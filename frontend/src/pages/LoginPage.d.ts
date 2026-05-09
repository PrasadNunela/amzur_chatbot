/**
 * Login page for user authentication.
 */
interface LoginPageProps {
    onLoginSuccess: (email: string, password: string) => Promise<void>;
    onLoginSuccessGoogle: (googleToken: string) => Promise<void>;
    onNavigateToRegister: () => void;
}
export declare function LoginPage({ onLoginSuccess, onLoginSuccessGoogle, onNavigateToRegister }: LoginPageProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=LoginPage.d.ts.map