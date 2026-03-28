import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/context/AuthContext'

const Register = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  
  const { register } = useAuth()
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
    
    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }

    setIsLoading(true)
    
    try {
      await register(formData.email, formData.password, formData.username)
      navigate('/app')
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error en el registro')
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
              Crear cuenta
            </CardTitle>
            <CardDescription className="text-gray-300 text-center">
              Únete a la mejor plataforma de streaming
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">
                  Nombre de usuario
                </label>
                <Input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  className="bg-gray-900 border-gray-700 text-white placeholder-gray-400 focus:ring-purple-500"
                  placeholder="Elige un nombre de usuario"
                  required
                />
              </div>
              
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
                  placeholder="Crea una contraseña"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">
                  Confirmar contraseña
                </label>
                <Input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="bg-gray-900 border-gray-700 text-white placeholder-gray-400 focus:ring-purple-500"
                  placeholder="Confirma tu contraseña"
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
                {isLoading ? 'Creando cuenta...' : 'Crear cuenta'}
              </Button>
            </form>
            
            <div className="mt-6 text-center">
              <p className="text-gray-300">
                ¿Ya tienes cuenta?{' '}
                <Link 
                  to="/login"
                  className="text-purple-500 hover:text-purple-400 font-medium"
                >
                  Inicia sesión
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

export default Register
