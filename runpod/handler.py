import os
import re
import subprocess
import tempfile
import base64
import time
import traceback
import sys 
import runpod
import torch
from transformers import AutoModelForSpeechSeq2Seq, AutoProcessor, pipeline
from huggingface_hub import snapshot_download

MODEL_ID = "ivrit-ai/yi-whisper-large-v3-turbo"
BAKED_MODEL_DIR = "/app/model"
VOLUME_MODEL_DIR = "/runpod-volume/model"

CONVERTIBLE_FORMATS = {".webm", ".ogg", ".m4a", ".mp4", ".aac", ".wma"}

pipe = None


def log(msg):
    print(msg, flush=True)
    sys.stdout.flush()


def get_model_path():
    if os.path.isdir(BAKED_MODEL_DIR) and os.listdir(BAKED_MODEL_DIR):
        log(f"[MODEL] Using baked-in model at {BAKED_MODEL_DIR}")
        return BAKED_MODEL_DIR

    if os.path.isdir(VOLUME_MODEL_DIR) and os.listdir(VOLUME_MODEL_DIR):
        log(f"[MODEL] Using volume model at {VOLUME_MODEL_DIR}")
        return VOLUME_MODEL_DIR

    log(f"[MODEL] Downloading {MODEL_ID} to {VOLUME_MODEL_DIR}...")
    os.makedirs(VOLUME_MODEL_DIR, exist_ok=True)
    snapshot_download(
        repo_id=MODEL_ID,
        local_dir=VOLUME_MODEL_DIR,
        local_dir_use_symlinks=False,
    )
    log("[MODEL] Download complete")
    return VOLUME_MODEL_DIR


def load_model():
    global pipe
    if pipe is not None:
        return pipe

    log("[MODEL] Loading model into memory...")
    t0 = time.time()
    model_path = get_model_path()

    device = "cuda" if torch.cuda.is_available() else "cpu"
    torch_dtype = torch.float16 if torch.cuda.is_available() else torch.float32

    model = AutoModelForSpeechSeq2Seq.from_pretrained(
        model_path,
        torch_dtype=torch_dtype,
        low_cpu_mem_usage=True,
        use_safetensors=True,
    )
    model.to(device)

    processor = AutoProcessor.from_pretrained(model_path)

    pipe = pipeline(
        "automatic-speech-recognition",
        model=model,
        tokenizer=processor.tokenizer,
        feature_extractor=processor.feature_extractor,
        torch_dtype=torch_dtype,
        device=device,
    )

    elapsed = time.time() - t0
    log(f"[MODEL] Loaded on {device} in {elapsed:.1f}s")
    return pipe


def convert_to_wav(input_path):
    wav_path = input_path.rsplit(".", 1)[0] + ".wav"
    log(f"[FFMPEG] Converting to WAV: {input_path} -> {wav_path}")
    t0 = time.time()

    proc = subprocess.run(
        ["ffmpeg", "-y", "-i", input_path, "-ar", "16000", "-ac", "1", "-f", "wav", wav_path],
        capture_output=True,
        timeout=120,
    )

    elapsed = time.time() - t0
    if proc.returncode != 0:
        stderr = proc.stderr.decode("utf-8", errors="replace")
        log(f"[FFMPEG] FAILED (exit {proc.returncode}, {elapsed:.1f}s): {stderr[:500]}")
        return None

    log(f"[FFMPEG] Success in {elapsed:.1f}s")
    return wav_path


def strip_nikud(text):
    return re.sub(r"[\u0591-\u05C7]", "", text)


def handler(job):
    job_id = job.get("id", "unknown")
    log(f"[JOB {job_id}] ========== START ==========")
    t_start = time.time()

    try:
        job_input = job.get("input", {})
        log(f"[JOB {job_id}] Input keys: {list(job_input.keys())}")

        audio_base64 = job_input.get("audio_base64")
        if not audio_base64:
            log(f"[JOB {job_id}] ERROR: No audio_base64 in input")
            return {"error": "No audio_base64 provided"}

        ext = job_input.get("extension", ".webm")
        if not ext.startswith("."):
            ext = f".{ext}"

        log(f"[JOB {job_id}] Base64 length: {len(audio_base64)}, extension: {ext}")

        try:
            audio_bytes = base64.b64decode(audio_base64)
        except Exception as e:
            log(f"[JOB {job_id}] ERROR: Base64 decode failed: {e}")
            return {"error": f"Invalid base64 audio: {e}"}

        log(f"[JOB {job_id}] Decoded audio: {len(audio_bytes)} bytes")

        log(f"[JOB {job_id}] Loading ASR model...")
        t_model = time.time()
        asr_pipe = load_model()
        log(f"[JOB {job_id}] Model ready in {time.time() - t_model:.1f}s")

        with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
            tmp.write(audio_bytes)
            tmp_path = tmp.name

        log(f"[JOB {job_id}] Temp file: {tmp_path} ({len(audio_bytes)} bytes)")

        wav_path = None
        input_path = tmp_path

        try:
            if ext.lower() in CONVERTIBLE_FORMATS:
                wav_path = convert_to_wav(tmp_path)
                if wav_path:
                    input_path = wav_path
                else:
                    log(f"[JOB {job_id}] WARN: ffmpeg failed, trying raw file")

            log(f"[JOB {job_id}] Running ASR on: {input_path}")
            t_asr = time.time()

            result = asr_pipe(
                input_path,
                generate_kwargs={"task": "transcribe", "language": "yi"},
                return_timestamps=True,
            )

            asr_elapsed = time.time() - t_asr
            log(f"[JOB {job_id}] ASR completed in {asr_elapsed:.1f}s")

            raw_text = ""
            if isinstance(result, dict):
                raw_text = result.get("text", "").strip()
                log(f"[JOB {job_id}] Result keys: {list(result.keys())}")
            else:
                log(f"[JOB {job_id}] Unexpected result type: {type(result)}")

            log(f"[JOB {job_id}] Raw text ({len(raw_text)} chars): {raw_text[:300]}")

            clean_text = strip_nikud(raw_text)
            log(f"[JOB {job_id}] Clean text ({len(clean_text)} chars): {clean_text[:300]}")

            total = time.time() - t_start
            log(f"[JOB {job_id}] ========== DONE in {total:.1f}s ==========")

            return {
                "transcription": clean_text,
                "raw_text": raw_text,
                "file_size_bytes": len(audio_bytes),
                "language": "yiddish",
                "processing_time_seconds": round(total, 2),
            }

        finally:
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)
            if wav_path and os.path.exists(wav_path):
                os.unlink(wav_path)

    except Exception as e:
        total = time.time() - t_start
        log(f"[JOB {job_id}] ========== EXCEPTION after {total:.1f}s ==========")
        log(f"[JOB {job_id}] {type(e).__name__}: {e}")
        traceback.print_exc()
        sys.stdout.flush()
        return {"error": str(e)}


log("=" * 60)
log("[WORKER] RunPod worker starting...")
log("=" * 60)

try:
    load_model()
    log("[WORKER] Model pre-loaded. Worker ready for jobs.")
except Exception as e:
    log(f"[WORKER] FATAL: Model pre-load failed: {e}")
    traceback.print_exc()

log("=" * 60)
runpod.serverless.start({"handler": handler})
