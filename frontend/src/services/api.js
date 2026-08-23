import axios from 'axios';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});
export const submitContact = async (data) => {
    const response = await api.post('/contact', data);
    return response.data;
};
export default api;
//# sourceMappingURL=api.js.map