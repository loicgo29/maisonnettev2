import express from 'express'
import mealsRouter from './meals.js'

const router = express.Router()

// Préfixe /api/backoffice
router.use('/meals', mealsRouter)

export default router
