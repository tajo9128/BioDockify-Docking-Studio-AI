import { useState, useCallback } from 'react'
import { Locale, t, getLocale, setLocale } from './index'

export function useTranslation() {
  const [locale, setLocaleState] = useState<Locale>(getLocale())

  const changeLocale = useCallback((newLocale: Locale) => {
    setLocale(newLocale)
    setLocaleState(newLocale)
  }, [])

  const translate = useCallback(
    (key: string) => t(locale, key),
    [locale]
  )

  return { t: translate, locale, changeLocale }
}
