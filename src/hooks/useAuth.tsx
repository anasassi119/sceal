import { useAuthState } from "react-firebase-hooks/auth";
import { GoogleAuthProvider, signInWithPopup, signOut, User, browserPopupRedirectResolver } from "firebase/auth";
import { auth } from "@/lib/firebaseConfig";

const provider = new GoogleAuthProvider();

export function useAuth() {
    const [user, loading, error] = useAuthState(auth);

    const login = async () => {
        try {
            await signInWithPopup(auth, provider, browserPopupRedirectResolver);
        } catch (error) {
            console.error("Popup login error:", error);
        }
    };

    const logout = async () => {
        await signOut(auth);
    };

    return { user, loading, error, login, logout } as {
        user: User | null;
        loading: boolean;
        error: Error | undefined;
        login: () => Promise<void>;
        logout: () => Promise<void>;
    };
}