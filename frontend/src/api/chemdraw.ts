import { apiClient } from '@/lib/apiClient'

export interface ChemPropertiesResult {
  smiles: string
  mw?: number
  logp?: number
  tpsa?: number
  hbd?: number
  hba?: number
  rotatable_bonds?: number
  iupac_name?: string
  inchi?: string
  inchi_key?: string
  mol_block?: string
}

export interface ChemConformerResult {
  conformers: Array<{ idx: number; energy: number }>
  smiles: string
}

export interface ChemDockingPrepResult {
  receptor_pdbqt?: string
  ligand_pdbqt?: string
  smiles_3d?: string
  success: boolean
}

export async function getMoleculeProperties(smiles: string): Promise<ChemPropertiesResult> {
  const { data } = await apiClient.post('/api/chem/properties', { smiles })
  return data
}

export async function extractSMILESFromStructure(structure: string): Promise<{ smiles: string }> {
  const { data } = await apiClient.post('/api/chem/extract-smiles', { structure })
  return data
}

export async function getMoleculeSuggestions(smiles: string): Promise<{ suggestions: string[] }> {
  const { data } = await apiClient.post('/api/chem/suggestions', { smiles })
  return data
}

export async function get3DStructure(jobId: string): Promise<{ pdb_content: string }> {
  const { data } = await apiClient.get(`/api/chem/3d/${jobId}`)
  return data
}

export async function cleanupSMILES(smiles: string): Promise<{ cleaned: string }> {
  const { data } = await apiClient.post('/api/chem/cleanup', { smiles })
  return data
}

export async function getIUPACName(smiles: string): Promise<{ iupac_name: string }> {
  const { data } = await apiClient.post('/api/chem/iupac', { smiles })
  return data
}

export async function getInchi(smiles: string): Promise<{ inchi: string; inchi_key: string }> {
  const { data } = await apiClient.post('/api/chem/inchi', { smiles })
  return data
}

export async function generateConformers(smiles: string, numConformers: number = 10): Promise<ChemConformerResult> {
  const { data } = await apiClient.post('/api/chem/conformers', { smiles, num_conformers: numConformers })
  return data
}

export async function convertToMol(smiles: string): Promise<{ mol_block: string }> {
  const { data } = await apiClient.post('/api/chem/to-mol', { smiles })
  return data
}

export async function convertTo3D(smiles: string): Promise<{ pdb_content: string }> {
  const { data } = await apiClient.post('/api/chem/to-3d', { smiles })
  return data
}

export async function prepareForDocking(smiles: string, receptorPath?: string): Promise<ChemDockingPrepResult> {
  const { data } = await apiClient.post('/api/chem/docking-prep', { smiles, receptor_path: receptorPath })
  return data
}
