"""
Chemistry tools for CrewAI - Wraps RDKit endpoints
"""
import httpx
from typing import Optional
from pydantic import BaseModel, Field

BACKEND_URL = "http://localhost:8000"


class PropertiesInput(BaseModel):
    """Input for property calculation"""
    smiles: Optional[str] = Field(default=None, description="SMILES string")
    content: Optional[str] = Field(default=None, description="File content (PDB/SDF/MOL2)")


class SMILES3DInput(BaseModel):
    """Input for SMILES to 3D conversion"""
    smiles: str = Field(description="SMILES string to convert")


class ConvertFormatInput(BaseModel):
    """Input for format conversion"""
    content: str = Field(description="Input molecule content")
    input_format: str = Field(default="pdb", description="Input format")
    output_format: str = Field(default="pdbqt", description="Output format")


class OptimizeInput(BaseModel):
    """Input for optimization"""
    smiles: Optional[str] = Field(default=None, description="SMILES string")
    content: Optional[str] = Field(default=None, description="Molecule content")
    force_field: str = Field(default="MMFF", description="Force field (MMFF or UFF)")


def calculate_properties(input: PropertiesInput) -> str:
    """
    Calculate molecular properties (MW, LogP, TPSA, HBD, HBA, drug-likeness).
    
    Use this tool to analyze a molecule's drug-like properties and Lipinski compliance.
    
    Args:
        smiles: SMILES string of the molecule
        content: Raw file content (PDB/SDF/MOL2) if SMILES not available
    
    Returns:
        JSON string with calculated properties
    """
    try:
        with httpx.Client(timeout=30.0) as client:
            response = client.post(
                f"{BACKEND_URL}/api/chem/properties",
                json={"smiles": input.smiles, "content": input.content}
            )
            return response.text
    except Exception as e:
        return f"Error calculating properties: {str(e)}"


def smiles_to_3d(input: SMILES3DInput) -> str:
    """
    Convert a SMILES string to a 3D molecular structure.
    
    Use this tool to generate 3D coordinates for a molecule.
    
    Args:
        smiles: SMILES string to convert
    
    Returns:
        PDB content with 3D coordinates
    """
    try:
        with httpx.Client(timeout=30.0) as client:
            response = client.post(
                f"{BACKEND_URL}/api/chem/smiles-to-3d",
                json={"smiles": input.smiles}
            )
            return response.text
    except Exception as e:
        return f"Error converting to 3D: {str(e)}"


def convert_format(input: ConvertFormatInput) -> str:
    """
    Convert molecular file formats (PDB, SDF, MOL2, PDBQT).
    
    Use this tool to convert between different molecular file formats.
    
    Args:
        content: Input molecule content
        input_format: Source format (pdb, sdf, mol2)
        output_format: Target format (pdbqt, pdb, sdf, mol2)
    
    Returns:
        Converted molecule content
    """
    try:
        with httpx.Client(timeout=30.0) as client:
            response = client.post(
                f"{BACKEND_URL}/api/rdkit/prepare_ligand",
                json={"content": input.content, "output_format": input.output_format}
            )
            return response.text
    except Exception as e:
        return f"Error converting format: {str(e)}"


def optimize_molecule(input: OptimizeInput) -> str:
    """
    Optimize molecular geometry using force field minimization.
    
    Use this tool to find the lowest energy conformation.
    
    Args:
        smiles: SMILES string to optimize
        content: Molecule content if SMILES not available
        force_field: Force field to use (MMFF or UFF)
    
    Returns:
        Optimized molecule content with minimized energy
    """
    try:
        with httpx.Client(timeout=60.0) as client:
            response = client.post(
                f"{BACKEND_URL}/api/chem/to-3d",
                json={"smiles": input.smiles}
            )
            return response.text
    except Exception as e:
        return f"Error optimizing molecule: {str(e)}"
