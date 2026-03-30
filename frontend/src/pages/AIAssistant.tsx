import { useState, useRef, useEffect } from 'react'
import { Card, Button, Badge } from '@/components/ui'
import { sendChat, getChatStatus } from '@/api/chat'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  isStreaming?: boolean
  toolsUsed?: string[]
}

const SUGGESTED_PROMPTS = [
  { label: '🎯 Dock aspirin to 1HIA', prompt: 'Dock aspirin (CC(=O)Oc1ccccc1C(=O)O) against receptor 1HIA and show me the binding affinity' },
  { label: '📊 Analyze drug-likeness', prompt: "Is aspirin drug-like according to Lipinski's Rule of 5? Calculate its properties." },
  { label: '🧬 Fetch a protein', prompt: 'Fetch protein structure 1ABC from PDB and tell me about it' },
  { label: '🔬 Design variants', prompt: 'Generate 5 molecular variants of aspirin and suggest which might have better binding' },
]

const EXAMPLE_WORKFLOWS = [
  {
    title: 'Virtual Screening Pipeline',
    steps: ['Fetch receptor → Generate pharmacophore → Screen library → Dock top hits → Analyze interactions'],
    icon: '🔍',
  },
  {
    title: 'Lead Optimization',
    steps: ['Dock lead → Analyze interactions → Suggest modifications → Generate variants → Redock'],
    icon: '💊',
  },
  {
    title: 'ADMET Prediction',
    steps: ['Calculate properties → Predict absorption → Assess toxicity → Suggest optimization'],
    icon: '🧪',
  },
]

