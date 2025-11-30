/**
 * Playground Info Dialog component.
 * Displays a comprehensive explanation of the RAG Playground functionality
 * and parameter settings to users.
 */

import { useCallback, useEffect } from "react";
import { Dismiss24Regular } from "@fluentui/react-icons";
import { useTranslation } from "react-i18next";

import styles from "./PlaygroundInfoDialog.module.css";

interface PlaygroundInfoDialogProps {
    onClose: () => void;
}

/**
 * Dialog component that explains the RAG Playground functionality and parameters.
 */
export function PlaygroundInfoDialog({ onClose }: PlaygroundInfoDialogProps): JSX.Element {
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
            aria-labelledby="playground-info-title"
        >
            <div className={styles.dialog}>
                {/* Header */}
                <div className={styles.header}>
                    <h2 id="playground-info-title" className={styles.title}>
                        {t("playground.info.title")}
                    </h2>
                    <button
                        className={styles.closeButton}
                        onClick={onClose}
                        aria-label={t("playground.close")}
                    >
                        <Dismiss24Regular />
                    </button>
                </div>

                {/* Content */}
                <div className={styles.content}>
                    {/* Introduction */}
                    <section className={styles.section}>
                        <h3 className={styles.sectionTitle}>{t("playground.info.introTitle")}</h3>
                        <p className={styles.paragraph}>{t("playground.info.introText")}</p>
                    </section>

                    {/* What is RAG */}
                    <section className={styles.section}>
                        <h3 className={styles.sectionTitle}>{t("playground.info.ragTitle")}</h3>
                        <p className={styles.paragraph}>{t("playground.info.ragText")}</p>
                    </section>

                    {/* Response Settings */}
                    <section className={styles.section}>
                        <h3 className={styles.sectionTitle}>{t("playground.info.responseTitle")}</h3>
                        <p className={styles.paragraph}>{t("playground.info.responseText")}</p>
                        <ul className={styles.list}>
                            <li>{t("playground.info.responseItem1")}</li>
                            <li>{t("playground.info.responseItem2")}</li>
                        </ul>
                    </section>

                    {/* Search Settings */}
                    <section className={styles.section}>
                        <h3 className={styles.sectionTitle}>{t("playground.info.searchTitle")}</h3>
                        <p className={styles.paragraph}>{t("playground.info.searchText")}</p>

                        <div className={styles.parameterBox}>
                            <h4 className={styles.parameterTitle}>{t("playground.info.retrievalModeTitle")}</h4>
                            <ul className={styles.subList}>
                                <li>{t("playground.info.retrievalModeItem1")}</li>
                                <li>{t("playground.info.retrievalModeItem2")}</li>
                                <li>{t("playground.info.retrievalModeItem3")}</li>
                            </ul>
                        </div>

                        <div className={styles.parameterBox}>
                            <h4 className={styles.parameterTitle}>{t("playground.info.semanticTitle")}</h4>
                            <p className={styles.paragraph}>{t("playground.info.semanticText")}</p>
                        </div>

                        <div className={styles.parameterBox}>
                            <h4 className={styles.parameterTitle}>{t("playground.info.agenticTitle")}</h4>
                            <p className={styles.paragraph}>{t("playground.info.agenticText")}</p>
                        </div>
                    </section>

                    {/* LLM Settings */}
                    <section className={styles.section}>
                        <h3 className={styles.sectionTitle}>{t("playground.info.llmTitle")}</h3>
                        <p className={styles.paragraph}>{t("playground.info.llmText")}</p>

                        <div className={styles.parameterBox}>
                            <h4 className={styles.parameterTitle}>{t("playground.info.temperatureTitle")}</h4>
                            <p className={styles.paragraph}>{t("playground.info.temperatureText")}</p>
                        </div>

                        <div className={styles.parameterBox}>
                            <h4 className={styles.parameterTitle}>{t("playground.info.reasoningTitle")}</h4>
                            <p className={styles.paragraph}>{t("playground.info.reasoningText")}</p>
                        </div>
                    </section>

                    {/* Tips */}
                    <section className={styles.section}>
                        <h3 className={styles.sectionTitle}>{t("playground.info.tipsTitle")}</h3>
                        <ul className={styles.list}>
                            <li>{t("playground.info.tip1")}</li>
                            <li>{t("playground.info.tip2")}</li>
                            <li>{t("playground.info.tip3")}</li>
                            <li>{t("playground.info.tip4")}</li>
                        </ul>
                    </section>
                </div>

                {/* Footer */}
                <div className={styles.footer}>
                    <button className={styles.closeButtonPrimary} onClick={onClose}>
                        {t("playground.info.understood")}
                    </button>
                </div>
            </div>
        </div>
    );
}

