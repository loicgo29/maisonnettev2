import axios from 'axios';
import { Expense, Period, Reequilibrage } from '../types';

// Déterminer l'URL de l'API dynamiquement basée sur le host actuel
const getApiUrl = () => {
  const envUrl = process.env.REACT_APP_API_URL;
  if (envUrl) return envUrl;

  // Toujours utiliser le proxy (Nginx route /api au backend)
  const apiUrl = '/api';
  console.log('[API] Using proxy:', apiUrl);
  return apiUrl;
};

const API_URL = getApiUrl();
console.log('[API] URL:', API_URL);

const client = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Log les requêtes et erreurs
client.interceptors.request.use(req => {
  console.log('[API Request]', {
    method: req.method?.toUpperCase(),
    url: req.url,
    data: req.data,
  });
  return req;
});

client.interceptors.response.use(
  res => res,
  err => {
    console.error('[API Error]', {
      url: err.config?.url,
      method: err.config?.method,
      status: err.response?.status,
      message: err.message,
      data: err.response?.data,
    });
    return Promise.reject(err);
  }
);

// Récursively convert string numbers to actual numbers
const parseNumbers = (obj: any): any => {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') {
    // Ne pas convertir les dates ISO (YYYY-MM-DD)
    if (/^\d{4}-\d{2}-\d{2}/.test(obj)) return obj;

    const num = parseFloat(obj);
    return !isNaN(num) ? num : obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(parseNumbers);
  }
  if (typeof obj === 'object') {
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = parseNumbers(value);
    }
    return result;
  }
  return obj;
};

// EXPENSES
export const expensesAPI = {
  getAll: (skip = 0, limit = 100) =>
    client.get<Expense[]>('/expenses', { params: { skip, limit } }).then(res => ({
      ...res,
      data: parseNumbers(res.data) as Expense[],
    })),
  create: (expense: Omit<Expense, 'id'>) =>
    client.post<Expense>('/expenses', expense).then(res => ({
      ...res,
      data: parseNumbers(res.data) as Expense,
    })),
  getById: (id: number) =>
    client.get<Expense>(`/expenses/${id}`).then(res => ({
      ...res,
      data: parseNumbers(res.data) as Expense,
    })),
  update: (id: number, expense: Partial<Expense>) =>
    client.put<Expense>(`/expenses/${id}`, expense).then(res => ({
      ...res,
      data: parseNumbers(res.data) as Expense,
    })),
  delete: (id: number) =>
    client.delete(`/expenses/${id}`),
  learnCategory: (id: number, category: string) =>
    client.post<Expense>(`/expenses/${id}/learn-category`, { category }).then(res => ({
      ...res,
      data: parseNumbers(res.data) as Expense,
    })),
};

// PERIODS
export const periodsAPI = {
  getAll: () =>
    client.get<Period[]>('/periods'),
  create: (period: Omit<Period, 'id'>) =>
    client.post<Period>('/periods', period),
  getById: (id: number) =>
    client.get<Period>(`/periods/${id}`),
  freeze: (id: number) =>
    client.post(`/periods/${id}/freeze`, {}),
};

// REEQUILIBRAGE
export const reequilibrageAPI = {
  getPeriod: (periodId: number) =>
    client.get<Reequilibrage>(`/reequilibrage/${periodId}`).then(res => ({
      ...res,
      data: parseNumbers(res.data) as Reequilibrage,
    })),
  getMeals: (periodId: number) =>
    client.get<any[]>(`/reequilibrage/${periodId}/meals`).then(res => ({
      ...res,
      data: parseNumbers(res.data) as any[],
    })),
};

// MEALS
export const mealsAPI = {
  saveMeal: (data: any) =>
    client.post('/meals/record', data),
  getSummary: (year: number, month: number) =>
    client.get(`/meals/summary/${year}/${month}`).then(res => ({
      ...res,
      data: parseNumbers(res.data),
    })),
  getMonthRaw: (year: number, month: number, account: string) =>
    client.get<Record<string, Record<string, number>>>(`/meals/month/${year}/${month}/${account}`).then(res => ({
      ...res,
      data: parseNumbers(res.data) as Record<string, Record<string, number>>,
    })),
  getRange: (startDate: string, endDate: string, account: string) =>
    client.get<Record<string, Record<string, number>>>(`/meals/range/${startDate}/${endDate}/${account}`).then(res => ({
      ...res,
      data: parseNumbers(res.data) as Record<string, Record<string, number>>,
    })),
  getMonth: (year: number, month: number, account: string) =>
    client.get<Record<string, Record<string, number>>>(`/meals/month/${year}/${month}/${account}`).then(res => {
      // Convert object {day: {person: count}} to array [{date, person, repas}, ...]
      const mealArray: any[] = [];

      for (const dayStr in res.data) {
        const day = parseInt(dayStr);
        const persons = res.data[dayStr];

        for (const person in persons) {
          const repas = parseInt(persons[person].toString());
          if (repas > 0) {
            mealArray.push({
              date: `2026-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
              person,
              repas,
              account,
            });
          }
        }
      }

      return {
        ...res,
        data: mealArray,
      };
    }),
};

// PRESENCE
export const presenceAPI = {
  getRange: (startDate: string, endDate: string, account: string) =>
    client.get<Record<string, Record<string, { midi: boolean; soir: boolean }>>>(`/presence/range/${startDate}/${endDate}/${account}`).then(res => ({
      ...res,
      data: res.data as Record<string, Record<string, { midi: boolean; soir: boolean }>>,
    })),
  toggle: (payload: { year: number; month: number; day: number; account: string; person: string; slot: 'midi' | 'soir'; present: boolean }) =>
    client.post('/presence/toggle', payload),
};

export default client;
