'use client';

import React, { useRef, useState } from 'react';
import { Upload, FileUp } from 'lucide-react';
import { cn } from '../utils/cn';
import { useUploadFileMutation } from '../store/api/apiSlice';

const DragDropZone: React.FC = () => {
    const [isDragging, setIsDragging] = useState(false);
    const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            uploadFile(files[0]);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            uploadFile(e.target.files[0]);
        }
    };

    const uploadFile = async (file: File) => {
        setUploadStatus('uploading');
        const formData = new FormData();
        formData.append('file', file);

        try {
            const result = await uploadFileMutation(formData).unwrap();
            console.log('Upload success:', result);
            setUploadStatus('success');
            // In real app, we would trigger a capability refresh here
            setTimeout(() => setUploadStatus('idle'), 3000);
        } catch (error: any) {
            console.error('Upload failed:', error);
            setUploadStatus('error');
            setTimeout(() => setUploadStatus('idle'), 3000);
        }
    };

    return (
        <div
            className={cn(
                "border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 cursor-pointer",
                uploadStatus === 'success'
                    ? "border-green-500 bg-green-50"
                    : isDragging
                        ? "border-[#003580] bg-blue-50"
                        : "border-blue-200 bg-blue-50/40 hover:border-blue-300 hover:bg-blue-50",
                uploadStatus === 'success' && "border-green-500 bg-green-50"
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
        >
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".agent,.zip"
                onChange={handleFileSelect}
            />

            <div className="flex flex-col items-center gap-3">
                <div className={cn(
                    "p-3 rounded-full bg-blue-100 text-[#003580] transition-colors",
                    isDragging && "bg-blue-200",
                    uploadStatus === 'success' && "bg-green-100 text-green-600"
                )}>
                    {uploadStatus === 'success' ? <FileUp className="w-6 h-6" /> : <Upload className="w-6 h-6" />}
                </div>

                <div>
                    <h3 className="font-medium text-gray-900">
                        {uploadStatus === 'uploading' ? 'Uploading...' : 'Upload Agent File'}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                        Drag & drop or click to browse (.agent)
                    </p>
                </div>
            </div>
        </div>
    );
};

export default DragDropZone;




