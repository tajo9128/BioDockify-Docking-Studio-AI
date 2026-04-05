"""
LLM Router
Supports: Ollama, OpenAI, DeepSeek, and any OpenAI-compatible API.
Reads config from llm_config.json for persistence across settings saves.
"""

import json
import os
import requests
import logging
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

from .config import OLLAMA_URL, OLLAMA_MODEL, AI_MODE, ALLOW_AI, OLLAMA_TIMEOUT
from .offline_engine import OfflineAssistant

logger = logging.getLogger(__name__)

# ── NanoBot Soul ──────────────────────────────────────────────────────────────
NANOBOT_SOUL = """You are NanoBot — the proactive AI soul of BioDockify Studio Student Edition.

PERSONALITY:
- You are curious, passionate about drug discovery, and genuinely care about helping students learn.
- You are direct, confident, and scientific. You explain WHY, not just WHAT.
- You proactively notice patterns across experiments and offer observations the student didn't ask for.
- You speak like a brilliant senior researcher mentoring a student — warm, sharp, and honest.
- You ALWAYS reference the student's past experiments naturally when relevant.
- After any result, you immediately comment on quality and suggest the logical next step.

AGENT TEAM (you coordinate these specialized agents):
1. Docking Agent — Vina/GNINA/RF-Score, binding affinity, pose ranking
2. Chemistry Agent — RDKit, SMILES, drug-likeness (Lipinski Rule of 5)
3. ADMET Agent — Caco-2, BBB, CYP450, hERG, AMES, hepatotoxicity
4. Analysis Agent — Interaction analysis, consensus scoring, ranking
5. Agent MD — OpenMM molecular dynamics, RMSD stability, trajectory analysis
6. Orchestrator — Coordinates team, synthesizes final reports

PROACTIVE BEHAVIORS:
- After docking: Comment on binding energy quality, suggest ADMET or MD next
- After MD: Interpret RMSD stability, flag instability causes
- After ADMET: Cross-reference flags with docking scores
- When idle: Offer a suggestion based on the last experiment in memory
- Always: Reference past job history from EXPERIMENT MEMORY when relevant

SCORING GUIDE:
- Binding energy ≤ -10 kcal/mol: Excellent — full validation pipeline recommended
- -10 to -8 kcal/mol: Strong — worth ADMET + MD validation  
- -8 to -6 kcal/mol: Moderate — structural optimization may help
- -6 to -4 kcal/mol: Weak — revisit compound design or docking box
- > -4 kcal/mol: Poor — consider redesign
- MD RMSD < 2.0 Å: Stable pose  |  2-3 Å: Borderline  |  > 3 Å: Unstable"""


# ── Conversation History Store ────────────────────────────────────────────────
_HISTORY_FILE = os.path.join(
    os.path.dirname(os.path.dirname(__file__)), "storage", "nanobot", "chat_history.json"
)
MAX_HISTORY_TURNS = 16  # keep last 16 turns (8 exchanges)


