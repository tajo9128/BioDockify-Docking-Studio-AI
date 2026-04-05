"""
BioDockify Drug Discovery Flow - Master orchestration pipeline
Routes user requests to the appropriate crew and synthesizes results.
"""

from crew.crews import (
    create_virtual_screening_crew,
    create_lead_optimization_crew,
    create_admet_prediction_crew,
    create_docking_analysis_crew,
    create_drug_discovery_crew,
    create_md_simulation_crew,
)
from typing import Dict, Any, Optional


class DrugDiscoveryFlow:
    """
    Master Drug Discovery Flow - Routes requests to appropriate crews.
    Plain Python class (no CrewAI Flow decorators).
    """

    def route(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Route request to appropriate crew and return result."""
        data = {
            "query": request.get("query", ""),
            "smiles": request.get("smiles"),
            "receptor_pdb": request.get("receptor_pdb"),
            "target": request.get("target"),
            "compounds": request.get("compounds", []),
            "crew_name": request.get("crew"),
            "llm": request.get("llm"),
        }

        crew_name = self._resolve_crew_name(data)
        handler = getattr(self, f"_run_{crew_name}", None)
        if handler is None:
            return {"error": f"Unknown crew: {crew_name}", "status": "failed"}
        return handler(data)

    def _resolve_crew_name(self, data: Dict[str, Any]) -> str:
        crew_name = data.get("crew_name", "").lower()
        query = data.get("query", "").lower()

        if crew_name:
            return crew_name
        if "screen" in query or "library" in query:
            return "virtual_screening"
        if "optim" in query or "improve" in query or "mutate" in query:
            return "lead_optimization"
        if "admet" in query or "toxicity" in query or "absorption" in query:
            return "admet_prediction"
        if "md" in query or "molecular dynamics" in query or "simulation" in query or "trajectory" in query:
            return "md_simulation"
        if "dock" in query or "binding" in query:
            return "docking_analysis"
        return "drug_discovery"

    def _run_virtual_screening(self, data: Dict[str, Any]) -> Dict[str, Any]:
        llm = data.get("llm")
        crew = create_virtual_screening_crew(llm)
        inputs = {
            "receptor_pdb": data.get("receptor_pdb", ""),
            "compounds": data.get("compounds", []),
        }
        result = crew.kickoff(inputs=inputs)
        return {"crew": "virtual_screening", "result": result.raw, "status": "completed"}

    def _run_lead_optimization(self, data: Dict[str, Any]) -> Dict[str, Any]:
        llm = data.get("llm")
        crew = create_lead_optimization_crew(llm)
        inputs = {
            "smiles": data.get("smiles", ""),
            "receptor_pdb": data.get("receptor_pdb", ""),
        }
        result = crew.kickoff(inputs=inputs)
        return {"crew": "lead_optimization", "result": result.raw, "status": "completed"}

    def _run_admet_prediction(self, data: Dict[str, Any]) -> Dict[str, Any]:
        llm = data.get("llm")
        crew = create_admet_prediction_crew(llm)
        inputs = {"compounds": data.get("compounds", [])}
        result = crew.kickoff(inputs=inputs)
        return {"crew": "admet_prediction", "result": result.raw, "status": "completed"}

    def _run_docking_analysis(self, data: Dict[str, Any]) -> Dict[str, Any]:
        llm = data.get("llm")
        crew = create_docking_analysis_crew(llm)
        inputs = {
            "smiles": data.get("smiles", ""),
            "receptor_pdb": data.get("receptor_pdb", ""),
        }
        result = crew.kickoff(inputs=inputs)
        return {"crew": "docking_analysis", "result": result.raw, "status": "completed"}

    def _run_drug_discovery(self, data: Dict[str, Any]) -> Dict[str, Any]:
        llm = data.get("llm")
        crew = create_drug_discovery_crew(llm)
        inputs = {
            "smiles": data.get("smiles", ""),
            "receptor_pdb": data.get("receptor_pdb", ""),
            "target": data.get("target", ""),
            "compounds": data.get("compounds", []),
        }
        result = crew.kickoff(inputs=inputs)
        return {"crew": "drug_discovery", "result": result.raw, "status": "completed"}

    def _run_md_simulation(self, data: Dict[str, Any]) -> Dict[str, Any]:
        llm = data.get("llm")
        crew = create_md_simulation_crew(llm)
        inputs = {
            "pdb_content": data.get("receptor_pdb", ""),
            "target_family": data.get("target", "unknown"),
            "ligand_name": data.get("smiles", ""),
        }
        result = crew.kickoff(inputs=inputs)
        return {"crew": "md_simulation", "result": result.raw, "status": "completed"}
