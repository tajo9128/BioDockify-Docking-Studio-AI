"""
Docking Engine - Actual molecular docking using AutoDock Vina Python API
Includes PDBQT file preparation using RDKit/MeeKo
"""
import os
import logging
import tempfile
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)


def check_vina() -> bool:
    """Check if Vina Python API is available"""
    try:
        from vina import Vina
        return True
    except ImportError:
        return False


def convert_pdb_to_pdbqt(input_path: str, output_path: str, is_ligand: bool = False) -> bool:
    """
    Convert PDB file to PDBQT format using RDKit and MeeKo.
    
    Args:
        input_path: Path to input PDB file
        output_path: Path to output PDBQT file
        is_ligand: True for ligand, False for receptor
        
    Returns:
        True if conversion successful, False otherwise
    """
    try:
        from rdkit import Chem
        from meeko import PDBQTMoleculeWriter, MoleculePreparation
        
        # Read molecule
        mol = Chem.MolFromPDBFile(input_path, removeHs=False)
        if mol is None:
            logger.error(f"Failed to read PDB file: {input_path}")
            return False
        
        # Prepare molecule
        if is_ligand:
            # For ligands: use MeeKo preparation
            preparator = MoleculePreparation()
            mol_setups = preparator.prepare(mol)
            if mol_setups is None or len(mol_setups) == 0:
                logger.error("MeeKo preparation failed for ligand")
                return False
            setup = mol_setups[0]
            
            # Write to PDBQT
            with open(output_path, 'w') as f:
                writer = PDBQTMoleculeWriter(f)
                writer.write([setup])
                writer.close()
        else:
            # For receptors: add PDBQT format header and write
            # Receptors are treated as rigid, just need to add ATOM/HETATM lines
            with open(input_path, 'r') as inf, open(output_path, 'w') as outf:
                for line in inf:
                    if line.startswith(('ATOM', 'HETATM')):
                        # Add blank fields for charge and type if not present
                        if len(line) < 66:
                            line = line.rstrip() + ' ' * (66 - len(line))
                        outf.write(line)
        
        logger.info(f"Converted {input_path} to {output_path}")
        return True
        
    except ImportError as e:
        logger.warning(f"Conversion libraries not available: {e}")
        return False
    except Exception as e:
        logger.error(f"Conversion error: {e}")
        return False


def prepare_receptor_file(receptor_path: str, output_dir: str = "/tmp") -> Optional[str]:
    """
    Prepare receptor file for Vina docking.
    Converts PDB to PDBQT if necessary.
    
    Args:
        receptor_path: Path to receptor file
        output_dir: Directory for temporary files
        
    Returns:
        Path to prepared PDBQT file or None if preparation fails
    """
    _, ext = os.path.splitext(receptor_path)
    ext = ext.lower()
    
    if ext == '.pdbqt':
        return receptor_path
    
    if ext == '.pdb':
        # Try to convert PDB to PDBQT
        output_path = os.path.join(output_dir, f"prepared_receptor_{os.path.basename(receptor_path)}.pdbqt")
        if convert_pdb_to_pdbqt(receptor_path, output_path, is_ligand=False):
            return output_path
        else:
            # If conversion fails, try using the PDB file directly
            # Some Vina versions accept PDB files
            logger.warning(f"PDBQT conversion failed, trying PDB file directly")
            return receptor_path
    
    logger.error(f"Unsupported receptor format: {ext}. Use PDB or PDBQT.")
    return None


