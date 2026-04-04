"""
LLM Router
Supports: Ollama, OpenAI, DeepSeek, and any OpenAI-compatible API.
Reads config from llm_config.json for persistence across settings saves.
"""

import json
import os
import requests
import logging
from typing import Dict, Optional

from .config import OLLAMA_URL, OLLAMA_MODEL, AI_MODE, ALLOW_AI, OLLAMA_TIMEOUT
from .offline_engine import OfflineAssistant

logger = logging.getLogger(__name__)

_CONFIG_FILE = os.path.join(
    os.path.dirname(os.path.dirname(__file__)), "llm_config.json"
)


def _load_config() -> Dict:
    """Load LLM config from file"""
    try:
        if os.path.exists(_CONFIG_FILE):
            with open(_CONFIG_FILE, "r") as f:
                return json.load(f)
    except Exception as e:
        logger.warning(f"Failed to load LLM config: {e}")
    return {}


def save_config(config: Dict):
    """Save LLM config to file"""
    try:
        with open(_CONFIG_FILE, "w") as f:
            json.dump(config, f, indent=2)
        logger.info(f"LLM config saved: provider={config.get('provider', 'unknown')}")
    except Exception as e:
        logger.error(f"Failed to save LLM config: {e}")


PROVIDER_URLS = {
    "ollama": "http://host.docker.internal:11434/v1",
    "openai": "https://api.openai.com/v1",
    "anthropic": "https://api.anthropic.com/v1",
    "gemini": "https://generativelanguage.googleapis.com/v1beta",
    "deepseek": "https://api.deepseek.com/v1",
    "mistral": "https://api.mistral.ai/v1",
    "groq": "https://api.groq.com/openai/v1",
    "openrouter": "https://openrouter.ai/api/v1",
    "siliconflow": "https://api.siliconflow.cn/v1",
    "qwen": "https://dashscope.aliyuncs.com/compatible-mode/v1",
}

PROVIDER_MODELS = {
    "ollama": "llama3.2",
    "openai": "gpt-4o-mini",
    "anthropic": "claude-sonnet-4-20250514",
    "gemini": "gemini-2.0-flash",
    "deepseek": "deepseek-chat",
    "mistral": "mistral-small-latest",
    "groq": "llama-3.1-8b-instant",
    "openrouter": "meta-llama/llama-3.1-8b-instruct",
    "siliconflow": "Qwen/Qwen2.5-7B-Instruct",
    "qwen": "qwen-turbo",
}


class OllamaProvider:
    """Ollama API provider"""

    def __init__(self, url: str = OLLAMA_URL, model: str = OLLAMA_MODEL):
        self.url = url
        self.model = model

    def is_available(self) -> bool:
        try:
            response = requests.get(f"{self.url}/api/tags", timeout=OLLAMA_TIMEOUT)
            if response.status_code == 200:
                data = response.json()
                models = data.get("models", [])
                if models and any(self.model in m.get("name", "") for m in models):
                    return True
                if models:
                    logger.info(f"Ollama has {len(models)} model(s)")
                    return True
                return False
            return False
        except Exception:
            return False

    def chat(self, prompt: str) -> str:
        headers = {"Content-Type": "application/json"}
        payload = {
            "model": self.model,
            "messages": [{"role": "user", "content": prompt}],
            "stream": False,
        }
        response = requests.post(
            f"{self.url}/api/chat",
            json=payload,
            headers=headers,
            timeout=OLLAMA_TIMEOUT * 2,
        )
        response.raise_for_status()
        data = response.json()
        return data["message"]["content"]

    def get_models(self) -> list:
        try:
            response = requests.get(f"{self.url}/api/tags", timeout=OLLAMA_TIMEOUT)
            if response.status_code == 200:
                data = response.json()
                return [m["name"] for m in data.get("models", [])]
        except Exception as e:
            logger.warning(f"Could not fetch Ollama models: {e}")
        return []


