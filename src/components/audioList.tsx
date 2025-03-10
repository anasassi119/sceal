"use client";

import { useState, useRef, useEffect } from "react";
import { storage } from "@/lib/firebaseConfig";
import { ref, list, getDownloadURL, deleteObject } from "firebase/storage";
import { User } from "firebase/auth";
import { Button } from "primereact/button";
import { Toast } from "primereact/toast";
import { ConfirmDialog, confirmDialog } from "primereact/confirmdialog";
import { VirtualScroller } from "primereact/virtualscroller";
import AudioPlayer from "@/components/audioPlayer";

interface Audio {
    name: string;
    url: string;
}

interface AudioListProps {
    user: User | null;
}

export default function AudioList({ user }: AudioListProps) {
    const [audios, setAudios] = useState<Audio[]>([]);
    const fetchedFilesRef = useRef<Set<string>>(new Set()); // ✅ Track fetched files in a ref
    const [nextPageToken, setNextPageToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const toast = useRef<Toast>(null);
    const scrollerRef = useRef<VirtualScroller>(null);

    useEffect(() => {
        const fetchStuff = async () => {
           await fetchAudios();
        }
        fetchStuff()
    }, [user]);

    // 🔥 Fetch files with pagination and avoid duplicates
    const fetchAudios = async (pageToken: string | null = null) => {
        if (!user || isLoading || (pageToken === null && audios.length > 0)) return; // ✅ Stop fetching if no nextPageToken
        setIsLoading(true);

        try {
            const storageRef = ref(storage, `audios/${user.uid}/`);
            const options = { maxResults: 10, pageToken: pageToken || undefined };
            const result = await list(storageRef, options);

            const audioPromises = result.items.map(async (item) => ({
                name: item.name,
                url: await getDownloadURL(item),
            }));
            const newAudios = await Promise.all(audioPromises);
            const uniqueAudios = newAudios.filter(audio => !fetchedFilesRef.current.has(audio.name));

            if (uniqueAudios.length > 0) {
                setAudios((prev) => [...prev, ...uniqueAudios]);
                uniqueAudios.forEach(audio => fetchedFilesRef.current.add(audio.name));
            }

            // ✅ Update nextPageToken properly
            if (result.nextPageToken) {
                setNextPageToken(result.nextPageToken);
            } else {
                setNextPageToken(null); // ✅ Ensure it's set to null when no more pages
            }

        } catch (error) {
            console.error("Error fetching files:", error);
        }

        setIsLoading(false);
    };

    const onLazyLoad = () => {
        if (nextPageToken !== null && !isLoading) { // ✅ Prevent extra fetches
            fetchAudios(nextPageToken);
            console.log("rabbbb")
        }
    };

    const confirmDelete = (filePath: string) => {
        confirmDialog({
            message: "Are you sure you want to delete this file?",
            header: "Confirm Deletion",
            icon: "pi pi-exclamation-triangle",
            acceptClassName: "p-button-danger",
            accept: () => deleteFile(filePath),
            reject: () => toast.current?.show({ severity: "info", summary: "Cancelled", detail: "File not deleted" })
        });
    };

    // 🔥 Delete File
    const deleteFile = async (filePath: string) => {
        try {
            console.log(filePath);
            const fileRef = ref(storage, filePath);
            await deleteObject(fileRef);

            setAudios((prevAudios) => prevAudios.filter(audio => audio.url !== filePath));

            // ✅ Remove from fetchedFilesRef immediately
            fetchedFilesRef.current.delete(filePath);

            toast.current?.show({ severity: "success", summary: "Deleted", detail: "File removed successfully!" });
        } catch (error) {
            console.error("Error deleting file:", error);
            toast.current?.show({ severity: "error", summary: "Error", detail: "Failed to delete file!" });
        }
    };

    // 🔥 Render Each Row in Virtual Scroller
    const itemTemplate = (audio: Audio) => (
        <div className="grid grid-cols-[200px_1fr_120px] gap-5 items-center w-full border-b-1 border-blue-200">
            <div className="overflow-hidden">
                <p>{audio.name}</p>
            </div>
            <AudioPlayer name={audio.name} url={audio.url} />
            <div className="flex gap-2">
                <a href={`${audio.url}&dl=1`} download={audio.url}>
                    <Button icon="pi pi-download" className="p-button-sm p-button-text" />
                </a>
                <Button
                    icon="pi pi-trash"
                    className="p-button-danger p-button-sm p-button-text"
                    onClick={() => confirmDelete(audio.url)}
                />
            </div>
        </div>
    );

    if (isLoading) {
        return (
            <div className="flex justify-center items-center gap-5">
                <i className="pi pi-spin pi-spinner" style={{ fontSize: '2rem' }}></i>
                Loading
            </div>
        );
    }

    if (!isLoading && audios.length === 0) {
        return <div>There are no audios yet.. try uploading a few</div>
    }

    return (
        <div>
            <Toast ref={toast} />
            <ConfirmDialog />
            <VirtualScroller
                className="w-full h-130"
                ref={scrollerRef}
                items={audios}
                itemSize={120} // Adjust row height
                lazy
                delay={150}
                onLazyLoad={onLazyLoad}
                itemTemplate={itemTemplate}
                loading={isLoading}
            />
        </div>
    );
}
