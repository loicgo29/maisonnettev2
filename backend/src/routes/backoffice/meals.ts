import express, { Request, Response } from 'express'
import { readFileSync, appendFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import { verifyBackofficeToken } from '../../middleware/backoffice-jwt.js'

const router = express.Router()

// Configuration des comptes (copié d'ALO)
const ACCOUNTS_CONFIG = {
  gourmich: ['Loïc', 'Mahaut', 'Alban', 'Ilan'],
  tigresse: ['Alice', 'Adèle', 'Joséphine', 'Albert', 'Oscar'],
}

// Répertoire de stockage
const MEALS_DIR = process.env.MEALS_DATA_DIR || '/data/backoffice'
const MEALS_FILE = join(MEALS_DIR, 'meals.jsonl')

// Vérifier/créer le répertoire
function ensureMealsDir() {
  if (!existsSync(MEALS_DIR)) {
    mkdirSync(MEALS_DIR, { recursive: true })
  }
}

// Type pour une entrée repas
interface MealRecord {
  date: string // YYYY-MM-DD
  person: string
  meal: number
  account: 'gourmich' | 'tigresse'
  timestamp: string // ISO 8601
}

/**
 * POST /api/backoffice/meals/record
 * Enregistrer un repas (append-only dans meals.jsonl)
 */
router.post('/record', verifyBackofficeToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { date, person, meal, account } = req.body

    // Validations
    if (!date || !person || meal === undefined || !account) {
      res.status(400).json({
        error: 'Missing required fields: date, person, meal, account',
      })
      return
    }

    if (!Object.keys(ACCOUNTS_CONFIG).includes(account)) {
      res.status(400).json({ error: `Invalid account: ${account}` })
      return
    }

    if (
      !ACCOUNTS_CONFIG[account as keyof typeof ACCOUNTS_CONFIG].includes(person)
    ) {
      res.status(400).json({
        error: `Person ${person} not in account ${account}`,
      })
      return
    }

    if (typeof meal !== 'number' || meal < 0 || meal > 4) {
      res.status(400).json({ error: 'meal must be between 0 and 4' })
      return
    }

    // Créer l'enregistrement
    const record: MealRecord = {
      date,
      person,
      meal,
      account,
      timestamp: new Date().toISOString(),
    }

    // Append au fichier JSONL
    ensureMealsDir()
    appendFileSync(MEALS_FILE, JSON.stringify(record) + '\n')

    res.json({ ok: true, record })
  } catch (error) {
    console.error('Error saving meal:', error)
    res.status(500).json({ error: 'Failed to save meal' })
  }
})

/**
 * GET /api/backoffice/meals/range
 * Récupérer les repas d'une plage de dates
 * Query params: startDate, endDate, account
 */
router.get('/range', verifyBackofficeToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { startDate, endDate, account } = req.query

    if (!startDate || !endDate || !account) {
      res.status(400).json({
        error: 'Missing query params: startDate, endDate, account',
      })
      return
    }

    const start = new Date(startDate as string).getTime()
    const end = new Date(endDate as string).getTime()

    if (Number.isNaN(start) || Number.isNaN(end)) {
      res.status(400).json({ error: 'Invalid date format' })
      return
    }

    // Lire le fichier JSONL
    ensureMealsDir()
    if (!existsSync(MEALS_FILE)) {
      res.json({})
      return
    }

    const lines = readFileSync(MEALS_FILE, 'utf-8').split('\n').filter(Boolean)
    const records = lines.map((line) => JSON.parse(line) as MealRecord)

    // Filtrer par account et date
    const filtered = records.filter((r) => {
      const recDate = new Date(r.date).getTime()
      return r.account === account && recDate >= start && recDate <= end
    })

    // Grouper par date
    const grouped: Record<string, Record<string, number>> = {}
    filtered.forEach((r) => {
      if (!grouped[r.date]) grouped[r.date] = {}
      grouped[r.date][r.person] = r.meal
    })

    res.json(grouped)
  } catch (error) {
    console.error('Error reading meals:', error)
    res.status(500).json({ error: 'Failed to read meals' })
  }
})

/**
 * GET /api/backoffice/meals/export
 * Télécharger le fichier meals.jsonl complet (pour import Mac Mini)
 */
router.get('/export', verifyBackofficeToken, async (req: Request, res: Response): Promise<void> => {
  try {
    ensureMealsDir()

    if (!existsSync(MEALS_FILE)) {
      res.status(404).json({ error: 'No meal data yet' })
      return
    }

    // Lire le fichier et envoyer
    const content = readFileSync(MEALS_FILE, 'utf-8')
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="meals-${new Date().toISOString().split('T')[0]}.jsonl"`
    )
    res.send(content)
  } catch (error) {
    console.error('Error exporting meals:', error)
    res.status(500).json({ error: 'Failed to export meals' })
  }
})

/**
 * GET /api/backoffice/meals/accounts
 * Lister les comptes et personnes disponibles
 */
router.get('/accounts', (_req: Request, res: Response) => {
  res.json(ACCOUNTS_CONFIG)
})

export default router
