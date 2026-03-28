import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/context/AuthContext'

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)
    
    try {
      await login(formData.email, formData.password)
      navigate('/app')
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error en el inicio de sesión')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-purple-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo y título */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-purple-500 rounded-full mb-4">
            <span className="text-3xl">🎵</span>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">Music Streamer</h1>
          <p className="text-gray-300">Tu música, a tu manera</p>
        </div>

        <Card className="bg-black/40 backdrop-blur-lg border-gray-800">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-semibold text-white text-center">
              Iniciar sesión
            </CardTitle>
            <CardDescription className="text-gray-300 text-center">
              Bienvenido de vuelta
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">
                  Email
                </label>
                <Input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="bg-gray-900 border-gray-700 text-white placeholder-gray-400 focus:ring-purple-500"
                  placeholder="tu@email.com"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">
                  Contraseña
                </label>
                <Input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="bg-gray-900 border-gray-700 text-white placeholder-gray-400 focus:ring-purple-500"
                  placeholder="Tu contraseña"
                  required
                />
              </div>

              {error && (
                <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3">
                  <p className="text-red-300 text-sm">{error}</p>
                </div>
              )}
              
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-purple-500 hover:bg-purple-600 text-white font-semibold"
              >
                {isLoading ? 'Iniciando sesión...' : 'Iniciar sesión'}
              </Button>
            </form>
            
            <div className="mt-6 text-center">
              <p className="text-gray-300">
                ¿No tienes cuenta?{' '}
                <Link 
                  to="/register"
                  className="text-purple-500 hover:text-purple-400 font-medium"
                >
                  Regístrate
                </Link>
              </p>
            </div>

            <div className="mt-4 text-center">
              <Link 
                to="/"
                className="text-gray-400 hover:text-white text-sm"
              >
                ← Volver al inicio
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default Login
