import axios from 'axios'
import { ContactFormData, ApiResponse } from '../types/contact'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

export const submitContact = async (data: ContactFormData): Promise<ApiResponse> => {
  const response = await api.post('/contact', data)
  return response.data
}

export default api
