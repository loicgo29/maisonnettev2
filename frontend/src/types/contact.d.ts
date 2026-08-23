export interface ContactFormData {
    nom: string;
    email: string;
    telephone: string;
    message: string;
}
export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
}
//# sourceMappingURL=contact.d.ts.map