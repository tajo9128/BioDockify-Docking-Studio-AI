"""
AI Configuration
Simplified to Ollama only with offline fallback
"""

import os

AI_MODE = os.getenv("AI_MODE", "auto")
# auto = auto-detect Ollama
# ollama = force Ollama
# offline = force offline fallback

# Try multiple Ollama URLs in order of preference
OLLAMA_URLS = [
    os.getenv("OLLAMA_URL", ""),  # User-specified URL (if set)
    "http://host.docker.internal:11434",  # Docker Desktop Windows/Mac - try first for Docker
    "http://localhost:11434",  # Local host (direct machine)
    "http://127.0.0.1:11434",  # Explicit localhost IP
    "http://ollama:11434",  # Docker Compose service name
]
# Filter out empty strings
OLLAMA_URLS = [url for url in OLLAMA_URLS if url]

# Default URL for backwards compatibility
OLLAMA_URL = "http://host.docker.internal:11434"  # Best for Docker Desktop

OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "qwen3:4b")

ALLOW_AI = os.getenv("ALLOW_AI", "true").lower() == "true"

OLLAMA_TIMEOUT = int(os.getenv("OLLAMA_TIMEOUT", "120"))
