import axios from 'axios'

export async function sendWhatsApp(phone: string, message: string): Promise<boolean> {
  try {
    await axios.post(
      `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`,
      new URLSearchParams({
        From: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
        To: `whatsapp:${phone}`,
        Body: message,
      }),
      {
        auth: {
          username: process.env.TWILIO_ACCOUNT_SID || '',
          password: process.env.TWILIO_AUTH_TOKEN || '',
        },
      }
    )

    console.log('WhatsApp sent to', phone)
    return true
  } catch (error) {
    console.error('WhatsApp error:', error)
    // Don't throw - WhatsApp is optional
    return false
  }
}
