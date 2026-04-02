import { apiClient } from '@/lib/apiClient'
import type { DockingProgress } from '@/lib/types'

export async function startDocking(
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
  const { data } = await apiClient.post('/jobs', {
    name: `docking-${config.engine}-${Date.now()}`,
    job_type: 'docking',
    parameters: {
      receptor_path: receptorPath,
      ligand_path: ligandPath,
      center_x: config.center_x,
      center_y: config.center_y,
      center_z: config.center_z,
      size_x: config.size_x,
      size_y: config.size_y,
      size_z: config.size_z,
      exhaustiveness: config.exhaustiveness,
      num_modes: config.num_modes,
      engine: config.engine,
    },
  })
  return data
}

export async function startConsensusDocking(
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
  }
): Promise<{ job_id: string; status: string }> {
  const { data } = await apiClient.post('/jobs', {
    name: `docking-consensus-${Date.now()}`,
    job_type: 'docking',
    parameters: {
      receptor_path: receptorPath,
      ligand_path: ligandPath,
      center_x: config.center_x,
      center_y: config.center_y,
      center_z: config.center_z,
      size_x: config.size_x,
      size_y: config.size_y,
      size_z: config.size_z,
      exhaustiveness: config.exhaustiveness,
      num_modes: config.num_modes,
      engine: 'consensus',
    },
  })
  return data
}

export async function cancelDocking(jobId: string): Promise<{ job_id: string; status: string }> {
  const { data } = await apiClient.post(`/dock/${jobId}/cancel`)
  return data
}

export async function getDockingStatus(jobId: string): Promise<DockingProgress> {
  const { data } = await apiClient.get<any>(`/jobs/${jobId}`)
  const status = data.status || 'unknown'
  const completed = status === 'completed' || status === 'COMPLETED'
  const failed = status === 'failed' || status === 'FAILED'
  return {
    progress: completed ? 100 : status === 'running' || status === 'RUNNING' ? 50 : 0,
    total: 100,
    status: completed ? 'completed' : (status.toLowerCase() as any),
    message: completed
      ? 'Docking completed successfully'
      : failed
        ? (data.error || 'Docking failed')
        : status === 'running' || status === 'RUNNING'
          ? 'Docking in progress...'
          : status === 'queued' || status === 'QUEUED'
            ? 'Job queued, waiting to start...'
            : data.message || status,
  }
}

export async function getDockingResult(jobId: string): Promise<any> {
  const { data } = await apiClient.get(`/jobs/${jobId}/results`)
  return data
}

export function createDockingStream(jobId: string): EventSource {
  return new EventSource(`/dock/${jobId}/status`)
}
