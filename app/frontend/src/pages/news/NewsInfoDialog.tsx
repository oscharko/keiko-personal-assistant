/**
 * News Info Dialog component.
 * Displays a comprehensive explanation of the News Dashboard functionality
 * and how personalized news works.
 */

import { useCallback, useEffect } from "react";
import { Dismiss24Regular } from "@fluentui/react-icons";
import { useTranslation } from "react-i18next";

import styles from "./NewsInfoDialog.module.css";

interface NewsInfoDialogProps {
    onClose: () => void;
}

/**
 * Dialog component that explains the News Dashboard functionality.
 */
export function NewsInfoDialog({ onClose }: NewsInfoDialogProps): JSX.Element {
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
            aria-labelledby="news-info-title"
        >
            <div className={styles.dialog}>
                {/* Header */}
                <div className={styles.header}>
                    <h2 id="news-info-title" className={styles.title}>
                        {t("news.info.title")}
                    </h2>
                    <button
                        className={styles.closeButton}
                        onClick={onClose}
                        aria-label={t("news.close")}
                    >
                        <Dismiss24Regular />
                    </button>
                </div>

                {/* Content */}
                <div className={styles.content}>
                    {/* Introduction */}
                    <section className={styles.section}>
                        <h3 className={styles.sectionTitle}>{t("news.info.introTitle")}</h3>
                        <p className={styles.paragraph}>{t("news.info.introText")}</p>
                    </section>

                    {/* How it works */}
                    <section className={styles.section}>
                        <h3 className={styles.sectionTitle}>{t("news.info.howItWorksTitle")}</h3>

                        {/* Step 1: Topics */}
                        <div className={styles.step}>
                            <span className={styles.stepNumber}>1</span>
                            <div className={styles.stepContent}>
                                <h4 className={styles.stepTitle}>{t("news.info.step1Title")}</h4>
                                <p className={styles.paragraph}>{t("news.info.step1Text")}</p>
                            </div>
                        </div>

                        {/* Step 2: Automatic Fetching */}
                        <div className={styles.step}>
                            <span className={styles.stepNumber}>2</span>
                            <div className={styles.stepContent}>
                                <h4 className={styles.stepTitle}>{t("news.info.step2Title")}</h4>
                                <p className={styles.paragraph}>{t("news.info.step2Text")}</p>
                            </div>
                        </div>

                        {/* Step 3: AI Summary */}
                        <div className={styles.step}>
                            <span className={styles.stepNumber}>3</span>
                            <div className={styles.stepContent}>
                                <h4 className={styles.stepTitle}>{t("news.info.step3Title")}</h4>
                                <p className={styles.paragraph}>{t("news.info.step3Text")}</p>
                            </div>
                        </div>

                        {/* Step 4: Display */}
                        <div className={styles.step}>
                            <span className={styles.stepNumber}>4</span>
                            <div className={styles.stepContent}>
                                <h4 className={styles.stepTitle}>{t("news.info.step4Title")}</h4>
                                <p className={styles.paragraph}>{t("news.info.step4Text")}</p>
                            </div>
                        </div>
                    </section>

                    {/* Features */}
                    <section className={styles.section}>
                        <h3 className={styles.sectionTitle}>{t("news.info.featuresTitle")}</h3>
                        <ul className={styles.list}>
                            <li>{t("news.info.feature1")}</li>
                            <li>{t("news.info.feature2")}</li>
                            <li>{t("news.info.feature3")}</li>
                            <li>{t("news.info.feature4")}</li>
                            <li>{t("news.info.feature5")}</li>
                        </ul>
                    </section>

                    {/* Caching */}
                    <section className={styles.section}>
                        <h3 className={styles.sectionTitle}>{t("news.info.cachingTitle")}</h3>
                        <p className={styles.paragraph}>{t("news.info.cachingText")}</p>
                    </section>

                    {/* Tips */}
                    <section className={styles.section}>
                        <h3 className={styles.sectionTitle}>{t("news.info.tipsTitle")}</h3>
                        <ul className={styles.list}>
                            <li>{t("news.info.tip1")}</li>
                            <li>{t("news.info.tip2")}</li>
                            <li>{t("news.info.tip3")}</li>
                        </ul>
                    </section>
                </div>

                {/* Footer */}
                <div className={styles.footer}>
                    <button className={styles.closeButtonPrimary} onClick={onClose}>
                        {t("news.info.understood")}
                    </button>
                </div>
            </div>
        </div>
    );
}

