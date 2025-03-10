"use client";

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {FaGoogle} from "react-icons/fa";

export default function Home() {
    const router = useRouter();
    const { user, login } = useAuth();

    useEffect(() => {
        if (user) router.push('/dashboard');
    }, [user, router]);

    return (
        <div className="flex flex-col items-center justify-center h-screen bg-white">
            <h1 className="text-xl text-center">Welcome to the <strong>React Audio Uploader Component</strong></h1>
            <h3 className="text-center">&copy; Anas Assi - as requested by the recruiters of Sceal</h3>
            <button onClick={login} className="flex items-center cursor-pointer
                                                flex-nowrap justify-around gap-2 text-xl
                                                bg-blue-500 text-white p-2 rounded mt-4 w-auto">
                <FaGoogle /> Continue with Google</button>
        </div>
    );
}