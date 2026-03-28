import React, { useState, useRef, useEffect } from 'react'
import { usePlayer } from '@/context/PlayerContext'
import { useAuth } from '@/context/AuthContext'
import { musicAPI } from '@/services/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

interface Track {
  id: string
  title: string
  artist: string
  duration: number
  url: string
  genre?: string
  album?: string
}

const Player = () => {
  const { isAuthenticated } = useAuth()
  const { 
    currentTrack, 
    isPlaying, 
    volume, 
    play, 
    pause, 
    setVolume, 
    loadTrack 
  } = usePlayer()
  
  const [tracks, setTracks] = useState<Track[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  
  const audioRef = useRef<HTMLAudioElement>(null)

  // Cargar tracks desde la API
  useEffect(() => {
    const loadTracks = async () => {
      setIsLoading(true)
      try {
        const response = await musicAPI.getTracks()
        const tracksWithUrls = response.data.map((track: any) => ({
          ...track,
          url: `/api/music/stream/${track.id}`
        }))
        setTracks(tracksWithUrls)
      } catch (error) {
        console.error('Error loading tracks:', error)
        // Fallback a tracks simulados
        const fallbackTracks: Track[] = [
          { id: '1', title: 'Rock Anthem', artist: 'The Rockers', duration: 180, url: '/api/music/stream/1', genre: 'Rock', album: 'Greatest Hits' },
          { id: '2', title: 'Jazz Morning', artist: 'Smooth Jazz Quartet', duration: 240, url: '/api/music/stream/2', genre: 'Jazz', album: 'Morning Sessions' },
          { id: '3', title: 'Electronic Beats', artist: 'DJ Synth', duration: 200, url: '/api/music/stream/3', genre: 'Electronic', album: 'Digital Dreams' },
          { id: '4', title: 'Acoustic Sunset', artist: 'Folk Singer', duration: 160, url: '/api/music/stream/4', genre: 'Acoustic', album: 'Unplugged' },
          { id: '5', title: 'Pop Sensation', artist: 'Pop Stars', duration: 220, url: '/api/music/stream/5', genre: 'Pop', album: 'Chart Toppers' },
          { id: '6', title: 'Classical Symphony', artist: 'Orchestra', duration: 300, url: '/api/music/stream/6', genre: 'Classical', album: 'Masterpieces' },
          { id: '7', title: 'Hip Hop Beats', artist: 'MC Flow', duration: 195, url: '/api/music/stream/7', genre: 'Hip Hop', album: 'Street Life' },
          { id: '8', title: 'Country Roads', artist: 'Nashville Stars', duration: 210, url: '/api/music/stream/8', genre: 'Country', album: 'Heartland' }
        ]
        setTracks(fallbackTracks)
      } finally {
        setIsLoading(false)
      }
    }
    
    if (isAuthenticated) {
      loadTracks()
    }
  }, [isAuthenticated])

  // Control del audio
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const updateTime = () => setCurrentTime(audio.currentTime)
    const updateDuration = () => setDuration(audio.duration)

    audio.addEventListener('timeupdate', updateTime)
    audio.addEventListener('loadedmetadata', updateDuration)

    return () => {
      audio.removeEventListener('timeupdate', updateTime)
      audio.removeEventListener('loadedmetadata', updateDuration)
    }
  }, [currentTrack])

  const handleTrackSelect = (track: Track) => {
    loadTrack(track)
    if (audioRef.current) {
      audioRef.current.src = track.url
      audioRef.current.load()
    }
  }

  const togglePlayPause = () => {
    if (isPlaying) {
      pause()
      audioRef.current?.pause()
    } else {
      play()
      audioRef.current?.play()
    }
  }

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume)
    if (audioRef.current) {
      audioRef.current.volume = newVolume
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-900 via-black to-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-24 h-24 bg-purple-500 rounded-full mx-auto mb-6 flex items-center justify-center text-4xl">
            🎵
          </div>
          <h1 className="text-3xl font-bold text-white mb-4">Reproductor</h1>
          <p className="text-gray-300 mb-8">Por favor inicia sesión para acceder al reproductor</p>
          <Button className="bg-purple-500 hover:bg-purple-600 text-white">
            Iniciar Sesión
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-900 via-black to-black">
      {/* Header */}
      <header className="bg-black/80 backdrop-blur-md sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-8">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                  <span className="text-sm">🎵</span>
                </div>
                <span className="text-white font-bold text-xl">Music Streamer</span>
              </div>
              <nav className="hidden md:flex space-x-6">
                <a href="/" className="text-gray-300 hover:text-white transition-colors">
                  ← Inicio
                </a>
                <a href="/profile" className="text-gray-300 hover:text-white transition-colors">
                  Perfil
                </a>
                <span className="text-purple-500 font-medium">Reproductor</span>
              </nav>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Lista de canciones */}
          <div className="lg:col-span-2">
            <h1 className="text-3xl font-bold text-white mb-6 flex items-center">
              🎵 Tu Música
            </h1>
            
            <Card className="bg-black/40 backdrop-blur-lg border-gray-800">
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="text-center py-12">
                    <div className="text-gray-300">Cargando música...</div>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-800">
                    {tracks.map((track, index) => (
                      <div
                        key={track.id}
                        className={`group flex items-center p-4 hover:bg-gray-800/50 transition-colors cursor-pointer ${
                          currentTrack?.id === track.id ? 'bg-gray-800/50' : ''
                        }`}
                        onClick={() => handleTrackSelect(track)}
                      >
                        <div className="w-12 h-12 bg-gradient-to-br from-gray-700 to-gray-800 rounded flex items-center justify-center mr-4">
                          {currentTrack?.id === track.id && isPlaying ? (
                            <div className="flex space-x-1">
                              <div className="w-1 h-3 bg-purple-500 animate-pulse"></div>
                              <div className="w-1 h-3 bg-purple-500 animate-pulse delay-75"></div>
                              <div className="w-1 h-3 bg-purple-500 animate-pulse delay-150"></div>
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm">{index + 1}</span>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-white">{track.title}</div>
                          <div className="text-sm text-gray-400">{track.artist}</div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <span className="text-sm text-gray-400 hidden md:block">{track.album}</span>
                          {track.genre && (
                            <span className="inline-block text-xs bg-gray-700 px-2 py-1 rounded text-gray-300">
                              {track.genre}
                            </span>
                          )}
                          <span className="text-sm text-gray-400">{formatTime(track.duration)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Reproductor lateral */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <Card className="bg-black/40 backdrop-blur-lg border-gray-800">
                <CardContent className="p-6">
                  {currentTrack ? (
                    <>
                      {/* Album Art */}
                      <div className="w-full aspect-square bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg mb-6 flex items-center justify-center text-6xl shadow-2xl">
                        🎵
                      </div>
                      
                      {/* Track Info */}
                      <div className="text-center mb-6">
                        <h3 className="text-xl font-bold text-white mb-2">{currentTrack.title}</h3>
                        <p className="text-gray-400">{currentTrack.artist}</p>
                        <p className="text-sm text-gray-500">{currentTrack.album}</p>
                      </div>

                      {/* Barra de progreso */}
                      <div className="mb-6">
                        <div className="flex justify-between text-xs text-gray-400 mb-2">
                          <span>{formatTime(currentTime)}</span>
                          <span>{formatTime(duration)}</span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-1">
                          <div 
                            className="bg-purple-500 h-1 rounded-full transition-all"
                            style={{ width: duration ? `${(currentTime / duration) * 100}%` : '0%' }}
                          />
                        </div>
                      </div>

                      {/* Controles */}
                      <div className="flex items-center justify-center space-x-6 mb-6">
                        <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
                          ⏮️
                        </Button>
                        <Button
                          onClick={togglePlayPause}
                          size="icon"
                          className="w-14 h-14 bg-purple-500 hover:bg-purple-600 rounded-full"
                        >
                          {isPlaying ? '⏸️' : '▶️'}
                        </Button>
                        <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
                          ⏭️
                        </Button>
                      </div>

                      {/* Volumen */}
                      <div className="flex items-center space-x-3">
                        <span className="text-gray-400">🔊</span>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.1"
                          value={volume}
                          onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                          className="flex-1 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                        />
                        <span className="text-sm text-gray-400 w-10">{Math.round(volume * 100)}%</span>
                      </div>

                      {/* Streaming Info */}
                      <div className="mt-6 pt-4 border-t border-gray-800">
                        <div className="text-xs text-gray-400 text-center">
                          🎵 Streaming desde: http://localhost:3001/api/music/stream/{currentTrack.id}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-12">
                      <div className="w-24 h-24 bg-gray-800 rounded-full mx-auto mb-4 flex items-center justify-center text-4xl">
                        🎵
                      </div>
                      <p className="text-gray-400">Selecciona una canción para comenzar</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Audio element oculto */}
      <audio ref={audioRef} />
    </div>
  )
}

export default Player
