import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { usePlayer } from '@/context/PlayerContext'
import { musicAPI } from '@/services/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface Track {
  _id: string
  title: string
  artist: string
  duration: number
  originalName: string
  mimetype: string
  size: number
  mediaType: 'audio' | 'video'
  playCount: number
  createdAt: string
  isPublic?: boolean
  uploadedBy?: string
  convertedFrom?: { originalName: string; originalFormat: string }
}

type Tab = 'player' | 'upload' | 'convert'

const formatTime = (s: number) => {
  if (!s || isNaN(s)) return '0:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

const formatSize = (bytes: number) => {
  if (!bytes) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
}

// Color gradients for track covers
const gradients = [
  'from-purple-600 to-blue-600',
  'from-pink-600 to-rose-600',
  'from-emerald-600 to-teal-600',
  'from-orange-600 to-amber-500',
  'from-violet-600 to-purple-600',
  'from-cyan-600 to-blue-500',
  'from-fuchsia-600 to-pink-500',
  'from-indigo-600 to-violet-600',
]

const getGradient = (i: number) => gradients[i % gradients.length]

// Icons as components
const IconPlay = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="white"><polygon points="5,3 19,12 5,21"/></svg>
)
const IconPause = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="white"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
)
const IconPrev = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>
)
const IconNext = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
)
const IconMusic = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-purple-300"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
)
const IconDownload = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
)
const IconTrash = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3,6 5,6 21,6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
)
const IconUpload = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
)
const IconConvert = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="17,1 21,5 17,9"/><path d="M3 11V9a4 4 0 014-4h14"/><polyline points="7,23 3,19 7,15"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg>
)
const IconVideo = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-pink-300"><polygon points="23,7 16,12 23,17"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
)
const IconVolume = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400"><polygon points="11,5 6,9 2,9 2,15 6,15 11,19"/><path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07"/></svg>
)
const IconArrow = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-purple-400"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
)

