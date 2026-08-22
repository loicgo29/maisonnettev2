import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import dotenv from 'dotenv'
import contactRouter from './routes/contact'
import { errorHandler } from './middleware/error'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

// Security middleware
app.use(helmet())
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? 'https://yourdomain.com' 
    : 'http://localhost:5173',
  credentials: true,
}))

// Body parser
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ limit: '10mb', extended: true }))

// Routes
app.use('/api/contact', contactRouter)

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

// Error handler
app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`)
})
