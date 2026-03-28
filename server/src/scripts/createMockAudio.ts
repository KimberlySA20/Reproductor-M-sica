import fs from 'fs'
import path from 'path'

// Crear directorio de uploads si no existe
const uploadDir = path.join(process.cwd(), 'uploads', 'music')
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

// Crear archivos de audio simulados (para desarrollo)
const createMockAudioFile = (filename: string, duration: number) => {
  const filePath = path.join(uploadDir, filename)
  
  // Crear un buffer de audio WAV simple (sine wave)
  const sampleRate = 44100
  const frequency = 440 // A4 note
  const samples = sampleRate * duration
  
  // Header WAV (44 bytes)
  const header = Buffer.alloc(44)
  header.write('RIFF', 0) // ChunkID
  header.writeUInt32LE(36 + samples * 2, 4) // ChunkSize
  header.write('WAVE', 8) // Format
  header.write('fmt ', 12) // Subchunk1ID
  header.writeUInt32LE(16, 16) // Subchunk1Size
  header.writeUInt16LE(1, 20) // AudioFormat (PCM)
  header.writeUInt16LE(1, 22) // NumChannels
  header.writeUInt32LE(sampleRate, 24) // SampleRate
  header.writeUInt32LE(sampleRate * 2, 28) // ByteRate
  header.writeUInt16LE(2, 32) // BlockAlign
  header.writeUInt16LE(16, 34) // BitsPerSample
  header.write('data', 36) // Subchunk2ID
  header.writeUInt32LE(samples * 2, 40) // Subchunk2Size
  
  // Datos de audio (sine wave)
  const audioData = Buffer.alloc(samples * 2)
  for (let i = 0; i < samples; i++) {
    const sample = Math.sin(2 * Math.PI * frequency * i / sampleRate) * 0.5
    const value = Math.floor(sample * 32767) // 16-bit
    audioData.writeInt16LE(value, i * 2)
  }
  
  fs.writeFileSync(filePath, Buffer.concat([header, audioData]))
  console.log(`✅ Archivo de audio creado: ${filename}`)
}

// Crear archivos de prueba
const tracks = [
  { filename: 'rock-anthem.mp3', duration: 180 },
  { filename: 'jazz-morning.mp3', duration: 240 },
  { filename: 'electronic-beats.mp3', duration: 200 },
  { filename: 'acoustic-sunset.mp3', duration: 160 },
  { filename: 'pop-sensation.mp3', duration: 220 }
]

console.log('🎵 Creando archivos de audio de prueba...')
tracks.forEach(track => {
  createMockAudioFile(track.filename, track.duration)
})

console.log('✅ Archivos de audio creados exitosamente')
console.log('📁 Ubicación: uploads/music/')
console.log('🎧 Listos para streaming')