export function AIAssistant() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<{ provider: string; available: boolean } | null>(null)
  const [showHelp, setShowHelp] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || loading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setLoading(true)
    setError(null)

    try {
      const response = await sendChat(userMessage.content)
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.response || 'AI returned no response. Check your LLM settings.',
        timestamp: new Date(),
        toolsUsed: response.tools_used,
      }
      setMessages((prev) => [...prev, assistantMessage])
      setStatus({ provider: response.provider || 'unknown', available: response.available !== false })
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || 'Failed to connect to AI assistant. Check Settings.'
      setError(msg)
      setMessages((prev) => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `⚠️ **Error**: ${msg}\n\nPlease check:\n1. Is the LLM service running in Settings?\n2. Is your API key valid?\n3. Is Ollama running locally (if using local model)?`,
        timestamp: new Date(),
      }])
    } finally {
      setLoading(false)
    }
  }

  const handleStatus = async () => {
    try {
      const s = await getChatStatus()
      setStatus({ provider: s.provider, available: s.ollama_available })
    } catch (err) {
      console.error('Status check failed:', err)
    }
  }

  const clearMessages = () => setMessages([])

  const handleSuggestedPrompt = (prompt: string) => {
    setInput(prompt)
    inputRef.current?.focus()
  }

  const formatContent = (content: string): string => {
    let formatted = content
    formatted = formatted.replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1 rounded text-xs font-mono">$1</code>')
    formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold">$1</strong>')
    formatted = formatted.replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold mt-3 mb-1">$1</h3>')
    formatted = formatted.replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold mt-4 mb-2">$1</h2>')
    formatted = formatted.replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold mt-4 mb-2">$1</h1>')
    formatted = formatted.replace(/^- (.+)$/gm, '<li class="ml-4">$1</li>')
    formatted = formatted.replace(/^(\d+)\. (.+)$/gm, '<li class="ml-4 list-decimal">$2</li>')
    return formatted
  }

  return (
    <div className="p-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-xl">
            🧬
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">BioDockify AI</h1>
            <p className="text-xs text-text-secondary">
              AI Drug Discovery Assistant {status?.provider ? `• ${status.provider}` : ''}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowHelp(!showHelp)}>
            {showHelp ? 'Hide Help' : 'How to Use'}
          </Button>
          <Button variant="outline" size="sm" onClick={handleStatus}>
            Status
          </Button>
          <Button variant="outline" size="sm" onClick={clearMessages}>
            Clear
          </Button>
        </div>
      </div>

      {/* Help Panel */}
      {showHelp && (
        <Card padding="md" className="mb-4 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200">
          <h3 className="font-bold text-text-primary mb-2">🚀 Quick Start with BioDockify AI</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
            {EXAMPLE_WORKFLOWS.map((wf) => (
              <div key={wf.title} className="bg-white/60 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl">{wf.icon}</span>
                  <span className="font-semibold text-sm">{wf.title}</span>
                </div>
                <p className="text-xs text-text-secondary">{wf.steps}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-blue-200">
            <p className="text-xs text-text-secondary">
              <strong>Try asking:</strong> "Fetch 1HIA from PDB" • "Is this molecule drug-like?" • "Suggest optimizations for better binding" • "Run a virtual screen"
            </p>
          </div>
        </Card>
      )}

      {/* Error banner */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* Status indicator */}
      {status && (
        <div className="mb-4 p-3 bg-surface-secondary rounded-lg flex items-center gap-3">
          <span className={`w-3 h-3 rounded-full ${status.available ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
          <span className="text-sm text-text-secondary">
            {status.available 
              ? `Connected to ${status.provider === 'ollama' ? 'Ollama (Local)' : status.provider}` 
              : 'Offline mode - Configure LLM in Settings'}
          </span>
          <Badge variant={status.available ? 'success' : 'warning'}>
            {status.available ? 'Online' : 'Offline'}
          </Badge>
        </div>
      )}

      {/* Messages */}
      <Card className="flex-1 flex flex-col overflow-hidden" padding="none">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-6xl mb-3">🧬</div>
              <h2 className="text-xl font-bold text-text-primary mb-2">Welcome to BioDockify AI</h2>
              <p className="text-text-secondary mb-6 max-w-md mx-auto">
                Your AI-powered drug discovery assistant. I can help with molecular docking, 
                property prediction, lead optimization, and more!
              </p>
              
              <div className="space-y-2">
                <p className="text-sm font-semibold text-text-tertiary">Try these examples:</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {SUGGESTED_PROMPTS.map((sp) => (
                    <button
                      key={sp.label}
                      onClick={() => handleSuggestedPrompt(sp.prompt)}
                      className="px-3 py-1.5 bg-primary-50 hover:bg-primary-100 text-primary-700 rounded-full text-xs font-medium transition-colors"
                    >
                      {sp.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-8 grid grid-cols-2 gap-4 max-w-lg mx-auto text-left">
                <div className="bg-surface-secondary rounded-lg p-3">
                  <div className="font-semibold text-sm mb-1">🔬 Docking</div>
                  <p className="text-xs text-text-tertiary">Run Vina/GNINA docking simulations</p>
                </div>
                <div className="bg-surface-secondary rounded-lg p-3">
                  <div className="font-semibold text-sm mb-1">📊 Properties</div>
                  <p className="text-xs text-text-tertiary">Calculate MW, LogP, TPSA, drug-likeness</p>
                </div>
                <div className="bg-surface-secondary rounded-lg p-3">
                  <div className="font-semibold text-sm mb-1">🧪 ADMET</div>
                  <p className="text-xs text-text-tertiary">Predict absorption and toxicity</p>
                </div>
                <div className="bg-surface-secondary rounded-lg p-3">
                  <div className="font-semibold text-sm mb-1">💊 Optimization</div>
                  <p className="text-xs text-text-tertiary">Suggest lead compound improvements</p>
                </div>
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-r from-primary to-secondary text-white'
                      : 'bg-surface-secondary text-text-primary'
                  }`}
                >
                  {msg.role === 'assistant' && msg.toolsUsed && msg.toolsUsed.length > 0 && (
                    <div className="flex items-center gap-1 mb-2">
                      <span className="text-xs opacity-60">Using tools:</span>
                      {msg.toolsUsed.map((tool) => (
                        <Badge key={tool} variant="info">
                          {tool}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <div 
                    className="text-sm whitespace-pre-wrap prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: formatContent(msg.content) }}
                  />
                  <p
                    className={`text-xs mt-2 ${
                      msg.role === 'user' ? 'text-white/60' : 'text-text-tertiary'
                    }`}
                  >
                    {msg.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))
          )}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-surface-secondary rounded-2xl px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl animate-bounce">🤖</span>
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
                <p className="text-xs text-text-tertiary mt-1">BioDockify AI is thinking...</p>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-border-light bg-gradient-to-r from-surface-secondary to-transparent">
          <div className="flex gap-3">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder="Ask about molecular docking, drug-likeness, ADMET, lead optimization..."
              className="flex-1 px-4 py-3 bg-white border border-border-light rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              disabled={loading}
            />
            <Button 
              onClick={handleSend} 
              disabled={loading || !input.trim()}
              className="bg-gradient-to-r from-primary to-secondary"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin">⚙️</span>
                  Thinking
                </span>
              ) : (
                'Send'
              )}
            </Button>
          </div>
          <p className="text-xs text-text-tertiary mt-2 text-center">
            Press Enter to send, Shift+Enter for new line • BioDockify AI uses chain-of-thought reasoning
          </p>
        </div>
      </Card>
    </div>
  )
}
