import { apiClient } from '@/lib/apiClient'

export interface PharmacophoreFeature {
  type: string
  family: string
  position: { x: number; y: number; z: number }
  atoms: number[]
  color: string
  radius: number
  smarts?: string
}

export interface PharmacophoreResult {
  success: boolean
  smiles?: string
  features: PharmacophoreFeature[]
  num_features: number
  feature_summary: Record<string, number>
  error?: string
}

export interface ScreeningResult {
  success: boolean
  total_screened: number
  total_hits: number
  hit_rate: number
  results: Array<{
    idx: number
    smiles: string
    num_features: number
    matched: boolean
    features?: PharmacophoreFeature[]
  }>
  hits: Array<{
    idx: number
    smiles: string
    num_features: number
    features: PharmacophoreFeature[]
    matched: boolean
  }>
}

export interface AlignmentResult {
  success: boolean
  mobile_smiles: string
  mobile_features: PharmacophoreFeature[]
  jaccard_similarity: number
  rmsd: number
  num_features_matched: number
  score: number
  error?: string
}

export interface FeatureInfo {
  name: string
  color: string
  radius: number
  description: string
}

export async function generatePharmacophore(smiles?: string, pdb?: string): Promise<PharmacophoreResult> {
  const { data } = await apiClient.post('/pharmacophore/generate', {
    smiles,
    pdb
  })
  return data
}

export async function screenLibrary(
  library: string[],
  minFeatures: number = 3,
  requiredFeatures?: string[]
): Promise<ScreeningResult> {
  const { data } = await apiClient.post('/pharmacophore/screen', {
    library,
    min_features: minFeatures,
    required_features: requiredFeatures
  })
  return data
}

export async function alignMolecule(
  referenceFeatures: PharmacophoreFeature[],
  mobileSmiles: string
): Promise<AlignmentResult> {
  const { data } = await apiClient.post('/pharmacophore/align', {
    reference_features: referenceFeatures,
    mobile_smiles: mobileSmiles
  })
  return data
}

export async function getFeatureInfo(): Promise<{ features: FeatureInfo[]; total_types: number }> {
  const { data } = await apiClient.get('/pharmacophore/features')
  return data
}

// Sample molecules for testing
export const SAMPLE_SMILES = {
  aspirin: 'CC(=O)OC1=CC=CC=C1C(=O)O',
  caffeine: 'Cn1cnc2c1c(=O)n(c(=O)n2C)C',
  ibuprofen: 'CC(C)Cc1ccc(cc1)C(C)C(=O)O',
  glucose: 'OC[C@H]1OC(O)[C@H](O)[C@@H](O)[C@@H]1O',
  ethanol: 'CCO',
  benzene: 'c1ccccc1',
  methanol: 'CO',
  acetone: 'CC(=O)C',
  phenol: 'c1ccc(cc1)O',
  aniline: 'Nc1ccccc1',
}

// Sample library for virtual screening
export const SAMPLE_LIBRARY = [
  'CC(=O)OC1=CC=CC=C1C(=O)O', // aspirin
  'Cn1cnc2c1c(=O)n(c(=O)n2C)C', // caffeine
  'CC(C)Cc1ccc(cc1)C(C)C(=O)O', // ibuprofen
  'CCO', // ethanol
  'CO', // methanol
  'CC(=O)C', // acetone
  'c1ccc(cc1)O', // phenol
  'Nc1ccccc1', // aniline
  'OC[C@H]1OC(O)[C@H](O)[C@@H](O)[C@@H]1O', // glucose
  'c1ccccc1', // benzene
]

export interface HypothesisResult {
  success: boolean
  hypothesis?: Array<{
    type: string
    center: number[]
    radius: number
    color: string
    coverage: number
  }>
  n_features?: number
  n_molecules?: number
  score?: number
  feature_types?: string[]
  error?: string
}

export interface ExclusionVolumeResult {
  success: boolean
  exclusion_spheres?: Array<{
    center: number[]
    radius: number
    color: string
    type: string
    residue: string
    element: string
    alpha: number
  }>
  n_spheres?: number
  n_receptor_atoms?: number
  error?: string
}

export async function generateHypothesis(_activeSmiles: string[], _minFeatures: number = 3, _maxFeatures: number = 6): Promise<HypothesisResult> {
  // Note: Backend route not yet implemented - placeholder
  console.warn('Hypothesis generation endpoint not available on backend')
  return { success: false, error: 'Hypothesis generation not yet available' }
}

export async function generateExclusionVolumes(_receptorPdb: string, _ligandCenter?: number[], _cutoff: number = 5.0): Promise<ExclusionVolumeResult> {
  // Note: Backend route not yet implemented - placeholder
  console.warn('Exclusion volumes endpoint not available on backend')
  return { success: false, error: 'Exclusion volumes not yet available' }
}
