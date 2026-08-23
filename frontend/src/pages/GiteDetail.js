import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { useAuth } from '../hooks/useAuth';
export function GiteDetail() {
    const { slug } = useParams();
    const navigate = useNavigate();
    const { isAuthenticated, login } = useAuth();
    const { data: gite, isLoading, error } = useQuery({
        queryKey: ['gite', slug],
        queryFn: async () => {
            const res = await api.get(`/api/gites/${slug}`);
            return res.data;
        },
        enabled: !!slug,
    });
    if (isLoading)
        return _jsx("div", { className: "min-h-screen flex items-center justify-center", children: "Chargement..." });
    if (error || !gite) {
        return (_jsx("div", { className: "min-h-screen flex items-center justify-center", children: _jsxs("div", { className: "text-center", children: [_jsx("h1", { className: "text-2xl font-bold text-red-600 mb-4", children: "G\u00EEte non trouv\u00E9" }), _jsx("button", { onClick: () => navigate('/'), className: "bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700", children: "Retour \u00E0 l'accueil" })] }) }));
    }
    // Group photos by category
    const photosByCategory = gite.photos.reduce((acc, photo) => {
        if (!acc[photo.categorie])
            acc[photo.categorie] = [];
        acc[photo.categorie].push(photo);
        return acc;
    }, {});
    return (_jsxs("div", { className: "min-h-screen bg-gray-50", children: [_jsx("div", { className: "bg-white shadow", children: _jsxs("div", { className: "max-w-4xl mx-auto px-4 py-6", children: [_jsx("button", { onClick: () => navigate('/'), className: "text-blue-600 hover:underline mb-4", children: "\u2190 Retour" }), _jsx("h1", { className: "text-4xl font-bold mb-2", children: gite.nom }), _jsx("p", { className: "text-gray-600", children: gite.adresse })] }) }), _jsxs("div", { className: "max-w-4xl mx-auto px-4 py-8", children: [_jsxs("div", { className: "bg-white rounded-lg shadow p-6 mb-8", children: [_jsx("h2", { className: "text-2xl font-bold mb-4", children: "Description" }), _jsx("p", { className: "text-gray-700 leading-relaxed", children: gite.description }), _jsxs("div", { className: "mt-6 grid grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx("span", { className: "text-gray-600", children: "Capacit\u00E9:" }), _jsxs("p", { className: "text-2xl font-bold", children: [gite.capacite, " personnes"] })] }), _jsxs("div", { children: [_jsx("span", { className: "text-gray-600", children: "Prix:" }), _jsxs("p", { className: "text-2xl font-bold text-blue-600", children: [gite.prixNuit.toFixed(2), " \u20AC/nuit"] })] })] })] }), Object.keys(photosByCategory).length > 0 && (_jsxs("div", { className: "bg-white rounded-lg shadow p-6 mb-8", children: [_jsx("h2", { className: "text-2xl font-bold mb-6", children: "Photos" }), Object.entries(photosByCategory).map(([category, photos]) => (_jsxs("div", { className: "mb-8 last:mb-0", children: [_jsx("h3", { className: "text-lg font-bold mb-4 text-gray-700", children: category.replace(/_/g, ' ') }), _jsx("div", { className: "grid grid-cols-2 md:grid-cols-3 gap-4", children: photos.map((photo) => (_jsx("div", { className: "overflow-hidden rounded-lg bg-gray-200", children: _jsx("img", { src: photo.url, alt: photo.alt || category, className: "w-full h-48 object-cover hover:scale-105 transition" }) }, photo.id))) })] }, category)))] })), _jsxs("div", { className: "bg-white rounded-lg shadow p-6", children: [_jsx("h2", { className: "text-2xl font-bold mb-6", children: "R\u00E9server" }), !isAuthenticated ? (_jsxs("div", { className: "text-center py-8", children: [_jsx("p", { className: "text-gray-600 mb-4", children: "Veuillez vous connecter pour faire une r\u00E9servation" }), _jsx("button", { onClick: login, className: "bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 text-lg font-bold", children: "Se connecter" })] })) : (_jsxs("div", { className: "text-center py-8", children: [_jsx("p", { className: "text-gray-600 mb-4", children: "La r\u00E9servation en ligne sera disponible bient\u00F4t" }), _jsx("p", { className: "text-sm text-gray-500", children: "Pour r\u00E9server maintenant, veuillez nous contacter par email ou t\u00E9l\u00E9phone" })] }))] })] })] }));
}
//# sourceMappingURL=GiteDetail.js.map