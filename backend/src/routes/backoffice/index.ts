import express from 'express'
import mealsRouter from './meals'

const router = express.Router()

// Préfixe /api/backoffice
router.use('/meals', mealsRouter)

export default router
