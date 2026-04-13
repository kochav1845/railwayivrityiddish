FROM nvidia/cuda:12.1.1-cudnn8-runtime-ubuntu22.04

ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    ffmpeg \
    libsndfile1 \
    git \
    git-lfs \
    && rm -rf /var/lib/apt/lists/*

RUN git lfs install

WORKDIR /app

COPY runpod/requirements.txt .
RUN pip3 install --no-cache-dir -r requirements.txt

ARG HF_TOKEN
RUN python3 <<'PYEOF'
import os
from huggingface_hub import login
token = os.environ.get('HF_TOKEN', '')
if token:
    login(token=token)
from transformers import AutoModelForSpeechSeq2Seq, AutoProcessor
import torch

model_id = 'ivrit-ai/yi-whisper-large-v3-turbo'
print(f'Downloading {model_id}...')
AutoModelForSpeechSeq2Seq.from_pretrained(model_id, torch_dtype=torch.float32, low_cpu_mem_usage=True, use_safetensors=True)
AutoProcessor.from_pretrained(model_id)
print(f'{model_id} downloaded successfully')
PYEOF

COPY runpod/handler.py .

CMD ["python3", "-u", "handler.py"]
