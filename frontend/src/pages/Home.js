import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import { Link } from 'react-router-dom';
export function Home() {
    const { user, isAuthenticated } = useAuth();
    const { data: gites = [], isLoading, error } = useQuery({
        queryKey: ['gites'],
        queryFn: async () => {
            const res = await api.get('/api/gites');
            return res.data;
        },
    });
    return (_jsxs("div", { className: "min-h-screen bg-gray-50", children: [_jsx("div", { className: "bg-blue-600 text-white py-12 px-4", children: _jsxs("div", { className: "max-w-4xl mx-auto", children: [_jsx("h1", { className: "text-4xl font-bold mb-4", children: "Bienvenue \u00E0 maisonnettev2" }), _jsx("p", { className: "text-lg", children: "D\u00E9couvrez nos g\u00EEtes et r\u00E9servez votre s\u00E9jour" }), isAuthenticated && user && (_jsxs("p", { className: "text-sm mt-4", children: ["Connect\u00E9 en tant que ", user.profile?.email] }))] }) }), _jsxs("div", { className: "max-w-4xl mx-auto py-12 px-4", children: [_jsx("h2", { className: "text-3xl font-bold mb-8", children: "Nos G\u00EEtes" }), isLoading && _jsx("div", { className: "text-center py-8", children: "Chargement..." }), error && (_jsx("div", { className: "bg-red-100 text-red-800 p-4 rounded mb-8", children: "Erreur lors du chargement des g\u00EEtes" })), gites.length === 0 && !isLoading && (_jsx("div", { className: "text-center py-8 text-gray-600", children: "Aucun g\u00EEte disponible pour le moment" })), _jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6", children: gites.map((gite) => (_jsx(Link, { to: `/gite/${gite.slug}`, children: _jsxs("div", { className: "bg-white rounded-lg shadow hover:shadow-lg transition cursor-pointer overflow-hidden", children: [_jsx("div", { className: "h-48 bg-gray-200 flex items-center justify-center", children: gite.photos?.[0]?.url ? (_jsx("img", { src: gite.photos[0].url, alt: gite.photos[0].alt || gite.nom, className: "w-full h-full object-cover" })) : (_jsx("span", { className: "text-gray-400", children: "Photo du g\u00EEte" })) }), _jsxs("div", { className: "p-4", children: [_jsx("h3", { className: "font-bold text-lg mb-2", children: gite.nom }), _jsx("p", { className: "text-gray-600 text-sm mb-4 line-clamp-2", children: gite.description }), _jsxs("div", { className: "flex justify-between items-center", children: [_jsxs("span", { className: "text-blue-600 font-bold", children: [gite.prixNuit.toFixed(2), " \u20AC/nuit"] }), _jsxs("span", { className: "text-sm text-gray-500", children: [gite.capacite, " personnes"] })] })] })] }) }, gite.id))) })] })] }));
}
//# sourceMappingURL=Home.js.map