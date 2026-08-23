import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';
import { submitContact } from '../services/api';
const contactSchema = z.object({
    nom: z.string().min(2, 'Nom requis (min 2 caractères)'),
    email: z.string().email('Email invalide'),
    telephone: z.string().regex(/^[0-9+\-\s()]{10,}$/, 'Téléphone invalide'),
    message: z.string().min(10, 'Message requis (min 10 caractères)'),
});
export default function Contact() {
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');
    const { register, handleSubmit, formState: { errors }, reset, } = useForm({
        resolver: zodResolver(contactSchema),
    });
    const onSubmit = async (data) => {
        setLoading(true);
        setError('');
        try {
            const response = await submitContact(data);
            if (response.success) {
                setSuccess(true);
                reset();
                setTimeout(() => setSuccess(false), 5000);
            }
            else {
                setError(response.error || 'Erreur lors de l\'envoi');
            }
        }
        catch (err) {
            setError('Erreur serveur. Veuillez réessayer.');
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsxs("div", { className: "max-w-md mx-auto p-8", children: [_jsx("h1", { className: "text-3xl font-bold mb-8", children: "Contact" }), success && (_jsx("div", { className: "p-4 bg-green-100 text-green-800 rounded mb-4", children: "\u2705 Message envoy\u00E9 avec succ\u00E8s !" })), error && (_jsxs("div", { className: "p-4 bg-red-100 text-red-800 rounded mb-4", children: ["\u274C ", error] })), _jsxs("form", { onSubmit: handleSubmit(onSubmit), className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium", children: "Nom" }), _jsx("input", { ...register('nom'), className: "w-full px-4 py-2 border rounded", placeholder: "Votre nom" }), errors.nom && _jsx("p", { className: "text-red-500 text-sm", children: errors.nom.message })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium", children: "Email" }), _jsx("input", { ...register('email'), type: "email", className: "w-full px-4 py-2 border rounded", placeholder: "votre@email.com" }), errors.email && _jsx("p", { className: "text-red-500 text-sm", children: errors.email.message })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium", children: "T\u00E9l\u00E9phone" }), _jsx("input", { ...register('telephone'), className: "w-full px-4 py-2 border rounded", placeholder: "+33 6 12 34 56 78" }), errors.telephone && _jsx("p", { className: "text-red-500 text-sm", children: errors.telephone.message })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium", children: "Message" }), _jsx("textarea", { ...register('message'), className: "w-full px-4 py-2 border rounded h-32", placeholder: "Votre message..." }), errors.message && _jsx("p", { className: "text-red-500 text-sm", children: errors.message.message })] }), _jsx("button", { type: "submit", disabled: loading, className: "w-full bg-blue-600 text-white py-2 rounded font-medium disabled:opacity-50", children: loading ? 'Envoi...' : 'Envoyer' })] })] }));
}
//# sourceMappingURL=Contact.js.map