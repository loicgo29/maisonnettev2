import { User } from 'oidc-client-ts';
import { login, logout } from '../auth/OIDCManager';
export declare function useAuth(): {
    login: typeof login;
    logout: typeof logout;
    user: User | null;
    isLoading: boolean;
    isAuthenticated: boolean;
};
//# sourceMappingURL=useAuth.d.ts.map