/**
 * Ideas Info Dialog component.
 * Displays a comprehensive explanation of the Ideas Hub functionality
 * and rating/evaluation logic to employees.
 */

import { useCallback, useEffect } from "react";
import { Dismiss24Regular } from "@fluentui/react-icons";
import { useTranslation } from "react-i18next";

import styles from "./IdeasInfoDialog.module.css";

interface IdeasInfoDialogProps {
    onClose: () => void;
}

/**
 * Dialog component that explains the Ideas Hub functionality and scoring logic.
 */
export function IdeasInfoDialog({ onClose }: IdeasInfoDialogProps): JSX.Element {
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
            aria-labelledby="ideas-info-title"
        >
            <div className={styles.dialog}>
                {/* Header */}
                <div className={styles.header}>
                    <h2 id="ideas-info-title" className={styles.title}>
                        {t("ideas.info.title")}
                    </h2>
                    <button
                        className={styles.closeButton}
                        onClick={onClose}
                        aria-label={t("ideas.close")}
                    >
                        <Dismiss24Regular />
                    </button>
                </div>

                {/* Content */}
                <div className={styles.content}>
                    {/* Introduction */}
                    <section className={styles.section}>
                        <h3 className={styles.sectionTitle}>{t("ideas.info.introTitle")}</h3>
                        <p className={styles.paragraph}>{t("ideas.info.introText")}</p>
                    </section>

                    {/* Goals */}
                    <section className={styles.section}>
                        <h3 className={styles.sectionTitle}>{t("ideas.info.goalsTitle")}</h3>
                        <ul className={styles.list}>
                            <li>{t("ideas.info.goal1")}</li>
                            <li>{t("ideas.info.goal2")}</li>
                            <li>{t("ideas.info.goal3")}</li>
                            <li>{t("ideas.info.goal4")}</li>
                        </ul>
                    </section>

                    {/* How it works */}
                    <section className={styles.section}>
                        <h3 className={styles.sectionTitle}>{t("ideas.info.howItWorksTitle")}</h3>

                        {/* Step 1: Submit */}
                        <div className={styles.step}>
                            <span className={styles.stepNumber}>1</span>
                            <div className={styles.stepContent}>
                                <h4 className={styles.stepTitle}>{t("ideas.info.step1Title")}</h4>
                                <p className={styles.paragraph}>{t("ideas.info.step1Text")}</p>
                            </div>
                        </div>

                        {/* Step 2: AI Analysis */}
                        <div className={styles.step}>
                            <span className={styles.stepNumber}>2</span>
                            <div className={styles.stepContent}>
                                <h4 className={styles.stepTitle}>{t("ideas.info.step2Title")}</h4>
                                <p className={styles.paragraph}>{t("ideas.info.step2Text")}</p>
                                <ul className={styles.subList}>
                                    <li>{t("ideas.info.step2Item1")}</li>
                                    <li>{t("ideas.info.step2Item2")}</li>
                                    <li>{t("ideas.info.step2Item3")}</li>
                                    <li>{t("ideas.info.step2Item4")}</li>
                                </ul>
                            </div>
                        </div>

                        {/* Step 3: Scoring */}
                        <div className={styles.step}>
                            <span className={styles.stepNumber}>3</span>
                            <div className={styles.stepContent}>
                                <h4 className={styles.stepTitle}>{t("ideas.info.step3Title")}</h4>
                                <p className={styles.paragraph}>{t("ideas.info.step3Text")}</p>
                            </div>
                        </div>
                    </section>

                    {/* Scoring Details */}
                    <section className={styles.section}>
                        <h3 className={styles.sectionTitle}>{t("ideas.info.scoringTitle")}</h3>

                        {/* Impact Score */}
                        <div className={styles.scoreBox}>
                            <h4 className={styles.scoreTitle}>{t("ideas.info.impactScoreTitle")}</h4>
                            <p className={styles.paragraph}>{t("ideas.info.impactScoreText")}</p>
                            <ul className={styles.subList}>
                                <li>{t("ideas.info.impactFactor1")}</li>
                                <li>{t("ideas.info.impactFactor2")}</li>
                                <li>{t("ideas.info.impactFactor3")}</li>
                                <li>{t("ideas.info.impactFactor4")}</li>
                                <li>{t("ideas.info.impactFactor5")}</li>
                            </ul>
                        </div>

                        {/* Feasibility Score */}
                        <div className={styles.scoreBox}>
                            <h4 className={styles.scoreTitle}>{t("ideas.info.feasibilityScoreTitle")}</h4>
                            <p className={styles.paragraph}>{t("ideas.info.feasibilityScoreText")}</p>
                            <ul className={styles.subList}>
                                <li>{t("ideas.info.feasibilityFactor1")}</li>
                                <li>{t("ideas.info.feasibilityFactor2")}</li>
                                <li>{t("ideas.info.feasibilityFactor3")}</li>
                            </ul>
                        </div>
                    </section>

                    {/* Recommendation Classes */}
                    <section className={styles.section}>
                        <h3 className={styles.sectionTitle}>{t("ideas.info.classificationTitle")}</h3>
                        <p className={styles.paragraph}>{t("ideas.info.classificationText")}</p>

                        <div className={styles.classificationGrid}>
                            <div className={`${styles.classificationCard} ${styles.highLeverage}`}>
                                <h4 className={styles.classificationName}>{t("ideas.info.highLeverageTitle")}</h4>
                                <p className={styles.classificationDesc}>{t("ideas.info.highLeverageDesc")}</p>
                            </div>
                            <div className={`${styles.classificationCard} ${styles.quickWin}`}>
                                <h4 className={styles.classificationName}>{t("ideas.info.quickWinTitle")}</h4>
                                <p className={styles.classificationDesc}>{t("ideas.info.quickWinDesc")}</p>
                            </div>
                            <div className={`${styles.classificationCard} ${styles.strategic}`}>
                                <h4 className={styles.classificationName}>{t("ideas.info.strategicTitle")}</h4>
                                <p className={styles.classificationDesc}>{t("ideas.info.strategicDesc")}</p>
                            </div>
                            <div className={`${styles.classificationCard} ${styles.evaluate}`}>
                                <h4 className={styles.classificationName}>{t("ideas.info.evaluateTitle")}</h4>
                                <p className={styles.classificationDesc}>{t("ideas.info.evaluateDesc")}</p>
                            </div>
                        </div>
                    </section>

                    {/* Benefits */}
                    <section className={styles.section}>
                        <h3 className={styles.sectionTitle}>{t("ideas.info.benefitsTitle")}</h3>
                        <ul className={styles.list}>
                            <li>{t("ideas.info.benefit1")}</li>
                            <li>{t("ideas.info.benefit2")}</li>
                            <li>{t("ideas.info.benefit3")}</li>
                            <li>{t("ideas.info.benefit4")}</li>
                        </ul>
                    </section>

                    {/* Data & Fairness */}
                    <section className={styles.section}>
                        <h3 className={styles.sectionTitle}>{t("ideas.info.fairnessTitle")}</h3>
                        <p className={styles.paragraph}>{t("ideas.info.fairnessText")}</p>
                    </section>
                </div>

                {/* Footer */}
                <div className={styles.footer}>
                    <button className={styles.closeButtonPrimary} onClick={onClose}>
                        {t("ideas.info.understood")}
                    </button>
                </div>
            </div>
        </div>
    );
}

