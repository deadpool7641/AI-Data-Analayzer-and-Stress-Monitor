import { createContext, useContext, useState, useEffect } from 'react'

const ThemeContext = createContext()

export const useTheme = () => useContext(ThemeContext)

export const ThemeProvider = ({ children }) => {
  // 1. Initialize from localStorage (so it remembers your choice)
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'dark';
  })

  useEffect(() => {
    // 2. Add/Remove the 'dark' class on the <html> tag
    const root = window.document.documentElement;
    
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // 3. Save to localStorage whenever it changes
    localStorage.setItem('theme', theme);
  }, [theme])

  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'dark' ? 'light' : 'dark'))
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}