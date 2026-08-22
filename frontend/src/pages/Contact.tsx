import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState } from 'react'
import { submitContact } from '../services/api'
import { ContactFormData } from '../types/contact'

const contactSchema = z.object({
  nom: z.string().min(2, 'Nom requis (min 2 caractères)'),
  email: z.string().email('Email invalide'),
  telephone: z.string().regex(/^[0-9+\-\s()]{10,}$/, 'Téléphone invalide'),
  message: z.string().min(10, 'Message requis (min 10 caractères)'),
})

export default function Contact() {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
  })

  const onSubmit = async (data: ContactFormData) => {
    setLoading(true)
    setError('')
    try {
      const response = await submitContact(data)
      if (response.success) {
        setSuccess(true)
        reset()
        setTimeout(() => setSuccess(false), 5000)
      } else {
        setError(response.error || 'Erreur lors de l\'envoi')
      }
    } catch (err) {
      setError('Erreur serveur. Veuillez réessayer.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Contact</h1>

      {success && (
        <div className="p-4 bg-green-100 text-green-800 rounded mb-4">
          ✅ Message envoyé avec succès !
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-100 text-red-800 rounded mb-4">
          ❌ {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium">Nom</label>
          <input
            {...register('nom')}
            className="w-full px-4 py-2 border rounded"
            placeholder="Votre nom"
          />
          {errors.nom && <p className="text-red-500 text-sm">{errors.nom.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium">Email</label>
          <input
            {...register('email')}
            type="email"
            className="w-full px-4 py-2 border rounded"
            placeholder="votre@email.com"
          />
          {errors.email && <p className="text-red-500 text-sm">{errors.email.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium">Téléphone</label>
          <input
            {...register('telephone')}
            className="w-full px-4 py-2 border rounded"
            placeholder="+33 6 12 34 56 78"
          />
          {errors.telephone && <p className="text-red-500 text-sm">{errors.telephone.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium">Message</label>
          <textarea
            {...register('message')}
            className="w-full px-4 py-2 border rounded h-32"
            placeholder="Votre message..."
          />
          {errors.message && <p className="text-red-500 text-sm">{errors.message.message}</p>}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded font-medium disabled:opacity-50"
        >
          {loading ? 'Envoi...' : 'Envoyer'}
        </button>
      </form>
    </div>
  )
}
