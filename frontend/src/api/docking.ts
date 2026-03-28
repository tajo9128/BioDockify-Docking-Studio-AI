import { apiClient } from '@/lib/apiClient'
import type { DockingProgress } from '@/lib/types'

export async function startDocking(
  jobId: string,
  totalLigands = 10,
  receptorPath: string,
  ligandPath: string,
  config: {
    center_x: number
    center_y: number
    center_z: number
    size_x: number
    size_y: number
    size_z: number
    exhaustiveness: number
    num_modes: number
    engine: string
  }
): Promise<{ job_id: string; status: string }> {
  const formData = new FormData()
  formData.append('job_id', jobId)
  formData.append('total_ligands', String(totalLigands))
  formData.append('receptor_path', receptorPath)
  formData.append('ligand_path', ligandPath)
  formData.append('center_x', String(config.center_x))
  formData.append('center_y', String(config.center_y))
  formData.append('center_z', String(config.center_z))
  formData.append('size_x', String(config.size_x))
  formData.append('size_y', String(config.size_y))
  formData.append('size_z', String(config.size_z))
  formData.append('exhaustiveness', String(config.exhaustiveness))
  formData.append('num_modes', String(config.num_modes))
  formData.append('engine', config.engine)

  const { data } = await apiClient.post('/dock/start', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export async function cancelDocking(jobId: string): Promise<{ job_id: string; status: string }> {
  const { data } = await apiClient.post(`/dock/${jobId}/cancel`)
  return data
}

export async function getDockingStatus(jobId: string): Promise<DockingProgress> {
  const { data } = await apiClient.get<DockingProgress>(`/dock/${jobId}/status`)
  return data
}

export function createDockingStream(jobId: string): EventSource {
  return new EventSource(`/dock/${jobId}/stream`)
}
