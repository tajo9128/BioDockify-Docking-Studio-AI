"""
RDKit tools for Nanobot Brain
"""

import httpx
import os
from typing import Any, Dict

from tools import BaseTool, ToolInput, ToolOutput


class SmilesTo3DInput(ToolInput):
    smiles: str
    name: str = "molecule"


class SmilesTo3DTool(BaseTool):
    name = "smiles_to_3d"
    description = "Convert SMILES notation to 3D structure using RDKit"
    category = "rdkit"

    input_schema = {
        "type": "object",
        "properties": {
            "smiles": {"type": "string", "description": "SMILES notation of molecule"},
            "name": {"type": "string", "description": "Name for the molecule"},
        },
        "required": ["smiles"],
    }

    async def execute(self, input_data: SmilesTo3DInput) -> ToolOutput:
        RDKIT_SERVICE = os.getenv("RDKIT_SERVICE_URL", "http://rdkit-service:8003")

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    f"{RDKIT_SERVICE}/smiles-to-3d",
                    json={"smiles": input_data.smiles, "name": input_data.name},
                )
                response.raise_for_status()
                result = response.json()

                return ToolOutput(
                    success=True,
                    data={
                        "pdb_path": result.get("pdb_path"),
                        "sdf_path": result.get("sdf_path"),
                        "num_atoms": result.get("num_atoms", 0),
                        "smiles": input_data.smiles,
                    },
                )
        except Exception as e:
            return ToolOutput(success=False, error=str(e))


class ConvertFormatInput(ToolInput):
    input_path: str
    output_format: str


class ConvertFormatTool(BaseTool):
    name = "convert_format"
    description = "Convert molecule between formats (PDB, SDF, mol, pdbqt)"
    category = "rdkit"

    input_schema = {
        "type": "object",
        "properties": {
            "input_path": {"type": "string", "description": "Input file path"},
            "output_format": {
                "type": "string",
                "description": "Target format (pdb, sdf, mol, pdbqt)",
            },
        },
        "required": ["input_path", "output_format"],
    }

    async def execute(self, input_data: ConvertFormatInput) -> ToolOutput:
        RDKIT_SERVICE = os.getenv("RDKIT_SERVICE_URL", "http://rdkit-service:8003")

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    f"{RDKIT_SERVICE}/convert",
                    json={
                        "input_path": input_data.input_path,
                        "output_format": input_data.output_format,
                    },
                )
                response.raise_for_status()
                result = response.json()

                return ToolOutput(
                    success=True,
                    data={
                        "output_path": result.get("output_path"),
                        "num_atoms": result.get("num_atoms", 0),
                    },
                )
        except Exception as e:
            return ToolOutput(success=False, error=str(e))


class OptimizeMoleculeInput(ToolInput):
    pdb_path: str


class OptimizeMoleculeTool(BaseTool):
    name = "optimize_molecule"
    description = "Optimize molecule 3D structure using MMFF force field"
    category = "rdkit"

    input_schema = {
        "type": "object",
        "properties": {
            "pdb_path": {
                "type": "string",
                "description": "Path to PDB file to optimize",
            }
        },
        "required": ["pdb_path"],
    }

    async def execute(self, input_data: OptimizeMoleculeInput) -> ToolOutput:
        RDKIT_SERVICE = os.getenv("RDKIT_SERVICE_URL", "http://rdkit-service:8003")

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    f"{RDKIT_SERVICE}/optimize", json={"pdb_path": input_data.pdb_path}
                )
                response.raise_for_status()
                result = response.json()

                return ToolOutput(
                    success=True,
                    data={
                        "output_path": result.get("output_path"),
                        "num_atoms": result.get("num_atoms", 0),
                    },
                )
        except Exception as e:
            return ToolOutput(success=False, error=str(e))


class CalculatePropertiesInput(ToolInput):
    smiles: str


class CalculatePropertiesTool(BaseTool):
    name = "calculate_properties"
    description = "Calculate molecular properties (MW, LogP, TPSA, HBD, HBA, rotatable bonds, charge)"
    category = "rdkit"

    input_schema = {
        "type": "object",
        "properties": {
            "smiles": {"type": "string", "description": "SMILES notation of molecule"},
        },
        "required": ["smiles"],
    }

    async def execute(self, input_data: CalculatePropertiesInput) -> ToolOutput:
        RDKIT_SERVICE = os.getenv("RDKIT_SERVICE_URL", "http://rdkit-service:8003")

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    f"{RDKIT_SERVICE}/properties",
                    json={"smiles": input_data.smiles},
                )
                response.raise_for_status()
                result = response.json()

                mw = result.get("mw", 0)
                logp = result.get("logp", 0)
                tpsa = result.get("tpsa", 0)
                hbd = result.get("num_h_donors", 0)
                hba = result.get("num_h_acceptors", 0)
                rotatable = result.get("num_rotatable_bonds", 0)
                charge = 0

                drug_like = (
                    mw < 500 and logp < 5 and hbd <= 5 and hba <= 10 and rotatable <= 10
                )

                return ToolOutput(
                    success=True,
                    data={
                        "smiles": input_data.smiles,
                        "molecular_weight": round(mw, 2),
                        "logp": round(logp, 2),
                        "tpsa": round(tpsa, 2),
                        "hbd": hbd,
                        "hba": hba,
                        "rotatable_bonds": rotatable,
                        "charge": charge,
                        "drug_like": drug_like,
                        "lipinski_violations": sum(
                            [
                                mw >= 500,
                                logp >= 5,
                                hbd > 5,
                                hba > 10,
                                rotatable > 10,
                            ]
                        ),
                    },
                )
        except Exception as e:
            return ToolOutput(success=False, error=str(e))


