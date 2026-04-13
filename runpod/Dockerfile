FROM nvidia/cuda:12.1.1-cudnn8-runtime-ubuntu22.04

ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    ffmpeg \
    libsndfile1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY runpod/requirements.txt .
RUN pip3 install --no-cache-dir -r requirements.txt

RUN python3 -c "from huggingface_hub import snapshot_download; snapshot_download('ivrit-ai/yi-whisper-large-v3-turbo', local_dir='/app/model', local_dir_use_symlinks=False)"

COPY runpod/handler.py .

CMD ["python3", "-u", "handler.py"]
