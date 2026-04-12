FROM python:3.11-slim

RUN apt-get update && apt-get install -y \
    ffmpeg \
    libsndfile1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY railway/requirements.txt .
RUN pip install --no-cache-dir \
    --extra-index-url https://download.pytorch.org/whl/cpu \
    -r requirements.txt

RUN python -c "\
from transformers import AutoModelForSpeechSeq2Seq, AutoProcessor; \
AutoModelForSpeechSeq2Seq.from_pretrained('ivrit-ai/whisper-large-v3-turbo-he', use_safetensors=True, low_cpu_mem_usage=True); \
AutoProcessor.from_pretrained('ivrit-ai/whisper-large-v3-turbo-he'); \
print('Model pre-downloaded successfully')"

COPY railway/server.py .

EXPOSE 8080

CMD ["python", "-u", "server.py"]
