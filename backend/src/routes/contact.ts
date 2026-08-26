import { Router, Request, Response } from 'express'
import { z } from 'zod'
import rateLimit from 'express-rate-limit'
import { sendEmail } from '../services/email.js'
import { sendWhatsApp } from '../services/whatsapp.js'

const router = Router()

// Rate limiter: 10 requests per hour
const limiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: 'Trop de demandes, veuillez réessayer plus tard',
})

const contactSchema = z.object({
  nom: z.string().min(2).max(100),
  email: z.string().email(),
  telephone: z.string().regex(/^[0-9+\-\s()]{10,}$/),
  message: z.string().min(10).max(5000),
})

router.post('/', limiter, async (req: Request, res: Response) => {
  try {
    const data = contactSchema.parse(req.body)

    // Send email to owner
    await sendEmail({
      to: process.env.OWNER_EMAIL || '',
      subject: `Nouveau message de ${data.nom}`,
      html: `
        <p><strong>Nom:</strong> ${data.nom}</p>
        <p><strong>Email:</strong> ${data.email}</p>
        <p><strong>Téléphone:</strong> ${data.telephone}</p>
        <p><strong>Message:</strong></p>
        <p>${data.message.replace(/\n/g, '<br>')}</p>
      `,
    })

    // Send WhatsApp notification
    await sendWhatsApp(
      process.env.OWNER_PHONE || '',
      `📧 Nouveau contact de ${data.nom}\nEmail: ${data.email}`
    )

    // Send confirmation email to user
    await sendEmail({
      to: data.email,
      subject: 'Nous avons reçu votre message',
      html: `
        <h2>Merci pour votre message!</h2>
        <p>Bonjour ${data.nom},</p>
        <p>Nous avons bien reçu votre message et vous remercie de nous avoir contactés.</p>
        <p>Nous vous répondrons dans les meilleurs délais.</p>
        <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;" />
        <h3>Pour nous joindre directement:</h3>
        <p><strong>Téléphone:</strong> <a href="tel:+33781103889" style="color: #667eea; text-decoration: none;">+33 7 81 10 38 89</a></p>
        <p><strong>Disponibilité:</strong> 24h/24, 7j/7</p>
        <p><strong>Email:</strong> <a href="mailto:lgbertheaume@gmail.com" style="color: #667eea; text-decoration: none;">lgbertheaume@gmail.com</a></p>
        <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;" />
        <p style="color: #666; font-size: 12px; margin-top: 30px;">
          Maisonnette de Bertheaume<br />
          Côtes d'Armor, France
        </p>
      `,
    })

    res.json({ success: true, data: { message: 'Email envoyé avec succès' } })
  } catch (error) {
    console.error('Contact error:', error)
    res.status(400).json({
      success: false,
      error: error instanceof z.ZodError ? 'Données invalides' : 'Erreur lors de l\'envoi',
    })
  }
})

export default router
