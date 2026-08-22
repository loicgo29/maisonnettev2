import axios from 'axios'

interface EmailOptions {
  to: string
  subject: string
  html: string
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    const response = await axios.post('https://api.resend.com/emails', {
      from: 'contact@maisonnette.fr',
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
