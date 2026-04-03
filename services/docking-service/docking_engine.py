"""
Docking Engine - AutoDock Vina execution
"""

import os
import logging
import subprocess
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)


def check_vina() -> bool:
    try:
        from vina import Vina

        return True
    except ImportError:
        return False


def check_gnina() -> bool:
    try:
        result = subprocess.run(
            ["gnina", "--version"], capture_output=True, text=True, timeout=10
        )
        return result.returncode == 0
    except (ImportError, FileNotFoundError, subprocess.TimeoutExpired):
        return False


def convert_pdb_to_pdbqt(
    input_path: str, output_path: str, is_ligand: bool = False
) -> bool:
    try:
        from rdkit import Chem
        from meeko import PDBQTMoleculeWriter, MoleculePreparation

        mol = Chem.MolFromPDBFile(input_path, removeHs=False)
        if mol is None:
            logger.error(f"Failed to read PDB file: {input_path}")
            return False

        if is_ligand:
            preparator = MoleculePreparation()
            mol_setups = preparator.prepare(mol)
            if mol_setups is None or len(mol_setups) == 0:
                logger.error("MeeKo preparation failed for ligand")
                return False
            setup = mol_setups[0]

            with open(output_path, "w") as f:
                writer = PDBQTMoleculeWriter(f)
                writer.write([setup])
                writer.close()
        else:
            with open(input_path, "r") as inf, open(output_path, "w") as outf:
                for line in inf:
                    if line.startswith(("ATOM", "HETATM")):
                        if len(line) < 66:
                            line = line.rstrip() + " " * (66 - len(line))
                        outf.write(line)

        logger.info(f"Converted {input_path} to {output_path}")
        return True

    except ImportError as e:
        logger.warning(f"Conversion libraries not available: {e}")
        return False
    except Exception as e:
        logger.error(f"Conversion error: {e}")
        return False


def prepare_receptor_file(
    receptor_path: str, output_dir: str = "/tmp"
) -> Optional[str]:
    _, ext = os.path.splitext(receptor_path)
    ext = ext.lower()

    if ext == ".pdbqt":
        return receptor_path

    if ext == ".pdb":
        output_path = os.path.join(
            output_dir, f"prepared_receptor_{os.path.basename(receptor_path)}.pdbqt"
        )
        if convert_pdb_to_pdbqt(receptor_path, output_path, is_ligand=False):
            return output_path
        return receptor_path

    logger.error(f"Unsupported receptor format: {ext}")
    return None


def prepare_ligand_file(ligand_path: str, output_dir: str = "/tmp") -> Optional[str]:
    _, ext = os.path.splitext(ligand_path)
    ext = ext.lower()

    if ext == ".pdbqt":
        return ligand_path

    if ext in [".pdb", ".sdf", ".mol2"]:
        output_path = os.path.join(
            output_dir, f"prepared_ligand_{os.path.basename(ligand_path)}.pdbqt"
        )
        if convert_pdb_to_pdbqt(ligand_path, output_path, is_ligand=True):
            return output_path
        return None

    logger.error(f"Unsupported ligand format: {ext}")
    return None


def run_vina_docking(
    receptor_path: str,
    ligand_path: str,
    center_x: float = 0.0,
    center_y: float = 0.0,
    center_z: float = 0.0,
    size_x: float = 20.0,
    size_y: float = 20.0,
    size_z: float = 20.0,
    exhaustiveness: int = 8,
    num_modes: int = 9,
    output_dir: str = "/tmp",
) -> Dict[str, Any]:
    try:
        from vina import Vina
    except ImportError:
        return {
            "success": False,
            "error": "Vina Python package not installed",
            "poses": [],
        }

    os.makedirs(output_dir, exist_ok=True)

    receptor_file = prepare_receptor_file(receptor_path, output_dir)
    if receptor_file is None:
        return {"success": False, "error": "Failed to prepare receptor", "poses": []}

    ligand_file = prepare_ligand_file(ligand_path, output_dir)
    if ligand_file is None:
        return {"success": False, "error": "Failed to prepare ligand", "poses": []}

    try:
        logger.info("Initializing Vina...")
        v = Vina(sf_name="vina")

        v.set_receptor(receptor_file)
        v.set_ligand_from_file(ligand_file)
        v.compute_vina_maps(
            center=[center_x, center_y, center_z], box_size=[size_x, size_y, size_z]
        )
        v.dock(exhaustiveness=exhaustiveness, n_poses=num_modes)

        energies = v.energies
        poses = v.poses(n_poses=num_modes, coordinates_only=False)

        results = []
        for i, pose in enumerate(poses):
            energy = float(energies[i][0]) if i < len(energies) else 0.0
            results.append(
                {
                    "pose_id": i + 1,
                    "vina_score": energy,
                    "gnina_score": None,
                    "rf_score": None,
                }
            )

        output_file = os.path.join(output_dir, "vina_results.pdbqt")
        try:
            v.write_pose(output_file, overwrite=True)
        except Exception:
            pass

        return {
            "success": True,
            "engine": "vina",
            "poses": results,
            "output_file": output_file if os.path.exists(output_file) else None,
        }

    except Exception as e:
        logger.error(f"Vina docking error: {e}")
        return {"success": False, "error": str(e), "poses": []}


