import axios from 'axios'

interface EmailOptions {
  to: string
  subject: string
  html: string
}

// L'expéditeur doit appartenir à un domaine vérifié dans Resend (DKIM/SPF
// publiés), sans quoi l'envoi est refusé. Distinct des MX, qui ne concernent
// que la réception.
const EXPEDITEUR =
  process.env.MAIL_FROM ||
  'onboarding@resend.dev' // En prod, change en domaine vérifié

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    const response = await axios.post('https://api.resend.com/emails', {
      from: EXPEDITEUR,
      to: options.to,
      subject: options.subject,
      html: options.html,
    }, {
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
    })

    console.log('Email sent:', response.data.id)
    return true
  } catch (error) {
    console.error('Email error:', error)
    throw new Error('Erreur lors de l\'envoi de l\'email')
  }
}
