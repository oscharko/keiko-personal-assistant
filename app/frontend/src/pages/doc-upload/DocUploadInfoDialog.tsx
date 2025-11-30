/**
 * Document Upload Info Dialog component.
 * Displays a comprehensive explanation of the Document Upload functionality
 * and how documents are processed for the RAG system.
 */

import { useCallback, useEffect } from "react";
import { Dismiss24Regular } from "@fluentui/react-icons";
import { useTranslation } from "react-i18next";

import styles from "./DocUploadInfoDialog.module.css";

interface DocUploadInfoDialogProps {
    onClose: () => void;
}

/**
 * Dialog component that explains the Document Upload functionality.
 */
export function DocUploadInfoDialog({ onClose }: DocUploadInfoDialogProps): JSX.Element {
    const { t } = useTranslation();

    // Handle escape key to close dialog
    const handleKeyDown = useCallback(
        (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                onClose();
            }
        },
        [onClose]
    );

    // Add/remove event listener for escape key
    useEffect(() => {
        document.addEventListener("keydown", handleKeyDown);
        // Prevent body scroll when dialog is open
        document.body.style.overflow = "hidden";

        return () => {
            document.removeEventListener("keydown", handleKeyDown);
            document.body.style.overflow = "";
        };
    }, [handleKeyDown]);

    // Handle overlay click to close dialog
    const handleOverlayClick = useCallback(
        (event: React.MouseEvent<HTMLDivElement>) => {
            if (event.target === event.currentTarget) {
                onClose();
            }
        },
        [onClose]
    );

    return (
        <div
            className={styles.overlay}
            onClick={handleOverlayClick}
            role="dialog"
            aria-modal="true"
            aria-labelledby="docupload-info-title"
        >
            <div className={styles.dialog}>
                {/* Header */}
                <div className={styles.header}>
                    <h2 id="docupload-info-title" className={styles.title}>
                        {t("upload.info.title")}
                    </h2>
                    <button
                        className={styles.closeButton}
                        onClick={onClose}
                        aria-label={t("upload.close")}
                    >
                        <Dismiss24Regular />
                    </button>
                </div>

                {/* Content */}
                <div className={styles.content}>
                    {/* Introduction */}
                    <section className={styles.section}>
                        <h3 className={styles.sectionTitle}>{t("upload.info.introTitle")}</h3>
                        <p className={styles.paragraph}>{t("upload.info.introText")}</p>
                    </section>

                    {/* How it works */}
                    <section className={styles.section}>
                        <h3 className={styles.sectionTitle}>{t("upload.info.howItWorksTitle")}</h3>

                        {/* Step 1: Upload */}
                        <div className={styles.step}>
                            <span className={styles.stepNumber}>1</span>
                            <div className={styles.stepContent}>
                                <h4 className={styles.stepTitle}>{t("upload.info.step1Title")}</h4>
                                <p className={styles.paragraph}>{t("upload.info.step1Text")}</p>
                            </div>
                        </div>

                        {/* Step 2: Processing */}
                        <div className={styles.step}>
                            <span className={styles.stepNumber}>2</span>
                            <div className={styles.stepContent}>
                                <h4 className={styles.stepTitle}>{t("upload.info.step2Title")}</h4>
                                <p className={styles.paragraph}>{t("upload.info.step2Text")}</p>
                            </div>
                        </div>

                        {/* Step 3: Indexing */}
                        <div className={styles.step}>
                            <span className={styles.stepNumber}>3</span>
                            <div className={styles.stepContent}>
                                <h4 className={styles.stepTitle}>{t("upload.info.step3Title")}</h4>
                                <p className={styles.paragraph}>{t("upload.info.step3Text")}</p>
                            </div>
                        </div>

                        {/* Step 4: Ready */}
                        <div className={styles.step}>
                            <span className={styles.stepNumber}>4</span>
                            <div className={styles.stepContent}>
                                <h4 className={styles.stepTitle}>{t("upload.info.step4Title")}</h4>
                                <p className={styles.paragraph}>{t("upload.info.step4Text")}</p>
                            </div>
                        </div>
                    </section>

                    {/* Supported Formats */}
                    <section className={styles.section}>
                        <h3 className={styles.sectionTitle}>{t("upload.info.formatsTitle")}</h3>
                        <p className={styles.paragraph}>{t("upload.info.formatsText")}</p>

                        <div className={styles.formatGrid}>
                            <div className={styles.formatCategory}>
                                <h4 className={styles.formatTitle}>{t("upload.info.documentsTitle")}</h4>
                                <ul className={styles.formatList}>
                                    <li>PDF</li>
                                    <li>DOCX</li>
                                    <li>XLSX</li>
                                    <li>PPTX</li>
                                </ul>
                            </div>
                            <div className={styles.formatCategory}>
                                <h4 className={styles.formatTitle}>{t("upload.info.textTitle")}</h4>
                                <ul className={styles.formatList}>
                                    <li>TXT</li>
                                    <li>MD</li>
                                    <li>HTML</li>
                                    <li>JSON</li>
                                </ul>
                            </div>
                            <div className={styles.formatCategory}>
                                <h4 className={styles.formatTitle}>{t("upload.info.imagesTitle")}</h4>
                                <ul className={styles.formatList}>
                                    <li>JPEG/JPG</li>
                                    <li>PNG</li>
                                    <li>BMP</li>
                                    <li>TIFF/HEIC</li>
                                </ul>
                            </div>
                        </div>
                    </section>

                    {/* Features */}
                    <section className={styles.section}>
                        <h3 className={styles.sectionTitle}>{t("upload.info.featuresTitle")}</h3>
                        <ul className={styles.list}>
                            <li>{t("upload.info.feature1")}</li>
                            <li>{t("upload.info.feature2")}</li>
                            <li>{t("upload.info.feature3")}</li>
                            <li>{t("upload.info.feature4")}</li>
                        </ul>
                    </section>

                    {/* Privacy */}
                    <section className={styles.section}>
                        <h3 className={styles.sectionTitle}>{t("upload.info.privacyTitle")}</h3>
                        <p className={styles.paragraph}>{t("upload.info.privacyText")}</p>
                    </section>
                </div>

                {/* Footer */}
                <div className={styles.footer}>
                    <button className={styles.closeButtonPrimary} onClick={onClose}>
                        {t("upload.info.understood")}
                    </button>
                </div>
            </div>
        </div>
    );
}