def run_gnina_docking(
    receptor_path: str,
    ligand_path: str,
    center_x: float = 0.0,
    center_y: float = 0.0,
    center_z: float = 0.0,
    size_x: float = 20.0,
    size_y: float = 20.0,
    size_z: float = 20.0,
    exhaustiveness: int = 8,
    num_modes: int = 9,
    output_dir: str = "/tmp",
) -> Dict[str, Any]:
    if not check_gnina():
        return {"success": False, "error": "GNINA not installed", "poses": []}

    os.makedirs(output_dir, exist_ok=True)

    receptor_file = prepare_receptor_file(receptor_path, output_dir)
    if receptor_file is None:
        return {"success": False, "error": "Failed to prepare receptor", "poses": []}

    ligand_file = prepare_ligand_file(ligand_path, output_dir)
    if ligand_file is None:
        return {"success": False, "error": "Failed to prepare ligand", "poses": []}

    output_file = os.path.join(output_dir, "gnina_results.pdbqt")
    log_file = os.path.join(output_dir, "gnina_log.txt")

    cmd = [
        "gnina",
        "--receptor",
        receptor_file,
        "--ligand",
        ligand_file,
        "--center_x",
        str(center_x),
        "--center_y",
        str(center_y),
        "--center_z",
        str(center_z),
        "--size_x",
        str(size_x),
        "--size_y",
        str(size_y),
        "--size_z",
        str(size_z),
        "--exhaustiveness",
        str(exhaustiveness),
        "--num_modes",
        str(num_modes),
        "--out",
        output_file,
        "--log",
        log_file,
        "--cpu",
        str(os.cpu_count() or 1),
    ]

    logger.info(f"Running GNINA: {' '.join(cmd[:6])}...")

    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=600)

        if result.returncode != 0:
            logger.error(f"GNINA failed: {result.stderr}")
            return {"success": False, "error": result.stderr, "poses": []}

        results = []
        if os.path.exists(log_file):
            with open(log_file, "r") as f:
                log_content = f.read()
            for line in log_content.split("\n"):
                if line.strip().startswith(
                    ("1", "2", "3", "4", "5", "6", "7", "8", "9")
                ):
                    parts = line.split()
                    if len(parts) >= 3:
                        try:
                            pose_id = int(parts[0])
                            vina_score = float(parts[1]) if parts[1] != "?" else 0.0
                            cnn_score = None
                            for p in parts[2:]:
                                try:
                                    cnn_score = float(p)
                                    break
                                except ValueError:
                                    continue
                            results.append(
                                {
                                    "pose_id": pose_id,
                                    "vina_score": vina_score,
                                    "gnina_score": cnn_score,
                                    "rf_score": None,
                                }
                            )
                        except (ValueError, IndexError):
                            continue

        if not results:
            return {
                "success": False,
                "error": "Failed to parse GNINA output",
                "poses": [],
            }

        return {
            "success": True,
            "engine": "gnina",
            "poses": results,
            "output_file": output_file,
        }

    except subprocess.TimeoutExpired:
        return {
            "success": False,
            "error": "GNINA timeout (10 min exceeded)",
            "poses": [],
        }
    except Exception as e:
        logger.error(f"GNINA error: {e}")
        return {"success": False, "error": str(e), "poses": []}


