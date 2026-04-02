import { apiClient } from '@/lib/apiClient'

export interface LLMSettings {
  provider: string
  model: string
  api_key: string
  base_url: string
  temperature: number
  max_tokens: number
}

export async function getLLMSettings(): Promise<LLMSettings> {
  const { data } = await apiClient.get<LLMSettings>('/llm/settings')
  return data
}

export async function updateLLMSettings(settings: Partial<LLMSettings>): Promise<{ status: string }> {
  const { data } = await apiClient.put('/llm/settings', settings)
  return data
}

export async function testLLMConnection(config?: Partial<LLMSettings>): Promise<{ status: string; response?: string; error?: string }> {
  const { data } = await apiClient.post('/llm/test', config || {})
  return data
}

export async function getOllamaModels(): Promise<{ available: boolean; models: string[]; error?: string }> {
  try {
    const { data } = await apiClient.get('/llm/ollama/models')
    return data
  } catch {
    return { available: false, models: [], error: 'Failed to fetch Ollama models' }
  }
}

export async function getLLMConfig(): Promise<any> {
  try {
    const { data } = await apiClient.get('/llm/config')
    return data
  } catch {
    return { error: 'LLM config endpoint not available' }
  }
}

export async function configureLLM(config: any): Promise<any> {
  const { data } = await apiClient.post('/llm/configure', config)
  return data
}
