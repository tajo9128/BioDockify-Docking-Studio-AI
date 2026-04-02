import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

interface TooltipProps {
  content: string
  technical?: string
  position?: 'top' | 'bottom' | 'left' | 'right'
  children: React.ReactNode
}

export function SmartTooltip({ content, technical, position = 'top', children }: TooltipProps) {
  const [show, setShow] = useState(false)
  const [mode, setMode] = useState<'simple' | 'technical'>('simple')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const pref = localStorage.getItem('tooltip-mode')
    if (pref === 'technical') setMode('technical')
    const seen = localStorage.getItem('tooltips-seen')
    if (seen) {
      try {
        const seenSet = new Set(JSON.parse(seen))
        if (seenSet.has(content)) setSaved(true)
      } catch {}
    }
  }, [content])

  const handleSave = () => {
    const seen = localStorage.getItem('tooltips-seen')
    const seenSet = seen ? new Set(JSON.parse(seen)) : new Set()
    seenSet.add(content)
    localStorage.setItem('tooltips-seen', JSON.stringify([...seenSet]))
    setSaved(true)
  }

  const posClass = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  }[position]

  return (
    <span className="relative inline-block">
      <span
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onFocus={() => setShow(true)}
        onBlur={() => setShow(false)}
        className="cursor-help border-b border-dashed border-cyan-400 text-cyan-300"
        tabIndex={0}
        role="tooltip"
        aria-label={mode === 'simple' ? content : technical || content}
      >
        {children}
      </span>

      {show && (
        <div
          className={`absolute z-50 w-64 p-3 bg-gray-800 border border-gray-600 rounded-lg shadow-xl text-xs ${posClass}`}
          role="tooltip"
        >
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={() => {
                const newMode = mode === 'simple' ? 'technical' : 'simple'
                setMode(newMode)
                localStorage.setItem('tooltip-mode', newMode)
              }}
              className="px-2 py-0.5 bg-gray-700 hover:bg-gray-600 rounded text-gray-300 transition-colors"
              aria-label={`Switch to ${mode === 'simple' ? 'technical' : 'simple'} explanation`}
            >
              {mode === 'simple' ? '🔬 Technical' : '📖 Simple'}
            </button>
            {!saved && (
              <button
                onClick={handleSave}
                className="px-2 py-0.5 bg-cyan-700 hover:bg-cyan-600 rounded text-cyan-200 transition-colors"
              >
                💾 Save
              </button>
            )}
          </div>
          <p className="text-gray-200 leading-relaxed">
            {mode === 'simple' ? content : technical || content}
          </p>
          {mode === 'technical' && technical && (
            <p className="mt-2 pt-2 border-t border-gray-600 text-gray-400 italic">
              {technical}
            </p>
          )}
        </div>
      )}
    </span>
  )
}
