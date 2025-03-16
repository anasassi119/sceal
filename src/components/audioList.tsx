"use client";
import dynamic from 'next/dynamic';

const Lottie = dynamic(() => import("lottie-react"), { ssr: false });
import { useState, useEffect, useRef, useCallback } from "react";
import { storage } from "@/lib/firebaseConfig";
import { ref, list, getDownloadURL, deleteObject } from "firebase/storage";
import { User } from "firebase/auth";
import { Button } from "primereact/button";
import { Toast } from "primereact/toast";
import { ConfirmDialog, confirmDialog } from "primereact/confirmdialog";
import AudioPlayer, {RHAP_UI} from 'react-h5-audio-player';
import 'react-h5-audio-player/lib/styles.css';
import {HiOutlineDotsVertical} from "react-icons/hi";
import {OverlayPanel} from "primereact/overlaypanel";
import playingAnimation from '../app/animations/playing.json';
import { Ripple } from "primereact/ripple";

interface Audio {
    name: string;
    url: string;
}

interface AudioListProps {
    user: User | null;
    isLoading: boolean;
    setIsLoading: (isLoading: boolean) => void;
}

export default function AudioList({ user, isLoading, setIsLoading }: AudioListProps) {
    const [audios, setAudios] = useState<Audio[]>([]);
    const fetchedFilesRef = useRef<Set<string>>(new Set());
    const overlayRef = useRef<OverlayPanel | null>(null);
    const [nextPageToken, setNextPageToken] = useState<string | null>(null);
    const [playingNow, setPlayingNow] = useState<Audio | null>(null);
    const toast = useRef<Toast>(null);
    const observerRef = useRef<IntersectionObserver | null>(null);
    const [selectedAudio, setSelectedAudio] = useState<Audio | null>(null);

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

    useEffect(() => {
        if (playingNow) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: playingNow.name,
                artist: "Anas's Audio Player",
                album: "Uploaded Audio",
                artwork: [
                    { src: "/96x96.png", sizes: "96x96", type: "image/png" },
                    { src: "/128x128.png", sizes: "128x128", type: "image/png" },
                    { src: "/192x192.png", sizes: "192x192", type: "image/png" }
                ]
            });
        }
    }, [playingNow]);

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
            console.log("fileRef", fileRef);
            await deleteObject(fileRef);
            setAudios((prev) => prev.filter(audio => audio.url !== filePath));
            fetchedFilesRef.current.delete(filePath);
            // setPlayingNow(null)
            toast.current?.show({ severity: "success", summary: "Deleted", detail: "File removed successfully!" });
        } catch (error) {
            console.error("Error deleting file:", error);
            toast.current?.show({ severity: "error", summary: "Error", detail: "Failed to delete file!" });
        }
    };

    return (
        <div className="fixed inset-0 top-[137px] bottom-0 flex flex-col overflow-hidden">
            <Toast ref={toast} />
            <ConfirmDialog />
            {(!isLoading && audios.length === 0 )&& (
                <div className="flex h-[calc(100vh-300px)] w-full justify-center items-center">
                    Hmm.. not audio yet, try uploading some!
                </div>
            )}
            <div className="max-w-full overflow-auto grow" style={{scrollbarWidth: "none" }}>
                <table className="w-full border-collapse border border-gray-300 rounded-br-none rounded-bl-none
                overflow-hidden">
                    <tbody>
                    {audios.map((audio, index) => (
                        <tr
                            key={audio.url || index}
                            ref={index === audios.length - 1 ? lastRowRef : null}
                            className={`border-0 border-gray-500 h-15 ${
                                index % 2 === 1 ? "bg-white" : "bg-gray-100"
                            } hover:cursor-pointer p-ripple`}
                        >
                            <td onClick={() => {
                                setPlayingNow(audio)
                            }
                            }
                                className="border-0 p-3 w-[90%] overflow-hidden whitespace-nowrap relative">
                                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 animate-scroll">
                                        {audio.name}
                                </div>
                                <Ripple />
                            </td>
                            <td className="border-0 p-3 flex h-14 justify-end items-center">
                                {playingNow?.url === audio.url && (
                                    <Lottie style={{height: "32px", display: "flex", alignItems: "center"}}
                                            animationData={playingAnimation} loop={true} />
                                )}
                                <button style={{color: "#868686"}} className="text-xl cursor-pointer h-full"
                                        onClick={(e) => {
                                            setSelectedAudio(audio)
                                            overlayRef.current?.toggle(e)
                                        }}>
                                    <HiOutlineDotsVertical />
                                </button>
                                <OverlayPanel ref={overlayRef}>
                                    <div>
                                        <a href={`${selectedAudio?.url || ''}&dl=1`} download>
                                            <Button icon="pi pi-download" className="p-button-sm p-button-text" />
                                        </a>
                                        <Button
                                            icon="pi pi-trash"
                                            className="p-button-danger p-button-sm p-button-text"
                                            onClick={() => confirmDelete(selectedAudio?.url || '')}
                                        />
                                    </div>
                                </OverlayPanel>
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>
            <div className="w-full flex h-[140px]">
                <AudioPlayer
                    className="relative"
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
                    customControlsSection={[
                        RHAP_UI.ADDITIONAL_CONTROLS,
                        RHAP_UI.MAIN_CONTROLS,
                        RHAP_UI.VOLUME_CONTROLS,
                    ]}
                />
            </div>
        </div>
    );
}