const Dashboard = () => {
  const { user, logout } = useAuth()
  const { currentTrack, isPlaying, volume, play, pause, setVolume, loadTrack } = usePlayer()

  const [tab, setTab] = useState<Tab>('player')
  const [tracks, setTracks] = useState<Track[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  // Upload
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadTitle, setUploadTitle] = useState('')
  const [uploadArtist, setUploadArtist] = useState('')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)

  // Convert
  const [convertId, setConvertId] = useState<string | null>(null)
  const [convertFormat, setConvertFormat] = useState('mp3')
  const [isConverting, setIsConverting] = useState(false)
  const [convertMsg, setConvertMsg] = useState('')

  const audioRef = useRef<HTMLAudioElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchTracks = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await musicAPI.getTracks()
      setTracks(res.data || [])
    } catch (e) {
      console.error('Error loading tracks:', e)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { fetchTracks() }, [fetchTracks])

  useEffect(() => {
    const el = currentTrack?.mediaType === 'video' ? videoRef.current : audioRef.current
    if (!el) return
    const onTime = () => setCurrentTime(el.currentTime)
    const onMeta = () => setDuration(el.duration)
    const onEnd = () => { pause(); setCurrentTime(0) }
    el.addEventListener('timeupdate', onTime)
    el.addEventListener('loadedmetadata', onMeta)
    el.addEventListener('ended', onEnd)
    return () => {
      el.removeEventListener('timeupdate', onTime)
      el.removeEventListener('loadedmetadata', onMeta)
      el.removeEventListener('ended', onEnd)
    }
  }, [currentTrack, pause])

  useEffect(() => {
    const el = currentTrack?.mediaType === 'video' ? videoRef.current : audioRef.current
    if (!el) return
    if (isPlaying) { el.play().catch(() => {}) } else { el.pause() }
  }, [isPlaying, currentTrack])

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume
    if (videoRef.current) videoRef.current.volume = volume
  }, [volume])

  const handleTrackSelect = (track: Track) => {
    loadTrack(track)
    setCurrentTime(0)
    setDuration(0)
    const url = musicAPI.getStreamUrl(track._id)
    if (track.mediaType === 'video') {
      if (videoRef.current) { videoRef.current.src = url; videoRef.current.load() }
    } else {
      if (audioRef.current) { audioRef.current.src = url; audioRef.current.load() }
    }
    setTimeout(() => play(), 200)
  }

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = currentTrack?.mediaType === 'video' ? videoRef.current : audioRef.current
    if (!el || !duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    el.currentTime = ((e.clientX - rect.left) / rect.width) * duration
  }

  const handlePrev = () => {
    if (!currentTrack || tracks.length === 0) return
    const idx = tracks.findIndex(t => t._id === currentTrack._id)
    handleTrackSelect(idx > 0 ? tracks[idx - 1] : tracks[tracks.length - 1])
  }

  const handleNext = () => {
    if (!currentTrack || tracks.length === 0) return
    const idx = tracks.findIndex(t => t._id === currentTrack._id)
    handleTrackSelect(idx < tracks.length - 1 ? tracks[idx + 1] : tracks[0])
  }

  const handleDownload = async (track: Track) => {
    try { await musicAPI.download(track._id, track.originalName) }
    catch { alert('Error al descargar') }
  }

  const handleUpload = async () => {
    if (!uploadFile) return
    setIsUploading(true)
    setUploadProgress(0)
    try {
      const fd = new FormData()
      fd.append('file', uploadFile)
      if (uploadTitle) fd.append('title', uploadTitle)
      if (uploadArtist) fd.append('artist', uploadArtist)
      await musicAPI.upload(fd, setUploadProgress)
      setUploadFile(null)
      setUploadTitle('')
      setUploadArtist('')
      if (fileInputRef.current) fileInputRef.current.value = ''
      await fetchTracks()
    } catch (e: any) {
      alert(e.response?.data?.error || 'Error al subir archivo')
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  const handleConvert = async () => {
    if (!convertId) return
    setIsConverting(true)
    setConvertMsg('')
    try {
      const res = await musicAPI.convert(convertId, convertFormat)
      setConvertMsg(res.message || 'Conversion exitosa')
      await fetchTracks()
    } catch (e: any) {
      setConvertMsg(e.response?.data?.error || 'Error en la conversion')
    } finally {
      setIsConverting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Eliminar este archivo?')) return
    try {
      await musicAPI.delete(id)
      if (currentTrack?._id === id) { loadTrack(null); pause() }
      await fetchTracks()
    } catch (e: any) {
      alert(e.response?.data?.error || 'Error al eliminar')
    }
  }

  const audioTracks = tracks.filter(t => t.mediaType === 'audio')
  const videoTracks = tracks.filter(t => t.mediaType === 'video')
  const myUploads = tracks.filter(t => t.uploadedBy === user?._id && !t.convertedFrom)
  const myConverted = tracks.filter(t => t.uploadedBy === user?._id && !!t.convertedFrom)

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* ===== SIDEBAR + MAIN ===== */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 bg-black flex flex-col flex-shrink-0 border-r border-white/5 hidden lg:flex">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                <IconMusic />
              </div>
              <span className="font-bold text-lg">Music Streamer</span>
            </div>

            <nav className="space-y-1">
              {([['player', 'Reproductor', 'M9 18V5l12-2v13'], ['upload', 'Subir', 'M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12'], ['convert', 'Convertir', '']] as [Tab, string, string][]).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    tab === key
                      ? 'bg-purple-600/20 text-purple-300'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {key === 'player' && <IconMusic />}
                  {key === 'upload' && <IconUpload />}
                  {key === 'convert' && <IconConvert />}
                  {label}
                </button>
              ))}
            </nav>
          </div>

          <div className="mt-auto p-4 border-t border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-full flex items-center justify-center text-sm font-bold">
                {(user?.username || user?.email || '?')[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{user?.username || user?.email}</div>
              </div>
              <button onClick={logout} className="text-gray-500 hover:text-white text-xs transition-colors">
                Salir
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-gradient-to-b from-purple-950/40 via-gray-950 to-black">
          {/* Mobile header */}
          <div className="lg:hidden sticky top-0 z-20 bg-black/80 backdrop-blur-lg border-b border-white/5 px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                  <IconMusic />
                </div>
                <span className="font-bold">Music Streamer</span>
              </div>
              <div className="flex gap-1">
                {([['player', 'P'], ['upload', 'S'], ['convert', 'C']] as [Tab, string][]).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setTab(key)}
                    className={`w-9 h-9 rounded-full text-xs font-bold transition-all ${
                      tab === key ? 'bg-purple-600 text-white' : 'text-gray-400 hover:bg-white/10'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="p-6">
            {/* ====== TAB: REPRODUCTOR ====== */}
            {tab === 'player' && (
              <div className="space-y-8">
                {/* Hero greeting */}
                <div>
                  <h1 className="text-3xl font-bold mb-1">
                    Hola, {user?.username || 'Usuario'}
                  </h1>
                  <p className="text-gray-400">Tu biblioteca musical</p>
                </div>

                {/* Quick play cards */}
                {audioTracks.length > 0 && (
                  <div>
                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                      {audioTracks.slice(0, 8).map((track, i) => (
                        <button
                          key={track._id}
                          onClick={() => handleTrackSelect(track)}
                          className={`group flex items-center gap-3 bg-white/5 hover:bg-white/10 rounded-lg overflow-hidden transition-all ${
                            currentTrack?._id === track._id ? 'ring-1 ring-purple-500 bg-purple-500/10' : ''
                          }`}
                        >
                          <div className={`w-12 h-12 bg-gradient-to-br ${getGradient(i)} flex items-center justify-center flex-shrink-0`}>
                            {currentTrack?._id === track._id && isPlaying ? (
                              <div className="flex gap-0.5 items-end h-5">
                                <div className="w-1 bg-white animate-pulse rounded-full" style={{height: '60%', animationDelay: '0ms'}} />
                                <div className="w-1 bg-white animate-pulse rounded-full" style={{height: '100%', animationDelay: '150ms'}} />
                                <div className="w-1 bg-white animate-pulse rounded-full" style={{height: '40%', animationDelay: '300ms'}} />
                              </div>
                            ) : (
                              <IconMusic />
                            )}
                          </div>
                          <span className="text-sm font-medium truncate pr-3">{track.title}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Songs list */}
                <div>
                  <h2 className="text-xl font-bold mb-4">Canciones</h2>
                  {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                      <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : audioTracks.length === 0 ? (
                    <div className="text-center py-20 bg-white/[0.02] rounded-2xl border border-white/5">
                      <div className="w-16 h-16 mx-auto mb-4 bg-purple-500/10 rounded-full flex items-center justify-center"><IconMusic /></div>
                      <p className="text-gray-400 mb-4">Tu biblioteca esta vacia</p>
                      <Button onClick={() => setTab('upload')} className="bg-purple-600 hover:bg-purple-500">Subir musica</Button>
                    </div>
                  ) : (
                    <div className="bg-white/[0.02] rounded-2xl border border-white/5 overflow-hidden">
                      {/* Table header */}
                      <div className="grid grid-cols-[40px_1fr_120px_80px_60px] gap-4 px-5 py-3 text-xs text-gray-500 uppercase tracking-wider border-b border-white/5">
                        <span>#</span>
                        <span>Titulo</span>
                        <span className="hidden md:block">Album</span>
                        <span className="text-right">Duracion</span>
                        <span />
                      </div>
                      {audioTracks.map((track, i) => (
                        <div
                          key={track._id}
                          onClick={() => handleTrackSelect(track)}
                          className={`group grid grid-cols-[40px_1fr_120px_80px_60px] gap-4 px-5 py-2.5 items-center cursor-pointer transition-all hover:bg-white/5 ${
                            currentTrack?._id === track._id ? 'bg-purple-500/5' : ''
                          }`}
                        >
                          {/* Number / playing indicator */}
                          <div className="flex items-center justify-center">
                            {currentTrack?._id === track._id && isPlaying ? (
                              <div className="flex gap-[2px] items-end h-4">
                                <div className="w-[3px] bg-purple-400 rounded-full animate-pulse" style={{height: '50%'}} />
                                <div className="w-[3px] bg-purple-400 rounded-full animate-pulse" style={{height: '100%', animationDelay: '150ms'}} />
                                <div className="w-[3px] bg-purple-400 rounded-full animate-pulse" style={{height: '70%', animationDelay: '300ms'}} />
                              </div>
                            ) : (
                              <>
                                <span className="text-gray-500 text-sm group-hover:hidden">{i + 1}</span>
                                <span className="hidden group-hover:block text-white"><IconPlay size={12} /></span>
                              </>
                            )}
                          </div>

                          {/* Title + artist + cover */}
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-10 h-10 rounded bg-gradient-to-br ${getGradient(i)} flex items-center justify-center flex-shrink-0`}>
                              <IconMusic />
                            </div>
                            <div className="min-w-0">
                              <div className={`text-sm font-medium truncate ${currentTrack?._id === track._id ? 'text-purple-400' : 'text-white'}`}>
                                {track.title}
                              </div>
                              <div className="text-xs text-gray-500 truncate">{track.artist}</div>
                            </div>
                          </div>

                          {/* Format tag */}
                          <div className="hidden md:block">
                            <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-gray-500 uppercase">
                              {track.originalName.split('.').pop()}
                            </span>
                          </div>

                          {/* Duration */}
                          <div className="text-right text-sm text-gray-500">{formatTime(track.duration)}</div>

                          {/* Actions */}
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={(e) => { e.stopPropagation(); handleDownload(track) }} className="p-1.5 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors" title="Descargar">
                              <IconDownload />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); handleDelete(track._id) }} className="p-1.5 hover:bg-white/10 rounded-full text-gray-400 hover:text-red-400 transition-colors" title="Eliminar">
                              <IconTrash />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Videos section */}
                {videoTracks.length > 0 && (
                  <div>
                    <h2 className="text-xl font-bold mb-4">Videos</h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                      {videoTracks.map((track, i) => (
                        <button
                          key={track._id}
                          onClick={() => handleTrackSelect(track)}
                          className={`group text-left rounded-xl overflow-hidden bg-white/[0.03] hover:bg-white/[0.08] transition-all border border-white/5 ${
                            currentTrack?._id === track._id ? 'ring-1 ring-purple-500' : ''
                          }`}
                        >
                          <div className={`aspect-video bg-gradient-to-br ${getGradient(i + 3)} flex items-center justify-center relative`}>
                            <IconVideo />
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                              <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center shadow-xl"><IconPlay size={20} /></div>
                            </div>
                          </div>
                          <div className="p-3">
                            <div className="text-sm font-medium truncate">{track.title}</div>
                            <div className="text-xs text-gray-500 truncate">{track.artist} &middot; {formatSize(track.size)}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ====== TAB: SUBIR ====== */}
            {tab === 'upload' && (
              <div className="max-w-3xl mx-auto space-y-8">
                <div>
                  <h1 className="text-3xl font-bold mb-1">Subir Archivo</h1>
                  <p className="text-gray-400">Agrega musica o videos a tu biblioteca</p>
                </div>

                {/* Upload form */}
                <div className="bg-white/[0.03] rounded-2xl border border-white/5 p-6 space-y-5">
                  <div
                    className="border-2 border-dashed border-white/10 rounded-xl p-8 text-center hover:border-purple-500/30 transition-colors cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="audio/*,video/*"
                      onChange={(e) => {
                        const f = e.target.files?.[0] || null
                        setUploadFile(f)
                        if (f && !uploadTitle) setUploadTitle(f.name.replace(/\.[^.]+$/, ''))
                      }}
                      className="hidden"
                    />
                    <div className="w-14 h-14 mx-auto mb-3 bg-purple-500/10 rounded-full flex items-center justify-center">
                      <IconUpload />
                    </div>
                    {uploadFile ? (
                      <div>
                        <p className="text-sm font-medium text-purple-300">{uploadFile.name}</p>
                        <p className="text-xs text-gray-500 mt-1">{formatSize(uploadFile.size)} &middot; {uploadFile.type}</p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm text-gray-300">Click para seleccionar archivo</p>
                        <p className="text-xs text-gray-500 mt-1">MP3, WAV, OGG, FLAC, MP4, WebM, AVI...</p>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">Titulo</label>
                      <Input value={uploadTitle} onChange={e => setUploadTitle(e.target.value)} placeholder="Nombre" className="bg-white/5 border-white/10 focus:border-purple-500" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">Artista</label>
                      <Input value={uploadArtist} onChange={e => setUploadArtist(e.target.value)} placeholder="Artista" className="bg-white/5 border-white/10 focus:border-purple-500" />
                    </div>
                  </div>

                  {isUploading && (
                    <div className="space-y-1">
                      <div className="w-full bg-white/5 rounded-full h-1.5">
                        <div className="bg-gradient-to-r from-purple-500 to-pink-500 h-1.5 rounded-full transition-all" style={{ width: `${uploadProgress}%` }} />
                      </div>
                      <p className="text-xs text-gray-500 text-center">{uploadProgress}%</p>
                    </div>
                  )}

                  <Button onClick={handleUpload} disabled={!uploadFile || isUploading} className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-40 h-11 text-sm font-semibold">
                    {isUploading ? `Subiendo... ${uploadProgress}%` : 'Subir Archivo'}
                  </Button>
                </div>

                {/* My uploads list */}
                <div>
                  <h2 className="text-lg font-bold mb-3">Mis archivos subidos <span className="text-gray-500 font-normal">({myUploads.length})</span></h2>
                  <div className="bg-white/[0.02] rounded-2xl border border-white/5 overflow-hidden">
                    {myUploads.length === 0 ? (
                      <div className="py-12 text-center text-gray-600 text-sm">Aun no has subido archivos</div>
                    ) : (
                      <div className="divide-y divide-white/5">
                        {myUploads.map((track, i) => (
                          <div key={track._id} className="group flex items-center gap-3 px-5 py-3 hover:bg-white/5 transition-colors">
                            <div className={`w-10 h-10 rounded bg-gradient-to-br ${getGradient(i)} flex items-center justify-center flex-shrink-0`}>
                              {track.mediaType === 'video' ? <IconVideo /> : <IconMusic />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium truncate">{track.title}</div>
                              <div className="text-xs text-gray-500 truncate">{track.artist} &middot; {formatSize(track.size)}</div>
                            </div>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-gray-500 uppercase">{track.originalName.split('.').pop()}</span>
                            <span className="text-xs text-gray-600">{formatTime(track.duration)}</span>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => handleDownload(track)} className="p-1.5 hover:bg-white/10 rounded-full text-gray-400 hover:text-white"><IconDownload /></button>
                              <button onClick={() => handleDelete(track._id)} className="p-1.5 hover:bg-white/10 rounded-full text-gray-400 hover:text-red-400"><IconTrash /></button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ====== TAB: CONVERTIR ====== */}
            {tab === 'convert' && (
              <div className="max-w-3xl mx-auto space-y-8">
                <div>
                  <h1 className="text-3xl font-bold mb-1">Convertir Archivo</h1>
                  <p className="text-gray-400">Cambia el formato de tus archivos</p>
                </div>

                <div className="bg-white/[0.03] rounded-2xl border border-white/5 p-6 space-y-5">
                  {tracks.length === 0 ? (
                    <div className="py-8 text-center text-gray-500">
                      No tienes archivos. <button onClick={() => setTab('upload')} className="text-purple-400 underline">Sube uno primero</button>
                    </div>
                  ) : (
                    <>
                      <div>
                        <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">Archivo original</label>
                        <select
                          value={convertId || ''}
                          onChange={e => setConvertId(e.target.value || null)}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500 transition-colors"
                        >
                          <option value="" className="bg-gray-900">-- Seleccionar archivo --</option>
                          {tracks.filter(t => !t.convertedFrom).map(t => (
                            <option key={t._id} value={t._id} className="bg-gray-900">
                              {t.title} &mdash; {t.originalName}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">Formato destino</label>
                        <div className="grid grid-cols-4 md:grid-cols-7 gap-2">
                          {['mp3', 'wav', 'ogg', 'aac', 'flac', 'mp4', 'webm'].map(fmt => (
                            <button
                              key={fmt}
                              onClick={() => setConvertFormat(fmt)}
                              className={`py-2 rounded-lg text-xs font-bold uppercase transition-all ${
                                convertFormat === fmt
                                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20'
                                  : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                              }`}
                            >
                              {fmt}
                            </button>
                          ))}
                        </div>
                      </div>
                      {convertMsg && (
                        <div className={`text-sm px-4 py-3 rounded-xl ${convertMsg.includes('Error') ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-green-500/10 text-green-400 border border-green-500/20'}`}>
                          {convertMsg}
                        </div>
                      )}
                      <Button onClick={handleConvert} disabled={!convertId || isConverting} className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-40 h-11 text-sm font-semibold">
                        {isConverting ? (
                          <span className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Convirtiendo...
                          </span>
                        ) : `Convertir a ${convertFormat.toUpperCase()}`}
                      </Button>
                    </>
                  )}
                </div>

                {/* Converted files list */}
                <div>
                  <h2 className="text-lg font-bold mb-3">Archivos convertidos <span className="text-gray-500 font-normal">({myConverted.length})</span></h2>
                  <div className="bg-white/[0.02] rounded-2xl border border-white/5 overflow-hidden">
                    {myConverted.length === 0 ? (
                      <div className="py-12 text-center text-gray-600 text-sm">Aun no has convertido archivos</div>
                    ) : (
                      <div className="divide-y divide-white/5">
                        {myConverted.map((track, i) => {
                          const newFmt = track.originalName.split('.').pop()?.toUpperCase() || '?'
                          const origFmt = track.convertedFrom?.originalFormat?.toUpperCase() || '?'
                          return (
                            <div key={track._id} className="group flex items-center gap-3 px-5 py-3 hover:bg-white/5 transition-colors">
                              <div className={`w-10 h-10 rounded bg-gradient-to-br ${getGradient(i + 2)} flex items-center justify-center flex-shrink-0`}>
                                <IconConvert />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium truncate">{track.title}</div>
                                <div className="text-xs text-gray-500 truncate">{track.convertedFrom?.originalName} &middot; {formatSize(track.size)}</div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-gray-400">{origFmt}</span>
                                <IconArrow />
                                <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-semibold">{newFmt}</span>
                              </div>
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleDownload(track)} className="p-1.5 hover:bg-white/10 rounded-full text-gray-400 hover:text-white" title="Descargar"><IconDownload /></button>
                                <button onClick={() => handleDelete(track._id)} className="p-1.5 hover:bg-white/10 rounded-full text-gray-400 hover:text-red-400" title="Eliminar"><IconTrash /></button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>

        {/* Right panel - Now Playing (desktop only, player tab) */}
        {tab === 'player' && currentTrack && (
          <aside className="w-80 bg-black/50 border-l border-white/5 flex-shrink-0 hidden xl:flex flex-col">
            <div className="p-5 flex-1 flex flex-col">
              <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-4">Reproduciendo</h3>

              {currentTrack.mediaType === 'video' ? (
                <video ref={videoRef} className="w-full rounded-xl mb-4 bg-black" />
              ) : (
                <div className={`w-full aspect-square bg-gradient-to-br ${getGradient(audioTracks.findIndex(t => t._id === currentTrack._id))} rounded-2xl mb-5 flex items-center justify-center shadow-2xl shadow-purple-500/10 relative overflow-hidden`}>
                  <div className="absolute inset-0 bg-black/10" />
                  <div className={`w-24 h-24 border-4 border-white/20 rounded-full flex items-center justify-center ${isPlaying ? 'animate-spin' : ''}`} style={{ animationDuration: '3s' }}>
                    <div className="w-8 h-8 bg-white/20 rounded-full" />
                  </div>
                </div>
              )}

              <div className="text-center mb-5">
                <h3 className="text-lg font-bold truncate">{currentTrack.title}</h3>
                <p className="text-sm text-gray-400">{currentTrack.artist}</p>
              </div>

              {/* Progress */}
              <div className="mb-5">
                <div className="w-full bg-white/10 rounded-full h-1 cursor-pointer group" onClick={handleSeek}>
                  <div className="bg-purple-500 h-1 rounded-full relative group-hover:bg-purple-400 transition-colors" style={{ width: duration ? `${(currentTime / duration) * 100}%` : '0%' }}>
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-md" />
                  </div>
                </div>
                <div className="flex justify-between text-[11px] text-gray-500 mt-1.5">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center justify-center gap-5 mb-5">
                <button onClick={handlePrev} className="text-gray-400 hover:text-white transition-colors"><IconPrev /></button>
                <button
                  onClick={() => isPlaying ? pause() : play()}
                  className="w-12 h-12 bg-white rounded-full flex items-center justify-center hover:scale-105 transition-transform shadow-xl"
                >
                  {isPlaying ? <IconPause size={18} /> : <IconPlay size={18} />}
                </button>
                <button onClick={handleNext} className="text-gray-400 hover:text-white transition-colors"><IconNext /></button>
              </div>

              {/* Volume */}
              <div className="flex items-center gap-3">
                <IconVolume />
                <input
                  type="range" min="0" max="1" step="0.01" value={volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  className="flex-1 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
                <span className="text-[11px] text-gray-500 w-7 text-right">{Math.round(volume * 100)}%</span>
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* ===== BOTTOM PLAYER BAR ===== */}
      {currentTrack && (
        <div className="bg-gradient-to-r from-gray-950 via-black to-gray-950 border-t border-white/5 px-4 py-2 z-30 flex-shrink-0">
          {/* Progress bar at top of bottom bar */}
          <div className="w-full bg-white/5 rounded-full h-0.5 mb-2 cursor-pointer" onClick={handleSeek}>
            <div className="bg-purple-500 h-0.5 rounded-full" style={{ width: duration ? `${(currentTime / duration) * 100}%` : '0%' }} />
          </div>

          <div className="max-w-7xl mx-auto flex items-center gap-4">
            {/* Track info */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${getGradient(audioTracks.findIndex(t => t._id === currentTrack._id))} flex items-center justify-center flex-shrink-0`}>
                {currentTrack.mediaType === 'video' ? <IconVideo /> : <IconMusic />}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{currentTrack.title}</div>
                <div className="text-xs text-gray-500 truncate">{currentTrack.artist}</div>
              </div>
            </div>

            {/* Center controls */}
            <div className="flex items-center gap-4">
              <button onClick={handlePrev} className="text-gray-400 hover:text-white transition-colors hidden sm:block"><IconPrev /></button>
              <button
                onClick={() => isPlaying ? pause() : play()}
                className="w-9 h-9 bg-white rounded-full flex items-center justify-center hover:scale-105 transition-transform"
              >
                {isPlaying ? <IconPause size={14} /> : <IconPlay size={14} />}
              </button>
              <button onClick={handleNext} className="text-gray-400 hover:text-white transition-colors hidden sm:block"><IconNext /></button>
            </div>

            {/* Time + volume */}
            <div className="flex items-center gap-3 flex-1 justify-end">
              <span className="text-xs text-gray-500 hidden sm:block">{formatTime(currentTime)} / {formatTime(duration)}</span>
              <div className="hidden md:flex items-center gap-2">
                <IconVolume />
                <input
                  type="range" min="0" max="1" step="0.01" value={volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  className="w-20 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hidden audio */}
      <audio ref={audioRef} preload="auto" />
    </div>
  )
}

export default Dashboard
