import express from 'express'
import { createServer } from 'http'
import cors from 'cors'

const app = express()
const server = createServer(app)

// Middleware
app.use(cors())
app.use(express.json())

// Routes básicas
app.get('/health', (req, res) => {
  res.json({ status: 'OK', worker: 'streaming' })
})

// Iniciar servidor worker
const PORT = process.env.WORKER_PORT || 3002

server.listen(PORT, () => {
  console.log(`🎵 Music Streamer Worker running on port ${PORT}`)
  console.log(`📡 Worker ready for streaming tasks`)
})

export default app
