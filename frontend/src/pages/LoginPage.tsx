/**
 * Login page for user authentication.
 */

import { useState } from 'react'
import { GoogleLogin } from '@react-oauth/google'

interface LoginPageProps {
  onLoginSuccess: (email: string, password: string) => Promise<void>
  onLoginSuccessGoogle: (googleToken: string) => Promise<void>
  onNavigateToRegister: () => void
}

export function LoginPage({ onLoginSuccess, onLoginSuccessGoogle, onNavigateToRegister }: LoginPageProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      await onLoginSuccess(email, password)
      // Clear form on success
      setEmail('')
      setPassword('')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSuccess = async (credentialResponse: any) => {
    console.log('Google credential received:', credentialResponse)
    setError(null)
    setIsLoading(true)
    try {
      const token = credentialResponse.credential
      console.log('Token extracted:', token ? 'token present' : 'NO TOKEN')
      if (!token) {
        throw new Error('No credential received from Google')
      }
      console.log('Calling onLoginSuccessGoogle with token...')
      await onLoginSuccessGoogle(token)
      console.log('Google login successful!')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Google login failed'
      console.error('Google login error:', err)
      console.error('Error message:', message)
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleError = () => {
    console.error('Google login error occurred')
    setError('Google login failed - please check your browser console and ensure Google OAuth is properly configured')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 max-w-md w-full">
        <h1 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-2">
          Amzur AI Chat
        </h1>
        <p className="text-center text-gray-600 dark:text-gray-400 mb-8">
          Sign in to your account
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="demo@amzur.com"
              disabled={isLoading}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              disabled={isLoading}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 font-semibold transition-colors"
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        {/* Google OAuth Divider */}
        <div className="mt-6 flex items-center">
          <div className="flex-1 border-t border-gray-300 dark:border-gray-600"></div>
          <span className="px-3 text-sm text-gray-600 dark:text-gray-400">or</span>
          <div className="flex-1 border-t border-gray-300 dark:border-gray-600"></div>
        </div>

        {/* Google OAuth Button */}
        <div className="mt-6 flex justify-center">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
          />
        </div>

        <p className="text-center text-gray-600 dark:text-gray-400 mt-6">
          Don't have an account?{' '}
          <button
            onClick={onNavigateToRegister}
            className="text-blue-500 hover:text-blue-600 font-semibold"
          >
            Sign up
          </button>
        </p>
      </div>
    </div>
  )
}