class APIProvider:
    """OpenAI-compatible API provider (DeepSeek, OpenAI, Mistral, Groq, etc.)"""

    def __init__(
        self, provider: str, api_key: str, base_url: str = "", model: str = ""
    ):
        self.provider = provider
        self.api_key = api_key
        self.base_url = (base_url or PROVIDER_URLS.get(provider, "")).rstrip("/")
        self.model = model or PROVIDER_MODELS.get(provider, "gpt-4o-mini")

    def is_available(self) -> bool:
        """Check if the API is reachable with a minimal request"""
        if not self.api_key or not self.base_url:
            return False
        try:
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            }
            resp = requests.get(f"{self.base_url}/models", headers=headers, timeout=10)
            return resp.status_code in (
                200,
                401,
                403,
            )  # 401/403 means reachable but auth issue
        except Exception:
            # Try a minimal chat completion as fallback check
            try:
                headers = {
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                }
                resp = requests.post(
                    f"{self.base_url}/chat/completions",
                    headers=headers,
                    json={
                        "model": self.model,
                        "messages": [{"role": "user", "content": "hi"}],
                        "max_tokens": 1,
                    },
                    timeout=15,
                )
                return resp.status_code in (200, 400, 401, 403, 429)
            except Exception:
                return False

    def chat(self, prompt: str) -> str:
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        messages = [
            {
                "role": "system",
                "content": """You are BioDockify AI, an expert drug discovery assistant built into BioDockify Studio AI — a free, open-source alternative to BIOVIA Discovery Studio and Schrödinger.

ABOUT THE SOFTWARE:
BioDockify Studio AI is a comprehensive molecular docking and drug discovery platform with:
- **Molecular Docking**: AutoDock Vina, GNINA (CNN scoring), RF-Score, consensus scoring
- **Batch Docking**: Screen multiple ligands with composite scoring (GNINA 50% + LE 25% + QED 15% + diversity 10%)
- **Pharmacophore Modeling**: Feature-based and structure-based pharmacophore design
- **QSAR Modeling**: Train ML models (RandomForest, GradientBoosting, SVR, PLS, Ridge, Lasso) with Y-scrambling and SHAP analysis
- **ADMET Prediction**: Absorption, Distribution, Metabolism, Excretion, Toxicity predictions
- **Molecular Dynamics**: GPU-accelerated MD simulations with trajectory visualization
- **ChemDraw**: Interactive molecule editor with SMILES, InChI, and structure drawing
- **Ligand Modifier**: RDKit-based chemical transformations and scaffold hopping
- **3D Viewer**: Interactive 3Dmol.js visualization of docking poses and trajectories
- **RMSD Analysis**: Structural comparison and clustering
- **Interaction Analysis**: Hydrogen bonds, hydrophobic contacts, pi-stacking, salt bridges
- **AI Assistant**: Powered by Ollama, OpenAI, DeepSeek, or offline fallback
- **CrewAI**: Multi-agent AI orchestration for complex drug discovery workflows
- **Knowledge Graph**: Target-compound-pathway-literature integration

FEATURES:
- Multi-language support (English, Spanish, Chinese, Arabic)
- Dark/light themes with accessibility options
- Real-time job queue management
- Composite scoring with GNINA CNN, Vina, and RF-Score
- Smart routing: strong binders (≤-5.0) exit at Vina, weak binders proceed to GNINA+RF
- GPU acceleration detection (NVIDIA CUDA)
- Docker-based deployment
- Desktop application via PyInstaller

Always be helpful, accurate, and specific about the software's capabilities. If a feature exists, explain how to use it. If not, be honest and suggest alternatives.""",
            },
            {"role": "user", "content": prompt},
        ]
        resp = requests.post(
            f"{self.base_url}/chat/completions",
            headers=headers,
            json={"model": self.model, "messages": messages, "max_tokens": 2048},
            timeout=60,
        )
        resp.raise_for_status()
        data = resp.json()
        return data["choices"][0]["message"]["content"]


