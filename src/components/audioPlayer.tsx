import WaveSurferPlayer from '@wavesurfer/react';
import WaveSurfer from 'wavesurfer.js';
import {useCallback, useRef, useState} from "react";
import {Button} from "primereact/button";


interface Audio {
    name: string;
    url: string;
}

export default function AudioPlayer(audio: Audio) {
    const wavesurferRef = useRef<WaveSurfer | null>(null);
    const [duration, setDuration] = useState<number>(0);
    const [currentTime, setCurrentTime] = useState<number>(0);
    const [isPlaying, setIsPlaying] = useState<boolean>(false);

    const handleWSMount = useCallback((ws: WaveSurfer) => {
        wavesurferRef.current = ws;

        ws.on("ready", () => {
            setDuration(ws.getDuration());
        });

        ws.on("audioprocess", () => {
            setCurrentTime(ws.getCurrentTime());
        });
        ws.on('play', () => setIsPlaying(true));
        ws.on('pause', () => setIsPlaying(false));
        ws.on('finish', () => setIsPlaying(false));
    }, []);

    const formatTime = (time: number) => {
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
    };

    const togglePlayPause = () => {
        wavesurferRef.current?.playPause();
    };

    return (
        <div className="w-full min-w-100 gap-2 grid items-center grid-cols-[50px_50px_1fr_50px]">
            <Button
                icon={isPlaying ? "pi pi-pause" : "pi pi-play"}
                className="p-button-rounded w-12"
                onClick={() => togglePlayPause()}
            />
            <span className="font-bold">{formatTime(currentTime)} </span>
            <WaveSurferPlayer
                backend="MediaElement"
                cursorWidth={0}
                height={80}
                barGap={1}
                barWidth={3}
                waveColor="#ddd"
                progressColor="#2196F3"
                url={audio.url}
                onReady={(ws) => handleWSMount(ws)}
            />
            <span className="font-bold">-{formatTime(duration-currentTime)}</span>
        </div>
    )
}