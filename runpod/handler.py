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
    job_input = job["input"]

    audio_base64 = job_input.get("audio_base64")
    if not audio_base64:
        return {"error": "No audio_base64 provided"}

    ext = job_input.get("extension", ".webm")
    if not ext.startswith("."):
        ext = f".{ext}"

    audio_bytes = base64.b64decode(audio_base64)

    asr_pipe = load_model()

    with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
        tmp.write(audio_bytes)
        tmp_path = tmp.name

    wav_path = None
    try:
        input_path = tmp_path
        if ext in (".webm", ".ogg", ".m4a", ".mp4"):
            wav_path = tmp_path.rsplit(".", 1)[0] + ".wav"
            proc = subprocess.run(
                ["ffmpeg", "-y", "-i", tmp_path, "-ar", "16000", "-ac", "1", "-f", "wav", wav_path],
                capture_output=True,
                timeout=120,
            )
            if proc.returncode == 0:
                input_path = wav_path

        result = asr_pipe(
            input_path,
            generate_kwargs={"task": "transcribe", "language": "yi"},
            return_timestamps=True,
        )
        raw_text = result.get("text", "").strip()
        transcription = re.sub(r'[\u0591-\u05C7]', '', raw_text)

        return {
            "transcription": transcription,
            "file_size_bytes": len(audio_bytes),
            "language": "yiddish",
        }
    except Exception as e:
        return {"error": str(e)}
    finally:
        os.unlink(tmp_path)
        if wav_path and os.path.exists(wav_path):
            os.unlink(wav_path)


runpod.serverless.start({"handler": handler})
 