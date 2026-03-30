"""
Docking tools for Nanobot Brain
"""

import httpx
import os
from typing import Any, Dict

from tools import BaseTool, ToolInput, ToolOutput


class DockingInput(ToolInput):
    receptor_path: str
    ligand_path: str
    exhaustiveness: int = 32
    num_modes: int = 10
    center_x: float = 0
    center_y: float = 0
    center_z: float = 0
    size_x: float = 20
    size_y: float = 20
    size_z: float = 20


class DockingTool(BaseTool):
    name = "dock_ligand"
    description = (
        "Run molecular docking between receptor and ligand using AutoDock Vina"
    )
    category = "docking"

    input_schema = {
        "type": "object",
        "properties": {
            "receptor_path": {
                "type": "string",
                "description": "Path to receptor PDBQT file",
            },
            "ligand_path": {
                "type": "string",
                "description": "Path to ligand PDBQT file",
            },
            "exhaustiveness": {
                "type": "integer",
                "description": "Docking exhaustiveness (default: 32)",
            },
            "num_modes": {
                "type": "integer",
                "description": "Number of binding modes (default: 10)",
            },
        },
        "required": ["receptor_path", "ligand_path"],
    }

    async def execute(self, input_data: DockingInput) -> ToolOutput:
        DOCKING_SERVICE = os.getenv(
            "DOCKING_SERVICE_URL", "http://docking-service:8002"
        )

        try:
            async with httpx.AsyncClient(timeout=300.0) as client:
                response = await client.post(
                    f"{DOCKING_SERVICE}/dock",
                    json={
                        "receptor_path": input_data.receptor_path,
                        "ligand_path": input_data.ligand_path,
                        "exhaustiveness": input_data.exhaustiveness,
                        "num_modes": input_data.num_modes,
                        "center_x": input_data.center_x,
                        "center_y": input_data.center_y,
                        "center_z": input_data.center_z,
                        "size_x": input_data.size_x,
                        "size_y": input_data.size_y,
                        "size_z": input_data.size_z,
                    },
                )
                response.raise_for_status()
                result = response.json()

                return ToolOutput(
                    success=True,
                    data={
                        "job_id": result.get("job_id"),
                        "best_energy": result.get("best_energy"),
                        "num_poses": result.get("num_poses", 0),
                        "status": "completed",
                    },
                )
        except Exception as e:
            return ToolOutput(success=False, error=str(e))


class BatchDockingInput(ToolInput):
    receptor_path: str
    ligand_library: str
    exhaustiveness: int = 32


class BatchDockingTool(BaseTool):
    name = "run_batch_docking"
    description = (
        "Run batch docking for multiple ligands from a library against a receptor"
    )
    category = "docking"

    input_schema = {
        "type": "object",
        "properties": {
            "receptor_path": {
                "type": "string",
                "description": "Path to receptor PDBQT file",
            },
            "ligand_library": {
                "type": "string",
                "description": "Path to ligand library (SDF/mol2)",
            },
            "exhaustiveness": {
                "type": "integer",
                "description": "Docking exhaustiveness",
            },
        },
        "required": ["receptor_path", "ligand_library"],
    }

    async def execute(self, input_data: BatchDockingInput) -> ToolOutput:
        DOCKING_SERVICE = os.getenv(
            "DOCKING_SERVICE_URL", "http://docking-service:8002"
        )

        try:
            async with httpx.AsyncClient(timeout=3600.0) as client:
                response = await client.post(
                    f"{DOCKING_SERVICE}/dock/async",
                    json={
                        "job_id": f"batch_{id(input_data)}",
                        "receptor_path": input_data.receptor_path,
                        "ligand_path": input_data.ligand_library,
                        "exhaustiveness": input_data.exhaustiveness,
                    },
                )
                response.raise_for_status()
                result = response.json()

                return ToolOutput(
                    success=True,
                    data={
                        "job_id": result.get("job_id"),
                        "num_ligands": result.get("num_ligands", 0),
                        "status": "queued",
                    },
                )
        except Exception as e:
            return ToolOutput(success=False, error=str(e))
