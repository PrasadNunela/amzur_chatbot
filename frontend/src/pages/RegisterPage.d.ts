/**
 * Register page for new user signup.
 */
interface RegisterPageProps {
    onRegisterSuccess: (email: string, password: string, fullName?: string) => Promise<void>;
    onNavigateToLogin: () => void;
}
export declare function RegisterPage({ onRegisterSuccess, onNavigateToLogin }: RegisterPageProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=RegisterPage.d.ts.map