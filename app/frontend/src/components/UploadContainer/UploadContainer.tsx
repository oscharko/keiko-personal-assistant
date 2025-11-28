import React, { useCallback, useEffect, useState, useRef } from "react";
import { Icon, Spinner, SpinnerSize } from "@fluentui/react";
import { useTranslation } from "react-i18next";

import styles from "./UploadContainer.module.css";
import { uploadFileApi, listUploadedFilesApi, deleteUploadedFileApi } from "../../api";
import { useLogin, getToken } from "../../authConfig";
import { useMsal } from "@azure/msal-react";

// Supported file types for upload
const ACCEPTED_FILE_TYPES = ".pdf,.html,.txt,.md,.jpeg,.jpg,.png,.docx,.xlsx,.pptx,.json,.bmp,.heic,.tiff";
const ACCEPTED_MIME_TYPES = [
    "application/pdf",
    "text/html",
    "text/plain",
    "text/markdown",
    "image/jpeg",
    "image/png",
    "image/bmp",
    "image/heic",
    "image/tiff",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/json"
];

/**
 * Checks if beta authentication is being used.
 * @returns True if a beta auth token exists in localStorage.
 */
const isBetaAuthEnabled = (): boolean => {
    return !!localStorage.getItem("beta_auth_token");
};

interface UploadContainerProps {
    isOpen: boolean;
    onClose: () => void;
}

export const UploadContainer: React.FC<UploadContainerProps> = ({ isOpen, onClose }) => {
    const { t } = useTranslation();
    const [files, setFiles] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isDragActive, setIsDragActive] = useState(false);
    // Only use MSAL client if not using beta auth
    const useBetaAuth = isBetaAuthEnabled();
    const client = useLogin && !useBetaAuth ? useMsal().instance : undefined;
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchFiles = useCallback(async () => {
        // For beta auth, we don't need a client - the API will use the token from localStorage
        if (!useBetaAuth && !client) return;

        setIsLoading(true);
        setError(null);
        try {
            // For beta auth, pass empty string as token - getHeaders in api.ts will use localStorage token
            const token = useBetaAuth ? "" : await getToken(client!);
            if (!useBetaAuth && !token) {
                throw new Error("Failed to get access token");
            }
            const fileList = await listUploadedFilesApi(token || "");
            setFiles(fileList);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsLoading(false);
        }
    }, [client, useBetaAuth]);

    useEffect(() => {
        if (isOpen) {
            fetchFiles();
        }
    }, [isOpen, fetchFiles]);

    /**
     * Validates if the file type is supported for upload.
     */
    const isValidFileType = (file: File): boolean => {
        // Check by MIME type
        if (ACCEPTED_MIME_TYPES.includes(file.type)) {
            return true;
        }
        // Fallback to extension check for files with empty or unknown MIME types
        const extension = file.name.toLowerCase().split(".").pop();
        const validExtensions = ACCEPTED_FILE_TYPES.split(",").map(ext => ext.replace(".", ""));
        return extension ? validExtensions.includes(extension) : false;
    };

    /**
     * Handles file upload to blob storage and triggers RAG indexing.
     */
    const handleUpload = async (file: File) => {
        // For beta auth, we don't need a client - the API will use the token from localStorage
        if (!useBetaAuth && !client) return;

        // Validate file type before upload
        if (!isValidFileType(file)) {
            setError(t("upload.invalidFileType", "Invalid file type. Please upload a supported file format."));
            return;
        }

        setIsUploading(true);
        setError(null);
        const formData = new FormData();
        formData.append("file", file);

        try {
            // For beta auth, pass empty string as token - getHeaders in api.ts will use localStorage token
            const token = useBetaAuth ? "" : await getToken(client!);
            if (!useBetaAuth && !token) {
                throw new Error("Failed to get access token");
            }
            await uploadFileApi(formData, token || "");
            await fetchFiles();
        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsUploading(false);
        }
    };

    const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragActive(true);
    };

    const onDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragActive(false);
    };

    const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleUpload(e.dataTransfer.files[0]);
            e.dataTransfer.clearData();
        }
    };

    const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            handleUpload(e.target.files[0]);
        }
    };

    const onUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleDelete = async (filename: string) => {
        // For beta auth, we don't need a client - the API will use the token from localStorage
        if (!useBetaAuth && !client) return;
        if (!confirm(t("upload.confirmDelete", { filename }))) return;

        try {
            // For beta auth, pass empty string as token - getHeaders in api.ts will use localStorage token
            const token = useBetaAuth ? "" : await getToken(client!);
            if (!useBetaAuth && !token) {
                throw new Error("Failed to get access token");
            }
            await deleteUploadedFileApi(filename, token || "");
            setFiles(prev => prev.filter(f => f !== filename));
        } catch (e: any) {
            setError(e.message);
        }
    };

    return (
        <>
            {/* Overlay backdrop */}
            {isOpen && (
                <div
                    className={styles.overlay}
                    onClick={onClose}
                    aria-hidden="true"
                />
            )}
            <div className={`${styles.container} ${isOpen ? styles.open : ""}`}>
                <div className={styles.header}>
                    <h2 className={styles.title}>{t("upload.title", "Document Management")}</h2>
                    <button className={styles.closeButton} onClick={onClose} aria-label="Close">
                        <Icon iconName="Cancel" />
                    </button>
                </div>

            {error && <div className={styles.error}>{error}</div>}

            <div
                className={`${styles.uploadArea} ${isDragActive ? styles.dragActive : ""}`}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                onClick={onUploadClick}
            >
                <input
                    type="file"
                    ref={fileInputRef}
                    className={styles.fileInput}
                    onChange={onFileSelect}
                    accept={ACCEPTED_FILE_TYPES}
                    style={{ display: "none" }}
                />
                <Icon iconName="CloudUpload" className={styles.uploadIcon} />
                {isUploading ? (
                    <Spinner size={SpinnerSize.medium} label={t("upload.uploading", "Uploading...")} />
                ) : (
                    <>
                        <p className={styles.uploadText}>
                            {isDragActive ? t("upload.dropHere", "Drop the file here") : t("upload.dragDrop", "Drag & drop a file here, or click to select")}
                        </p>
                        <p className={styles.uploadSubtext}>{t("upload.supportedTypes", "Supported files: PDF, HTML, TXT, MD, JPEG, PNG")}</p>
                    </>
                )}
            </div>

            <div className={styles.documentList}>
                <h3 className={styles.listHeader}>{t("upload.uploadedFiles", "Uploaded Documents")}</h3>
                {isLoading ? (
                    <div className={styles.spinner}>
                        <Spinner size={SpinnerSize.large} />
                    </div>
                ) : (
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>{t("upload.filename", "Filename")}</th>
                                <th>{t("upload.actions", "Actions")}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {files.length === 0 ? (
                                <tr>
                                    <td colSpan={2} className={styles.noFiles}>
                                        {t("upload.noFiles", "No files uploaded")}
                                    </td>
                                </tr>
                            ) : (
                                files.map((file, index) => (
                                    <tr key={index}>
                                        <td>{file}</td>
                                        <td>
                                            <button
                                                className={styles.deleteButton}
                                                onClick={() => handleDelete(file)}
                                                title={t("upload.delete", "Delete")}
                                            >
                                                <Icon iconName="Delete" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
        </>
    );
};
