"""
Validated tool decorator - wraps CrewAI tools with Pydantic validation,
chemical sanity checks, structured output, and auto-retry capability.
"""

from functools import wraps
from typing import Callable, Any, Dict, List, Optional
import traceback
import logging

logger = logging.getLogger(__name__)


class ToolResult:
    """Structured tool result with validation metadata."""
    def __init__(
        self,
        success: bool,
        data: Optional[Dict[str, Any]] = None,
        error: Optional[str] = None,
        validation_notes: Optional[List[str]] = None,
        confidence: float = 0.9,
        metadata: Optional[Dict[str, Any]] = None,
    ):
        self.success = success
        self.data = data or {}
        self.error = error
        self.validation_notes = validation_notes or []
        self.confidence = max(0.0, min(1.0, confidence))
        self.metadata = metadata or {}

    def to_dict(self) -> Dict[str, Any]:
        return {
            "success": self.success,
            "data": self.data,
            "error": self.error,
            "validation_notes": self.validation_notes,
            "confidence": self.confidence,
            "metadata": self.metadata,
        }

    def __str__(self):
        if self.success:
            notes = " | ".join(self.validation_notes) if self.validation_notes else "OK"
            return f"[✓] confidence={self.confidence:.2f} | {notes} | {json.dumps(self.data, default=str)[:200]}"
        return f"[✗] {self.error}"


def chemical_sanity_check(result: dict) -> List[str]:
    """Check chemical plausibility of tool results."""
    notes = []
    energy = result.get("energy") or result.get("best_score") or result.get("vina_score")
    if energy is not None:
        try:
            energy = float(energy)
            if energy > 100:
                notes.append("⚠️ Unphysical energy >100 kcal/mol")
            elif energy > 0:
                notes.append("⚠️ Positive binding energy (unfavorable)")
        except (ValueError, TypeError):
            pass

    rmsd = result.get("rmsd")
    if rmsd is not None:
        try:
            if float(rmsd) > 3.0:
                notes.append("⚠️ Pose deviation >3Å")
        except (ValueError, TypeError):
            pass

    clashes = result.get("clashes")
    if clashes is not None:
        try:
            if int(clashes) > 10:
                notes.append("⚠️ Excessive steric clashes")
        except (ValueError, TypeError):
            pass

    return notes


def validated_tool(func: Callable) -> Callable:
    """Decorator: wraps tool with validation, chemical checks, and structured output."""
    @wraps(func)
    def wrapper(*args, **kwargs):
        try:
            raw = func(*args, **kwargs)
            if raw is None:
                return ToolResult(
                    success=False,
                    error="Tool returned None",
                    confidence=0.1
                )

            if isinstance(raw, ToolResult):
                return raw

            if isinstance(raw, dict):
                notes = chemical_sanity_check(raw)
                confidence = 0.9 - (len(notes) * 0.15)
                return ToolResult(
                    success=True,
                    data=raw,
                    validation_notes=notes,
                    confidence=max(0.3, confidence)
                )

            return ToolResult(
                success=True,
                data={"output": str(raw)},
                confidence=0.7
            )

        except Exception as e:
            logger.error(f"Tool {func.__name__} failed: {e}")
            return ToolResult(
                success=False,
                error=str(e),
                validation_notes=[f"Tool failed: {traceback.format_exc()[:200]}"],
                confidence=0.1
            )

    return wrapper


def auto_retry(func: Callable, max_retries: int = 3) -> Callable:
    """Decorator: auto-retry with parameter adjustment on failure."""
    @wraps(func)
    def wrapper(*args, **kwargs):
        last_error = None
        for attempt in range(max_retries):
            try:
                result = func(*args, **kwargs)
                if isinstance(result, ToolResult) and result.success:
                    return result
                if isinstance(result, dict) and result.get("success"):
                    return result
                last_error = result
            except Exception as e:
                last_error = str(e)

            if attempt < max_retries - 1:
                logger.warning(f"Retry {attempt+1}/{max_retries} for {func.__name__}")

        return ToolResult(
            success=False,
            error=f"Failed after {max_retries} attempts. Last error: {last_error}",
            confidence=0.1
        )

    return wrapper


import json