def _load_history() -> List[Dict]:
    try:
        if os.path.exists(_HISTORY_FILE):
            with open(_HISTORY_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
    except Exception:
        pass
    return []


def _save_history(history: List[Dict]):
    try:
        Path(_HISTORY_FILE).parent.mkdir(parents=True, exist_ok=True)
        with open(_HISTORY_FILE, "w", encoding="utf-8") as f:
            json.dump(history[-MAX_HISTORY_TURNS:], f, indent=2, ensure_ascii=False)
    except Exception as e:
        logger.warning(f"Failed to save chat history: {e}")


def _append_history(role: str, content: str):
    history = _load_history()
    history.append({"role": role, "content": content, "ts": datetime.now().isoformat()})
    _save_history(history)


def _get_history_messages(last_n: int = 10) -> List[Dict]:
    """Return last N turns as [{role, content}] without timestamps."""
    history = _load_history()
    return [{"role": h["role"], "content": h["content"]} for h in history[-last_n:]]


def clear_chat_history():
    """Wipe conversation history."""
    _save_history([])


# ── Memory Context Builder ────────────────────────────────────────────────────

def _build_memory_context() -> str:
    """Pull recent job history from crew/memory.py ChromaDB/JSON for NanoBot context."""
    try:
        from crew.memory import memory as exp_memory
        stats = exp_memory.get_stats()
        recent = exp_memory.get_job_history(n=5)
        if not recent:
            return ""
        lines = [f"[EXPERIMENT MEMORY] {stats.get('total_experiments', 0)} jobs on record, "
                 f"success rate {stats.get('success_rate', 0):.0%}"]
        for exp in recent:
            meta = exp.get("meta", {})
            result = exp.get("result", {})
            t = exp.get("type", meta.get("type", "job"))
            ts = str(exp.get("timestamp", ""))[:10]
            score = result.get("best_score", result.get("binding_energy", result.get("energy", "")))
            status = exp.get("status", "")
            target = meta.get("target", "")
            ligand = meta.get("scaffold", meta.get("smiles", ""))[:30]
            lines.append(f"  • [{ts}] {t} | ligand={ligand} target={target} score={score} status={status}")
        chroma = exp_memory.chroma_stats()
        lines.append(f"  [ChromaDB: {chroma.get('backend')} — {chroma.get('total_indexed')} indexed]")
        return "\n".join(lines)
    except Exception as e:
        logger.debug(f"Memory context unavailable: {e}")
        return ""

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

    def chat(self, messages: List[Dict]) -> str:
        """Send a pre-built messages list (system + history + user) to Ollama."""
        headers = {"Content-Type": "application/json"}
        payload = {
            "model": self.model,
            "messages": messages,
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

    def chat(self, messages: List[Dict]) -> str:
        """Send a pre-built messages list (system + history + user) to the API provider."""
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
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
        Send a chat message as NanoBot.
        Injects soul, experiment memory context, and conversation history.
        Returns dict with: response, provider, available, memory_context
        """
        detected = self.provider

        # Build system prompt: soul + live memory context
        memory_ctx = _build_memory_context()
        system_content = NANOBOT_SOUL
        if memory_ctx:
            system_content += f"\n\n{memory_ctx}"

        # Build messages: system + history + current user message
        messages: List[Dict] = [{"role": "system", "content": system_content}]
        messages.extend(_get_history_messages(last_n=10))
        messages.append({"role": "user", "content": message})

        # Save user turn to history
        _append_history("user", message)

        # Ollama
        if detected == "ollama":
            try:
                response_text = self.ollama.chat(messages)
                _append_history("assistant", response_text)
                return {
                    "response": response_text,
                    "provider": "ollama",
                    "available": True,
                    "memory_context": bool(memory_ctx),
                }
            except Exception as e:
                logger.warning(f"Ollama failed: {e}")
                response_text = self.offline.respond(message)
                _append_history("assistant", response_text)
                return {
                    "response": response_text,
                    "provider": "offline",
                    "available": False,
                    "error": str(e),
                }

        # API providers (OpenAI, DeepSeek, Groq, custom, etc.)
        if detected != "offline" and self._api_provider:
            try:
                response_text = self._api_provider.chat(messages)
                _append_history("assistant", response_text)
                return {
                    "response": response_text,
                    "provider": detected,
                    "available": True,
                    "memory_context": bool(memory_ctx),
                }
            except Exception as e:
                logger.warning(f"{detected} failed: {e}")
                response_text = self.offline.respond(message)
                _append_history("assistant", response_text)
                return {
                    "response": response_text,
                    "provider": "offline",
                    "available": False,
                    "error": str(e),
                }

        # Offline fallback
        response_text = self.offline.respond(message)
        _append_history("assistant", response_text)
        return {"response": response_text, "provider": "offline", "available": False, "memory_context": False}

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
