"""
CrewAI Experiment Memory - ChromaDB-backed storage for experiment tracking,
failure pattern recognition, and parameter tuning suggestions.
ChromaDB enables semantic similarity search over job history.
Falls back to JSON if ChromaDB is unavailable.
"""

import json
import logging
import uuid
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)

try:
    import chromadb
    from chromadb.config import Settings
    HAS_CHROMA = True
except ImportError:
    HAS_CHROMA = False
    logger.warning("chromadb not installed — using JSON fallback for experiment memory")


class ExperimentMemory:
    """
    Stores experiment metadata, results, and validation notes for learning.
    Uses ChromaDB for persistent, semantically-searchable job history.
    Falls back to JSON if ChromaDB is unavailable.
    """

    def __init__(self, persist_dir: str = "./data/crewai_memory"):
        self.persist_dir = Path(persist_dir)
        self.persist_dir.mkdir(parents=True, exist_ok=True)
        self._experiments: Dict[str, Dict[str, Any]] = {}
        self._chroma_client = None
        self._collection = None
        self._init_chroma()
        self._load()

    def _init_chroma(self):
        """Initialize ChromaDB persistent client."""
        if not HAS_CHROMA:
            return
        try:
            chroma_path = str(self.persist_dir / "chromadb")
            self._chroma_client = chromadb.PersistentClient(
                path=chroma_path,
                settings=Settings(anonymized_telemetry=False),
            )
            self._collection = self._chroma_client.get_or_create_collection(
                name="job_history",
                metadata={"hnsw:space": "cosine"},
            )
            logger.info(f"ChromaDB initialized at {chroma_path} — {self._collection.count()} jobs in history")
        except Exception as e:
            logger.warning(f"ChromaDB init failed ({e}) — using JSON fallback")
            self._chroma_client = None
            self._collection = None

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

    def _chroma_doc(self, exp_id: str, meta: Dict, result: Dict) -> str:
        """Build a natural-language document string for ChromaDB embedding."""
        scaffold = meta.get("scaffold", meta.get("smiles", "unknown"))
        target = meta.get("target", "unknown")
        exp_type = meta.get("type", "experiment")
        status = result.get("status", "unknown")
        score = result.get("best_score", result.get("binding_energy", result.get("energy", "")))
        ts = result.get("timestamp", datetime.now().isoformat())[:10]
        return (
            f"{exp_type} experiment on {ts}: ligand={scaffold}, target={target}, "
            f"status={status}, score={score}. "
            f"Notes: {' '.join(result.get('validation_notes', []))}"
        )

    def store(self, exp_id: str, meta: Dict[str, Any], result: Dict[str, Any]):
        """Store experiment result in JSON + ChromaDB."""
        entry = {
            "meta": meta,
            "result": result,
            "status": result.get("status", "unknown"),
            "confidence": result.get("confidence", 0.0),
            "validation_notes": result.get("validation_notes", []),
            "timestamp": result.get("timestamp", datetime.now().isoformat()),
        }
        self._experiments[exp_id] = entry
        self._save()

        # Index into ChromaDB for semantic search
        if self._collection is not None:
            try:
                doc = self._chroma_doc(exp_id, meta, result)
                chroma_meta = {
                    "exp_id": exp_id,
                    "type": str(meta.get("type", "experiment")),
                    "target": str(meta.get("target", "")),
                    "scaffold": str(meta.get("scaffold", meta.get("smiles", ""))),
                    "status": str(entry["status"]),
                    "timestamp": str(entry["timestamp"])[:19],
                }
                self._collection.upsert(
                    ids=[exp_id],
                    documents=[doc],
                    metadatas=[chroma_meta],
                )
            except Exception as e:
                logger.warning(f"ChromaDB store failed for {exp_id}: {e}")

    def get(self, exp_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve experiment by ID."""
        return self._experiments.get(exp_id)

    def query_similar(self, query: str, n: int = 5) -> List[Dict[str, Any]]:
        """
        Find similar experiments by semantic similarity (ChromaDB) or keyword fallback.
        """
        # ChromaDB semantic search
        if self._collection is not None and self._collection.count() > 0:
            try:
                results = self._collection.query(
                    query_texts=[query],
                    n_results=min(n, self._collection.count()),
                )
                ids = results.get("ids", [[]])[0]
                docs = results.get("documents", [[]])[0]
                metas = results.get("metadatas", [[]])[0]
                distances = results.get("distances", [[]])[0]
                out = []
                for eid, doc, m, dist in zip(ids, docs, metas, distances):
                    exp = self._experiments.get(eid, {})
                    out.append({
                        "exp_id": eid,
                        "similarity": round(1.0 - dist, 4),
                        "document": doc,
                        **exp,
                    })
                return out
            except Exception as e:
                logger.warning(f"ChromaDB query failed: {e} — falling back to keyword search")

        # Keyword fallback
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

    def get_job_history(self, job_type: str = None, n: int = 20) -> List[Dict[str, Any]]:
        """Return recent job history, optionally filtered by type (docking/md/qsar/admet)."""
        exps = list(self._experiments.items())
        exps.sort(key=lambda x: x[1].get("timestamp", ""), reverse=True)
        results = []
        for exp_id, exp in exps:
            if job_type and exp.get("meta", {}).get("type", "") != job_type:
                continue
            results.append({"exp_id": exp_id, **exp})
            if len(results) >= n:
                break
        return results

    def chroma_stats(self) -> Dict[str, Any]:
        """Return ChromaDB collection stats."""
        if self._collection is not None:
            try:
                return {
                    "backend": "chromadb",
                    "total_indexed": self._collection.count(),
                    "persist_dir": str(self.persist_dir / "chromadb"),
                }
            except Exception:
                pass
        return {"backend": "json_fallback", "total_indexed": len(self._experiments)}

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
