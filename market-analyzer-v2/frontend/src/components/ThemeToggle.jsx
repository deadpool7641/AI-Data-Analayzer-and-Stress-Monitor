import { useTheme } from '../contexts/ThemeContext'

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()

  return (
    <button 
      onClick={toggleTheme} 
      // Update: Dynamic styling so the button looks good in both modes
      className={`
        p-2 rounded transition-colors duration-200
        ${theme === 'dark' 
          ? 'hover:bg-gray-700 text-yellow-300' // Dark mode styles
          : 'hover:bg-gray-200 text-gray-800'   // Light mode styles
        }
      `}
      aria-label="Toggle Dark Mode"
    >
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  )
}