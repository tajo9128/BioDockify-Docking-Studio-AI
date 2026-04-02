import { useState } from 'react'

interface FeedbackProps {
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message: string
  suggestion?: string
  onDismiss?: () => void
}

export function StudentFeedback({ type, title, message, suggestion, onDismiss }: FeedbackProps) {
  const [dismissed, setDismissed] = useState(false)
  if (dismissed) return null

  const colors = {
    success: { bg: 'bg-green-900/30', border: 'border-green-600', icon: '✅', text: 'text-green-200' },
    error: { bg: 'bg-red-900/30', border: 'border-red-600', icon: '❌', text: 'text-red-200' },
    warning: { bg: 'bg-yellow-900/30', border: 'border-yellow-600', icon: '⚠️', text: 'text-yellow-200' },
    info: { bg: 'bg-blue-900/30', border: 'border-blue-600', icon: 'ℹ️', text: 'text-blue-200' },
  }[type]

  return (
    <div className={`p-4 rounded-lg border ${colors.bg} ${colors.border} ${colors.text} mb-3`} role="alert">
      <div className="flex items-start gap-3">
        <span className="text-lg flex-shrink-0">{colors.icon}</span>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm">{title}</h4>
          <p className="text-xs mt-1 opacity-90">{message}</p>
          {suggestion && (
            <div className="mt-2 p-2 bg-black/20 rounded text-xs">
              <span className="font-medium">💡 Try this:</span> {suggestion}
            </div>
          )}
        </div>
        <button
          onClick={() => { setDismissed(true); onDismiss?.() }}
          className="text-gray-400 hover:text-white flex-shrink-0"
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
