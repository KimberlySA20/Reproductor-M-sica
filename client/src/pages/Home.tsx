import React, { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/context/AuthContext'

const Home = () => {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()

  // Redirección automática cuando se autentica
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/profile', { replace: true })
    }
  }, [isAuthenticated, navigate])

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-900 via-black to-black">
      {/* Navigation Header */}
      <header className="bg-black/80 backdrop-blur-md sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                <span className="text-sm">🎵</span>
              </div>
              <span className="text-white font-bold text-xl">Music Streamer</span>
            </div>
            <nav className="hidden md:flex space-x-6">
              <Link to="/login" className="text-gray-300 hover:text-white transition-colors">
                Login
              </Link>
              <Link to="/register" className="text-gray-300 hover:text-white transition-colors">
                Registrarse
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
            Tu Música,{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">
              Tu Manera
            </span>
          </h1>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            La plataforma de streaming que te da control total sobre tu música. 
            Disfruta de una experiencia única tipo Spotify.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register">
              <Button size="lg" className="bg-purple-500 hover:bg-purple-600 text-white px-8 py-3 text-lg">
                Comenzar Gratis
              </Button>
            </Link>
            <Link to="/login">
              <Button variant="outline" size="lg" className="border-white text-white hover:bg-white hover:text-black px-8 py-3 text-lg">
                Iniciar Sesión
              </Button>
            </Link>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          <Card className="bg-white/10 backdrop-blur-lg border-gray-700 hover:bg-white/20 transition-all cursor-pointer group">
            <CardHeader>
              <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <span className="text-2xl">🎧</span>
              </div>
              <CardTitle className="text-white text-xl">Reproductor</CardTitle>
              <CardDescription className="text-gray-300">
                Escucha tu música favorita con el mejor reproductor streaming
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-purple-400 font-medium flex items-center group-hover:text-purple-300">
                Inicia sesión para acceder →
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-lg border-gray-700 hover:bg-white/20 transition-all cursor-pointer group">
            <CardHeader>
              <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <span className="text-2xl">🔐</span>
              </div>
              <CardTitle className="text-white text-xl">Acceder</CardTitle>
              <CardDescription className="text-gray-300">
                Inicia sesión o regístrate para acceder a todas las funciones
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-blue-400 font-medium flex items-center group-hover:text-blue-300">
                Iniciar sesión →
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-lg border-gray-700 hover:bg-white/20 transition-all cursor-pointer group">
            <CardHeader>
              <div className="w-12 h-12 bg-pink-500 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <span className="text-2xl">👤</span>
              </div>
              <CardTitle className="text-white text-xl">Perfil</CardTitle>
              <CardDescription className="text-gray-300">
                Gestiona tu cuenta, playlists y preferencias musicales
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-pink-400 font-medium flex items-center group-hover:text-pink-300">
                Requiere login →
              </div>
            </CardContent>
          </Card>
        </div>

        {/* System Status */}
        <Card className="bg-purple-900/20 backdrop-blur-lg border-purple-700/50 max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle className="text-purple-400 text-xl flex items-center">
              🚀 Estado del Sistema
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span className="text-gray-300">Frontend: React 18 + Tailwind CSS</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span className="text-gray-300">Backend: Node.js + Express + TypeScript</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span className="text-gray-300">Database: MongoDB Conectada</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span className="text-gray-300">Workers: Streaming Activos</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span className="text-gray-300">Auth: JWT Implementation Ready</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span className="text-gray-300">UI: Spotify-style Design</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}

export default Home
