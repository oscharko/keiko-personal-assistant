/**
 * Ideas Hub page component.
 * Displays submitted ideas with filtering, sorting, and pagination.
 * Allows users to submit new ideas and view existing ones.
 */

import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Spinner, SpinnerSize } from "@fluentui/react";
import {
    Add24Regular,
    ArrowDownload24Regular,
    ArrowLeft24Regular,
    Grid24Regular,
    Lightbulb24Regular,
    DataScatter24Regular,
    Warning24Regular,
    Info24Regular
} from "@fluentui/react-icons";
import { useMsal } from "@azure/msal-react";
import { useTranslation } from "react-i18next";

import { getIdeasApi, getIdeaEngagementBatchApi } from "../../api";
import { Idea, IdeaListResponse, IdeaStatus, IdeaEngagement } from "../../api/models";
import { getToken, useLogin } from "../../authConfig";
import styles from "./IdeaHub.module.css";
import { IdeaCard } from "./IdeaCard";
import { IdeaDetailModal } from "./IdeaDetailModal";
import { IdeaSubmissionForm } from "./IdeaSubmissionForm";
import { PortfolioMatrix } from "./PortfolioMatrix";
import { IdeasInfoDialog } from "./IdeasInfoDialog";

/**
 * Main Ideas Hub component.
 */
