# BioDockify Docking Studio - All-in-One Docker Image
# Using supervisor approach similar to Agent Zero for stable startup

# Stage 1: Build React frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: Final Image (CPU only - Vina)
FROM python:3.11-slim

LABEL maintainer="BioDockify"
LABEL description="BioDockify Studio AI - All-in-one molecular docking and drug discovery platform"

ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    wget \
    bzip2 \
    ca-certificates \
    tzdata \
    supervisor \
    libglib2.0-0 \
    libsm6 \
    libxml2 \
    libxslt1.1 \
    libxrender1 \
    libxext6 \
    && rm -rf /var/lib/apt/lists/*

# Install Miniconda for conda-forge packages (vina, rdkit, meeko)
RUN wget -q https://repo.anaconda.com/miniconda/Miniconda3-latest-Linux-x86_64.sh -O /tmp/miniconda.sh && \
    bash /tmp/miniconda.sh -b -p /opt/conda && \
    rm /tmp/miniconda.sh && \
    /opt/conda/bin/conda clean -afy

ENV PATH=/opt/conda/bin:$PATH

# Install scientific stack from conda-forge
RUN conda install -y -c conda-forge \
    rdkit \
    vina \
    meeko \
    boost \
    boost-cpp \
    && conda clean -afy

# Set working directory
WORKDIR /app

# Copy backend files (preserve directory structure)
COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir -r /app/backend/requirements.txt

COPY backend/ /app/backend/

# Copy React built frontend into backend static directory
COPY --from=frontend-builder /app/frontend/dist /app/backend/static/

# Create supervisor configuration
RUN mkdir -p /var/log/supervisor

# Create startup script
RUN echo '#!/bin/bash' > /startup.sh && \
    echo 'echo ""' >> /startup.sh && \
    echo 'echo "============================================================"' >> /startup.sh && \
    echo 'echo "  🧬 BioDockify Studio AI - Backend Starting..."' >> /startup.sh && \
    echo 'echo "============================================================="' >> /startup.sh && \
    echo 'echo ""' >> /startup.sh && \
    echo 'echo "  🌐 Web UI:           http://localhost:8000"' >> /startup.sh && \
    echo 'echo "  🧪 ChemDraw:         http://localhost:8000/chemdraw"' >> /startup.sh && \
    echo 'echo "  📚 API Documentation: http://localhost:8000/docs"' >> /startup.sh && \
    echo 'echo "  📖 ReDoc:            http://localhost:8000/redoc"' >> /startup.sh && \
    echo 'echo "  ✅ Health:           http://localhost:8000/health"' >> /startup.sh && \
    echo 'echo "============================================================="' >> /startup.sh && \
    echo 'echo ""' >> /startup.sh && \
    chmod +x /startup.sh

# Create supervisor config
RUN echo '[supervisord]' >> /etc/supervisor/conf.d/docking-studio.conf && \
    echo 'nodaemon=true' >> /etc/supervisor/conf.d/docking-studio.conf && \
    echo 'user=root' >> /etc/supervisor/conf.d/docking-studio.conf && \
    echo 'logfile=/dev/stdout' >> /etc/supervisor/conf.d/docking-studio.conf && \
    echo 'logfile_maxbytes=0' >> /etc/supervisor/conf.d/docking-studio.conf && \
    echo 'pidfile=/var/run/supervisord.pid' >> /etc/supervisor/conf.d/docking-studio.conf && \
    echo '' >> /etc/supervisor/conf.d/docking-studio.conf && \
    echo '[program:uvicorn]' >> /etc/supervisor/conf.d/docking-studio.conf && \
    echo 'command=uvicorn main:app --host 0.0.0.0 --port 8000 --reload' >> /etc/supervisor/conf.d/docking-studio.conf && \
    echo 'directory=/app/backend' >> /etc/supervisor/conf.d/docking-studio.conf && \
    echo 'user=root' >> /etc/supervisor/conf.d/docking-studio.conf && \
    echo 'stdout_logfile=/dev/stdout' >> /etc/supervisor/conf.d/docking-studio.conf && \
    echo 'stdout_logfile_maxbytes=0' >> /etc/supervisor/conf.d/docking-studio.conf && \
    echo 'stderr_logfile=/dev/stderr' >> /etc/supervisor/conf.d/docking-studio.conf && \
    echo 'stderr_logfile_maxbytes=0' >> /etc/supervisor/conf.d/docking-studio.conf && \
    echo 'autorestart=true' >> /etc/supervisor/conf.d/docking-studio.conf && \
    echo 'startretries=3' >> /etc/supervisor/conf.d/docking-studio.conf && \
    echo 'stopwaitsecs=30' >> /etc/supervisor/conf.d/docking-studio.conf

# Expose port
EXPOSE 8000

# Run supervisor (which manages uvicorn)
CMD ["/bin/bash", "-c", "/startup.sh && /usr/bin/supervisord -c /etc/supervisor/conf.d/docking-studio.conf"]
