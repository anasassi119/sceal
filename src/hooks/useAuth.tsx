// hooks/useAuth.ts
import { useAuthState } from 'react-firebase-hooks/auth';
import { GoogleAuthProvider, signInWithPopup, signOut, User } from 'firebase/auth';
import { auth } from '@/lib/firebaseConfig';

const provider = new GoogleAuthProvider();

export function useAuth() {
    const [user, loading, error] = useAuthState(auth);

    const login = () => signInWithPopup(auth, provider);
    const logout = () => signOut(auth);

    return { user, loading, error, login, logout } as {
        user: User | null;
        loading: boolean;
        error: Error | undefined;
        login: () => Promise<never>;
        logout: () => Promise<void>;
    };
}