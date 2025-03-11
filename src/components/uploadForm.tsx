"use client";

import { useState, useRef } from 'react';
import { storage } from '@/lib/firebaseConfig';
import { ref, uploadBytesResumable } from 'firebase/storage';
import { User } from 'firebase/auth';
import { Button } from "primereact/button";
import { FileUpload, FileUploadHandlerEvent, FileUploadHeaderTemplateOptions } from "primereact/fileupload";
import { Toast } from "primereact/toast";
import {ProgressBar} from "primereact/progressbar";
import { InputText } from "primereact/inputtext";
import AudioPlayer from "@/components/audioPlayer";

interface UploadFormProps {
    user: User | null;
}

export default function UploadForm({ user }: UploadFormProps) {
    const [audioURL, setAudioURL] = useState('');
    const mediaRecorder = useRef<MediaRecorder | null>(null);
    const audioChunks = useRef<Blob[]>([]);
    const [isRecording, setIsRecording] = useState(false);
    const toast = useRef<Toast>(null);
    const fileUploadRef = useRef<FileUpload>(null);
    const [progress, setProgress] = useState<number>(0);
    const [customFileName, setCustomFileName] = useState<string>(`recording-${Date.now()}.mp3`); // ✅ Custom name state
    const [fileExtension, setFileExtension] = useState<string>('mp3');

    const startRecording = async () => {
        audioChunks.current = [];
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder.current = new MediaRecorder(stream);

        mediaRecorder.current.ondataavailable = (event) => {
            audioChunks.current.push(event.data);
        };

        mediaRecorder.current.onstop = () => {
            const audioBlob = new Blob(audioChunks.current, { type: 'audio/mp3' });
            const file = new File([audioBlob], `recording-${Date.now()}`, { type: 'audio/mp3' });
            const url = URL.createObjectURL(audioBlob);
            setAudioURL(url);

            if (fileUploadRef.current) {
                fileUploadRef.current.setFiles([
                    Object.assign(file, { objectURL: url })
                ]);
            }
        };

        mediaRecorder.current.start();
        setIsRecording(true);
    };

    const stopRecording = () => {
        mediaRecorder.current?.stop();
        setIsRecording(false);
    };

    const customUploadAudio = async ({ files }: FileUploadHandlerEvent) => {
        const file = files[0];
        if (!file) {
            toast.current?.show({ severity: 'error', summary: 'Fail', detail: 'No files selected!' });
            return;
        }

        setAudioURL(URL.createObjectURL(file));
        const storageRef = ref(storage, `audios/${user?.uid}/${customFileName}.${fileExtension}`);

        const uploadTask = uploadBytesResumable(storageRef, file);

        uploadTask.on('state_changed',
            (snapshot) => {
                setProgress((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
            },
            (error) => {
                toast.current?.show({ severity: 'error', summary: 'Fail', detail: error.message });
            },
            () => {
                toast.current?.show({ severity: 'success', summary: 'Success', detail: 'File Uploaded!' });
                setAudioURL('');
                setProgress(0);
                setCustomFileName(`recording-${Date.now()}.mp3`);
                fileUploadRef.current?.clear();
            }
        );
    };

    const chooseOptions = {className: "min-w-50"}
    const uploadOptions = {className: "p-button-success min-w-50"}
    const cancelOptions = {className: "p-button-danger min-w-50"}

    const headerTemplate = (options: FileUploadHeaderTemplateOptions) => {
        const { className, chooseButton, uploadButton, cancelButton } = options;
        return (
            <div className={className} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                {chooseButton}
                <Button
                    className="min-w-50"
                    label={isRecording ? 'Stop Recording' : 'Record Audio'}
                    icon={isRecording ? 'pi pi-stop' : 'pi pi-microphone'}
                    severity={isRecording ? 'danger' : undefined}
                    onClick={isRecording ? stopRecording : startRecording}
                />
                {uploadButton}
                {cancelButton}
            </div>
        );
    };

    const progressBarTemplate = () => {
        return (
            <ProgressBar style={{height: "1rem"}} value={progress.toFixed(1)}></ProgressBar>
        )
    }

    return (
        <div className="flex flex-col gap-4">
            <Toast ref={toast}/>
            <FileUpload
                className="overflow-hidden scroll-auto"
                style={{overflow: "auto auto"}}
                ref={fileUploadRef}
                customUpload
                headerTemplate={headerTemplate}
                chooseOptions={chooseOptions}
                uploadOptions={uploadOptions}
                cancelOptions={cancelOptions}
                progressBarTemplate={progressBarTemplate}
                chooseLabel="Choose Audio"
                uploadLabel="Start Upload"
                accept="audio/*"
                uploadHandler={customUploadAudio}
                onSelect={(e) => {
                    const file = e.files[0];
                    if (file) {
                        setAudioURL(URL.createObjectURL(file));
                        setCustomFileName(file.name.split('.')[0])
                        setFileExtension(file.name.split('.')[1])
                    }
                }}
                onClear={() => {
                    setCustomFileName(`recording-${Date.now()}`)
                    setFileExtension('mp3')
                }}
                emptyTemplate={<p className="m-0">Choose an audio file to upload, or record your own.</p>}
                itemTemplate={() => (
                    <div className="grid grid-cols-[3fr_1fr] gap-5 items-center">
                        <AudioPlayer name={customFileName} url={audioURL} />
                        <div className="flex gap-2 items-center min-w-88">
                            <label htmlFor="customName">File Name:</label>
                            <InputText
                                id="customName"
                                value={customFileName}
                                onChange={(e) => setCustomFileName(e.target.value)}
                                placeholder="Enter custom file name"
                            />
                        </div>
                    </div>
                )}
            />
        </div>
    );
}