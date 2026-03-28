"""
Docking Engine - Actual molecular docking using AutoDock Vina Python API
"""
import os
import logging
import tempfile
from typing import Dict, Any, List

logger = logging.getLogger(__name__)

# Check if vina is available
def check_vina() -> bool:
    try:
        from vina import Vina
        return True
    except ImportError:
        return False


def prepare_receptor_file(receptor_path: str, output_dir: str) -> str:
    """
    Prepare receptor file - for PDB files, just return the path.
    For other formats, conversion would be needed with Open Babel.
    """
    _, ext = os.path.splitext(receptor_path)
    if ext.lower() in ['.pdb', '.pdbqt']:
        return receptor_path
    # For other formats, we would need obabel but for now assume PDB/PDBQT
    return receptor_path


def prepare_ligand_file(ligand_path: str, output_dir: str) -> str:
    """
    Prepare ligand file - for PDBQT/SDF files, return the path.
    """
    _, ext = os.path.splitext(ligand_path)
    if ext.lower() in ['.pdbqt', '.sdf', '.mol2']:
        return ligand_path
    return ligand_path


def run_vina_docking(
    receptor_path: str,
    ligand_path: str,
    center_x: float,
    center_y: float,
    center_z: float,
    size_x: float = 20,
    size_y: float = 20,
    size_z: float = 20,
    exhaustiveness: int = 8,
    num_modes: int = 9,
    output_dir: str = "/tmp"
) -> Dict[str, Any]:
    """
    Run AutoDock Vina docking using Python API.
    
    Returns:
        Dictionary with docking results
    """
    try:
        from vina import Vina
    except ImportError:
        logger.error("Vina not installed")
        return {
            "success": False,
            "error": "Vina not installed",
            "results": []
        }
    
    try:
        # Initialize Vina
        v = Vina(sf_name='vina')
        
        # Set receptor and ligand
        logger.info(f"Setting receptor: {receptor_path}")
        v.set_receptor(receptor_path)
        
        logger.info(f"Setting ligand: {ligand_path}")
        v.set_ligand_from_file(ligand_path)
        
        # Set search space (grid box)
        logger.info(f"Setting box center: ({center_x}, {center_y}, {center_z}), size: ({size_x}, {size_y}, {size_z})")
        v.compute_vina_maps(center=[center_x, center_y, center_z], box_size=[size_x, size_y, size_z])
        
        # Set docking parameters
        v.dock(exhaustiveness=exhaustiveness, n_poses=num_modes)
        
        # Get results
        energies = v.score()
        logger.info(f"Initial scores computed: {energies}")
        
        # Optimize poses
        v.optimize()
        energy_optimized = v.score()
        logger.info(f"Optimized energy: {energy_optimized}")
        
        # Generate poses
        v.dock(exhaustiveness=exhaustiveness, n_poses=num_modes)
        
        # Get all poses with energies
        results = []
        for i in range(num_modes):
            try:
                pose = v.get_pose(i)
                if pose is not None:
                    energy = energies[i] if i < len(energies) else 0.0
                    results.append({
                        "pose_id": i + 1,
                        "vina_score": float(energy),
                        "gnina_score": None,
                        "rf_score": None,
                        "pose_data": str(pose)[:500] if pose else ""
                    })
            except Exception as e:
                logger.warning(f"Could not get pose {i}: {e}")
                continue
        
        # Write output file
        output_file = os.path.join(output_dir, f"vina_results.pdbqt")
        try:
            v.write_pose(output_file, overwrite=True)
        except Exception as e:
            logger.warning(f"Could not write output: {e}")
        
        return {
            "success": True,
            "engine": "vina",
            "results": results,
            "output_file": output_file
        }
        
    except Exception as e:
        logger.error(f"Vina docking error: {e}")
        return {
            "success": False,
            "error": str(e),
            "results": []
        }


def run_docking_simple(
    receptor_data: str,
    ligand_data: str,
    center_x: float = 0,
    center_y: float = 0,
    center_z: float = 0,
    size_x: float = 20,
    size_y: float = 20,
    size_z: float = 20,
    exhaustiveness: int = 8,
    num_modes: int = 9,
    output_dir: str = "/tmp"
) -> Dict[str, Any]:
    """
    Run docking with in-memory receptor and ligand data.
    
    Args:
        receptor_data: PDB/PDBQT string for receptor
        ligand_data: PDB/PDBQT string for ligand
        center_x, center_y, center_z: Grid box center
        size_x, size_y, size_z: Grid box size
        exhaustiveness: Sampling exhaustiveness
        num_modes: Number of binding modes
        output_dir: Output directory
    
    Returns:
        Dictionary with docking results
    """
    try:
        from vina import Vina
    except ImportError:
        return {
            "success": False,
            "error": "Vina not installed",
            "results": []
        }
    
    try:
        # Create temp files
        with tempfile.NamedTemporaryFile(mode='w', suffix='.pdbqt', delete=False) as f:
            f.write(receptor_data)
            receptor_file = f.name
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.pdbqt', delete=False) as f:
            f.write(ligand_data)
            ligand_file = f.name
        
        try:
            # Initialize Vina
            v = Vina(sf_name='vina')
            
            # Set receptor and ligand
            v.set_receptor(receptor_file)
            v.set_ligand_from_file(ligand_file)
            
            # Set search space
            v.compute_vina_maps(center=[center_x, center_y, center_z], box_size=[size_x, size_y, size_z])
            
            # Dock
            v.dock(exhaustiveness=exhaustiveness, n_poses=num_modes)
            
            # Get energies
            energies = v.score()
            
            # Build results
            results = []
            for i in range(min(num_modes, len(energies))):
                results.append({
                    "pose_id": i + 1,
                    "vina_score": float(energies[i]),
                    "gnina_score": None,
                    "rf_score": None
                })
            
            # Write output
            output_file = os.path.join(output_dir, "docking_output.pdbqt")
            try:
                v.write_pose(output_file, overwrite=True)
            except:
                pass
            
            return {
                "success": True,
                "engine": "vina",
                "results": results,
                "output_file": output_file
            }
            
        finally:
            # Clean up temp files
            if os.path.exists(receptor_file):
                os.unlink(receptor_file)
            if os.path.exists(ligand_file):
                os.unlink(ligand_file)
                
    except Exception as e:
        logger.error(f"Docking error: {e}")
        return {
            "success": False,
            "error": str(e),
            "results": []
        }


def run_docking(
    receptor_path: str,
    ligand_path: str,
    engine: str = "vina",
    center_x: float = 0,
    center_y: float = 0,
    center_z: float = 0,
    size_x: float = 20,
    size_y: float = 20,
    size_z: float = 20,
    exhaustiveness: int = 8,
    num_modes: int = 9,
    output_dir: str = "/tmp"
) -> Dict[str, Any]:
    """
    Main docking function.
    
    Args:
        receptor_path: Path to receptor file
        ligand_path: Path to ligand file
        engine: 'vina' (only engine available)
        center_x, center_y, center_z: Grid box center
        size_x, size_y, size_z: Grid box size
        exhaustiveness: Sampling exhaustiveness
        num_modes: Number of binding modes
        output_dir: Output directory
    
    Returns:
        Dictionary with docking results
    """
    return run_vina_docking(
        receptor_path, ligand_path,
        center_x, center_y, center_z,
        size_x, size_y, size_z,
        exhaustiveness, num_modes, output_dir
    )
