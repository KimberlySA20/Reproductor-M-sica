import React, { createContext, useContext, useState } from 'react'

interface PlayerContextType {
  currentTrack: any | null
  isPlaying: boolean
  volume: number
  play: () => void
  pause: () => void
  setVolume: (volume: number) => void
  loadTrack: (track: any) => void
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined)

export const PlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTrack, setCurrentTrack] = useState<any | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolumeState] = useState(0.7)

  const play = () => setIsPlaying(true)
  const pause = () => setIsPlaying(false)

  const setVolume = (newVolume: number) => {
    setVolumeState(Math.max(0, Math.min(1, newVolume)))
  }

  const loadTrack = (track: any) => {
    setCurrentTrack(track)
    setIsPlaying(false)
  }

  return (
    <PlayerContext.Provider value={{
      currentTrack,
      isPlaying,
      volume,
      play,
      pause,
      setVolume,
      loadTrack
    }}>
      {children}
    </PlayerContext.Provider>
  )
}

export const usePlayer = () => {
  const context = useContext(PlayerContext)
  if (context === undefined) {
    throw new Error('usePlayer must be used within a PlayerProvider')
  }
  return context
}
