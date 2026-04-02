import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

interface AccessibilityContextType {
  highContrast: boolean
  reducedMotion: boolean
  fontSize: number
  toggleHighContrast: () => void
  toggleReducedMotion: () => void
  setFontSize: (size: number) => void
}

const AccessibilityContext = createContext<AccessibilityContextType>({
  highContrast: false,
  reducedMotion: false,
  fontSize: 16,
  toggleHighContrast: () => {},
  toggleReducedMotion: () => {},
  setFontSize: () => {},
})

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [highContrast, setHighContrast] = useState(() => {
    return localStorage.getItem('a11y-contrast') === 'true'
  })
  const [reducedMotion, setReducedMotion] = useState(() => {
    return localStorage.getItem('a11y-motion') === 'true'
  })
  const [fontSize, setFontSizeState] = useState(() => {
    return parseInt(localStorage.getItem('a11y-fontsize') || '16', 10)
  })

  const toggleHighContrast = useCallback(() => {
    setHighContrast(prev => {
      localStorage.setItem('a11y-contrast', String(!prev))
      return !prev
    })
  }, [])

  const toggleReducedMotion = useCallback(() => {
    setReducedMotion(prev => {
      localStorage.setItem('a11y-motion', String(!prev))
      return !prev
    })
  }, [])

  const setFontSize = useCallback((size: number) => {
    const clamped = Math.max(12, Math.min(24, size))
    setFontSizeState(clamped)
    localStorage.setItem('a11y-fontsize', String(clamped))
  }, [])

  return (
    <AccessibilityContext.Provider
      value={{ highContrast, reducedMotion, fontSize, toggleHighContrast, toggleReducedMotion, setFontSize }}
    >
      <div className={highContrast ? 'high-contrast' : ''} style={{ fontSize }}>
        {children}
      </div>
    </AccessibilityContext.Provider>
  )
}

export function useAccessibility() {
  return useContext(AccessibilityContext)
}
