import { useState } from 'react'
import { Loader2, AlertCircle } from 'lucide-react'

export default function LoginForm({ onSubmit, loading, error }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  function handleFormSubmit(e) {
    e.preventDefault()
    if (!onSubmit) return
    onSubmit({ email, password })
  }

  return (
    <form onSubmit={handleFormSubmit} className="space-y-6">
      
      {/* Error Message Display */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm animate-in fade-in slide-in-from-top-2">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Email
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-2.5 rounded-2xl bg-gray-900/60 border border-gray-700 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          placeholder="you@example.com"
          required
          disabled={loading}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Password
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-2.5 rounded-2xl bg-gray-900/60 border border-gray-700 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
          placeholder="••••••••"
          required
          autoComplete="current-password"
          disabled={loading}
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 rounded-2xl bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold shadow-lg hover:from-blue-400 hover:to-purple-400 disabled:opacity-60 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            Signing in...
          </>
        ) : (
          'Login'
        )}
      </button>
    </form>
  )
}