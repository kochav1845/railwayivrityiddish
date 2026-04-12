import os
import tempfile
import traceback
from fastapi import FastAPI, File, Form, UploadFile, HTTPException
from fastapi.responses import JSONResponse
import uvicorn

app = FastAPI()

MODELS = {
    "hebrew": {
        "id": "ivrit-ai/whisper-large-v3-turbo",
        "language": "hebrew",
    },
    "yiddish": {
        "id": "ivrit-ai/yi-whisper-large-v3-turbo",
        "language": "yiddish",
    },
}

_pipes = {}
_device = None
_load_errors = {}


def get_pipe(lang: str):
    global _device
    if lang not in MODELS:
        raise ValueError(f"Unsupported language: {lang}")

    if lang in _pipes:
        return _pipes[lang]

    import torch
    from transformers import AutoModelForSpeechSeq2Seq, AutoProcessor, pipeline

    _device = "cuda" if torch.cuda.is_available() else "cpu"
    torch_dtype = torch.float16 if torch.cuda.is_available() else torch.float32
    model_id = MODELS[lang]["id"]

    print(f"Loading model {model_id} on {_device} from local cache...")

    model = AutoModelForSpeechSeq2Seq.from_pretrained(
        model_id,
        torch_dtype=torch_dtype,
        low_cpu_mem_usage=True,
        use_safetensors=True,
        local_files_only=True,
    )
    model.to(_device)

    processor = AutoProcessor.from_pretrained(model_id, local_files_only=True)

    pipe = pipeline(
        "automatic-speech-recognition",
        model=model,
        tokenizer=processor.tokenizer,
        feature_extractor=processor.feature_extractor,
        torch_dtype=torch_dtype,
        device=_device,
    )

    _pipes[lang] = pipe
    print(f"Model {model_id} loaded and ready.")
    return pipe


@app.on_event("startup")
def load_models_on_startup():
    for lang in MODELS:
        try:
            get_pipe(lang)
        except Exception as e:
            _load_errors[lang] = str(e)
            print(f"WARNING: {lang} model failed to load at startup: {e}")
            traceback.print_exc()


@app.get("/health")
def health():
    return {
        "status": "ok" if len(_pipes) == len(MODELS) else "degraded",
        "models": {
            lang: {
                "model_id": cfg["id"],
                "loaded": lang in _pipes,
                "error": _load_errors.get(lang),
            }
            for lang, cfg in MODELS.items()
        },
        "device": _device or "not_loaded",
    }


@app.post("/transcribe")
async def transcribe(
    audio: UploadFile = File(...),
    language: str = Form("hebrew"),
):
    lang = language.lower().strip()
    if lang not in MODELS:
        raise HTTPException(status_code=400, detail=f"Unsupported language: {lang}. Supported: {', '.join(MODELS.keys())}")

    if not audio.content_type or not audio.content_type.startswith("audio/"):
        if not audio.filename or not any(
            audio.filename.endswith(ext)
            for ext in [".wav", ".mp3", ".m4a", ".ogg", ".flac", ".webm", ".mp4"]
        ):
            raise HTTPException(status_code=400, detail="Invalid audio file")

    try:
        pipe = get_pipe(lang)
    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail=f"Model not available for {lang}: {e}",
        )

    with tempfile.NamedTemporaryFile(
        delete=False,
        suffix=os.path.splitext(audio.filename or ".wav")[1],
    ) as tmp:
        contents = await audio.read()
        tmp.write(contents)
        tmp_path = tmp.name

    try:
        result = pipe(
            tmp_path,
            generate_kwargs={"task": "transcribe", "language": MODELS[lang]["language"]},
            return_timestamps=False,
        )
        transcription = result.get("text", "").strip()
        return JSONResponse({
            "transcription": transcription,
            "filename": audio.filename,
            "file_size_bytes": len(contents),
            "language": lang,
        })
    finally:
        os.unlink(tmp_path)


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    uvicorn.run(app, host="0.0.0.0", port=port)
