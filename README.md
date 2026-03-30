# BioDockify

**Professional AI-Powered Molecular Docking Studio** — runs at `http://localhost:8000`

Built with Discovery Studio-inspired UI + BioDockify AI assistant. One-command startup.

## Quick Start

```bash
# Option 1: Single Container (Recommended)
docker compose -f docker-compose.single.yml up -d
# Open browser → http://localhost:8000

# Option 2: Full Microservices
docker compose up -d
```

## Features

| Feature | Description |
|---------|-------------|
| **Docking** | AutoDock Vina + GNINA with consensus scoring |
| **3D Viewer** | Interactive molecular visualization |
| **MD Simulation** | Molecular dynamics with OpenMM |
| **Results** | Analysis dashboard with export |
| **BioDockify AI** | Multi-provider AI assistant (OpenAI, Claude, Gemini, etc.) |

## AI Providers

- OpenAI (GPT-4o, GPT-4o-mini)
- Anthropic Claude
- Google Gemini
- Mistral AI
- DeepSeek / Qwen
- OpenRouter
- Ollama (Local)

## Development

```bash
# Build frontend
cd frontend && npm install && npm run build

# Build single container
docker build -f Dockerfile.single -t biodockify/docking-studio:latest .
```

## License

MIT
