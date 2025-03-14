"use client";
// app/layout.tsx

import { useRouter } from 'next/navigation';
import {useEffect, useRef, useState} from 'react';
import { useAuth } from '@/hooks/useAuth';
import UploadForm from '@/components/uploadForm';
import AudioList from '@/components/audioList';
import {Menubar} from "primereact/menubar";
import {Avatar} from "primereact/avatar";
import { TabView, TabPanel } from 'primereact/tabview';
import {Menu} from "primereact/menu";

export default function Dashboard() {
    const router = useRouter();
    const { user, logout, loading } = useAuth();
    const menuRef = useRef<Menu>(null);
    const names = user?.displayName?.split(" ") || ["U", "U"];
    const initials = names.map((name) => name[0].toUpperCase()).join("");
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
        if (!loading && !user) {
            router.push('/');
        }
    }, [user, loading, router]);

    if (!isClient || loading || !user) {
        return (
            <div className="flex justify-center items-center w-screen h-screen gap-5">
                <i className="pi pi-spin pi-spinner" style={{ fontSize: '2rem' }}></i>
                Loading
            </div>
        );
    }

    const startItems = (
        <img className="h-10 invert" src="https://anasassi.com/logo.png" alt="Anas Assi Logo"/>
    )

    const endItems = <Avatar onClick={(e) => menuRef.current?.toggle(e)}
                             label={initials} size="large" style={{ backgroundColor: '#2196F3', color: '#ffffff' }} shape="circle" />

    const avatarMenuItems = [
        {
            label: 'Logout',
            icon: 'pi pi-sign-out',
            command: () => logout(),
        },
    ];

    return (
        <div>
            <Menubar className="justify-between h-14" start={startItems} end={endItems}/>
            <Menu model={avatarMenuItems} popup ref={menuRef} />
            <TabView>
                <TabPanel className="ml-1" header="Upload/Record Audio" leftIcon="pi pi-upload">
                    <UploadForm user={user} />
                </TabPanel>
                <TabPanel header="My Uploaded Audios" leftIcon="pi pi-headphones">
                    <div className="overflow-auto" style={{scrollbarWidth: "none" }}>
                        <AudioList user={user} />
                    </div>
                </TabPanel>
            </TabView>
        </div>
    );
}