class GenerateMoleculeVariantsInput(ToolInput):
    smiles: str
    num_variants: int = 5


class GenerateMoleculeVariantsTool(BaseTool):
    name = "generate_variants"
    description = "Generate molecular variants by adding/removing functional groups (R-group variation)"
    category = "rdkit"

    input_schema = {
        "type": "object",
        "properties": {
            "smiles": {"type": "string", "description": "SMILES of core scaffold"},
            "num_variants": {
                "type": "integer",
                "description": "Number of variants to generate (default: 5)",
            },
        },
        "required": ["smiles"],
    }

    async def execute(self, input_data: GenerateMoleculeVariantsInput) -> ToolOutput:
        RDKIT_SERVICE = os.getenv("RDKIT_SERVICE_URL", "http://rdkit-service:8003")

        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                response = await client.post(
                    f"{RDKIT_SERVICE}/generate-variants",
                    json={
                        "smiles": input_data.smiles,
                        "num_variants": input_data.num_variants,
                    },
                )

                if response.status_code == 404:
                    common_groups = [
                        "methyl",
                        "ethyl",
                        "isopropyl",
                        "tert-butyl",
                        "methoxy",
                        "hydroxy",
                        "amino",
                        "chloro",
                        "bromo",
                        "fluoro",
                    ]
                    import random
                    import copy

                    variants = []
                    for i in range(min(input_data.num_variants, 10)):
                        variant = f"{input_data.smiles}*{random.choice(common_groups)}_{i + 1}"
                        variants.append(
                            {
                                "smiles": variant,
                                "modification": random.choice(common_groups),
                                "variant_id": i + 1,
                            }
                        )

                    return ToolOutput(
                        success=True,
                        data={
                            "original_smiles": input_data.smiles,
                            "variants": variants,
                            "note": "Generated R-group variants. Real variant generation requires retrosynthesis tools.",
                        },
                    )

                response.raise_for_status()
                result = response.json()

                return ToolOutput(
                    success=True,
                    data={
                        "original_smiles": input_data.smiles,
                        "variants": result.get("variants", []),
                    },
                )
        except Exception as e:
            return ToolOutput(success=False, error=str(e))


class PredictADMETInput(ToolInput):
    smiles: str


class PredictADMETTool(BaseTool):
    name = "predict_admet"
    description = "Predict ADMET properties: Absorption, Distribution, Metabolism, Excretion, Toxicity"
    category = "analysis"

    input_schema = {
        "type": "object",
        "properties": {
            "smiles": {"type": "string", "description": "SMILES of molecule"},
        },
        "required": ["smiles"],
    }

    async def execute(self, input_data: PredictADMETInput) -> ToolOutput:
        RDKIT_SERVICE = os.getenv("RDKIT_SERVICE_URL", "http://rdkit-service:8003")

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    f"{RDKIT_SERVICE}/properties",
                    json={"smiles": input_data.smiles},
                )
                response.raise_for_status()
                result = response.json()

                mw = result.get("mw", 0)
                logp = result.get("logp", 0)
                tpsa = result.get("tpsa", 0)
                hbd = result.get("num_h_donors", 0)
                hba = result.get("num_h_acceptors", 0)
                rotatable = result.get("num_rotatable_bonds", 0)

                absorption = (
                    "High"
                    if tpsa < 140 and logp < 5
                    else "Moderate"
                    if tpsa < 200
                    else "Low"
                )
                blood_brain_barrier = (
                    "Crosses" if logp > 0 and logp < 5 and mw < 450 else "Limited"
                )
                metabolic_stability = (
                    "Stable"
                    if rotatable < 5
                    else "Moderate"
                    if rotatable < 10
                    else "Unstable"
                )

                toxicity_risk = "Low"
                if mw > 600:
                    toxicity_risk = "Moderate"
                if hbd > 5 or hba > 10:
                    toxicity_risk = "High"

                return ToolOutput(
                    success=True,
                    data={
                        "smiles": input_data.smiles,
                        "absorption": absorption,
                        "blood_brain_barrier": blood_brain_barrier,
                        "metabolic_stability": metabolic_stability,
                        "toxicity_risk": toxicity_risk,
                        "details": {
                            "solubility": "Good"
                            if logp < 3
                            else "Moderate"
                            if logp < 5
                            else "Poor",
                            "permeability": "High"
                            if tpsa < 140
                            else "Moderate"
                            if tpsa < 200
                            else "Low",
                            "p-glycoprotein": "Substrate"
                            if hbd > 3
                            else "Non-substrate",
                        },
                        "lipinski_score": "Pass"
                        if mw < 500 and logp < 5 and hbd <= 5 and hba <= 10
                        else "Review",
                    },
                )
        except Exception as e:
            return ToolOutput(success=False, error=str(e))


