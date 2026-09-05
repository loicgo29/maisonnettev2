import express from 'express'
import mealsRouter from './meals.js'
import authRouter from '../backoffice-auth.js'

const router = express.Router()

// Préfixe /api/backoffice
router.use('/auth', authRouter)
router.use('/meals', mealsRouter)

export default router