export function Component() {
    const navigate = useNavigate();
    // Only use MSAL instance if useLogin is true (Azure AD auth)
    const client = useLogin ? useMsal().instance : undefined;
    const { t } = useTranslation();

    // State
    const [ideas, setIdeas] = useState<Idea[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedIdea, setSelectedIdea] = useState<Idea | null>(null);
    const [showSubmissionForm, setShowSubmissionForm] = useState(false);
    const [showInfoDialog, setShowInfoDialog] = useState(false);

    // Pagination state
    const [page, setPage] = useState(1);
    const [pageSize] = useState(12);
    const [total, setTotal] = useState(0);
    const [hasMore, setHasMore] = useState(false);

    // Filter state
    const [statusFilter, setStatusFilter] = useState<string>("");
    const [myIdeasOnly, setMyIdeasOnly] = useState(false);
    const [sortBy, setSortBy] = useState<string>("createdAt");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
    const [quickFilter, setQuickFilter] = useState<string>("");

    // View mode state (grid or matrix)
    const [viewMode, setViewMode] = useState<"grid" | "matrix">("grid");

    // Engagement data for all ideas
    const [engagementMap, setEngagementMap] = useState<Record<string, IdeaEngagement>>({});

    // Current user ID for comment ownership checks
    const [currentUserId, setCurrentUserId] = useState<string | undefined>(undefined);

    // Admin and reviewer status
    const [isAdmin, setIsAdmin] = useState(false);
    const [isReviewer, setIsReviewer] = useState(false);

    /**
     * Load ideas from the API.
     *
     * In grid view we respect pagination to keep the list performant.
     * In matrix view we deliberately load all matching ideas (up to 500)
     * so the Portfolio Matrix can visualize the full portfolio across
     * all quadrants instead of only the current page.
     */
    const loadIdeas = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const token = client ? await getToken(client) : undefined;

            const effectivePageSize = viewMode === "matrix" ? 500 : pageSize;

            const response: IdeaListResponse = await getIdeasApi(token, {
                page,
                pageSize: effectivePageSize,
                status: statusFilter || undefined,
                myIdeas: myIdeasOnly,
                sortBy,
                sortOrder
            });

            setIdeas(response.ideas);
            setTotal(response.totalCount);
            setHasMore(response.hasMore);
        } catch (err) {
            console.error("Error loading ideas:", err);
            setError(err instanceof Error ? err.message : "Failed to load ideas");
        } finally {
            setIsLoading(false);
        }
    }, [client, page, pageSize, statusFilter, myIdeasOnly, sortBy, sortOrder, viewMode]);

    /**
     * Handle successful idea submission.
     */
    const handleIdeaSubmitted = useCallback((newIdea: Idea) => {
        setShowSubmissionForm(false);
        // Reload ideas to show the new one
        loadIdeas();
    }, [loadIdeas]);

    /**
     * Handle idea update (from detail modal).
     */
    const handleIdeaUpdated = useCallback((updatedIdea: Idea) => {
        setIdeas(prev => prev.map(idea =>
            idea.ideaId === updatedIdea.ideaId ? updatedIdea : idea
        ));
        setSelectedIdea(null);
    }, []);

    /**
     * Handle idea deletion.
     */
    const handleIdeaDeleted = useCallback((deletedIdeaId: string) => {
        setIdeas(prev => prev.filter(idea => idea.ideaId !== deletedIdeaId));
        setSelectedIdea(null);
    }, []);

    // Load ideas on mount and when filters change
    useEffect(() => {
        loadIdeas();
    }, [loadIdeas]);

    // Load engagement data for all ideas using batch API
    useEffect(() => {
        const loadEngagement = async () => {
            if (ideas.length === 0) return;

            try {
                const token = client ? await getToken(client) : undefined;
                const ideaIds = ideas.map(idea => idea.ideaId);

                // Use batch API to get all engagement data in a single request
                const engagements = await getIdeaEngagementBatchApi(ideaIds, token);
                setEngagementMap(engagements);
            } catch (err) {
                console.error("Error loading engagement data:", err);
            }
        };

        loadEngagement();
    }, [client, ideas]);

    // Get current user ID, admin and reviewer status from MSAL or Beta Auth
    useEffect(() => {
        // First check for Beta Auth user ID
        const betaUserId = localStorage.getItem("beta_auth_user_id");
        const betaIsAdmin = localStorage.getItem("beta_auth_is_admin") === "true";
        const betaIsReviewer = localStorage.getItem("beta_auth_is_reviewer") === "true";

        if (betaUserId) {
            setCurrentUserId(betaUserId);
            setIsAdmin(betaIsAdmin);
            setIsReviewer(betaIsReviewer || betaIsAdmin); // Admins are also reviewers
            return;
        }

        // Fall back to MSAL for Azure AD users
        if (client) {
            const accounts = client.getAllAccounts();
            if (accounts.length > 0) {
                setCurrentUserId(accounts[0].localAccountId);
            }
        }
    }, [client]);

    // Reset to page 1 when filters change
    useEffect(() => {
        setPage(1);
    }, [statusFilter, myIdeasOnly, sortBy, sortOrder, quickFilter]);

    /**
     * Apply quick filter presets.
     */
    const applyQuickFilter = useCallback((filter: string) => {
        if (quickFilter === filter) {
            // Toggle off
            setQuickFilter("");
            setSortBy("createdAt");
            setSortOrder("desc");
        } else {
            setQuickFilter(filter);
            switch (filter) {
                case "topImpact":
                    setSortBy("impactScore");
                    setSortOrder("desc");
                    break;
                case "quickWins":
                    setSortBy("feasibilityScore");
                    setSortOrder("desc");
                    break;
                case "strategic":
                    setSortBy("impactScore");
                    setSortOrder("desc");
                    break;
                default:
                    setSortBy("createdAt");
                    setSortOrder("desc");
            }
        }
    }, [quickFilter]);

    // Render loading state
    if (isLoading && ideas.length === 0) {
        return (
            <div className={styles.container}>
                <header className={styles.header}>
                    <div className={styles.headerLeft}>
                        <h1 className={styles.title}>{t("ideas.title")}</h1>
                        <p className={styles.subtitle}>{t("ideas.subtitle")}</p>
                    </div>
                </header>
                <div className={styles.content}>
                    <div className={styles.loadingState}>
                        <Spinner size={SpinnerSize.large} />
                        <p className={styles.loadingText}>{t("ideas.loading")}</p>
                    </div>
                </div>
            </div>
        );
    }

    // Render error state
    if (error && ideas.length === 0) {
        return (
            <div className={styles.container}>
                <header className={styles.header}>
                    <div className={styles.headerLeft}>
                        <h1 className={styles.title}>{t("ideas.title")}</h1>
                        <p className={styles.subtitle}>{t("ideas.subtitle")}</p>
                    </div>
                    <div className={styles.headerActions}>
                        <button className={styles.backButton} onClick={() => navigate("/")}>
                            <ArrowLeft24Regular />
                            {t("ideas.backToChat")}
                        </button>
                    </div>
                </header>
                <div className={styles.content}>
                    <div className={styles.errorState}>
                        <Warning24Regular className={styles.errorIcon} />
                        <h2 className={styles.errorTitle}>{t("ideas.errorTitle")}</h2>
                        <p className={styles.errorDescription}>{error}</p>
                    </div>
                </div>
            </div>
        );
    }

    // Render main content
    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.headerLeft}>
                    <h1 className={styles.title}>{t("ideas.title")}</h1>
                    <p className={styles.subtitle}>{t("ideas.subtitle")}</p>
                </div>
                <div className={styles.headerActions}>
                    <div className={styles.viewToggle}>
                        <button
                            className={`${styles.viewToggleButton} ${viewMode === "grid" ? styles.viewToggleActive : ""}`}
                            onClick={() => setViewMode("grid")}
                            title={t("ideas.viewMode.grid")}
                        >
                            <Grid24Regular />
                        </button>
                        <button
                            className={`${styles.viewToggleButton} ${viewMode === "matrix" ? styles.viewToggleActive : ""}`}
                            onClick={() => setViewMode("matrix")}
                            title={t("ideas.viewMode.matrix")}
                        >
                            <DataScatter24Regular />
                        </button>
                    </div>
                    <button
                        className={styles.infoButton}
                        onClick={() => setShowInfoDialog(true)}
                        title={t("ideas.explainFunction")}
                    >
                        <Info24Regular />
                        {t("ideas.explainFunction")}
                    </button>
                    <button
                        className={styles.primaryButton}
                        onClick={() => setShowSubmissionForm(true)}
                    >
                        <Add24Regular />
                        {t("ideas.submitIdea")}
                    </button>
                    <div className={styles.exportDropdown}>
                        <button className={styles.exportButton}>
                            <ArrowDownload24Regular />
                            {t("ideas.export.title")}
                        </button>
                        <div className={styles.exportMenu}>
                            <a
                                href="/api/ideas/export/csv"
                                className={styles.exportMenuItem}
                                download
                            >
                                {t("ideas.export.csv")}
                            </a>
                            <a
                                href="/api/ideas/export/excel"
                                className={styles.exportMenuItem}
                                download
                            >
                                {t("ideas.export.excel")}
                            </a>
                            <a
                                href="/api/ideas/export/report"
                                className={styles.exportMenuItem}
                                download
                            >
                                {t("ideas.export.report")}
                            </a>
                        </div>
                    </div>
                    <button className={styles.backButton} onClick={() => navigate("/")}>
                        <ArrowLeft24Regular />
                        {t("ideas.backToChat")}
                    </button>
                </div>
            </header>

            <div className={styles.content}>
                {/* Quick Filters */}
                <div className={styles.quickFilters}>
                    <button
                        className={`${styles.quickFilterButton} ${quickFilter === "topImpact" ? styles.quickFilterActive : ""}`}
                        onClick={() => applyQuickFilter("topImpact")}
                    >
                        {t("ideas.quickFilter.topImpact")}
                    </button>
                    <button
                        className={`${styles.quickFilterButton} ${quickFilter === "quickWins" ? styles.quickFilterActive : ""}`}
                        onClick={() => applyQuickFilter("quickWins")}
                    >
                        {t("ideas.quickFilter.quickWins")}
                    </button>
                    <button
                        className={`${styles.quickFilterButton} ${quickFilter === "strategic" ? styles.quickFilterActive : ""}`}
                        onClick={() => applyQuickFilter("strategic")}
                    >
                        {t("ideas.quickFilter.strategic")}
                    </button>
                </div>

                {/* Filter Bar */}
                <div className={styles.filterBar}>
                    <div className={styles.filterGroup}>
                        <label className={styles.filterLabel}>{t("ideas.filterStatus")}:</label>
                        <select
                            className={styles.filterSelect}
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="">{t("ideas.allStatuses")}</option>
                            <option value={IdeaStatus.Draft}>{t("ideas.status.draft")}</option>
                            <option value={IdeaStatus.Submitted}>{t("ideas.status.submitted")}</option>
                            <option value={IdeaStatus.UnderReview}>{t("ideas.status.underReview")}</option>
                            <option value={IdeaStatus.Approved}>{t("ideas.status.approved")}</option>
                            <option value={IdeaStatus.Rejected}>{t("ideas.status.rejected")}</option>
                            <option value={IdeaStatus.Implemented}>{t("ideas.status.implemented")}</option>
                        </select>
                    </div>

                    <div className={styles.filterGroup}>
                        <label className={styles.filterLabel}>{t("ideas.sortBy")}:</label>
                        <select
                            className={styles.filterSelect}
                            value={sortBy}
                            onChange={(e) => {
                                setSortBy(e.target.value);
                                setQuickFilter("");
                            }}
                        >
                            <option value="createdAt">{t("ideas.sort.createdAt")}</option>
                            <option value="updatedAt">{t("ideas.sort.updatedAt")}</option>
                            <option value="title">{t("ideas.sort.title")}</option>
                            <option value="impactScore">{t("ideas.sort.impactScore")}</option>
                            <option value="feasibilityScore">{t("ideas.sort.feasibilityScore")}</option>
                        </select>
                        <select
                            className={styles.filterSelect}
                            value={sortOrder}
                            onChange={(e) => setSortOrder(e.target.value as "asc" | "desc")}
                        >
                            <option value="desc">{t("ideas.sort.descending")}</option>
                            <option value="asc">{t("ideas.sort.ascending")}</option>
                        </select>
                    </div>

                    <button
                        className={`${styles.filterToggle} ${myIdeasOnly ? styles.filterToggleActive : ""}`}
                        onClick={() => setMyIdeasOnly(!myIdeasOnly)}
                    >
                        {t("ideas.myIdeasOnly")}
                    </button>
                </div>

                {/* Ideas Grid, Matrix, or Empty State */}
                {ideas.length > 0 ? (
                    <>
                        {viewMode === "grid" ? (
                            <>
                                <div className={styles.ideasGrid}>
                                    {ideas.map(idea => (
                                        <IdeaCard
                                            key={idea.ideaId}
                                            idea={idea}
                                            onClick={() => setSelectedIdea(idea)}
                                            engagement={engagementMap[idea.ideaId]}
                                        />
                                    ))}
                                </div>

                                {/* Pagination */}
                                <div className={styles.pagination}>
                                    <button
                                        className={styles.paginationButton}
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                        disabled={page === 1 || isLoading}
                                    >
                                        {t("ideas.previousPage")}
                                    </button>
                                    <span className={styles.paginationInfo}>
                                        {t("ideas.pageInfo", { page, total: Math.max(1, Math.ceil(total / pageSize)) })}
                                    </span>
                                    <button
                                        className={styles.paginationButton}
                                        onClick={() => setPage(p => p + 1)}
                                        disabled={!hasMore || isLoading}
                                    >
                                        {t("ideas.nextPage")}
                                    </button>
                                </div>
                            </>
                        ) : (
                            <PortfolioMatrix
                                ideas={ideas}
                                onIdeaClick={(idea) => setSelectedIdea(idea)}
                            />
                        )}
                    </>
                ) : (
                    <div className={styles.emptyState}>
                        <Lightbulb24Regular className={styles.emptyStateIcon} />
                        <h2 className={styles.emptyStateTitle}>{t("ideas.emptyTitle")}</h2>
                        <p className={styles.emptyStateDescription}>{t("ideas.emptyDescription")}</p>
                        <button
                            className={styles.emptyStateButton}
                            onClick={() => setShowSubmissionForm(true)}
                        >
                            <Add24Regular />
                            {t("ideas.submitFirstIdea")}
                        </button>
                    </div>
                )}
            </div>

            {/* Submission Form Modal */}
            {showSubmissionForm && (
                <IdeaSubmissionForm
                    onClose={() => setShowSubmissionForm(false)}
                    onSubmitted={handleIdeaSubmitted}
                />
            )}

            {/* Detail Modal */}
            {selectedIdea && (
                <IdeaDetailModal
                    idea={selectedIdea}
                    onClose={() => setSelectedIdea(null)}
                    onUpdated={handleIdeaUpdated}
                    onDeleted={handleIdeaDeleted}
                    currentUserId={currentUserId}
                    isAdmin={isAdmin}
                    isReviewer={isReviewer}
                />
            )}

            {/* Info Dialog */}
            {showInfoDialog && (
                <IdeasInfoDialog onClose={() => setShowInfoDialog(false)} />
            )}
        </div>
    );
}

