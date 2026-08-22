import { useEffect, useState } from 'react';
import { User } from 'oidc-client-ts';
import { getUser, login, logout } from '../auth/OIDCManager';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export function useAuth() {
  const [auth, setAuth] = useState<AuthState>({
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
      } catch (err) {
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
