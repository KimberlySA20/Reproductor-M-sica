import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useAuth } from '@/context/AuthContext'

const Profile = () => {
  const [activeTab, setActiveTab] = useState('music')
  const { user, logout } = useAuth()
  
  const [userStats, setUserStats] = useState({
    playlists: 3,
    followers: 42,
    following: 128,
    totalPlayTime: '2,456 min',
    topGenre: 'Rock'
  })

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-900 via-black to-black text-white">
      {/* Header */}
      <header className="bg-gradient-to-b from-purple-900/50 to-transparent">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-8">
            <Link 
              to="/"
              className="text-gray-300 hover:text-white transition-colors"
            >
              ← Inicio
            </Link>
            <Button 
              onClick={logout}
              variant="ghost"
              className="text-gray-300 hover:text-white"
            >
              Cerrar sesión
            </Button>
          </div>
          
          <div className="flex items-end space-x-6 mb-8">
            <div className="w-32 h-32 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center text-4xl font-bold">
              {user?.username?.[0]?.toUpperCase() || 'U'}
            </div>
            <div>
              <h1 className="text-4xl font-bold mb-2">{user?.username}</h1>
              <p className="text-gray-300">{user?.email}</p>
              <div className="flex items-center space-x-6 mt-2 text-sm">
                <span><strong>{userStats.followers}</strong> seguidores</span>
                <span><strong>{userStats.following}</strong> siguiendo</span>
                <span><strong>{userStats.playlists}</strong> playlists</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="container mx-auto px-4">
        <div className="border-b border-gray-800 mb-8">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('music')}
              className={`pb-4 border-b-2 font-medium transition-colors ${
                activeTab === 'music' 
                  ? 'border-white text-white' 
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              Música
            </button>
            <button
              onClick={() => setActiveTab('playlists')}
              className={`pb-4 border-b-2 font-medium transition-colors ${
                activeTab === 'playlists' 
                  ? 'border-white text-white' 
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              Playlists
            </button>
            <button
              onClick={() => setActiveTab('upload')}
              className={`pb-4 border-b-2 font-medium transition-colors ${
                activeTab === 'upload' 
                  ? 'border-white text-white' 
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              Subir Música
            </button>
            <button
              onClick={() => setActiveTab('stats')}
              className={`pb-4 border-b-2 font-medium transition-colors ${
                activeTab === 'stats' 
                  ? 'border-white text-white' 
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              Estadísticas
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'music' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="bg-gray-900/50 border-gray-800 hover:bg-gray-900/70 transition-colors cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
                    🎵
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Mis Canciones</h3>
                    <p className="text-sm text-gray-400">0 canciones</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gray-900/50 border-gray-800 hover:bg-gray-900/70 transition-colors cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                    ❤️
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Canciones Favoritas</h3>
                    <p className="text-sm text-gray-400">0 favoritas</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gray-900/50 border-gray-800 hover:bg-gray-900/70 transition-colors cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center">
                    🎤
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Artistas Seguidos</h3>
                    <p className="text-sm text-gray-400">0 artistas</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'playlists' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="bg-gray-900/50 border-gray-800 hover:bg-gray-900/70 transition-colors cursor-pointer">
              <CardContent className="p-6">
                <div className="w-full h-40 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg mb-4 flex items-center justify-center text-4xl">
                  🎧
                </div>
                <h3 className="font-semibold text-white">Mis Favoritas</h3>
                <p className="text-sm text-gray-400">0 canciones</p>
              </CardContent>
            </Card>
            <Card className="bg-gray-900/50 border-gray-800 hover:bg-gray-900/70 transition-colors cursor-pointer">
              <CardContent className="p-6">
                <div className="w-full h-40 bg-gradient-to-br from-green-600 to-teal-600 rounded-lg mb-4 flex items-center justify-center text-4xl">
                  🎸
                </div>
                <h3 className="font-semibold text-white">Rock Clásico</h3>
                <p className="text-sm text-gray-400">0 canciones</p>
              </CardContent>
            </Card>
            <Card className="bg-gray-900/50 border-gray-800 hover:bg-gray-900/70 transition-colors cursor-pointer">
              <CardContent className="p-6">
                <div className="w-full h-40 bg-gradient-to-br from-orange-600 to-red-600 rounded-lg mb-4 flex items-center justify-center text-4xl">
                  🎹
                </div>
                <h3 className="font-semibold text-white">Jazz Relax</h3>
                <p className="text-sm text-gray-400">0 canciones</p>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'upload' && (
          <div className="max-w-2xl mx-auto">
            <Card className="bg-gray-900/50 border-gray-800">
              <CardContent className="p-8">
                <h3 className="text-xl font-semibold text-white mb-6">Subir Música</h3>
                <div className="border-2 border-dashed border-gray-700 rounded-lg p-12 text-center">
                  <div className="text-4xl mb-4">📁</div>
                  <p className="text-gray-400 mb-4">Arrastra tus archivos de música aquí</p>
                  <Button className="bg-green-500 hover:bg-green-600">
                    Seleccionar Archivos
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="max-w-4xl mx-auto">
            <Card className="bg-gray-900/50 border-gray-800">
              <CardContent className="p-8">
                <h3 className="text-xl font-semibold text-white mb-6">Estadísticas de Escucha</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-400 mb-2">{userStats.totalPlayTime}</div>
                    <p className="text-gray-400">Tiempo total</p>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-400 mb-2">{userStats.topGenre}</div>
                    <p className="text-gray-400">Género favorito</p>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-purple-400 mb-2">{userStats.followers}</div>
                    <p className="text-gray-400">Seguidores</p>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-orange-400 mb-2">{userStats.playlists}</div>
                    <p className="text-gray-400">Playlists</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}

export default Profile
