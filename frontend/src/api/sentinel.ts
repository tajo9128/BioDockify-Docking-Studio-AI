import { apiClient } from '@/lib/apiClient'

export interface SentinelStatus {
  queue_length: number
  active_jobs: number
  failed_jobs: number
  retry_count: number
}

export async function getSentinelStatus(): Promise<SentinelStatus> {
  const { data } = await apiClient.get('/sentinel/queue/status')
  return data
}

export async function monitorJob(jobId: string, service: string = 'docking'): Promise<any> {
  const { data } = await apiClient.post('/sentinel/monitor', { job_id: jobId, service })
  return data
}

export async function retryJob(jobId: string, service: string = 'docking'): Promise<{ success: boolean }> {
  const { data } = await apiClient.post('/sentinel/retry', { job_id: jobId, service })
  return data
}

export async function fallbackJob(jobId: string, strategy: string, service: string = 'docking'): Promise<any> {
  const { data } = await apiClient.post('/sentinel/fallback', { job_id: jobId, service, strategy })
  return data
}

export async function escalateJob(jobId: string, reason: string, service: string = 'docking'): Promise<any> {
  const { data } = await apiClient.post('/sentinel/escalate', null, {
    params: { job_id: jobId, service, reason },
  })
  return data
}

export async function validateResult(validationResult: any, service: string = 'docking'): Promise<any> {
  const { data } = await apiClient.post('/sentinel/validate/result', validationResult, {
    params: { service },
  })
  return data
}
