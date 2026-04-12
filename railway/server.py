import os
import subprocess
import tempfile
import traceback
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
import uvicorn

app = FastAPI()

MODEL_ID = "ivrit-ai/yi-whisper-large-v3-turbo"

_pipe = None
_device = None
_load_error = None


def get_pipe():
    global _pipe, _device
    if _pipe is not None:
        return _pipe

    import torch
    from transformers import AutoModelForSpeechSeq2Seq, AutoProcessor, pipeline

    _device = "cuda" if torch.cuda.is_available() else "cpu"
    torch_dtype = torch.float16 if torch.cuda.is_available() else torch.float32

    print(f"Loading model {MODEL_ID} on {_device} from local cache...")

    model = AutoModelForSpeechSeq2Seq.from_pretrained(
        MODEL_ID,
        torch_dtype=torch_dtype,
        low_cpu_mem_usage=True,
        use_safetensors=True,
        local_files_only=True,
    )
    model.to(_device)

    processor = AutoProcessor.from_pretrained(MODEL_ID, local_files_only=True)

    _pipe = pipeline(
        "automatic-speech-recognition",
        model=model,
        tokenizer=processor.tokenizer,
        feature_extractor=processor.feature_extractor,
        torch_dtype=torch_dtype,
        device=_device,
    )

    print(f"Model {MODEL_ID} loaded and ready.")
    return _pipe


@app.on_event("startup")
def load_model_on_startup():
    global _load_error
    try:
        get_pipe()
    except Exception as e:
        _load_error = str(e)
        print(f"WARNING: Model failed to load at startup: {e}")
        traceback.print_exc()


@app.get("/health")
def health():
    return {
        "status": "ok" if _pipe is not None else "degraded",
        "model_id": MODEL_ID,
        "loaded": _pipe is not None,
        "error": _load_error,
        "device": _device or "not_loaded",
    }


@app.post("/transcribe")
async def transcribe(audio: UploadFile = File(...)):
    if not audio.content_type or not audio.content_type.startswith("audio/"):
        if not audio.filename or not any(
            audio.filename.endswith(ext)
            for ext in [".wav", ".mp3", ".m4a", ".ogg", ".flac", ".webm", ".mp4"]
        ):
            raise HTTPException(status_code=400, detail="Invalid audio file")

    try:
        pipe = get_pipe()
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Model not available: {e}")

    contents = await audio.read()
    ext = os.path.splitext(audio.filename or ".wav")[1].lower()

    with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
        tmp.write(contents)
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

        result = pipe(
            input_path,
            generate_kwargs={"task": "transcribe", "language": "yi", "return_timestamps": False},
        )
        transcription = result.get("text", "").strip()
        return JSONResponse({
            "transcription": transcription,
            "filename": audio.filename,
            "file_size_bytes": len(contents),
            "language": "yiddish",
        })
    finally:
        os.unlink(tmp_path)
        if wav_path and os.path.exists(wav_path):
            os.unlink(wav_path)


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    uvicorn.run(app, host="0.0.0.0", port=port)
