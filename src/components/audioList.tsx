"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { storage } from "@/lib/firebaseConfig";
import { ref, list, getDownloadURL, deleteObject } from "firebase/storage";
import { User } from "firebase/auth";
import { Button } from "primereact/button";
import { Toast } from "primereact/toast";
import { ConfirmDialog, confirmDialog } from "primereact/confirmdialog";
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
    const fetchedFilesRef = useRef<Set<string>>(new Set());
    const [nextPageToken, setNextPageToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const toast = useRef<Toast>(null);
    const observerRef = useRef<IntersectionObserver | null>(null);

    useEffect(() => {
        fetchAudios();
    }, []);

    // Fetch audio files from Firebase Storage with pagination
    const fetchAudios = async (pageToken: string | null = null) => {
        if (!user || isLoading || (pageToken === null && audios.length > 0)) return;
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

            setNextPageToken(result.nextPageToken || null);
            console.log(result.nextPageToken);
        } catch (error) {
            console.error("Error fetching files:", error);
        }

        setIsLoading(false);
    };

    const lastRowRef = useCallback(
        (node: HTMLTableRowElement | null) => {
            if (isLoading) return;
            if (observerRef.current) observerRef.current.disconnect();

            observerRef.current = new IntersectionObserver((entries) => {
                if (entries[0].isIntersecting && nextPageToken) {
                    fetchAudios(nextPageToken);
                }
            });

            if (node) observerRef.current.observe(node);
        },
        [isLoading, nextPageToken]
    );

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

    const deleteFile = async (filePath: string) => {
        try {
            const fileRef = ref(storage, filePath);
            await deleteObject(fileRef);
            setAudios((prev) => prev.filter(audio => audio.url !== filePath));
            fetchedFilesRef.current.delete(filePath);

            toast.current?.show({ severity: "success", summary: "Deleted", detail: "File removed successfully!" });
        } catch (error) {
            console.error("Error deleting file:", error);
            toast.current?.show({ severity: "error", summary: "Error", detail: "Failed to delete file!" });
        }
    };

    return (
        <div>
            <Toast ref={toast} />
            <ConfirmDialog />
            <div className="max-w-full overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300 rounded-lg overflow-hidden">
                    <thead className="bg-gray-400">
                    <tr>
                        <th className="p-3 border-0 w-3/12">Audio Name</th>
                        <th className="p-3 border-0">Play/Pause</th>
                        <th className="p-3 border-0 w-1/12">Download</th>
                        <th className="p-3 border-0 w-1/12">Delete</th>
                    </tr>
                    </thead>
                    <tbody>
                    {audios.map((audio, index) => (
                        <tr
                            key={audio.url}
                            ref={index === audios.length - 1 ? lastRowRef : null}
                            className={`border-0 ${
                                index % 2 === 1 ? "bg-gray-200" : "bg-white"
                            }`}
                        >
                            <td className="border-0 p-3 w-3/12">{audio.name}</td>
                            <td className="border-0 p-3">
                                <AudioPlayer name={audio.name} url={audio.url} />
                            </td>
                            <td className="border-0 p-3 w-1/12 text-center">
                                <a href={`${audio.url}&dl=1`} download>
                                    <Button icon="pi pi-download" className="p-button-sm p-button-text" />
                                </a>
                            </td>
                            <td className="border-0 p-3 w-1/12 text-center">
                                <Button
                                    icon="pi pi-trash"
                                    className="p-button-danger p-button-sm p-button-text"
                                    onClick={() => confirmDelete(audio.url)}
                                />
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>

            {isLoading && (
                <div className="flex justify-center items-center gap-5 mt-4">
                    <i className="pi pi-spin pi-spinner" style={{ fontSize: '2rem' }}></i>
                    Loading...
                </div>
            )}
        </div>
    );
}