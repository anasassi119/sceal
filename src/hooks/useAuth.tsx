import { useEffect, useState, useCallback } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import {
    GoogleAuthProvider,
    signInWithPopup,
    // signInWithRedirect,
    signOut,
    onAuthStateChanged,
    getRedirectResult
} from "firebase/auth";
import { auth } from "@/lib/firebaseConfig";

// Initialize Google provider
const provider = new GoogleAuthProvider();

export function useAuth() {
    const [user, loading, error] = useAuthState(auth);
    const [initialized, setInitialized] = useState(false);
    const [isRedirecting, setIsRedirecting] = useState(false);
    const [isSafari, setIsSafari] = useState(false);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setIsSafari(/^((?!chrome|android).)*safari/i.test(navigator.userAgent) ||
                /iPhone|iPad|iPod/i.test(navigator.userAgent));
        }
    }, []);

    // Process redirect result as soon as component mounts
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const processRedirect = async () => {
                try {
                    const result = await getRedirectResult(auth);
                    if (result) {
                        // console.log("Redirect sign-in successful");
                        // Redirect completed successfully
                    }
                } catch (error) {
                    console.error("Redirect sign-in error:", error);
                } finally {
                    setInitialized(true);
                }
            };

            processRedirect();
        }
    }, []);

    // Set up auth state listener
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, () => {
            // console.log("Auth State Changed:", user ? "User logged in" : "No user");
            setInitialized(true);
        });

        return () => unsubscribe();
    }, []);

    const login = useCallback(async () => {
        try {
            // if (isSafari || window.innerWidth < 768) {
            //     setIsRedirecting(true);
            //     // Add state parameter to track that we're in a redirect flow
            //     provider.setCustomParameters({
            //         // You can add any needed state parameters
            //         state: `redirect-${Date.now()}`
            //     });
            //     await signInWithRedirect(auth, provider);
            //     // Code after this point won't execute until after redirect completes
            // } else {
                await signInWithPopup(auth, provider);
            // }
        } catch (error) {
            console.error("Login error:", error);
            setIsRedirecting(false);
        }
    }, [isSafari]);

    const logout = async () => {
        await signOut(auth);
    };

    return {
        user,
        loading: loading || !initialized || isRedirecting,
        error,
        login,
        logout,
        isAuthenticated: !!user && initialized
    };
}