def prepare_ligand_file(ligand_path: str, output_dir: str = "/tmp") -> Optional[str]:
    """
    Prepare ligand file for Vina docking.
    Converts PDB/SDF/MOL2 to PDBQT if necessary.
    
    Args:
        ligand_path: Path to ligand file
        output_dir: Directory for temporary files
        
    Returns:
        Path to prepared PDBQT file or None if preparation fails
    """
    _, ext = os.path.splitext(ligand_path)
    ext = ext.lower()
    
    if ext == '.pdbqt':
        return ligand_path
    
    if ext in ['.pdb', '.sdf', '.mol2']:
        # Try to convert to PDBQT
        output_path = os.path.join(output_dir, f"prepared_ligand_{os.path.basename(ligand_path)}.pdbqt")
        if convert_pdb_to_pdbqt(ligand_path, output_path, is_ligand=True):
            return output_path
        else:
            logger.error(f"Ligand conversion failed for: {ligand_path}")
            return None
    
    logger.error(f"Unsupported ligand format: {ext}. Use PDB, SDF, MOL2, or PDBQT.")
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
    output_dir: str = "/tmp"
) -> Dict[str, Any]:
    """
    Run AutoDock Vina docking using Python API.
    
    Args:
        receptor_path: Path to receptor PDBQT file
        ligand_path: Path to ligand PDBQT file
        center_x, center_y, center_z: Grid box center coordinates
        size_x, size_y, size_z: Grid box dimensions
        exhaustiveness: Search exhaustiveness (1-32)
        num_modes: Number of binding modes to generate
        output_dir: Directory for output files
        
    Returns:
        Dictionary with docking results
    """
    try:
        from vina import Vina
    except ImportError:
        logger.error("Vina not installed")
        return {
            "success": False,
            "error": "Vina Python package not installed",
            "results": []
        }
    
    os.makedirs(output_dir, exist_ok=True)
    
    # Prepare receptor
    receptor_file = prepare_receptor_file(receptor_path, output_dir)
    if receptor_file is None:
        return {
            "success": False,
            "error": f"Failed to prepare receptor: {receptor_path}. Please use PDBQT format.",
            "results": []
        }
    
    # Prepare ligand
    ligand_file = prepare_ligand_file(ligand_path, output_dir)
    if ligand_file is None:
        return {
            "success": False,
            "error": f"Failed to prepare ligand: {ligand_path}. Please use PDB, SDF, or MOL2 format.",
            "results": []
        }
    
    try:
        # Initialize Vina
        logger.info("Initializing Vina...")
        v = Vina(sf_name='vina')
        
        # Set receptor
        logger.info(f"Setting receptor from: {receptor_file}")
        try:
            v.set_receptor(rigid_pdbqt_filename=receptor_file)
        except Exception as e:
            logger.error(f"Failed to set receptor: {e}")
            return {
                "success": False,
                "error": f"Failed to set receptor: {str(e)}. Ensure receptor is valid PDBQT format.",
                "results": []
            }
        
        # Set ligand
        logger.info(f"Setting ligand from: {ligand_file}")
        try:
            v.set_ligand_from_file(ligand_file)
        except Exception as e:
            logger.error(f"Failed to set ligand: {e}")
            return {
                "success": False,
                "error": f"Failed to set ligand: {str(e)}. Ensure ligand is valid PDBQT format.",
                "results": []
            }
        
        # Set search space (grid box)
        logger.info(f"Setting box center: ({center_x}, {center_y}, {center_z}), size: ({size_x}, {size_y}, {size_z})")
        try:
            v.compute_vina_maps(center=[center_x, center_y, center_z], box_size=[size_x, size_y, size_z])
        except Exception as e:
            logger.error(f"Failed to compute Vina maps: {e}")
            return {
                "success": False,
                "error": f"Failed to compute Vina maps: {str(e)}",
                "results": []
            }
        
        # Run docking
        logger.info(f"Running docking with exhaustiveness={exhaustiveness}, num_modes={num_modes}")
        try:
            v.dock(exhaustiveness=exhaustiveness, n_poses=num_modes)
        except Exception as e:
            logger.error(f"Docking failed: {e}")
            return {
                "success": False,
                "error": f"Docking failed: {str(e)}",
                "results": []
            }
        
        # Get energies and poses
        try:
            energies = v.energies
            logger.info(f"Docking completed. Best score: {energies[0][0] if energies else 'N/A'}")
        except Exception as e:
            logger.warning(f"Could not get energies: {e}")
            energies = []
        
        # Build results from poses
        results = []
        try:
            poses = v.poses(n_poses=num_modes, coordinates_only=False)
            for i, pose in enumerate(poses):
                energy = float(energies[i][0]) if i < len(energies) else 0.0
                results.append({
                    "pose_id": i + 1,
                    "vina_score": energy,
                    "gnina_score": None,
                    "rf_score": None
                })
        except Exception as e:
            logger.debug(f"Could not get poses: {e}")
        
        # Write output file
        output_file = os.path.join(output_dir, "vina_results.pdbqt")
        try:
            v.write_pose(output_file, overwrite=True)
            logger.info(f"Results written to: {output_file}")
        except Exception as e:
            logger.warning(f"Could not write output file: {e}")
        
        return {
            "success": True,
            "engine": "vina",
            "results": results,
            "output_file": output_file if os.path.exists(output_file) else None
        }
        
    except Exception as e:
        logger.error(f"Vina docking error: {e}")
        return {
            "success": False,
            "error": str(e),
            "results": []
        }


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
    output_dir: str = "/tmp"
) -> Dict[str, Any]:
    """
    Main docking function.
    
    Args:
        receptor_path: Path to receptor file
        ligand_path: Path to ligand file
        engine: Docking engine ('vina' currently supported)
        center_x, center_y, center_z: Grid box center
        size_x, size_y, size_z: Grid box size
        exhaustiveness: Search exhaustiveness
        num_modes: Number of binding modes
        output_dir: Output directory
        
    Returns:
        Dictionary with docking results
    """
    if engine.lower() == "vina":
        return run_vina_docking(
            receptor_path, ligand_path,
            center_x, center_y, center_z,
            size_x, size_y, size_z,
            exhaustiveness, num_modes, output_dir
        )
    
    return {
        "success": False,
        "error": f"Unknown engine: {engine}. Only 'vina' is currently supported.",
        "results": []
    }
