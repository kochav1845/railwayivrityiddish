import os
import tempfile
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
import uvicorn

app = FastAPI()

MODEL_ID = "ivrit-ai/whisper-large-v3-turbo-he"

_pipe = None
_device = None


@app.on_event("startup")
def load_model_on_startup():
    get_pipe()


def get_pipe():
    global _pipe, _device
    if _pipe is None:
        import torch
        from transformers import AutoModelForSpeechSeq2Seq, AutoProcessor, pipeline

        _device = "cuda" if torch.cuda.is_available() else "cpu"
        torch_dtype = torch.float16 if torch.cuda.is_available() else torch.float32

        print(f"Loading model {MODEL_ID} on {_device}...")

        model = AutoModelForSpeechSeq2Seq.from_pretrained(
            MODEL_ID,
            torch_dtype=torch_dtype,
            low_cpu_mem_usage=True,
            use_safetensors=True,
        )
        model.to(_device)

        processor = AutoProcessor.from_pretrained(MODEL_ID)

        _pipe = pipeline(
            "automatic-speech-recognition",
            model=model,
            tokenizer=processor.tokenizer,
            feature_extractor=processor.feature_extractor,
            torch_dtype=torch_dtype,
            device=_device,
        )

        print("Model loaded and ready.")

    return _pipe


@app.get("/health")
def health():
    return {
        "status": "ok",
        "model": MODEL_ID,
        "device": _device or "not_loaded",
        "model_loaded": _pipe is not None,
    }


@app.post("/transcribe")
async def transcribe(audio: UploadFile = File(...)):
    if not audio.content_type or not audio.content_type.startswith("audio/"):
        if not audio.filename or not any(
            audio.filename.endswith(ext)
            for ext in [".wav", ".mp3", ".m4a", ".ogg", ".flac", ".webm", ".mp4"]
        ):
            raise HTTPException(status_code=400, detail="Invalid audio file")

    with tempfile.NamedTemporaryFile(
        delete=False,
        suffix=os.path.splitext(audio.filename or ".wav")[1],
    ) as tmp:
        contents = await audio.read()
        tmp.write(contents)
        tmp_path = tmp.name

    try:
        pipe = get_pipe()
        result = pipe(
            tmp_path,
            generate_kwargs={"task": "transcribe", "language": "hebrew"},
            return_timestamps=False,
        )
        transcription = result.get("text", "").strip()
        return JSONResponse({
            "transcription": transcription,
            "filename": audio.filename,
            "file_size_bytes": len(contents),
        })
    finally:
        os.unlink(tmp_path)


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    uvicorn.run(app, host="0.0.0.0", port=port)
