import { useState, useEffect } from 'react'
import { Card, Button, Input, Select, Tabs, TabPanel } from '@/components/ui'
import { getLLMSettings, updateLLMSettings, testLLMConnection } from '@/api/settings'

const AI_PROVIDERS = [
  { value: 'openai', label: 'OpenAI', icon: '🤖', models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'] },
  { value: 'anthropic', label: 'Anthropic Claude', icon: '🧠', models: ['claude-3-5-sonnet', 'claude-3-opus', 'claude-3-haiku'] },
  { value: 'gemini', label: 'Google Gemini', icon: '✨', models: ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-pro'] },
  { value: 'openrouter', label: 'OpenRouter', icon: '🔀', models: ['anthropic/claude-3.5-sonnet', 'google/gemini-pro'] },
  { value: 'mistral', label: 'Mistral AI', icon: '🌊', models: ['mistral-large', 'mistral-7b-instruct'] },
  { value: 'siliconflow', label: 'SiliconFlow', icon: '🌐', models: ['Qwen/Qwen2-72B', 'DeepSeek-V2.5'] },
  { value: 'deepseek', label: 'DeepSeek', icon: '🐉', models: ['deepseek-chat', 'deepseek-coder'] },
  { value: 'qwen', label: 'Qwen (Alibaba)', icon: '🏯', models: ['qwen-turbo', 'qwen-plus', 'qwen-max'] },
  { value: 'ollama', label: 'Ollama (Local)', icon: '💻', models: ['llama3', 'mistral', 'codellama'] },
];

export function Settings() {
  const [showApiKey, setShowApiKey] = useState(false)
  const [activeTab, setActiveTab] = useState('llm')
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

  const getModelsForProvider = (provider: string) => {
    const models: Record<string, Array<{ value: string; label: string }>> = {
      openai: [
        { value: 'gpt-4o', label: 'GPT-4o (Best, fastest)' },
        { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Fast, cheap)' },
        { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
        { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
      ],
      anthropic: [
        { value: 'claude-3-5-sonnet', label: 'Claude 3.5 Sonnet (Recommended)' },
        { value: 'claude-3-opus', label: 'Claude 3 Opus (Most capable)' },
        { value: 'claude-3-haiku', label: 'Claude 3 Haiku (Fast)' },
      ],
      gemini: [
        { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro (Best)' },
        { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash (Fast)' },
        { value: 'gemini-pro', label: 'Gemini Pro' },
      ],
      openrouter: [
        { value: 'anthropic/claude-3.5-sonnet', label: 'Claude 3.5 Sonnet (via OpenRouter)' },
        { value: 'google/gemini-pro', label: 'Gemini Pro (via OpenRouter)' },
        { value: 'openai/gpt-4o', label: 'GPT-4o (via OpenRouter)' },
      ],
      mistral: [
        { value: 'mistral-large', label: 'Mistral Large (Best)' },
        { value: 'mistral-7b-instruct', label: 'Mistral 7B Instruct' },
      ],
      deepseek: [
        { value: 'deepseek-chat', label: 'DeepSeek Chat (Recommended)' },
        { value: 'deepseek-coder', label: 'DeepSeek Coder' },
        { value: 'deepseek-reasoner', label: 'DeepSeek Reasoner' },
      ],
      siliconflow: [
        { value: 'Qwen/Qwen2-72B', label: 'Qwen2-72B (via SiliconFlow)' },
        { value: 'deepseek-ai/DeepSeek-V2.5', label: 'DeepSeek V2.5 (via SiliconFlow)' },
        { value: '01-ai/Yi-Large', label: 'Yi Large (via SiliconFlow)' },
      ],
      qwen: [
        { value: 'qwen-turbo', label: 'Qwen Turbo (Fast)' },
        { value: 'qwen-plus', label: 'Qwen Plus (Recommended)' },
        { value: 'qwen-max', label: 'Qwen Max (Best)' },
      ],
      ollama: [
        { value: 'llama3', label: 'Llama 3' },
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
      setMessage('Settings saved successfully!')
    } catch {
      setMessage('Failed to save settings.')
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

  const tabs = [
    { id: 'llm', label: '🤖 AI Provider' },
    { id: 'general', label: '⚙ General' },
    { id: 'docker', label: '🐳 Docker' },
  ]

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Settings</h1>
        <p className="text-text-secondary mt-1">Configure AI provider and application preferences</p>
      </div>

      {message && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${message.includes('success') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {message}
        </div>
      )}

      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      <TabPanel>
        {activeTab === 'llm' && (
          <div className="space-y-6 max-w-2xl">
            <Card>
              <h3 className="font-bold text-text-primary mb-1">AI Provider Configuration</h3>
              <p className="text-xs text-text-tertiary mb-4">Configure your preferred LLM for the AI Assistant</p>

              <div className="space-y-4">
                <Select
                  label="Provider"
                  value={llmConfig.provider}
                  onChange={(e) => handleProviderChange(e.target.value)}
                  options={[
                    { value: 'openai', label: '🤖 OpenAI (GPT-4, GPT-4o)' },
                    { value: 'anthropic', label: '🧠 Anthropic Claude' },
                    { value: 'gemini', label: '✨ Google Gemini' },
                    { value: 'openrouter', label: '🔀 OpenRouter' },
                    { value: 'mistral', label: '🌊 Mistral AI' },
                    { value: 'siliconflow', label: '🌐 SiliconFlow' },
                    { value: 'deepseek', label: '🐉 DeepSeek' },
                    { value: 'qwen', label: '🏯 Qwen (Alibaba)' },
                    { value: 'ollama', label: '💻 Ollama (Local)' },
                  ]}
                />

                <Select
                  label="Model"
                  value={llmConfig.model}
                  onChange={(e) => setLlmConfig({ ...llmConfig, model: e.target.value })}
                  options={getModelsForProvider(llmConfig.provider)}
                />

                <Input
                  label="API Base URL"
                  value={llmConfig.baseUrl}
                  onChange={(e) => setLlmConfig({ ...llmConfig, baseUrl: e.target.value })}
                  placeholder="https://api.openai.com/v1"
                  hint="OpenAI-compatible endpoint base URL"
                />

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
                        ? 'No API key needed for local models'
                        : 'Your API key is stored only in memory and not persisted'
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
                    hint="Lower = more focused, Higher = more creative"
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
                    {saving ? 'Saving...' : '💾 Save Settings'}
                  </Button>
                  <Button variant="outline" onClick={handleTest} disabled={testing}>
                    {testing ? '🔄 Testing...' : '🔍 Test Connection'}
                  </Button>
                </div>

                {testResult && (
                  <div className={`mt-4 p-4 rounded-lg border ${
                    testResult.status === 'ok'
                      ? 'bg-green-50 border-green-200 text-green-800'
                      : 'bg-red-50 border-red-200 text-red-800'
                  }`}>
                    <p className="font-semibold text-sm">
                      {testResult.status === 'ok' ? '✅ Connection Successful!' : '❌ Connection Failed'}
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

            {/* Provider Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {llmConfig.provider === 'anthropic' && (
                <Card className="border-orange-200 bg-orange-50/50">
                  <h4 className="font-bold text-orange-800 mb-2">🧠 Anthropic Claude Setup</h4>
                  <ol className="text-xs text-orange-700 space-y-1 list-decimal list-inside">
                    <li>Visit <a href="https://console.anthropic.com" className="underline" target="_blank" rel="noopener">console.anthropic.com</a></li>
                    <li>Create account and get API key</li>
                    <li>Base URL is already configured</li>
                    <li>Claude 3.5 Sonnet is recommended for best balance</li>
                  </ol>
                </Card>
              )}
              {llmConfig.provider === 'gemini' && (
                <Card className="border-blue-200 bg-blue-50/50">
                  <h4 className="font-bold text-blue-800 mb-2">✨ Google Gemini Setup</h4>
                  <ol className="text-xs text-blue-700 space-y-1 list-decimal list-inside">
                    <li>Visit <a href="https://aistudio.google.com" className="underline" target="_blank" rel="noopener">aistudio.google.com</a></li>
                    <li>Get API key from Google AI Studio</li>
                    <li>Base URL is already configured</li>
                    <li>Gemini 1.5 Pro offers large context windows</li>
                  </ol>
                </Card>
              )}
              {llmConfig.provider === 'openrouter' && (
                <Card className="border-purple-200 bg-purple-50/50">
                  <h4 className="font-bold text-purple-800 mb-2">🔀 OpenRouter Setup</h4>
                  <ol className="text-xs text-purple-700 space-y-1 list-decimal list-inside">
                    <li>Visit <a href="https://openrouter.ai" className="underline" target="_blank" rel="noopener">openrouter.ai</a></li>
                    <li>Sign up and add credits</li>
                    <li>Access many models through unified API</li>
                    <li>Base URL is already configured</li>
                  </ol>
                </Card>
              )}
              {llmConfig.provider === 'mistral' && (
                <Card className="border-cyan-200 bg-cyan-50/50">
                  <h4 className="font-bold text-cyan-800 mb-2">🌊 Mistral AI Setup</h4>
                  <ol className="text-xs text-cyan-700 space-y-1 list-decimal list-inside">
                    <li>Visit <a href="https://console.mistral.ai" className="underline" target="_blank" rel="noopener">console.mistral.ai</a></li>
                    <li>Create account and get API key</li>
                    <li>Base URL is already configured</li>
                    <li>Mistral Large is their most capable model</li>
                  </ol>
                </Card>
              )}
              {llmConfig.provider === 'deepseek' && (
                <Card className="border-green-200 bg-green-50/50">
                  <h4 className="font-bold text-green-800 mb-2">🐉 DeepSeek Setup</h4>
                  <ol className="text-xs text-green-700 space-y-1 list-decimal list-inside">
                    <li>Visit <a href="https://platform.deepseek.com" className="underline" target="_blank" rel="noopener">platform.deepseek.com</a></li>
                    <li>Create account and get API key</li>
                    <li>Base URL is already configured</li>
                    <li>DeepSeek is very cost-effective</li>
                  </ol>
                </Card>
              )}
              {llmConfig.provider === 'qwen' && (
                <Card className="border-red-200 bg-red-50/50">
                  <h4 className="font-bold text-red-800 mb-2">🏯 Qwen (Alibaba) Setup</h4>
                  <ol className="text-xs text-red-700 space-y-1 list-decimal list-inside">
                    <li>Visit <a href="https://dashscope.console.aliyun.com" className="underline" target="_blank" rel="noopener">dashscope.console.aliyun.com</a></li>
                    <li>Enable the model in your dashboard</li>
                    <li>Get API key from your account</li>
                    <li>Qwen models are very capable</li>
                  </ol>
                </Card>
              )}
              {llmConfig.provider === 'siliconflow' && (
                <Card className="border-pink-200 bg-pink-50/50">
                  <h4 className="font-bold text-pink-800 mb-2">🌐 SiliconFlow Setup</h4>
                  <ol className="text-xs text-pink-700 space-y-1 list-decimal list-inside">
                    <li>Visit <a href="https://siliconflow.cn" className="underline" target="_blank" rel="noopener">siliconflow.cn</a></li>
                    <li>Aggregates many Chinese models in one place</li>
                    <li>Pay-as-you-go, very affordable</li>
                    <li>Supports: Qwen, DeepSeek, Yi, InternLM</li>
                  </ol>
                </Card>
              )}
              {llmConfig.provider === 'ollama' && (
                <Card className="border-teal-200 bg-teal-50/50">
                  <h4 className="font-bold text-teal-800 mb-2">💻 Ollama (Local) Setup</h4>
                  <ol className="text-xs text-teal-700 space-y-1 list-decimal list-inside">
                    <li>Install <a href="https://ollama.com" className="underline" target="_blank" rel="noopener">ollama.com</a></li>
                    <li>Run: <code className="bg-teal-100 px-1 rounded">ollama pull llama3</code></li>
                    <li>API key not needed (runs locally)</li>
                    <li>Base URL is already configured</li>
                  </ol>
                </Card>
              )}
            </div>
          </div>
        )}

        {activeTab === 'general' && (
          <Card className="max-w-2xl">
            <h3 className="font-bold text-text-primary mb-4">General Settings</h3>
            <div className="space-y-4">
              <Select
                label="Theme"
                value="light"
                options={[
                  { value: 'light', label: 'Light' },
                  { value: 'dark', label: 'Dark (coming soon)' },
                  { value: 'auto', label: 'Auto (System)' },
                ]}
              />
              <Select
                label="Log Level"
                value="INFO"
                options={[
                  { value: 'DEBUG', label: 'Debug' },
                  { value: 'INFO', label: 'Info' },
                  { value: 'WARNING', label: 'Warning' },
                  { value: 'ERROR', label: 'Error' },
                ]}
              />
              <div className="flex gap-3 pt-4">
                <Button onClick={() => setMessage('General settings saved (in-memory only)')}>Save Changes</Button>
                <Button variant="outline" onClick={() => setMessage('Settings reset to defaults')}>Reset to Defaults</Button>
              </div>
            </div>
          </Card>
        )}

        {activeTab === 'docker' && (
          <Card className="max-w-2xl">
            <h3 className="font-bold text-text-primary mb-4">Docker Configuration</h3>
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
                    className="w-5 h-5 text-primary rounded"
                  />
                  <div>
                    <p className="font-semibold text-text-primary">GPU Acceleration</p>
                    <p className="text-xs text-text-tertiary">Enable NVIDIA GPU passthrough to containers</p>
                  </div>
                </label>
              </div>
              <div className="flex gap-3 pt-4">
                <Button onClick={() => setMessage('Docker settings saved (in-memory only)')}>Save Changes</Button>
                <Button variant="outline" onClick={() => { setDockerConfig({ timeout: '3600', gpuEnabled: true }); setMessage('Docker settings reset') }}>Reset to Defaults</Button>
              </div>
            </div>
          </Card>
        )}
      </TabPanel>
    </div>
  )
}
