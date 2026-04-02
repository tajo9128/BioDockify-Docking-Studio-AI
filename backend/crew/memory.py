"""
CrewAI Experiment Memory - ChromaDB-backed storage for experiment tracking,
failure pattern recognition, and parameter tuning suggestions.
"""

import json
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)


class ExperimentMemory:
    """Stores experiment metadata, results, and validation notes for learning."""

    def __init__(self, persist_dir: str = "./data/crewai_memory"):
        self.persist_dir = Path(persist_dir)
        self.persist_dir.mkdir(parents=True, exist_ok=True)
        self._experiments: Dict[str, Dict[str, Any]] = {}
        self._load()

    def _load(self):
        exp_file = self.persist_dir / "experiments.json"
        if exp_file.exists():
            try:
                with open(exp_file, 'r') as f:
                    self._experiments = json.load(f)
            except Exception as e:
                logger.warning(f"Failed to load experiment memory: {e}")

    def _save(self):
        exp_file = self.persist_dir / "experiments.json"
        try:
            with open(exp_file, 'w') as f:
                json.dump(self._experiments, f, indent=2, default=str)
        except Exception as e:
            logger.warning(f"Failed to save experiment memory: {e}")

    def store(self, exp_id: str, meta: Dict[str, Any], result: Dict[str, Any]):
        """Store experiment result."""
        self._experiments[exp_id] = {
            "meta": meta,
            "result": result,
            "status": result.get("status", "unknown"),
            "confidence": result.get("confidence", 0.0),
            "validation_notes": result.get("validation_notes", []),
            "timestamp": result.get("timestamp", ""),
        }
        self._save()

    def get(self, exp_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve experiment by ID."""
        return self._experiments.get(exp_id)

    def query_similar(self, query: str, n: int = 5) -> List[Dict[str, Any]]:
        """Find similar experiments by scaffold/target keywords."""
        query_lower = query.lower()
        scored = []
        for exp_id, exp in self._experiments.items():
            meta = exp.get("meta", {})
            text = f"{meta.get('scaffold', '')} {meta.get('target', '')} {meta.get('smiles', '')}"
            score = sum(1 for word in query_lower.split() if word in text.lower())
            if score > 0:
                scored.append((score, exp_id, exp))
        scored.sort(reverse=True)
        return [{"exp_id": eid, **exp} for _, eid, exp in scored[:n]]

    def get_failure_patterns(self, tool_name: str = None) -> List[Dict[str, Any]]:
        """Identify common failure patterns."""
        patterns = {}
        for exp_id, exp in self._experiments.items():
            result = exp.get("result", {})
            if result.get("status") == "failed":
                error = result.get("error", "unknown")
                key = error[:100]
                if key not in patterns:
                    patterns[key] = {"count": 0, "examples": [], "suggestions": []}
                patterns[key]["count"] += 1
                patterns[key]["examples"].append(exp_id)

                meta = exp.get("meta", {})
                if "grid" in error.lower():
                    patterns[key]["suggestions"].append("Increase box_size by 2.0 Å")
                elif "rotatable" in error.lower():
                    patterns[key]["suggestions"].append("Increase exhaustiveness")
                elif "clash" in error.lower():
                    patterns[key]["suggestions"].append("Reduce vdw_scaling to 0.8")

        return [
            {"error_pattern": k, **v}
            for k, v in sorted(patterns.items(), key=lambda x: x[1]["count"], reverse=True)
        ]

    def get_stats(self) -> Dict[str, Any]:
        """Get memory statistics."""
        total = len(self._experiments)
        completed = sum(1 for e in self._experiments.values() if e.get("status") == "completed")
        failed = sum(1 for e in self._experiments.values() if e.get("status") == "failed")
        avg_confidence = 0.0
        if total > 0:
            confs = [e.get("confidence", 0.0) for e in self._experiments.values()]
            avg_confidence = sum(c for c in confs if c > 0) / max(len([c for c in confs if c > 0]), 1)

        return {
            "total_experiments": total,
            "completed": completed,
            "failed": failed,
            "success_rate": round(completed / max(total, 1), 3),
            "avg_confidence": round(avg_confidence, 3),
        }


memory = ExperimentMemory()
