import { useEffect, useState } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import {
    GoogleAuthProvider,
    signInWithPopup,
    signInWithRedirect,
    signOut,
    onAuthStateChanged,
    getRedirectResult
} from "firebase/auth";
import { auth } from "@/lib/firebaseConfig";

const provider = new GoogleAuthProvider();

export function useAuth() {
    const [user, loading, error] = useAuthState(auth);
    const [initialized, setInitialized] = useState(false);

    const [isSafari, setIsSafari] = useState(false);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setIsSafari(/^((?!chrome|android).)*safari/i.test(navigator.userAgent));
        }
    }, []);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, () => {
            setInitialized(true);
        });

        return () => unsubscribe();
    }, []);

    // Handle redirect login results
    useEffect(() => {
        if (!initialized || typeof window === 'undefined') return;

        getRedirectResult(auth)
            .then((result) => {
                if (result?.user) {
                }
            })
            .catch(() => {
            });
    }, [initialized]);

    const login = async () => {
        try {
            // Use redirect for Safari and mobile, popup for others
            if (isSafari || window.innerWidth < 768) {
                await signInWithRedirect(auth, provider);
            } else {
                await signInWithPopup(auth, provider);
            }
        } catch (error) {
            console.error("Login error:", error);
        }
    };

    const logout = async () => {
        await signOut(auth);
    };

    return {
        user,
        loading: loading || !initialized,
        error,
        login,
        logout,
        isAuthenticated: !!user && initialized
    };
}