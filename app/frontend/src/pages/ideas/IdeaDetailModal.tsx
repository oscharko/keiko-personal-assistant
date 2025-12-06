/**
 * Idea Detail Modal component.
 * Displays full details of an idea including LLM-generated analysis,
 * engagement metrics (likes), and comments section.
 */

import { useState, useCallback, useEffect } from "react";
import { Panel, PanelType, PrimaryButton, DefaultButton, Spinner, SpinnerSize, TextField } from "@fluentui/react";
import { Edit24Regular, Delete24Regular, Lightbulb24Regular, Heart24Regular, Heart24Filled, Comment24Regular, Send24Regular, Checkmark24Regular, Dismiss24Regular, CheckmarkCircle24Regular } from "@fluentui/react-icons";
import { useMsal } from "@azure/msal-react";
import { useTranslation } from "react-i18next";

import { deleteIdeaApi, addIdeaLikeApi, removeIdeaLikeApi, getIdeaEngagementApi, getIdeaCommentsApi, createIdeaCommentApi, updateIdeaCommentApi, deleteIdeaCommentApi, reviewIdeaApi, updateIdeaStatusApi } from "../../api";
import { Idea, IdeaStatus, RecommendationClass, IdeaEngagement, IdeaComment, SimilarIdea } from "../../api/models";
import { getToken, useLogin } from "../../authConfig";
import styles from "./IdeaDetailModal.module.css";

interface IdeaDetailModalProps {
    idea: Idea;
    onClose: () => void;
    onUpdated: (idea: Idea) => void;
    onDeleted: (ideaId: string) => void;
    currentUserId?: string;
    isAdmin?: boolean;
    isReviewer?: boolean;
}

/**
 * Format a timestamp to a readable date string.
 */
