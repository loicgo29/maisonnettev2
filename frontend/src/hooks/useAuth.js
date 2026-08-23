import { useEffect, useState } from 'react';
import { getUser, login, logout } from '../auth/OIDCManager';
export function useAuth() {
    const [auth, setAuth] = useState({
        user: null,
        isLoading: true,
        isAuthenticated: false,
    });
    useEffect(() => {
        let isMounted = true;
        (async () => {
            try {
                const user = await getUser();
                if (isMounted) {
                    setAuth({
                        user,
                        isLoading: false,
                        isAuthenticated: !!user,
                    });
                }
            }
            catch (err) {
                console.error('Error loading auth state:', err);
                if (isMounted) {
                    setAuth((prev) => ({ ...prev, isLoading: false }));
                }
            }
        })();
        return () => {
            isMounted = false;
        };
    }, []);
    return {
        ...auth,
        login,
        logout,
    };
}
//# sourceMappingURL=useAuth.js.map