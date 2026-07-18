'use client'

import { useState } from 'react'

export function ThemeSwitcher() {
  const [theme, setTheme] = useState(() =>
    typeof document === 'undefined'
      ? 'mist'
      : document.documentElement.getAttribute('data-876-theme') || 'mist'
  )

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newTheme = e.target.value
    setTheme(newTheme)
    if (newTheme === 'mist') {
      document.documentElement.removeAttribute('data-876-theme')
    } else {
      document.documentElement.setAttribute('data-876-theme', newTheme)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <label
        htmlFor="theme-switcher"
        className="text-muted-foreground text-sm font-medium"
      >
        Theme:
      </label>
      <select
        id="theme-switcher"
        value={theme}
        onChange={handleChange}
        className="border-input bg-background text-foreground focus-visible:ring-ring h-8 rounded-md border px-2 py-1 text-sm shadow-sm focus-visible:ring-1 focus-visible:outline-none"
      >
        <option value="mist">Mist</option>
      </select>
    </div>
  )
}
