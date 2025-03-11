"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { storage } from "@/lib/firebaseConfig";
import { ref, list, getDownloadURL, deleteObject } from "firebase/storage";
import { User } from "firebase/auth";
import { Button } from "primereact/button";
import { Toast } from "primereact/toast";
import { ConfirmDialog, confirmDialog } from "primereact/confirmdialog";
import AudioPlayer from 'react-h5-audio-player';
import 'react-h5-audio-player/lib/styles.css';

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
    const [playingNow, setPlayingNow] = useState<Audio | null>(null);
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
            <div className="max-w-full overflow-x-auto rounded-lg">
                <table className="w-full border-collapse border border-gray-300 rounded-lg overflow-hidden">
                    {/*<thead className="bg-gray-400">*/}
                    {/*<tr>*/}
                    {/*    <th className="p-3 border-0 w-3/12">Audio Name</th>*/}
                    {/*    /!*<th className="p-3 border-0">Play/Pause</th>*!/*/}
                    {/*    <th className="p-3 border-0 w-1/12">Download</th>*/}
                    {/*</tr>*/}
                    {/*</thead>*/}
                    <tbody>
                    {audios.map((audio, index) => (
                        <tr
                            key={audio.url}
                            ref={index === audios.length - 1 ? lastRowRef : null}
                            className={`border-0 h-10 ${
                                index % 2 === 1 ? "bg-white" : "bg-gray-200"
                            } hover:cursor-pointer`}
                            onClick={() => {
                                setPlayingNow(audio)
                            }
                        }
                        >
                            <td className="border-0 p-3 w-3/12 overflow-hidden whitespace-nowrap relative">
                                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 animate-scroll">
                                    {audio.name}
                                </div>
                            </td>
                            <td className="border-0 p-3 w-1/12 text-center">
                                <a href={`${audio.url}&dl=1`} download>
                                    <Button icon="pi pi-download" className="p-button-sm p-button-text" />
                                </a>
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
            <div className="fixed bottom-0 left-1/2 transform -translate-x-1/2 -translate-y-3/4 w-9/10 h-20">
                <AudioPlayer
                    autoPlayAfterSrcChange
                    showJumpControls={false}
                    showSkipControls={false}
                    src={playingNow?.url}
                    header={
                        (
                            <div className="h-10 text-center overflow-hidden whitespace-nowrap">
                                {playingNow?.name || 'No Audio Playing'}
                            </div>
                        )
                    }
                />
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