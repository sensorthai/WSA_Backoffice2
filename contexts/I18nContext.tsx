"use client"

import React, { createContext, useContext, useState, useEffect } from 'react'
import th from '@/locales/th.json'
import en from '@/locales/en.json'

type Locale = 'th' | 'en'

interface I18nContextType {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: string) => string
}

const dictionaries: Record<Locale, any> = { th, en }

const I18nContext = createContext<I18nContextType | undefined>(undefined)

export function I18nProvider({ children, initialLocale = 'th' }: { children: React.ReactNode, initialLocale?: Locale }) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale)

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale)
    document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000`
    window.location.reload()
  }

  const t = (key: string): string => {
    const keys = key.split('.')
    let value = dictionaries[locale]
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k]
      } else {
        return key // fallback to key
      }
    }
    return typeof value === 'string' ? value : key
  }

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useTranslation() {
  const context = useContext(I18nContext)
  if (context === undefined) {
    throw new Error('useTranslation must be used within an I18nProvider')
  }
  return context
}
