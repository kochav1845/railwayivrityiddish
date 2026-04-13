import os
import re
import subprocess
import tempfile
import base64
import runpod
import torch
from transformers import AutoModelForSpeechSeq2Seq, AutoProcessor, pipeline
from huggingface_hub import snapshot_download

MODEL_ID = "ivrit-ai/yi-whisper-large-v3-turbo"
BAKED_MODEL_DIR = "/app/model"
VOLUME_MODEL_DIR = "/runpod-volume/model"

pipe = None


def get_model_path():
    if os.path.isdir(BAKED_MODEL_DIR) and os.listdir(BAKED_MODEL_DIR):
        print(f"Loading model from baked-in image: {BAKED_MODEL_DIR}")
        return BAKED_MODEL_DIR

    if os.path.isdir(VOLUME_MODEL_DIR) and os.listdir(VOLUME_MODEL_DIR):
        print(f"Loading model from network volume: {VOLUME_MODEL_DIR}")
        return VOLUME_MODEL_DIR

    print(f"No local model found. Downloading {MODEL_ID} to {VOLUME_MODEL_DIR}...")
    os.makedirs(VOLUME_MODEL_DIR, exist_ok=True)
    snapshot_download(
        repo_id=MODEL_ID,
        local_dir=VOLUME_MODEL_DIR,
        local_dir_use_symlinks=False,
    )
    print("Download complete.")
    return VOLUME_MODEL_DIR


def load_model():
    global pipe
    if pipe is not None:
        return pipe

    print("Loading model into memory...")
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

    print(f"Model {MODEL_ID} loaded on {device}.")
    return pipe


def handler(job):
    import time
    job_id = job.get("id", "unknown")
    print(f"[JOB {job_id}] === Handler started ===")
    start_time = time.time()

    job_input = job["input"]
    print(f"[JOB {job_id}] Input keys: {list(job_input.keys())}")

    audio_base64 = job_input.get("audio_base64")
    if not audio_base64:
        print(f"[JOB {job_id}] ERROR: No audio_base64 provided")
        return {"error": "No audio_base64 provided"}

    ext = job_input.get("extension", ".webm")
    if not ext.startswith("."):
        ext = f".{ext}"

    print(f"[JOB {job_id}] Decoding base64 audio (length: {len(audio_base64)} chars, ext: {ext})")
    audio_bytes = base64.b64decode(audio_base64)
    print(f"[JOB {job_id}] Decoded audio: {len(audio_bytes)} bytes")

    print(f"[JOB {job_id}] Loading model...")
    model_start = time.time()
    asr_pipe = load_model()
    print(f"[JOB {job_id}] Model ready in {time.time() - model_start:.2f}s")

    with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
        tmp.write(audio_bytes)
        tmp_path = tmp.name
    print(f"[JOB {job_id}] Wrote temp file: {tmp_path}")

    wav_path = None
    try:
        input_path = tmp_path
        if ext in (".webm", ".ogg", ".m4a", ".mp4"):
            wav_path = tmp_path.rsplit(".", 1)[0] + ".wav"
            print(f"[JOB {job_id}] Converting {ext} to WAV via ffmpeg...")
            ffmpeg_start = time.time()
            proc = subprocess.run(
                ["ffmpeg", "-y", "-i", tmp_path, "-ar", "16000", "-ac", "1", "-f", "wav", wav_path],
                capture_output=True,
                timeout=120,
            )
            print(f"[JOB {job_id}] ffmpeg exit code: {proc.returncode} ({time.time() - ffmpeg_start:.2f}s)")
            if proc.returncode != 0:
                print(f"[JOB {job_id}] ffmpeg stderr: {proc.stderr.decode()}")
            else:
                input_path = wav_path
        else:
            print(f"[JOB {job_id}] Skipping ffmpeg conversion (ext={ext})")

        print(f"[JOB {job_id}] Running ASR pipeline on: {input_path}")
        asr_start = time.time()
        result = asr_pipe(
            input_path,
            generate_kwargs={"task": "transcribe", "language": "yi"},
            return_timestamps=True,
        )
        print(f"[JOB {job_id}] ASR completed in {time.time() - asr_start:.2f}s")
        print(f"[JOB {job_id}] Raw result keys: {list(result.keys()) if isinstance(result, dict) else type(result)}")

        raw_text = result.get("text", "").strip()
        print(f"[JOB {job_id}] Raw text ({len(raw_text)} chars): {raw_text[:200]}")
        transcription = re.sub(r'[\u0591-\u05C7]', '', raw_text)
        print(f"[JOB {job_id}] Cleaned text ({len(transcription)} chars): {transcription[:200]}")

        total_time = time.time() - start_time
        print(f"[JOB {job_id}] === Handler completed in {total_time:.2f}s ===")

        return {
            "transcription": transcription,
            "file_size_bytes": len(audio_bytes),
            "language": "yiddish",
        }
    except Exception as e:
        print(f"[JOB {job_id}] EXCEPTION: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        return {"error": str(e)}
    finally:
        os.unlink(tmp_path)
        if wav_path and os.path.exists(wav_path):
            os.unlink(wav_path)


print("--- RunPod Worker Starting ---")
try:
    load_model()
    print("--- Model pre-loaded successfully. Worker ready. ---")
except Exception as e:
    print(f"--- FATAL: Failed to pre-load model: {e} ---")

runpod.serverless.start({"handler": handler})
 