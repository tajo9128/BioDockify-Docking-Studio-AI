"""
Molecular Dynamics Tools for CrewAI Agent MD
Wraps backend MD endpoints for CrewAI tool use.
"""

import logging
import requests
from crewai.tools import tool

logger = logging.getLogger(__name__)

BASE_URL = "http://localhost:8000"


@tool("run_md_simulation")
def run_md_simulation(
    pdb_content: str,
    steps: int = 50000,
    temperature: float = 300.0,
    solvent_model: str = "tip3p",
    frame_interval: int = 500,
) -> dict:
    """
    Run a molecular dynamics simulation using OpenMM.
    Args:
        pdb_content: PDB file content of the protein-ligand complex
        steps: Number of MD steps (default 50000 = 100 ps at 2 fs timestep)
        temperature: Simulation temperature in Kelvin (default 300 K)
        solvent_model: Water model - tip3p or implicit (default tip3p)
        frame_interval: Save a frame every N steps (default 500)
    Returns:
        dict with trajectory data, RMSD values, energy, and stability assessment
    """
    try:
        resp = requests.post(
            f"{BASE_URL}/api/md/run",
            json={
                "pdb_content": pdb_content,
                "steps": steps,
                "temperature": temperature,
                "solvent_model": solvent_model,
                "frame_interval": frame_interval,
            },
            timeout=7200,
        )
        resp.raise_for_status()
        return resp.json()
    except Exception as e:
        logger.error(f"MD simulation failed: {e}")
        return {"error": str(e), "status": "failed"}


@tool("analyze_md_trajectory")
def analyze_md_trajectory(job_id: str) -> dict:
    """
    Analyze a completed MD trajectory: RMSD, RMSF, energy, stability.
    Args:
        job_id: The MD job ID returned from run_md_simulation
    Returns:
        dict with RMSD time series, average energy, stability flag, key frame indices
    """
    try:
        resp = requests.get(f"{BASE_URL}/api/md/results/{job_id}", timeout=60)
        resp.raise_for_status()
        return resp.json()
    except Exception as e:
        return {"error": str(e), "status": "failed"}


@tool("interpret_rmsd")
def interpret_rmsd(rmsd_values: list, threshold_stable: float = 2.0) -> dict:
    """
    Interpret RMSD values from an MD trajectory to assess pose stability.
    Args:
        rmsd_values: List of RMSD values (Angstroms) over simulation time
        threshold_stable: RMSD threshold for stability (default 2.0 Å)
    Returns:
        dict with stability assessment, trend, recommendations
    """
    if not rmsd_values:
        return {"error": "No RMSD data provided"}

    final_rmsd = rmsd_values[-1]
    max_rmsd = max(rmsd_values)
    avg_rmsd = sum(rmsd_values) / len(rmsd_values)
    equilibration_point = next(
        (i for i, r in enumerate(rmsd_values) if r < threshold_stable * 1.2),
        len(rmsd_values),
    )

    stable = final_rmsd < threshold_stable and max_rmsd < threshold_stable * 1.5

    if stable:
        assessment = "STABLE — The ligand maintains its binding pose throughout the simulation."
        recommendations = [
            "Extract representative frames for interaction analysis.",
            "Run longer simulation (5-10x current) to confirm stability.",
            "Analyze key hydrogen bonds and hydrophobic contacts.",
        ]
    elif final_rmsd < threshold_stable * 2:
        assessment = "BORDERLINE — Minor conformational fluctuations observed."
        recommendations = [
            "Extend equilibration phase before production run.",
            "Check protonation states of key residues at binding site.",
            "Consider restraining backbone atoms during equilibration.",
        ]
    else:
        assessment = "UNSTABLE — Ligand has drifted significantly from initial pose."
        recommendations = [
            "Verify docking pose quality before MD — check for steric clashes.",
            "Increase equilibration time and use position restraints initially.",
            "Check charge state and force field parameters for the ligand.",
            "Consider alternative binding poses from docking results.",
        ]

    return {
        "stable": stable,
        "assessment": assessment,
        "final_rmsd": round(final_rmsd, 3),
        "max_rmsd": round(max_rmsd, 3),
        "avg_rmsd": round(avg_rmsd, 3),
        "equilibration_step": equilibration_point,
        "recommendations": recommendations,
    }


@tool("suggest_md_parameters")
def suggest_md_parameters(target_family: str, ligand_mw: float = 0.0) -> dict:
    """
    Suggest optimal MD simulation parameters based on target protein family.
    Args:
        target_family: Protein family (kinase/gpcr/protease/nuclear_receptor/ion_channel/enzyme)
        ligand_mw: Molecular weight of the ligand in Da (optional, helps tune box size)
    Returns:
        dict with recommended steps, temperature, solvent model, box padding
    """
    family_params = {
        "kinase": {
            "steps": 100000, "temperature": 300.0, "solvent_model": "tip3p",
            "box_padding": 12.0, "note": "Kinases are flexible — use longer simulation for hinge region sampling.",
        },
        "gpcr": {
            "steps": 200000, "temperature": 310.0, "solvent_model": "tip3p",
            "box_padding": 15.0, "note": "GPCRs need membrane environment ideally — use implicit solvent as fallback.",
        },
        "protease": {
            "steps": 75000, "temperature": 300.0, "solvent_model": "tip3p",
            "box_padding": 10.0, "note": "Proteases are generally rigid — shorter simulation sufficient.",
        },
        "nuclear_receptor": {
            "steps": 150000, "temperature": 300.0, "solvent_model": "tip3p",
            "box_padding": 12.0, "note": "Check helix H12 movement — key for agonist/antagonist classification.",
        },
        "ion_channel": {
            "steps": 250000, "temperature": 310.0, "solvent_model": "tip3p",
            "box_padding": 18.0, "note": "Ion channels require explicit membrane — use implicit solvent as fallback.",
        },
        "enzyme": {
            "steps": 80000, "temperature": 300.0, "solvent_model": "tip3p",
            "box_padding": 10.0, "note": "Focus on active site loop dynamics during simulation.",
        },
    }
    params = family_params.get(
        target_family.lower(),
        {"steps": 50000, "temperature": 300.0, "solvent_model": "tip3p",
         "box_padding": 12.0, "note": "Using default parameters — classify target for optimized settings."},
    )
    if ligand_mw > 500:
        params["steps"] = int(params["steps"] * 1.5)
        params["note"] += " Large ligand — extended sampling recommended."
    return params
