import { useState, useEffect } from 'react'
import { Card, Button, Input, Select, Checkbox } from '@/components/ui'
import { getLLMSettings, updateLLMSettings, testLLMConnection } from '@/api/settings'

const APP_VERSION = '2.0.1'

const AI_PROVIDERS = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic Claude' },
  { value: 'gemini', label: 'Google Gemini' },
  { value: 'openrouter', label: 'OpenRouter' },
  { value: 'mistral', label: 'Mistral AI' },
  { value: 'siliconflow', label: 'SiliconFlow' },
  { value: 'deepseek', label: 'DeepSeek' },
  { value: 'qwen', label: 'Qwen (Alibaba)' },
  { value: 'ollama', label: 'Ollama (Local)' },
]

const getModelsForProvider = (provider: string) => {
  const models: Record<string, Array<{ value: string; label: string }>> = {
    openai: [
      { value: 'gpt-4o', label: 'GPT-4o' },
      { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
      { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
      { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
    ],
    anthropic: [
      { value: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4' },
      { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet' },
      { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus' },
      { value: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku' },
    ],
    gemini: [
      { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
      { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
      { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
      { value: 'gemini-pro', label: 'Gemini Pro' },
    ],
    openrouter: [
      { value: 'anthropic/claude-3.5-sonnet', label: 'Claude 3.5 Sonnet' },
      { value: 'google/gemini-pro', label: 'Gemini Pro' },
      { value: 'openai/gpt-4o', label: 'GPT-4o' },
    ],
    mistral: [
      { value: 'mistral-large', label: 'Mistral Large' },
      { value: 'mistral-7b-instruct', label: 'Mistral 7B Instruct' },
    ],
    deepseek: [
      { value: 'deepseek-chat', label: 'DeepSeek Chat' },
      { value: 'deepseek-coder', label: 'DeepSeek Coder' },
      { value: 'deepseek-reasoner', label: 'DeepSeek Reasoner' },
    ],
    siliconflow: [
      { value: 'Qwen/Qwen2-72B', label: 'Qwen2-72B' },
      { value: 'deepseek-ai/DeepSeek-V2.5', label: 'DeepSeek V2.5' },
      { value: '01-ai/Yi-Large', label: 'Yi Large' },
    ],
    qwen: [
      { value: 'qwen-turbo', label: 'Qwen Turbo' },
      { value: 'qwen-plus', label: 'Qwen Plus' },
      { value: 'qwen-max', label: 'Qwen Max' },
    ],
    ollama: [
      { value: 'llama3', label: 'Llama 3' },
      { value: 'llama3.1', label: 'Llama 3.1' },
      { value: 'mistral', label: 'Mistral' },
      { value: 'codellama', label: 'Code Llama' },
      { value: 'qwen2.5', label: 'Qwen 2.5' },
    ],
  }
  return models[provider] || models.openai
}

const getBaseUrlForProvider = (provider: string) => {
  const baseUrls: Record<string, string> = {
    openai: 'https://api.openai.com/v1',
    anthropic: 'https://api.anthropic.com/v1',
    gemini: 'https://generativelanguage.googleapis.com/v1beta',
    openrouter: 'https://openrouter.ai/api/v1',
    mistral: 'https://api.mistral.ai/v1',
    siliconflow: 'https://api.siliconflow.cn/v1',
    deepseek: 'https://api.deepseek.com/v1',
    qwen: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    ollama: 'http://localhost:11434/v1',
  }
  return baseUrls[provider] || ''
}

const getChannelForProvider = (provider: string): string => {
  const channels: Record<string, string> = {
    openai: 'openai',
    anthropic: 'anthropic',
    gemini: 'gemini',
    openrouter: 'openai',
    mistral: 'openai',
    siliconflow: 'chinese',
    deepseek: 'chinese',
    qwen: 'chinese',
    ollama: 'local',
  }
  return channels[provider] || 'auto'
}

export function Settings() {
  const [showApiKey, setShowApiKey] = useState(false)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ status: string; response?: string; error?: string } | null>(null)
  const [message, setMessage] = useState('')

  const [llmConfig, setLlmConfig] = useState({
    provider: 'openai',
    model: 'gpt-4o-mini',
    apiKey: '',
    baseUrl: 'https://api.openai.com/v1',
    temperature: '0.7',
    maxTokens: '4096',
  })

  const [systemConfig, setSystemConfig] = useState({
    theme: 'system',
    logLevel: 'INFO',
    compactMode: false,
    showTimestamps: true,
    autoSave: true,
  })

  const [dockerConfig, setDockerConfig] = useState({
    timeout: '3600',
    gpuEnabled: true,
  })

  useEffect(() => {
    getLLMSettings()
      .then((settings) => {
        setLlmConfig({
          provider: settings.provider || 'openai',
          model: settings.model || 'gpt-4o-mini',
          apiKey: settings.api_key || '',
          baseUrl: settings.base_url || 'https://api.openai.com/v1',
          temperature: String(settings.temperature || 0.7),
          maxTokens: String(settings.max_tokens || 4096),
        })
      })
      .catch(() => {})
  }, [])

  const handleProviderChange = (provider: string) => {
    const newBaseUrl = getBaseUrlForProvider(provider)
    const models = getModelsForProvider(provider)
    setLlmConfig({
      ...llmConfig,
      provider,
      baseUrl: newBaseUrl,
      model: models[0]?.value || '',
    })
    setTestResult(null)
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage('')
    try {
      await updateLLMSettings({
        provider: llmConfig.provider,
        model: llmConfig.model,
        api_key: llmConfig.apiKey,
        base_url: llmConfig.baseUrl,
        temperature: parseFloat(llmConfig.temperature) || 0.7,
        max_tokens: parseInt(llmConfig.maxTokens) || 4096,
      })
      setMessage('Settings saved successfully')
    } catch {
      setMessage('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    setMessage('')
    try {
      const result = await testLLMConnection()
      setTestResult(result)
    } catch (err: any) {
      setTestResult({ status: 'error', error: err?.message || 'Connection failed' })
    } finally {
      setTesting(false)
    }
  }

  const handleResetLLM = () => {
    if (!confirm('Reset AI settings to defaults?')) return
    setLlmConfig({
      provider: 'openai',
      model: 'gpt-4o-mini',
      apiKey: '',
      baseUrl: 'https://api.openai.com/v1',
      temperature: '0.7',
      maxTokens: '4096',
    })
    setTestResult(null)
    setMessage('AI settings reset to defaults')
  }

  const handleResetSystem = () => {
    if (!confirm('Reset system preferences to defaults?')) return
    setSystemConfig({
      theme: 'system',
      logLevel: 'INFO',
      compactMode: false,
      showTimestamps: true,
      autoSave: true,
    })
    setMessage('System preferences reset to defaults')
  }

  const handleResetDocker = () => {
    if (!confirm('Reset Docker settings to defaults?')) return
    setDockerConfig({ timeout: '3600', gpuEnabled: true })
    setMessage('Docker settings reset to defaults')
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Settings</h1>
          <p className="text-sm text-text-secondary mt-1">Configure AI provider and application preferences</p>
        </div>
        <span className="px-3 py-1 bg-surface-secondary text-text-secondary text-sm rounded-full border border-border-light">
          v{APP_VERSION}
        </span>
      </div>

      {message && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${
          message.includes('success') || message.includes('reset')
            ? 'bg-success-bg text-success border border-success/20'
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card padding="lg">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-text-primary">AI Settings</h2>
                <p className="text-sm text-text-secondary mt-0.5">Configure your preferred LLM provider</p>
              </div>
              <Button variant="ghost" size="sm" onClick={handleResetLLM}>
                Reset
              </Button>
            </div>

            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select
                  label="Provider"
                  value={llmConfig.provider}
                  onChange={(e) => handleProviderChange(e.target.value)}
                  options={AI_PROVIDERS}
                />
                <Select
                  label="Model"
                  value={llmConfig.model}
                  onChange={(e) => setLlmConfig({ ...llmConfig, model: e.target.value })}
                  options={getModelsForProvider(llmConfig.provider)}
                />
              </div>

              <div className="relative">
                <Input
                  label="API Base URL"
                  value={llmConfig.baseUrl}
                  onChange={(e) => setLlmConfig({ ...llmConfig, baseUrl: e.target.value })}
                  placeholder="https://api.openai.com/v1"
                />
              </div>

              <div className="relative">
                <Input
                  label="API Key"
                  type={showApiKey ? 'text' : 'password'}
                  value={llmConfig.apiKey}
                  onChange={(e) => setLlmConfig({ ...llmConfig, apiKey: e.target.value })}
                  placeholder={
                    llmConfig.provider === 'ollama'
                      ? 'Leave empty for local models'
                      : 'sk-...'
                  }
                  hint={
                    llmConfig.provider === 'ollama'
                      ? 'No API key required for local models'
                      : 'Your API key is stored only in memory'
                  }
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-8 text-text-tertiary hover:text-text-primary text-xs"
                >
                  {showApiKey ? 'Hide' : 'Show'}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Temperature"
                  type="number"
                  value={llmConfig.temperature}
                  onChange={(e) => setLlmConfig({ ...llmConfig, temperature: e.target.value })}
                  min={0}
                  max={2}
                  step={0.1}
                  hint="Lower = focused, Higher = creative"
                />
                <Input
                  label="Max Tokens"
                  type="number"
                  value={llmConfig.maxTokens}
                  onChange={(e) => setLlmConfig({ ...llmConfig, maxTokens: e.target.value })}
                  min={100}
                  max={128000}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Settings'}
                </Button>
                <Button variant="outline" onClick={handleTest} disabled={testing}>
                  {testing ? 'Testing...' : 'Test Connection'}
                </Button>
              </div>

              {testResult && (
                <div className={`p-4 rounded-lg border ${
                  testResult.status === 'ok'
                    ? 'bg-success-bg text-success border-success/20'
                    : 'bg-red-50 text-red-700 border-red-200'
                }`}>
                  <p className="font-semibold text-sm">
                    {testResult.status === 'ok' ? 'Connection successful' : 'Connection failed'}
                  </p>
                  {testResult.response && (
                    <p className="text-sm mt-1">Model responded: "{testResult.response}"</p>
                  )}
                  {testResult.error && (
                    <p className="text-xs mt-1 font-mono">Error: {testResult.error}</p>
                  )}
                </div>
              )}
            </div>
          </Card>

          <Card padding="lg">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-text-primary">System Preferences</h2>
                <p className="text-sm text-text-secondary mt-0.5">General application settings</p>
              </div>
              <Button variant="ghost" size="sm" onClick={handleResetSystem}>
                Reset
              </Button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select
                  label="Theme"
                  value={systemConfig.theme}
                  onChange={(e) => setSystemConfig({ ...systemConfig, theme: e.target.value })}
                  options={[
                    { value: 'system', label: 'System Default' },
                    { value: 'light', label: 'Light' },
                    { value: 'dark', label: 'Dark' },
                  ]}
                />
                <Select
                  label="Log Level"
                  value={systemConfig.logLevel}
                  onChange={(e) => setSystemConfig({ ...systemConfig, logLevel: e.target.value })}
                  options={[
                    { value: 'DEBUG', label: 'Debug' },
                    { value: 'INFO', label: 'Info' },
                    { value: 'WARNING', label: 'Warning' },
                    { value: 'ERROR', label: 'Error' },
                  ]}
                />
              </div>

              <div className="space-y-3 border-t border-border-light pt-4">
                <Checkbox
                  label="Compact mode"
                  checked={systemConfig.compactMode}
                  onChange={(e) => setSystemConfig({ ...systemConfig, compactMode: e.target.checked })}
                />
                <Checkbox
                  label="Show timestamps"
                  checked={systemConfig.showTimestamps}
                  onChange={(e) => setSystemConfig({ ...systemConfig, showTimestamps: e.target.checked })}
                />
                <Checkbox
                  label="Auto-save settings"
                  checked={systemConfig.autoSave}
                  onChange={(e) => setSystemConfig({ ...systemConfig, autoSave: e.target.checked })}
                />
              </div>
            </div>
          </Card>

          <Card padding="lg">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-text-primary">Docker Configuration</h2>
                <p className="text-sm text-text-secondary mt-0.5">Container runtime settings</p>
              </div>
              <Button variant="ghost" size="sm" onClick={handleResetDocker}>
                Reset
              </Button>
            </div>

            <div className="space-y-4">
              <Input
                label="Timeout (seconds)"
                type="number"
                value={dockerConfig.timeout}
                onChange={(e) => setDockerConfig({ ...dockerConfig, timeout: e.target.value })}
                min={60}
                max={7200}
              />
              <div className="p-4 bg-surface-secondary rounded-lg">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={dockerConfig.gpuEnabled}
                    onChange={(e) => setDockerConfig({ ...dockerConfig, gpuEnabled: e.target.checked })}
                    className="w-5 h-5 text-primary rounded border-border-light focus:ring-primary cursor-pointer"
                  />
                  <div>
                    <p className="font-semibold text-text-primary">GPU Acceleration</p>
                    <p className="text-xs text-text-tertiary">Enable NVIDIA GPU passthrough to containers</p>
                  </div>
                </label>
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card padding="lg">
            <h2 className="text-base font-semibold text-text-primary mb-4">About</h2>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Application</span>
                <span className="text-text-primary font-medium">BioDockify</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Version</span>
                <span className="text-text-primary font-medium">{APP_VERSION}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Channel</span>
                <span className="text-text-primary font-medium">{getChannelForProvider(llmConfig.provider)}</span>
              </div>
            </div>
          </Card>

          <Card padding="lg">
            <h2 className="text-base font-semibold text-text-primary mb-3">Quick Reference</h2>
            <div className="space-y-3 text-xs text-text-secondary">
              <div>
                <p className="font-semibold text-text-primary mb-1">API Key Security</p>
                <p>Keys are stored in memory only and never persisted to disk.</p>
              </div>
              <div>
                <p className="font-semibold text-text-primary mb-1">Local Models</p>
                <p>Select Ollama as provider and leave API key empty. Ensure Ollama is running locally.</p>
              </div>
              <div>
                <p className="font-semibold text-text-primary mb-1">Temperature</p>
                <p>Controls randomness. 0.0 is deterministic, 2.0 is most creative.</p>
              </div>
              <div>
                <p className="font-semibold text-text-primary mb-1">Max Tokens</p>
                <p>Maximum response length. Higher values allow longer answers.</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