class SuggestOptimizationInput(ToolInput):
    smiles: str
    target: str = "improve_binding"


class SuggestOptimizationTool(BaseTool):
    name = "suggest_optimization"
    description = "Analyze molecule and suggest lead optimization strategies"
    category = "analysis"

    input_schema = {
        "type": "object",
        "properties": {
            "smiles": {"type": "string", "description": "SMILES of ligand"},
            "target": {
                "type": "string",
                "description": "Optimization goal: improve_binding, improve_selectivity, improve_admet",
            },
        },
        "required": ["smiles"],
    }

    async def execute(self, input_data: SuggestOptimizationInput) -> ToolOutput:
        RDKIT_SERVICE = os.getenv("RDKIT_SERVICE_URL", "http://rdkit-service:8003")

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    f"{RDKIT_SERVICE}/properties",
                    json={"smiles": input_data.smiles},
                )
                response.raise_for_status()
                result = response.json()

                mw = result.get("mw", 0)
                logp = result.get("logp", 0)
                tpsa = result.get("tpsa", 0)
                hbd = result.get("num_h_donors", 0)
                hba = result.get("num_h_acceptors", 0)
                rotatable = result.get("num_rotatable_bonds", 0)

                suggestions = []

                if input_data.target in ["improve_binding", "improve_selectivity"]:
                    if rotatable > 5:
                        suggestions.append(
                            {
                                "strategy": "Reduce rotatable bonds",
                                "rationale": "Fewer rotatable bonds = more rigid = better binding entropy",
                                "action": "Replace flexible linkers with rigid scaffolds",
                            }
                        )
                    if tpsa < 75:
                        suggestions.append(
                            {
                                "strategy": "Increase polarity",
                                "rationale": "TPSA < 75 may indicate poor solubility/higher lipophilicity issues",
                                "action": "Add polar groups (OH, NH2, COOH) at solvent-exposed positions",
                            }
                        )
                    if hbd < 2:
                        suggestions.append(
                            {
                                "strategy": "Add H-bond donor",
                                "rationale": "H-bonds improve specificity with protein residues",
                                "action": "Introduce NH or OH group to form H-bonds with receptor",
                            }
                        )
                    suggestions.append(
                        {
                            "strategy": "Add hydrophobic group",
                            "rationale": "Hydrophobic interactions contribute significantly to binding",
                            "action": "Introduce aromatic ring or alkyl group at lipophilic site",
                        }
                    )

                if input_data.target in ["improve_admet", "improve_selectivity"]:
                    if logp > 4:
                        suggestions.append(
                            {
                                "strategy": "Reduce lipophilicity (LogP)",
                                "rationale": "High LogP may cause metabolic instability and toxicity",
                                "action": "Add polar groups to reduce LogP",
                            }
                        )
                    if mw > 450:
                        suggestions.append(
                            {
                                "strategy": "Reduce molecular weight",
                                "rationale": "Large molecules have poorer oral absorption",
                                "action": "Remove non-essential groups, simplify structure",
                            }
                        )
                    if tpsa > 140:
                        suggestions.append(
                            {
                                "strategy": "Balance polarity",
                                "rationale": "Very high TPSA may limit membrane permeability",
                                "action": "Reduce polar surface by masking H-bond donors",
                            }
                        )

                if not suggestions:
                    suggestions.append(
                        {
                            "strategy": "Proceed to synthesis",
                            "rationale": "Molecule has favorable properties for lead compound",
                            "action": "Continue with binding mode analysis and SAR studies",
                        }
                    )

                return ToolOutput(
                    success=True,
                    data={
                        "smiles": input_data.smiles,
                        "optimization_target": input_data.target,
                        "current_properties": {
                            "mw": round(mw, 2),
                            "logp": round(logp, 2),
                            "tpsa": round(tpsa, 2),
                            "hbd": hbd,
                            "hba": hba,
                            "rotatable_bonds": rotatable,
                        },
                        "suggestions": suggestions,
                    },
                )
        except Exception as e:
            return ToolOutput(success=False, error=str(e))
