import { UserManager, User } from 'oidc-client-ts';
export declare const userManager: UserManager;
export declare function getUser(): Promise<User | null>;
export declare function getAuthHeaders(): Promise<{
    Authorization?: undefined;
} | {
    Authorization: string;
}>;
export declare function login(): Promise<void>;
export declare function logout(): Promise<void>;
export declare function handleCallback(): Promise<void | User>;
//# sourceMappingURL=OIDCManager.d.ts.map