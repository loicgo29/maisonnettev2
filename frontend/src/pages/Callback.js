import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { handleCallback } from '../auth/OIDCManager';
export function Callback() {
    const navigate = useNavigate();
    const [error, setError] = useState(null);
    useEffect(() => {
        (async () => {
            try {
                await handleCallback();
                // Redirect to home after successful callback
                navigate('/', { replace: true });
            }
            catch (err) {
                console.error('Callback error:', err);
                setError(err instanceof Error ? err.message : 'Authentication failed. Please try again.');
                // Redirect to login after a short delay
                setTimeout(() => navigate('/login', { replace: true }), 3000);
            }
        })();
    }, [navigate]);
    if (error) {
        return (_jsx("div", { className: "flex items-center justify-center min-h-screen bg-red-50", children: _jsxs("div", { className: "text-center", children: [_jsx("h1", { className: "text-2xl font-bold text-red-600 mb-4", children: "Authentication Failed" }), _jsx("p", { className: "text-red-800 mb-6", children: error }), _jsx("p", { className: "text-gray-600", children: "Redirecting to login..." })] }) }));
    }
    return (_jsx("div", { className: "flex items-center justify-center min-h-screen bg-gray-50", children: _jsxs("div", { className: "text-center", children: [_jsx("div", { className: "inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4" }), _jsx("h1", { className: "text-2xl font-bold text-gray-800", children: "Completing authentication..." }), _jsx("p", { className: "text-gray-600 mt-2", children: "Please wait while we verify your credentials" })] }) }));
}
//# sourceMappingURL=Callback.js.map