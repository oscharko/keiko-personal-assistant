/**
 * Idea Card component for displaying ideas in a grid.
 * Shows title, summary, tags, status, engagement metrics, and metadata.
 */

import { Heart24Regular, Heart24Filled, Comment24Regular } from "@fluentui/react-icons";
import { useTranslation } from "react-i18next";

import { Idea, IdeaStatus, RecommendationClass, IdeaEngagement } from "../../api/models";
import styles from "./IdeaCard.module.css";

interface IdeaCardProps {
    idea: Idea;
    onClick: () => void;
    engagement?: IdeaEngagement;
}

/**
 * Format a timestamp to a readable date string.
 */
function formatDate(timestamp: number | undefined): string {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    return date.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric"
    });
}

/**
 * Get the CSS class for a status badge.
 */
function getStatusClass(status: IdeaStatus): string {
    switch (status) {
        case IdeaStatus.Draft:
            return styles.statusDraft;
        case IdeaStatus.Submitted:
            return styles.statusSubmitted;
        case IdeaStatus.UnderReview:
            return styles.statusUnderReview;
        case IdeaStatus.Approved:
            return styles.statusApproved;
        case IdeaStatus.Rejected:
            return styles.statusRejected;
        case IdeaStatus.Implemented:
            return styles.statusImplemented;
        case IdeaStatus.Archived:
            return styles.statusArchived;
        default:
            return styles.statusDraft;
    }
}

/**
 * Get the CSS class for a recommendation badge.
 */
function getRecommendationClass(recommendation: RecommendationClass | undefined): string {
    switch (recommendation) {
        case RecommendationClass.QuickWin:
            return styles.recommendationQuickWin;
        case RecommendationClass.HighLeverage:
            return styles.recommendationHighLeverage;
        case RecommendationClass.Strategic:
            return styles.recommendationStrategic;
        case RecommendationClass.Evaluate:
            return styles.recommendationEvaluate;
        default:
            return "";
    }
}

/**
 * Get the CSS class for a score value.
 */
function getScoreClass(score: number | undefined): string {
    if (score === undefined) return "";
    if (score >= 70) return styles.scoreHigh;
    if (score >= 40) return styles.scoreMedium;
    return styles.scoreLow;
}

export function IdeaCard({ idea, onClick, engagement }: IdeaCardProps) {
    const { t } = useTranslation();

    // Use summary if available, otherwise truncate description
    const displayText = idea.summary || idea.description;

    // Limit tags to display
    const maxTags = 3;
    const displayTags = idea.tags?.slice(0, maxTags) || [];
    const remainingTags = (idea.tags?.length || 0) - maxTags;

    // Only use review scores - classification is only shown after LLM review
    const hasBeenReviewed = idea.reviewedAt !== undefined && idea.reviewedAt > 0;
    const effectiveImpactScore = hasBeenReviewed ? idea.reviewImpactScore : undefined;
    const effectiveFeasibilityScore = hasBeenReviewed ? idea.reviewFeasibilityScore : undefined;
    const effectiveRecommendationClass = hasBeenReviewed ? idea.reviewRecommendationClass : undefined;

    return (
        <article
            className={styles.ideaCard}
            onClick={onClick}
            role="button"
            tabIndex={0}
            onKeyPress={(e) => e.key === "Enter" && onClick()}
        >
            {/* Header with Status */}
            <div className={styles.cardHeader}>
                <span className={`${styles.statusBadge} ${getStatusClass(idea.status)}`}>
                    {t(`ideas.status.${idea.status}`)}
                </span>
                {effectiveRecommendationClass && (
                    <span className={`${styles.recommendationBadge} ${getRecommendationClass(effectiveRecommendationClass)}`}>
                        {t(`ideas.recommendation.${effectiveRecommendationClass}`)}
                    </span>
                )}
            </div>

            {/* Content */}
            <div className={styles.cardContent}>
                <h3 className={styles.cardTitle}>{idea.title}</h3>
                <p className={styles.cardSummary}>{displayText}</p>

                {/* Tags */}
                {displayTags.length > 0 && (
                    <div className={styles.cardTags}>
                        {displayTags.map(tag => (
                            <span key={tag} className={styles.tag}>{tag}</span>
                        ))}
                        {remainingTags > 0 && (
                            <span className={`${styles.tag} ${styles.tagMore}`}>
                                +{remainingTags}
                            </span>
                        )}
                    </div>
                )}

                {/* Scores (if available) */}
                {(effectiveImpactScore !== undefined || effectiveFeasibilityScore !== undefined) && (
                    <div className={styles.cardScores}>
                        {effectiveImpactScore !== undefined && (
                            <div className={styles.scoreIndicator}>
                                <span className={styles.scoreLabel}>{t("ideas.impact")}:</span>
                                <span className={`${styles.scoreValue} ${getScoreClass(effectiveImpactScore)}`}>
                                    {effectiveImpactScore}
                                </span>
                            </div>
                        )}
                        {effectiveFeasibilityScore !== undefined && (
                            <div className={styles.scoreIndicator}>
                                <span className={styles.scoreLabel}>{t("ideas.feasibility")}:</span>
                                <span className={`${styles.scoreValue} ${getScoreClass(effectiveFeasibilityScore)}`}>
                                    {effectiveFeasibilityScore}
                                </span>
                            </div>
                        )}
                    </div>
                )}

                {/* Engagement Metrics */}
                {engagement && (
                    <div className={styles.cardEngagement}>
                        <div className={styles.engagementItem}>
                            {engagement.userHasLiked ? (
                                <Heart24Filled className={styles.engagementIconLiked} />
                            ) : (
                                <Heart24Regular className={styles.engagementIcon} />
                            )}
                            <span className={styles.engagementCount}>{engagement.likeCount}</span>
                        </div>
                        <div className={styles.engagementItem}>
                            <Comment24Regular className={styles.engagementIcon} />
                            <span className={styles.engagementCount}>{engagement.commentCount}</span>
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div className={styles.cardFooter}>
                    <div className={styles.cardMeta}>
                        {idea.submitterName && (
                            <span className={styles.cardSubmitter}>{idea.submitterName}</span>
                        )}
                        <span className={styles.cardDate}>{formatDate(idea.createdAt)}</span>
                    </div>
                    {idea.department && (
                        <span className={styles.cardDepartment}>{idea.department}</span>
                    )}
                </div>
            </div>
        </article>
    );
}