def run_docking(
    receptor_path: str,
    ligand_path: str,
    engine: str = "vina",
    center_x: float = 0.0,
    center_y: float = 0.0,
    center_z: float = 0.0,
    size_x: float = 20.0,
    size_y: float = 20.0,
    size_z: float = 20.0,
    exhaustiveness: int = 8,
    num_modes: int = 9,
    output_dir: str = "/tmp",
) -> Dict[str, Any]:
    engine = engine.lower()

    if engine == "vina":
        return run_vina_docking(
            receptor_path,
            ligand_path,
            center_x,
            center_y,
            center_z,
            size_x,
            size_y,
            size_z,
            exhaustiveness,
            num_modes,
            output_dir,
        )
    elif engine == "gnina":
        return run_gnina_docking(
            receptor_path,
            ligand_path,
            center_x,
            center_y,
            center_z,
            size_x,
            size_y,
            size_z,
            exhaustiveness,
            num_modes,
            output_dir,
        )
    elif engine == "consensus":
        vina_result = run_vina_docking(
            receptor_path,
            ligand_path,
            center_x,
            center_y,
            center_z,
            size_x,
            size_y,
            size_z,
            exhaustiveness,
            num_modes,
            output_dir,
        )
        gnina_result = run_gnina_docking(
            receptor_path,
            ligand_path,
            center_x,
            center_y,
            center_z,
            size_x,
            size_y,
            size_z,
            exhaustiveness,
            num_modes,
            output_dir,
        )

        vina_poses = vina_result.get("poses", [])
        gnina_poses = gnina_result.get("poses", [])

        consensus_results = []
        for i, (vp, gp) in enumerate(zip(vina_poses, gnina_poses)):
            vina_score = vp.get("vina_score", 0)
            gnina_score = gp.get("gnina_score", 0)
            if gnina_score is not None:
                consensus_score = (vina_score + gnina_score) / 2
            else:
                consensus_score = vina_score
            consensus_results.append(
                {
                    "pose_id": i + 1,
                    "vina_score": vina_score,
                    "gnina_score": gnina_score,
                    "consensus_score": consensus_score,
                }
            )

        consensus_results.sort(key=lambda x: x["consensus_score"])

        return {
            "success": True,
            "engine": "consensus",
            "results": consensus_results,
            "vina_results": vina_result,
            "gnina_results": gnina_result,
        }

    return {
        "success": False,
        "error": f"Unknown engine: {engine}. Use: vina, gnina, consensus",
        "results": [],
    }


def run_consensus(receptor, ligand, center, size, exhaustiveness, num_modes):
    vina_result = run_vina_docking(
        receptor,
        ligand,
        center[0],
        center[1],
        center[2],
        size[0],
        size[1],
        size[2],
        exhaustiveness,
        num_modes,
    )

    if not check_gnina():
        logger.warning("GNINA not installed, running Vina-only consensus")
        for pose in vina_result.get("poses", []):
            pose["consensus_score"] = pose.get("vina_score")
        vina_result["gnina_available"] = False
        vina_result["consensus_note"] = (
            "GNINA not installed - consensus uses Vina scores only"
        )
        return vina_result

    gnina_result = run_gnina_docking(
        receptor,
        ligand,
        center[0],
        center[1],
        center[2],
        size[0],
        size[1],
        size[2],
        exhaustiveness,
        num_modes,
    )

    if not gnina_result.get("success"):
        logger.warning(f"GNINA failed: {gnina_result.get('error')}, using Vina only")
        for pose in vina_result.get("poses", []):
            pose["consensus_score"] = pose.get("vina_score")
        vina_result["gnina_available"] = False
        vina_result["consensus_note"] = (
            f"GNINA failed - {gnina_result.get('error', 'unknown error')}"
        )
        return vina_result

    consensus_poses = []
    vina_poses = vina_result.get("poses", [])
    gnina_poses = gnina_result.get("poses", [])

    for i, (vina_pose, gnina_pose) in enumerate(zip(vina_poses, gnina_poses)):
        vina_score = vina_pose.get("vina_score", 0)
        gnina_score = gnina_pose.get("gnina_score", vina_score)
        consensus_score = (vina_score + gnina_score) / 2

        pose = vina_pose.copy()
        pose["gnina_score"] = gnina_score
        pose["consensus_score"] = consensus_score
        pose["rf_score"] = gnina_pose.get("rf_score")
        consensus_poses.append(pose)

    return {
        "success": True,
        "poses": consensus_poses,
        "gnina_available": True,
        "consensus_note": "Scores averaged from Vina and GNINA",
    }


if __name__ == "__main__":
    print(f"Vina available: {check_vina()}")
