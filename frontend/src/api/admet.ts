import { apiClient } from '@/lib/apiClient'

export interface ADMETPrediction {
  smiles: string
  absorption?: string
  distribution?: string
  metabolism?: string
  excretion?: string
  toxicity?: string
  bbb_permeant?: boolean
  cyp_inhibitor?: boolean
  ames_toxic?: boolean
  hepatotoxic?: boolean
  skin_sensitization?: boolean
  solubility?: string
  bioavailability_score?: number
  drug_likeness?: number
  synthetic_accessibility?: number
}

export interface ADMETFilterRequest {
  compounds: Array<{ smiles: string; name?: string }>
  rules?: {
    mw_max?: number
    logp_max?: number
    hbd_max?: number
    hba_max?: number
    tpsa_max?: number
    rotatable_bonds_max?: number
    bbb_permeant?: boolean
    ames_toxic?: boolean
  }
}

export interface ADMETFilterResult {
  passed: Array<{ smiles: string; name?: string; score: number }>
  failed: Array<{ smiles: string; name?: string; reason: string }>
  total: number
  pass_rate: number
}

export async function predictADMET(smiles: string): Promise<ADMETPrediction> {
  const { data } = await apiClient.post('/admet/predict', { smiles })
  return data
}

export async function predictADMETBatch(compounds: Array<{ smiles: string; name?: string }>): Promise<ADMETPrediction[]> {
  const { data } = await apiClient.post('/admet/predict/batch', { compounds })
  return data
}

export async function filterByADMET(request: ADMETFilterRequest): Promise<ADMETFilterResult> {
  const { data } = await apiClient.post('/admet/filter', request)
  return data
}