class LLMRouter:
    """
    Intelligent LLM router that:
    - Reads config from llm_config.json (saved by Settings page)
    - Supports Ollama, OpenAI, DeepSeek, and OpenAI-compatible APIs
    - Falls back to offline assistant on failure
    """

    def __init__(self):
        self._config = _load_config()
        self._init_providers()

    def _init_providers(self):
        """Initialize provider instances with URL normalization for Docker."""
        saved_model = (
            self._config.get("model")
            if self._config.get("provider") == "ollama"
            else None
        )
        saved_url = (
            self._config.get("base_url")
            if self._config.get("provider") == "ollama"
            else None
        )

        # Normalize URL: replace localhost with host.docker.internal for Docker compatibility
        if saved_url and "localhost" in saved_url:
            saved_url = saved_url.replace("localhost", "host.docker.internal")

        # Strip /v1 suffix (OllamaProvider adds it itself for chat)
        ollama_base = (
            saved_url.rstrip("/").removesuffix("/v1") if saved_url else None
        ) or OLLAMA_URL
        self.ollama = OllamaProvider(url=ollama_base, model=saved_model or OLLAMA_MODEL)
        self.offline = OfflineAssistant()
        self._provider = None
        self._api_provider = None
        logger.info(
            f"LLMRouter initialized (ollama url={ollama_base}, model={self.ollama.model})"
        )

    def reset(self):
        """Reset provider detection and re-read config."""
        self._config = _load_config()
        self._init_providers()

    def _get_config_provider(self) -> str:
        return self._config.get("provider", "ollama")

    def _get_api_key(self) -> str:
        return self._config.get("api_key", "")

    def _get_base_url(self) -> str:
        return self._config.get("base_url", "")

    def _get_model(self) -> str:
        return self._config.get("model", "")

    @property
    def provider(self) -> str:
        if self._provider is None:
            self._provider = self._detect_provider()
        return self._provider

    def _detect_provider(self) -> str:
        if not ALLOW_AI:
            logger.info("AI disabled via config")
            return "offline"

        config_provider = self._get_config_provider()

        # Ollama provider
        if config_provider == "ollama":
            if self.ollama.is_available():
                logger.info("Ollama available")
                return "ollama"
            logger.warning("Ollama configured but not available")
            return "offline"

        # API-based providers (DeepSeek, OpenAI, etc.)
        if config_provider in PROVIDER_URLS:
            api_key = self._get_api_key()
            if not api_key:
                logger.warning(f"{config_provider} configured but no API key")
                return "offline"
            base_url = self._get_base_url() or PROVIDER_URLS.get(config_provider, "")
            model = self._get_model() or PROVIDER_MODELS.get(config_provider, "")
            self._api_provider = APIProvider(config_provider, api_key, base_url, model)
            if self._api_provider.is_available():
                logger.info(f"{config_provider} API available")
                return config_provider
            logger.warning(f"{config_provider} API not reachable")
            return "offline"

        # Custom OpenAI-compatible
        if config_provider == "custom":
            api_key = self._get_api_key()
            base_url = self._get_base_url()
            model = self._get_model()
            if not base_url:
                logger.warning("Custom provider configured but no base URL")
                return "offline"
            self._api_provider = APIProvider("custom", api_key, base_url, model)
            if self._api_provider.is_available():
                logger.info("Custom API available")
                return "custom"
            return "offline"

        return "offline"

    def detect_ollama(self) -> bool:
        return self.ollama.is_available()

    def detect_provider(self) -> bool:
        """Check if the configured provider is available"""
        config_provider = self._get_config_provider()
        if config_provider == "ollama":
            return self.ollama.is_available()
        if self._api_provider:
            return self._api_provider.is_available()
        return False

    def get_available_models(self) -> list:
        if self.provider == "ollama":
            return self.ollama.get_models()
        return []

    def chat(self, message: str) -> Dict:
        """
        Send a chat message.
        Returns dict with: response, provider, available
        """
        # Force provider detection to initialize _api_provider
        detected = self.provider

        # Ollama
        if detected == "ollama":
            try:
                response_text = self.ollama.chat(message)
                return {
                    "response": response_text,
                    "provider": "ollama",
                    "available": True,
                }
            except Exception as e:
                logger.warning(f"Ollama failed: {e}")
                response_text = self.offline.respond(message)
                return {
                    "response": response_text,
                    "provider": "offline",
                    "available": False,
                    "error": str(e),
                }

        # API providers (OpenAI, DeepSeek, Groq, custom, etc.)
        if detected != "offline" and self._api_provider:
            try:
                response_text = self._api_provider.chat(message)
                return {
                    "response": response_text,
                    "provider": detected,
                    "available": True,
                }
            except Exception as e:
                logger.warning(f"{detected} failed: {e}")
                response_text = self.offline.respond(message)
                return {
                    "response": response_text,
                    "provider": "offline",
                    "available": False,
                    "error": str(e),
                }

        # Offline fallback
        response_text = self.offline.respond(message)
        return {"response": response_text, "provider": "offline", "available": False}

    def reset(self):
        """Reset provider cache and reload config"""
        self._provider = None
        self._api_provider = None
        self._config = _load_config()
        self._init_providers()


def get_router() -> LLMRouter:
    """Get singleton router instance"""
    if not hasattr(get_router, "_instance"):
        get_router._instance = LLMRouter()
    return get_router._instance