function formatDate(timestamp: number | undefined): string {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    return date.toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

/**
 * Get the CSS class for a status badge.
 */
function getStatusClass(status: IdeaStatus): string {
    const statusMap: Record<string, string> = {
        [IdeaStatus.Draft]: styles.statusDraft,
        [IdeaStatus.Submitted]: styles.statusSubmitted,
        [IdeaStatus.UnderReview]: styles.statusUnderReview,
        [IdeaStatus.Approved]: styles.statusApproved,
        [IdeaStatus.Rejected]: styles.statusRejected,
        [IdeaStatus.Implemented]: styles.statusImplemented,
        [IdeaStatus.Archived]: styles.statusArchived
    };
    return statusMap[status] || styles.statusDraft;
}

/**
 * Get the CSS class for a recommendation badge.
 */
function getRecommendationClass(recommendation: RecommendationClass | undefined): string {
    if (!recommendation) return "";
    const recMap: Record<string, string> = {
        [RecommendationClass.QuickWin]: styles.recommendationQuickWin,
        [RecommendationClass.HighLeverage]: styles.recommendationHighLeverage,
        [RecommendationClass.Strategic]: styles.recommendationStrategic,
        [RecommendationClass.Evaluate]: styles.recommendationEvaluate
    };
    return recMap[recommendation] || "";
}

/**
 * Get score color class based on value.
 */
function getScoreClass(score: number | undefined): string {
    if (score === undefined) return "";
    if (score >= 70) return styles.scoreHigh;
    if (score >= 40) return styles.scoreMedium;
    return styles.scoreLow;
}

function getScoreBarClass(score: number | undefined): string {
    if (score === undefined) return "";
    if (score >= 70) return styles.scoreBarHigh;
    if (score >= 40) return styles.scoreBarMedium;
    return styles.scoreBarLow;
}

export function IdeaDetailModal({ idea, onClose, onUpdated, onDeleted, currentUserId, isAdmin = false, isReviewer = false }: IdeaDetailModalProps) {
    const client = useLogin ? useMsal().instance : undefined;
    const { t } = useTranslation();

    const [isDeleting, setIsDeleting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isReviewing, setIsReviewing] = useState(false);
    const [isChangingStatus, setIsChangingStatus] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Engagement state
    const [engagement, setEngagement] = useState<IdeaEngagement | null>(null);
    const [isLiking, setIsLiking] = useState(false);

    // Comments state
    const [comments, setComments] = useState<IdeaComment[]>([]);
    const [commentsLoading, setCommentsLoading] = useState(false);
    const [newComment, setNewComment] = useState("");
    const [isSubmittingComment, setIsSubmittingComment] = useState(false);
    const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
    const [editingCommentText, setEditingCommentText] = useState("");
    const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);

    // Handle escape key to close modal
    const handleKeyDown = useCallback((event: KeyboardEvent) => {
        if (event.key === "Escape" && !showDeleteConfirm) {
            onClose();
        }
    }, [onClose, showDeleteConfirm]);

    useEffect(() => {
        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [handleKeyDown]);

    // Load engagement data
    useEffect(() => {
        const loadEngagement = async () => {
            try {
                const token = client ? await getToken(client) : undefined;
                const engagementData = await getIdeaEngagementApi(idea.ideaId, token);
                setEngagement(engagementData);
            } catch (err) {
                console.error("Error loading engagement:", err);
            }
        };
        loadEngagement();
    }, [client, idea.ideaId]);

    // Load comments
    useEffect(() => {
        const loadComments = async () => {
            setCommentsLoading(true);
            try {
                const token = client ? await getToken(client) : undefined;
                const response = await getIdeaCommentsApi(idea.ideaId, token, { sortOrder: "asc" });
                setComments(response.comments);
            } catch (err) {
                console.error("Error loading comments:", err);
            } finally {
                setCommentsLoading(false);
            }
        };
        loadComments();
    }, [client, idea.ideaId]);

    /**
     * Handle like/unlike toggle.
     */
    const handleLikeToggle = useCallback(async () => {
        if (isLiking || !engagement) return;

        setIsLiking(true);
        try {
            const token = client ? await getToken(client) : undefined;
            if (engagement.userHasLiked) {
                await removeIdeaLikeApi(idea.ideaId, token);
                setEngagement({
                    ...engagement,
                    likeCount: engagement.likeCount - 1,
                    userHasLiked: false
                });
            } else {
                await addIdeaLikeApi(idea.ideaId, token);
                setEngagement({
                    ...engagement,
                    likeCount: engagement.likeCount + 1,
                    userHasLiked: true
                });
            }
        } catch (err) {
            console.error("Error toggling like:", err);
        } finally {
            setIsLiking(false);
        }
    }, [client, idea.ideaId, engagement, isLiking]);

    /**
     * Handle submitting a new comment.
     */
    const handleSubmitComment = useCallback(async () => {
        if (!newComment.trim() || isSubmittingComment) return;

        setIsSubmittingComment(true);
        try {
            const token = client ? await getToken(client) : undefined;
            const response = await createIdeaCommentApi(idea.ideaId, { content: newComment.trim() }, token);
            setComments([...comments, response.comment]);
            setNewComment("");
            if (engagement) {
                setEngagement({
                    ...engagement,
                    commentCount: engagement.commentCount + 1
                });
            }
        } catch (err) {
            console.error("Error creating comment:", err);
        } finally {
            setIsSubmittingComment(false);
        }
    }, [client, idea.ideaId, newComment, comments, engagement, isSubmittingComment]);

    /**
     * Handle updating a comment.
     */
    const handleUpdateComment = useCallback(async (commentId: string) => {
        if (!editingCommentText.trim()) return;

        try {
            const token = client ? await getToken(client) : undefined;
            const response = await updateIdeaCommentApi(idea.ideaId, commentId, { content: editingCommentText.trim() }, token);
            setComments(comments.map(c => c.commentId === commentId ? response.comment : c));
            setEditingCommentId(null);
            setEditingCommentText("");
        } catch (err) {
            console.error("Error updating comment:", err);
        }
    }, [client, idea.ideaId, editingCommentText, comments]);

    /**
     * Handle deleting a comment.
     */
    const handleDeleteComment = useCallback(async (commentId: string) => {
        setDeletingCommentId(commentId);
        try {
            const token = client ? await getToken(client) : undefined;
            await deleteIdeaCommentApi(idea.ideaId, commentId, token);
            setComments(comments.filter(c => c.commentId !== commentId));
            if (engagement) {
                setEngagement({
                    ...engagement,
                    commentCount: Math.max(0, engagement.commentCount - 1)
                });
            }
        } catch (err) {
            console.error("Error deleting comment:", err);
        } finally {
            setDeletingCommentId(null);
        }
    }, [client, idea.ideaId, comments, engagement]);

    /**
     * Format comment timestamp.
     */
    const formatCommentDate = (timestamp: number): string => {
        const date = new Date(timestamp);
        return date.toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    };

    /**
     * Handle triggering LLM review.
     */
    const handleReview = useCallback(async () => {
        setIsReviewing(true);
        setError(null);
        try {
            const token = client ? await getToken(client) : undefined;
            const updatedIdea = await reviewIdeaApi(idea.ideaId, token);
            onUpdated(updatedIdea);
        } catch (err) {
            console.error("Error reviewing idea:", err);
            setError(err instanceof Error ? err.message : t("ideas.reviewError"));
        } finally {
            setIsReviewing(false);
        }
    }, [client, idea.ideaId, onUpdated, t]);

    // Handle status change (approve, reject, implement)
    const handleStatusChange = useCallback(async (newStatus: "approved" | "rejected" | "implemented") => {
        setIsChangingStatus(true);
        setError(null);
        try {
            const token = client ? await getToken(client) : undefined;
            const updatedIdea = await updateIdeaStatusApi(idea.ideaId, newStatus, token);
            onUpdated(updatedIdea);
        } catch (err) {
            console.error("Error changing idea status:", err);
            setError(err instanceof Error ? err.message : t("ideas.statusChangeError"));
        } finally {
            setIsChangingStatus(false);
        }
    }, [client, idea.ideaId, onUpdated, t]);

    // Check if current user is the owner of the idea
    const isOwner = currentUserId && idea.submitterId === currentUserId;

    // Check if idea is in editable status
    const isEditableStatus = idea.status === IdeaStatus.Draft || idea.status === IdeaStatus.Submitted;

    // Check if current user can edit (must be owner and idea in editable status)
    const canEdit = isOwner && isEditableStatus;

    // Check if current user can delete (owner with editable status OR admin can delete any idea)
    const canDelete = (isOwner && isEditableStatus) || isAdmin;

    // Check if current user can review (reviewer or admin, idea not yet reviewed)
    // Analysis will be performed automatically if not yet done
    const canReview = (isReviewer || isAdmin) && !idea.reviewedAt;

    // Check if current user can change status (reviewer or admin)
    const canChangeStatus = isReviewer || isAdmin;

    // Determine which status actions are available based on current status
    const canApprove = canChangeStatus && idea.status === IdeaStatus.UnderReview;
    const canReject = canChangeStatus && (idea.status === IdeaStatus.UnderReview || idea.status === IdeaStatus.Submitted || idea.status === IdeaStatus.Approved);
    const canImplement = canChangeStatus && idea.status === IdeaStatus.Approved;

    return (
        <>
            <Panel
                isOpen={true}
                onDismiss={onClose}
                type={PanelType.medium}
                headerText={idea.title}
                closeButtonAriaLabel={t("ideas.close")}
                isLightDismiss={!showDeleteConfirm && !isDeleting}
                className={styles.panel}
            >
                <div className={styles.content}>
                    {/* Header with Status */}
                    <div className={styles.header}>
                        <span className={`${styles.statusBadge} ${getStatusClass(idea.status)}`}>
                            {t(`ideas.status.${idea.status}`)}
                        </span>
                        {idea.recommendationClass && (
                            <span className={`${styles.recommendationBadge} ${getRecommendationClass(idea.recommendationClass)}`}>
                                {t(`ideas.recommendation.${idea.recommendationClass}`)}
                            </span>
                        )}
                    </div>

                    {/* Metadata */}
                    <div className={styles.metadata}>
                        {idea.submitterName && (
                            <div className={styles.metaItem}>
                                <span className={styles.metaLabel}>{t("ideas.submittedBy")}</span>
                                <span className={styles.metaValue}>{idea.submitterName}</span>
                            </div>
                        )}
                        {idea.department && (
                            <div className={styles.metaItem}>
                                <span className={styles.metaLabel}>{t("ideas.department")}</span>
                                <span className={styles.metaValue}>{idea.department}</span>
                            </div>
                        )}
                        <div className={styles.metaItem}>
                            <span className={styles.metaLabel}>{t("ideas.createdAt")}</span>
                            <span className={styles.metaValue}>{formatDate(idea.createdAt)}</span>
                        </div>
                        {idea.updatedAt !== idea.createdAt && (
                            <div className={styles.metaItem}>
                                <span className={styles.metaLabel}>{t("ideas.updatedAt")}</span>
                                <span className={styles.metaValue}>{formatDate(idea.updatedAt)}</span>
                            </div>
                        )}
                    </div>

                    {/* Summary (LLM-generated) */}
                    {idea.summary && (
                        <div className={styles.section}>
                            <h3 className={styles.sectionTitle}>
                                <Lightbulb24Regular />
                                {t("ideas.aiSummary")}
                            </h3>
                            <p className={styles.sectionContent}>{idea.summary}</p>
                        </div>
                    )}

                    {/* Description */}
                    <div className={styles.section}>
                        <h3 className={styles.sectionTitle}>{t("ideas.description")}</h3>
                        <p className={styles.sectionContent}>{idea.description}</p>
                    </div>

                    {/* Problem Description */}
                    {idea.problemDescription && (
                        <div className={styles.section}>
                            <h3 className={styles.sectionTitle}>{t("ideas.problemDescription")}</h3>
                            <p className={styles.sectionContent}>{idea.problemDescription}</p>
                        </div>
                    )}

                    {/* Expected Benefit */}
                    {idea.expectedBenefit && (
                        <div className={styles.section}>
                            <h3 className={styles.sectionTitle}>{t("ideas.expectedBenefit")}</h3>
                            <p className={styles.sectionContent}>{idea.expectedBenefit}</p>
                        </div>
                    )}

                    {/* Tags */}
                    {idea.tags && idea.tags.length > 0 && (
                        <div className={styles.section}>
                            <h3 className={styles.sectionTitle}>{t("ideas.tags")}</h3>
                            <div className={styles.tagsList}>
                                {idea.tags.map(tag => (
                                    <span key={tag} className={styles.tag}>{tag}</span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Scores */}
                    {(idea.impactScore !== undefined || idea.feasibilityScore !== undefined) && (
                        <div className={styles.section}>
                            <h3 className={styles.sectionTitle}>
                                {idea.reviewedAt ? t("ideas.initialScores") : t("ideas.scores")}
                            </h3>
                            <div className={styles.scoresGrid}>
                                {idea.impactScore !== undefined && (
                                    <div className={styles.scoreCard}>
                                        <span className={styles.scoreLabel}>{t("ideas.impactScore")}</span>
                                        <span className={`${styles.scoreValue} ${getScoreClass(idea.impactScore)}`}>
                                            {idea.impactScore}
                                        </span>
                                        <div className={styles.scoreBar}>
                                            <div
                                                className={`${styles.scoreBarFill} ${getScoreBarClass(idea.impactScore)}`}
                                                style={{ width: `${idea.impactScore}%` }}
                                            />
                                        </div>
                                    </div>
                                )}
                                {idea.feasibilityScore !== undefined && (
                                    <div className={styles.scoreCard}>
                                        <span className={styles.scoreLabel}>{t("ideas.feasibilityScore")}</span>
                                        <span className={`${styles.scoreValue} ${getScoreClass(idea.feasibilityScore)}`}>
                                            {idea.feasibilityScore}
                                        </span>
                                        <div className={styles.scoreBar}>
                                            <div
                                                className={`${styles.scoreBarFill} ${getScoreBarClass(idea.feasibilityScore)}`}
                                                style={{ width: `${idea.feasibilityScore}%` }}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* LLM Review Scores */}
                    {idea.reviewedAt && (idea.reviewImpactScore !== undefined || idea.reviewFeasibilityScore !== undefined) && (
                        <div className={styles.section}>
                            <h3 className={styles.sectionTitle}>{t("ideas.reviewScores")}</h3>
                            <div className={styles.scoresGrid}>
                                {idea.reviewImpactScore !== undefined && (
                                    <div className={styles.scoreCard}>
                                        <span className={styles.scoreLabel}>{t("ideas.reviewImpactScore")}</span>
                                        <span className={`${styles.scoreValue} ${getScoreClass(idea.reviewImpactScore)}`}>
                                            {idea.reviewImpactScore}
                                        </span>
                                        <div className={styles.scoreBar}>
                                            <div
                                                className={`${styles.scoreBarFill} ${getScoreBarClass(idea.reviewImpactScore)}`}
                                                style={{ width: `${idea.reviewImpactScore}%` }}
                                            />
                                        </div>
                                    </div>
                                )}
                                {idea.reviewFeasibilityScore !== undefined && (
                                    <div className={styles.scoreCard}>
                                        <span className={styles.scoreLabel}>{t("ideas.reviewFeasibilityScore")}</span>
                                        <span className={`${styles.scoreValue} ${getScoreClass(idea.reviewFeasibilityScore)}`}>
                                            {idea.reviewFeasibilityScore}
                                        </span>
                                        <div className={styles.scoreBar}>
                                            <div
                                                className={`${styles.scoreBarFill} ${getScoreBarClass(idea.reviewFeasibilityScore)}`}
                                                style={{ width: `${idea.reviewFeasibilityScore}%` }}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                            {idea.reviewReasoning && (
                                <div className={styles.reviewReasoning}>
                                    <strong>{t("ideas.reviewReasoning")}:</strong>
                                    <p>{idea.reviewReasoning}</p>
                                </div>
                            )}
                            <div className={styles.reviewMeta}>
                                {t("ideas.reviewedAt")}: {formatDate(idea.reviewedAt)}
                                {idea.reviewedBy && idea.reviewedBy !== "llm" && (
                                    <span> {t("ideas.reviewedBy")}: {idea.reviewedBy}</span>
                                )}
                            </div>
                        </div>
                    )}

                    {/* KPI Estimates */}
                    {idea.kpiEstimates && (
                        <div className={styles.section}>
                            <h3 className={styles.sectionTitle}>{t("ideas.kpiEstimates")}</h3>
                            <div className={styles.kpiGrid}>
                                {idea.kpiEstimates.timeSavingsHours !== undefined && (
                                    <div className={styles.kpiItem}>
                                        <div className={styles.kpiLabel}>{t("ideas.kpi.timeSavings")}</div>
                                        <div className={styles.kpiValue}>{idea.kpiEstimates.timeSavingsHours}h</div>
                                    </div>
                                )}
                                {idea.kpiEstimates.costReductionEur !== undefined && (
                                    <div className={styles.kpiItem}>
                                        <div className={styles.kpiLabel}>{t("ideas.kpi.costReduction")}</div>
                                        <div className={styles.kpiValue}>{idea.kpiEstimates.costReductionEur} EUR</div>
                                    </div>
                                )}
                                {idea.kpiEstimates.qualityImprovementPercent !== undefined && (
                                    <div className={styles.kpiItem}>
                                        <div className={styles.kpiLabel}>{t("ideas.kpi.qualityImprovement")}</div>
                                        <div className={styles.kpiValue}>{idea.kpiEstimates.qualityImprovementPercent}%</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Affected Processes */}
                    {idea.affectedProcesses && idea.affectedProcesses.length > 0 && (
                        <div className={styles.section}>
                            <h3 className={styles.sectionTitle}>{t("ideas.affectedProcesses")}</h3>
                            <div className={styles.itemsList}>
                                {idea.affectedProcesses.map(process => (
                                    <span key={process} className={styles.listItem}>{process}</span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Target Users */}
                    {idea.targetUsers && idea.targetUsers.length > 0 && (
                        <div className={styles.section}>
                            <h3 className={styles.sectionTitle}>{t("ideas.targetUsers")}</h3>
                            <div className={styles.itemsList}>
                                {idea.targetUsers.map(user => (
                                    <span key={user} className={styles.listItem}>{user}</span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Similar Ideas */}
                    {idea.similarIdeas && idea.similarIdeas.length > 0 && (
                        <div className={styles.section}>
                            <h3 className={styles.sectionTitle}>{t("ideas.similarIdeasSection")}</h3>
                            <div className={styles.similarIdeasList}>
                                {idea.similarIdeas.map((similarIdea: SimilarIdea) => (
                                    <div key={similarIdea.ideaId} className={styles.similarIdeaItem}>
                                        <div className={styles.similarIdeaTitle}>{similarIdea.title}</div>
                                        <div className={styles.similarIdeaMeta}>
                                            <span className={styles.similarIdeaScore}>
                                                {Math.round(similarIdea.similarityScore * 100)}% {t("ideas.similar")}
                                            </span>
                                            <span className={styles.similarIdeaStatus}>
                                                {t(`ideas.status.${similarIdea.status}`)}
                                            </span>
                                        </div>
                                        {similarIdea.summary && (
                                            <p className={styles.similarIdeaSummary}>{similarIdea.summary}</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Analysis Info */}
                    {idea.analyzedAt && (
                        <div className={styles.analysisInfo}>
                            <Lightbulb24Regular />
                            <span>{t("ideas.analyzedAt", { date: formatDate(idea.analyzedAt) })}</span>
                        </div>
                    )}

                    {/* Engagement Section */}
                    {engagement && (
                        <div className={styles.engagementSection}>
                            <button
                                className={`${styles.likeButton} ${engagement.userHasLiked ? styles.liked : ""}`}
                                onClick={handleLikeToggle}
                                disabled={isLiking}
                                aria-label={engagement.userHasLiked ? t("ideas.unlike") : t("ideas.like")}
                            >
                                {engagement.userHasLiked ? (
                                    <Heart24Filled className={styles.likeIconFilled} />
                                ) : (
                                    <Heart24Regular className={styles.likeIcon} />
                                )}
                                <span className={styles.likeCount}>{engagement.likeCount}</span>
                                <span className={styles.likeLabel}>
                                    {engagement.likeCount === 1 ? t("ideas.like") : t("ideas.likes")}
                                </span>
                            </button>
                            <div className={styles.commentCount}>
                                <Comment24Regular className={styles.commentIcon} />
                                <span>{engagement.commentCount}</span>
                                <span className={styles.commentLabel}>
                                    {engagement.commentCount === 1 ? t("ideas.comment") : t("ideas.comments")}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Comments Section */}
                    <div className={styles.commentsSection}>
                        <h3 className={styles.sectionTitle}>
                            <Comment24Regular />
                            {t("ideas.comments")}
                        </h3>

                        {/* Comments List */}
                        {commentsLoading ? (
                            <div className={styles.commentsLoading}>
                                <Spinner size={SpinnerSize.small} />
                            </div>
                        ) : comments.length === 0 ? (
                            <p className={styles.noComments}>{t("ideas.noComments")}</p>
                        ) : (
                            <div className={styles.commentsList}>
                                {comments.map(comment => (
                                    <div key={comment.commentId} className={styles.commentItem}>
                                        <div className={styles.commentHeader}>
                                            <span className={styles.commentAuthor}>{comment.userId}</span>
                                            <span className={styles.commentDate}>{formatCommentDate(comment.createdAt)}</span>
                                        </div>
                                        {editingCommentId === comment.commentId ? (
                                            <div className={styles.commentEditForm}>
                                                <TextField
                                                    multiline
                                                    rows={2}
                                                    value={editingCommentText}
                                                    onChange={(_, val) => setEditingCommentText(val || "")}
                                                    className={styles.commentEditInput}
                                                />
                                                <div className={styles.commentEditActions}>
                                                    <DefaultButton
                                                        text={t("ideas.cancel")}
                                                        onClick={() => {
                                                            setEditingCommentId(null);
                                                            setEditingCommentText("");
                                                        }}
                                                    />
                                                    <PrimaryButton
                                                        text={t("ideas.save")}
                                                        onClick={() => handleUpdateComment(comment.commentId)}
                                                    />
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <p className={styles.commentContent}>{comment.content}</p>
                                                {currentUserId === comment.userId && (
                                                    <div className={styles.commentActions}>
                                                        <button
                                                            className={styles.commentActionButton}
                                                            onClick={() => {
                                                                setEditingCommentId(comment.commentId);
                                                                setEditingCommentText(comment.content);
                                                            }}
                                                        >
                                                            {t("ideas.edit")}
                                                        </button>
                                                        <button
                                                            className={styles.commentActionButton}
                                                            onClick={() => handleDeleteComment(comment.commentId)}
                                                            disabled={deletingCommentId === comment.commentId}
                                                        >
                                                            {deletingCommentId === comment.commentId ? (
                                                                <Spinner size={SpinnerSize.xSmall} />
                                                            ) : (
                                                                t("ideas.delete")
                                                            )}
                                                        </button>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* New Comment Form */}
                        <div className={styles.newCommentForm}>
                            <TextField
                                multiline
                                rows={2}
                                placeholder={t("ideas.addComment")}
                                value={newComment}
                                onChange={(_, val) => setNewComment(val || "")}
                                className={styles.newCommentInput}
                            />
                            <PrimaryButton
                                className={styles.submitCommentButton}
                                onClick={handleSubmitComment}
                                disabled={!newComment.trim() || isSubmittingComment}
                            >
                                {isSubmittingComment ? (
                                    <Spinner size={SpinnerSize.xSmall} />
                                ) : (
                                    <>
                                        <Send24Regular />
                                        {t("ideas.submitComment")}
                                    </>
                                )}
                            </PrimaryButton>
                        </div>
                    </div>

                    {/* Status Actions (Approve/Reject/Implement) */}
                    {(canApprove || canReject || canImplement) && (
                        <div className={styles.statusActions}>
                            <h4 className={styles.statusActionsTitle}>{t("ideas.statusActions")}</h4>
                            <div className={styles.statusActionsButtons}>
                                {canApprove && (
                                    <PrimaryButton
                                        className={styles.approveButton}
                                        onClick={() => handleStatusChange("approved")}
                                        disabled={isChangingStatus || isDeleting || isReviewing}
                                    >
                                        {isChangingStatus ? (
                                            <Spinner size={SpinnerSize.small} />
                                        ) : (
                                            <Checkmark24Regular />
                                        )}
                                        {t("ideas.approve")}
                                    </PrimaryButton>
                                )}
                                {canImplement && (
                                    <PrimaryButton
                                        className={styles.implementButton}
                                        onClick={() => handleStatusChange("implemented")}
                                        disabled={isChangingStatus || isDeleting || isReviewing}
                                    >
                                        {isChangingStatus ? (
                                            <Spinner size={SpinnerSize.small} />
                                        ) : (
                                            <CheckmarkCircle24Regular />
                                        )}
                                        {t("ideas.implement")}
                                    </PrimaryButton>
                                )}
                                {canReject && (
                                    <DefaultButton
                                        className={styles.rejectButton}
                                        onClick={() => handleStatusChange("rejected")}
                                        disabled={isChangingStatus || isDeleting || isReviewing}
                                    >
                                        {isChangingStatus ? (
                                            <Spinner size={SpinnerSize.small} />
                                        ) : (
                                            <Dismiss24Regular />
                                        )}
                                        {t("ideas.reject")}
                                    </DefaultButton>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    {(canEdit || canDelete || canReview) && (
                        <div className={styles.actions}>
                            {canReview && (
                                <PrimaryButton
                                    className={styles.reviewButton}
                                    onClick={handleReview}
                                    disabled={isReviewing || isDeleting || isChangingStatus}
                                >
                                    {isReviewing ? (
                                        <>
                                            <Spinner size={SpinnerSize.small} />
                                            {t("ideas.reviewing")}
                                        </>
                                    ) : (
                                        <>
                                            <Lightbulb24Regular />
                                            {t("ideas.requestReview")}
                                        </>
                                    )}
                                </PrimaryButton>
                            )}
                            {canEdit && (
                                <PrimaryButton
                                    className={styles.editButton}
                                    disabled={isDeleting || isReviewing || isChangingStatus}
                                >
                                    <Edit24Regular />
                                    {t("ideas.edit")}
                                </PrimaryButton>
                            )}
                            {canDelete && (
                                <DefaultButton
                                    className={styles.deleteButton}
                                    onClick={() => setShowDeleteConfirm(true)}
                                    disabled={isDeleting || isReviewing || isChangingStatus}
                                >
                                    <Delete24Regular />
                                    {t("ideas.delete")}
                                </DefaultButton>
                            )}
                        </div>
                    )}
                </div>

                {isDeleting && (
                    <div className={styles.loadingOverlay}>
                        <Spinner size={SpinnerSize.large} />
                    </div>
                )}

                {showDeleteConfirm && (
                    <div className={styles.confirmOverlay} role="dialog" aria-modal="true">
                        <div className={styles.confirmDialog}>
                            <h3 className={styles.confirmTitle}>{t("ideas.deleteConfirmTitle")}</h3>
                            <p className={styles.confirmMessage}>{t("ideas.deleteConfirmMessage")}</p>
                            {error && <div className={styles.errorMessage}>{error}</div>}
                            <div className={styles.confirmActions}>
                                <DefaultButton
                                    onClick={() => setShowDeleteConfirm(false)}
                                    text={t("ideas.cancel")}
                                    disabled={isDeleting}
                                />
                                <PrimaryButton
                                    onClick={async () => {
                                        setIsDeleting(true);
                                        setError(null);
                                        try {
                                            const token = client ? await getToken(client) : undefined;
                                            await deleteIdeaApi(idea.ideaId, token);
                                            setShowDeleteConfirm(false);
                                            onDeleted(idea.ideaId);
                                        } catch (err) {
                                            console.error("Error deleting idea:", err);
                                            setError(err instanceof Error ? err.message : t("ideas.deleteError"));
                                            setIsDeleting(false);
                                        }
                                    }}
                                    text={isDeleting ? t("ideas.deleting") : t("ideas.confirmDelete")}
                                    disabled={isDeleting}
                                    styles={{
                                        root: { backgroundColor: "#d13438", borderColor: "#d13438" },
                                        rootHovered: { backgroundColor: "#a4262c", borderColor: "#a4262c" },
                                        rootPressed: { backgroundColor: "#8a2121", borderColor: "#8a2121" }
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                )}
            </Panel>
        </>
    );
}

