/**
 * DocUploadPage component for document management.
 * Provides a full-page interface for uploading and managing documents.
 */
import React, {useCallback, useEffect, useRef, useState} from "react";
import {useNavigate} from "react-router-dom";
import {Icon, IconButton, Spinner, SpinnerSize} from "@fluentui/react";
import {useTranslation} from "react-i18next";
import {Helmet} from "react-helmet-async";
import {useMsal} from "@azure/msal-react";
import {Info24Regular} from "@fluentui/react-icons";
import styles from "./DocUploadPage.module.css";
import {deleteUploadedFileApi, listUploadedFilesApi, uploadFileApi} from "../../api";
import {getToken, useLogin} from "../../authConfig";
import {DocUploadInfoDialog} from "./DocUploadInfoDialog";
import {ParticleBackground} from "../../components/ParticleBackground";

const ACCEPTED_FILE_TYPES = ".pdf,.html,.txt,.md,.jpeg,.jpg,.png,.docx,.xlsx,.pptx,.json,.bmp,.heic,.tiff";
const ACCEPTED_MIME_TYPES = [
    "application/pdf", "text/html", "text/plain", "text/markdown", "image/jpeg", "image/png",
    "image/bmp", "image/heic", "image/tiff",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation", "application/json"
];

const isBetaAuthEnabled = (): boolean => !!localStorage.getItem("beta_auth_token");

export function Component(): JSX.Element {
    const {t} = useTranslation();
    const navigate = useNavigate();
    const [files, setFiles] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isDragActive, setIsDragActive] = useState(false);
    const [showInfoDialog, setShowInfoDialog] = useState(false);
    const useBetaAuth = isBetaAuthEnabled();
    const client = useLogin && !useBetaAuth ? useMsal().instance : undefined;
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchFiles = useCallback(async () => {
        if (!useBetaAuth && !client) return;
        setIsLoading(true);
        setError(null);
        try {
            const token = useBetaAuth ? "" : await getToken(client!);
            if (!useBetaAuth && !token) throw new Error("Failed to get access token");
            setFiles(await listUploadedFilesApi(token || ""));
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Unknown error");
        } finally {
            setIsLoading(false);
        }
    }, [client, useBetaAuth]);

    useEffect(() => {
        fetchFiles();
    }, [fetchFiles]);

    const isValidFileType = (file: File): boolean => {
        if (ACCEPTED_MIME_TYPES.includes(file.type)) return true;
        const ext = file.name.toLowerCase().split(".").pop();
        return ext ? ACCEPTED_FILE_TYPES.split(",").map(e => e.replace(".", "")).includes(ext) : false;
    };

    const handleUpload = async (file: File) => {
        if (!useBetaAuth && !client) return;
        if (!isValidFileType(file)) {
            setError(t("upload.invalidFileType", "Invalid file type."));
            return;
        }
        setIsUploading(true);
        setError(null);
        const formData = new FormData();
        formData.append("file", file);
        try {
            const token = useBetaAuth ? "" : await getToken(client!);
            if (!useBetaAuth && !token) throw new Error("Failed to get access token");
            await uploadFileApi(formData, token || "");
            await fetchFiles();
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Unknown error");
        } finally {
            setIsUploading(false);
        }
    };

    const handleDelete = async (filename: string) => {
        if (!useBetaAuth && !client) return;
        if (!confirm(t("upload.confirmDelete", {filename}))) return;
        try {
            const token = useBetaAuth ? "" : await getToken(client!);
            if (!useBetaAuth && !token) throw new Error("Failed to get access token");
            await deleteUploadedFileApi(filename, token || "");
            setFiles(prev => prev.filter(f => f !== filename));
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Unknown error");
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
        if (e.dataTransfer.files?.length > 0) {
            handleUpload(e.dataTransfer.files[0]);
            e.dataTransfer.clearData();
        }
    };
    const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.length) handleUpload(e.target.files[0]);
    };

    return (
        <div className={styles.container}>
            <Helmet>
                <title>{t("upload.title", "Document Management")} - Keiko</title>
            </Helmet>

            <div className={styles.header}>
                <div className={styles.headerLeft}>
                    <h1 className={styles.title}>{t("upload.title")}</h1>
                    <p className={styles.subtitle}>{t("upload.subtitle")}</p>
                </div>
                <div className={styles.headerActions}>
                    <button
                        className={styles.infoButton}
                        onClick={() => setShowInfoDialog(true)}
                        title={t("upload.explainFunction")}
                    >
                        <Info24Regular/>
                        {t("upload.explainFunction")}
                    </button>
                    <button className={styles.backButton} onClick={() => navigate("/")}>
                        <Icon iconName="Back"/>
                        {t("upload.backToChat")}
                    </button>
                </div>
            </div>


            {error && <div className={styles.error}>{error}</div>}

            <div className={styles.content}>

                <div className={`${styles.uploadArea} ${isDragActive ? styles.dragActive : ""}`}
                     onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
                     onClick={() => fileInputRef.current?.click()}>
                    <ParticleBackground
                        backgroundColor="#DCFF4A"
                        particleColor="#000000"
                    />
                    <div className={styles.uploadContent}>
                        <input type="file" ref={fileInputRef} className={styles.fileInput} onChange={onFileSelect}
                               accept={ACCEPTED_FILE_TYPES} style={{display: "none"}}/>
                        <Icon iconName="CloudUpload" className={styles.uploadIcon}/>
                        {isUploading ?
                            <Spinner size={SpinnerSize.medium} label={t("upload.uploading", "Uploading...")}/> : (
                                <>
                                    <p className={styles.uploadText}>{isDragActive ? t("upload.dropHere", "Drop here")
                                        : t("upload.dragDrop", "Drag & drop a file here, or click to select")}</p>
                                    <p className={styles.uploadSubtext}>{t("upload.supportedTypes", "PDF, HTML, TXT, MD, JPEG, PNG, DOCX")}</p>
                                </>
                            )}
                    </div>
                </div>


                <div className={styles.documentList}>
                    <h2 className={styles.listHeader}>{t("upload.uploadedFiles", "Uploaded Documents")}</h2>
                    {isLoading ? <div className={styles.spinner}><Spinner size={SpinnerSize.large}/></div> : (
                        <div className={styles.tableWrapper}>
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
                                        <td colSpan={2}
                                            className={styles.noFiles}>{t("upload.noFiles", "No files uploaded")}</td>
                                    </tr>
                                ) : files.map((file, i) => (
                                    <tr key={i}>
                                        <td>{file}</td>
                                        <td>
                                            <IconButton
                                                iconProps={{iconName: "Delete"}}
                                                title={t("upload.delete")}
                                                ariaLabel={t("delete", "Delete")}
                                                onClick={() => handleDelete(file)}
                                                styles={{
                                                    root: {
                                                        backgroundColor: "#DCFF4A",
                                                        color: "#000",
                                                        marginLeft: "8px",
                                                        borderRadius: "20%",
                                                        border: "1px solid #000"
                                                    },
                                                    rootHovered: {
                                                        backgroundColor: "#000",
                                                        color: "#fff",
                                                        borderRadius: "20%",
                                                        border: "1px solid #DCFF4A"
                                                    }
                                                }}
                                            />
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

            </div>

            {/* Info Dialog */}
            {showInfoDialog && (
                <DocUploadInfoDialog onClose={() => setShowInfoDialog(false)}/>
            )}
        </div>
    );
}

Component.displayName = "DocUploadPage";
