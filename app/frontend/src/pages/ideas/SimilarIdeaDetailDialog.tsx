/**
 * Similar Idea Detail Dialog component.
 * Displays the full details of a similar idea in a styled dialog
 * matching the IdeasInfoDialog design.
 * Uses Fluent UI Modal for proper layering.
 */

import {useEffect, useState} from "react";
import {Modal, IconButton} from "@fluentui/react";
import {useMsal} from "@azure/msal-react";
import {useTranslation} from "react-i18next";

import {getIdeaApi, Idea, SimilarIdea} from "../../api";
import {getToken, useLogin} from "../../authConfig";
import styles from "./SimilarIdeaDetailDialog.module.css";

interface SimilarIdeaDetailDialogProps {
    similarIdea: SimilarIdea;
    onClose: () => void;
}

/**
 * Dialog component that displays the full details of a similar idea.
 */
export function SimilarIdeaDetailDialog({
                                            similarIdea,
                                            onClose
                                        }: SimilarIdeaDetailDialogProps): JSX.Element {
    const {t} = useTranslation();
    const client = useLogin ? useMsal().instance : undefined;
    const [fullIdea, setFullIdea] = useState<Idea | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Load the full idea details
    useEffect(() => {
        const loadIdea = async () => {
            try {
                setIsLoading(true);
                setError(null);
                const token = client ? await getToken(client) : undefined;
                const idea = await getIdeaApi(similarIdea.ideaId, token);
                setFullIdea(idea);
            } catch (err) {
                console.error("Failed to load idea details:", err);
                setError(t("ideas.errorTitle"));
            } finally {
                setIsLoading(false);
            }
        };
        loadIdea();
    }, [similarIdea.ideaId, client, t]);

    // Format date for display (timestamp is in milliseconds)
    const formatDate = (timestamp?: number) => {
        if (!timestamp) return "";
        return new Date(timestamp).toLocaleDateString();
    };

    return (
        <Modal
            isOpen={true}
            isBlocking={true}
            containerClassName={styles.modalContainer}
            styles={{
                main: {
                    maxWidth: '720px',
                    width: '100%',
                    maxHeight: '85vh',
                    borderRadius: '16px',
                    padding: 0,
                    overflow: 'hidden'
                },
                root: {
                    zIndex: 10000000
                }
            }}
        >
            <div className={styles.dialog}>
                {/* Header */}
                <div className={styles.header}>
                    <h2 id="similar-idea-title" className={styles.title}>
                        {similarIdea.title}
                    </h2>
                    <IconButton
                        iconProps={{ iconName: 'Cancel' }}
                        ariaLabel={t("ideas.close")}
                        onClick={onClose}
                        className={styles.closeButton}
                    />
                </div>

                {/* Content */}
                <div className={styles.content}>
                    {isLoading ? (
                        <div className={styles.loading}>
                            {t("ideas.loading")}
                        </div>
                    ) : error ? (
                        <div className={styles.error}>{error}</div>
                    ) : fullIdea ? (
                        <>
                            {/* Similarity Score Badge */}
                            <div className={styles.similarityBadge}>
                                <span className={styles.similarityLabel}>
                                    {t("ideas.similarityScore")}:
                                </span>
                                <span className={styles.similarityValue}>
                                    {Math.round(similarIdea.similarityScore * 100)}%
                                </span>
                            </div>

                            {/* Status and Meta */}
                            <section className={styles.section}>
                                <div className={styles.metaGrid}>
                                    <div className={styles.metaItem}>
                                        <span className={styles.metaLabel}>
                                            {t("ideas.status.label")}:
                                        </span>
                                        <span
                                            className={`${styles.statusBadge} ${styles[fullIdea.status || "submitted"]}`}>
                                            {t(`ideas.status.${fullIdea.status || "submitted"}`)}
                                        </span>
                                    </div>
                                    {fullIdea.department && (
                                        <div className={styles.metaItem}>
                                            <span className={styles.metaLabel}>
                                                {t("ideas.department")}:
                                            </span>
                                            <span>{fullIdea.department}</span>
                                        </div>
                                    )}
                                    <div className={styles.metaItem}>
                                        <span className={styles.metaLabel}>
                                            {t("ideas.createdAt")}:
                                        </span>
                                        <span>{formatDate(fullIdea.createdAt)}</span>
                                    </div>
                                </div>
                            </section>

                            {/* AI Summary */}
                            {fullIdea.summary && (
                                <section className={styles.section}>
                                    <h3 className={styles.sectionTitle}>
                                        {t("ideas.aiSummary")}
                                    </h3>
                                    <p className={styles.paragraph}>{fullIdea.summary}</p>
                                </section>
                            )}

                            {/* Description */}
                            <section className={styles.section}>
                                <h3 className={styles.sectionTitle}>
                                    {t("ideas.description")}
                                </h3>
                                <p className={styles.paragraph}>{fullIdea.description}</p>
                            </section>

                            {/* Problem Description */}
                            {fullIdea.problemDescription && (
                                <section className={styles.section}>
                                    <h3 className={styles.sectionTitle}>
                                        {t("ideas.problemDescription")}
                                    </h3>
                                    <p className={styles.paragraph}>
                                        {fullIdea.problemDescription}
                                    </p>
                                </section>
                            )}

                            {/* Expected Benefit */}
                            {fullIdea.expectedBenefit && (
                                <section className={styles.section}>
                                    <h3 className={styles.sectionTitle}>
                                        {t("ideas.expectedBenefit")}
                                    </h3>
                                    <p className={styles.paragraph}>
                                        {fullIdea.expectedBenefit}
                                    </p>
                                </section>
                            )}

                            {/* Scores */}
                            {(fullIdea.impactScore || fullIdea.feasibilityScore) && (
                                <section className={styles.section}>
                                    <h3 className={styles.sectionTitle}>
                                        {t("ideas.scores")}
                                    </h3>
                                    <div className={styles.scoresGrid}>
                                        {fullIdea.impactScore !== undefined && (
                                            <div className={styles.scoreBox}>
                                                <span className={styles.scoreLabel}>
                                                    {t("ideas.impactScore")}
                                                </span>
                                                <span className={styles.scoreValue}>
                                                    {fullIdea.impactScore}
                                                </span>
                                            </div>
                                        )}
                                        {fullIdea.feasibilityScore !== undefined && (
                                            <div className={styles.scoreBox}>
                                                <span className={styles.scoreLabel}>
                                                    {t("ideas.feasibilityScore")}
                                                </span>
                                                <span className={styles.scoreValue}>
                                                    {fullIdea.feasibilityScore}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </section>
                            )}

                            {/* Tags */}
                            {fullIdea.tags && fullIdea.tags.length > 0 && (
                                <section className={styles.section}>
                                    <h3 className={styles.sectionTitle}>
                                        {t("ideas.tags")}
                                    </h3>
                                    <div className={styles.tagsList}>
                                        {fullIdea.tags.map((tag, index) => (
                                            <span key={index} className={styles.tag}>
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                </section>
                            )}

                            {/* Affected Processes */}
                            {fullIdea.affectedProcesses &&
                                fullIdea.affectedProcesses.length > 0 && (
                                    <section className={styles.section}>
                                        <h3 className={styles.sectionTitle}>
                                            {t("ideas.affectedProcesses")}
                                        </h3>
                                        <ul className={styles.list}>
                                            {fullIdea.affectedProcesses.map(
                                                (process, index) => (
                                                    <li key={index}>{process}</li>
                                                )
                                            )}
                                        </ul>
                                    </section>
                                )}

                            {/* Target Users */}
                            {fullIdea.targetUsers &&
                                fullIdea.targetUsers.length > 0 && (
                                    <section className={styles.section}>
                                        <h3 className={styles.sectionTitle}>
                                            {t("ideas.targetUsers")}
                                        </h3>
                                        <ul className={styles.list}>
                                            {fullIdea.targetUsers.map((user, index) => (
                                                <li key={index}>{user}</li>
                                            ))}
                                        </ul>
                                    </section>
                                )}
                        </>
                    ) : null}
                </div>

                {/* Footer */}
                <div className={styles.footer}>
                    <button
                        type="button"
                        className={styles.closeButtonPrimary}
                        onClick={onClose}
                    >
                        {t("ideas.close")}
                    </button>
                </div>
            </div>
        </Modal>
    );
}

