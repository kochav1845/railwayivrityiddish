FROM python:3.11-slim

RUN apt-get update && apt-get install -y \
    ffmpeg \
    libsndfile1 \
    git \
    git-lfs \
    && rm -rf /var/lib/apt/lists/*

RUN git lfs install

WORKDIR /app

COPY railway/requirements.txt .
RUN pip install --no-cache-dir \
    --extra-index-url https://download.pytorch.org/whl/cpu \
    -r requirements.txt

ARG HF_TOKEN
RUN python -c "\
import os; \
os.environ['HF_TOKEN'] = os.environ.get('HF_TOKEN', ''); \
from huggingface_hub import login; \
token = os.environ.get('HF_TOKEN', ''); \
if token: login(token=token); \
from transformers import AutoModelForSpeechSeq2Seq, AutoProcessor; \
import torch; \
model_id = 'ivrit-ai/whisper-large-v3-turbo-he'; \
AutoModelForSpeechSeq2Seq.from_pretrained(model_id, torch_dtype=torch.float32, low_cpu_mem_usage=True, use_safetensors=True); \
AutoProcessor.from_pretrained(model_id); \
print('Model downloaded successfully')"

COPY railway/server.py .

EXPOSE 8080

CMD ["python", "-u", "server.py"]
