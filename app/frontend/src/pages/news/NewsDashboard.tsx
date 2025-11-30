/**
 * News Dashboard page component.
 * Displays personalized news based on user's search terms.
 * News is pre-fetched by a background scheduler and cached for 24 hours.
 */

import {useCallback, useEffect, useState} from "react";
import {useNavigate} from "react-router-dom";
import {Spinner, SpinnerSize} from "@fluentui/react";
import {
    ArrowLeft24Regular,
    ArrowSync24Regular,
    Info24Regular,
    News24Regular,
    Settings24Regular,
    Warning24Regular
} from "@fluentui/react-icons";
import {useMsal} from "@azure/msal-react";
import {useTranslation} from "react-i18next";

import {getCachedNewsApi, getNewsPreferencesApi} from "../../api";
import {NewsItem, NewsPreferencesResponse, NewsSearchResult} from "../../api/models";
import {getToken, useLogin} from "../../authConfig";
import styles from "./NewsDashboard.module.css";
import {NewsDetailModal} from "./NewsDetailModal";
import {NewsInfoDialog} from "./NewsInfoDialog";
import {NewsPreferencesModal} from "./NewsPreferencesModal";

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
 * Strip Markdown formatting from text for plain text display.
 * Removes common Markdown syntax like bold, italic, links, etc.
 */
function stripMarkdown(text: string): string {
    if (!text) return "";
    return text
        // Remove bold/italic markers
        .replace(/\*\*([^*]+)\*\*/g, "$1")
        .replace(/\*([^*]+)\*/g, "$1")
        .replace(/__([^_]+)__/g, "$1")
        .replace(/_([^_]+)_/g, "$1")
        // Remove inline links [text](url)
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
        // Remove reference links [text][ref]
        .replace(/\[([^\]]+)\]\[[^\]]*\]/g, "$1")
        // Remove headers
        .replace(/^#{1,6}\s+/gm, "")
        // Remove horizontal rules
        .replace(/^[-*_]{3,}\s*$/gm, "")
        // Remove list markers
        .replace(/^[\s]*[-*+]\s+/gm, "")
        .replace(/^[\s]*\d+\.\s+/gm, "")
        // Remove code blocks
        .replace(/```[\s\S]*?```/g, "")
        .replace(/`([^`]+)`/g, "$1")
        // Remove blockquotes
        .replace(/^>\s+/gm, "")
        // Clean up extra whitespace
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}

/**
 * News card component for displaying a single news item.
 */
interface NewsCardProps {
    item: NewsItem;
    onClick: () => void;
}

function NewsCard({item, onClick}: NewsCardProps) {
    // Strip Markdown formatting for plain text display in cards
    const plainSummary = stripMarkdown(item.summary);

    return (
        <article className={styles.newsCard} onClick={onClick} role="button" tabIndex={0}>
            {item.imageUrl ? (
                <img src={item.imageUrl} alt={item.title} className={styles.newsCardImage}/>
            ) : (
                <div className={styles.newsCardImagePlaceholder}>
                    <News24Regular/>
                </div>
            )}
            <div className={styles.newsCardContent}>
                <span className={styles.newsCardSearchTerm}>{item.searchTerm}</span>
                <h3 className={styles.newsCardTitle}>{item.title}</h3>
                <p className={styles.newsCardSummary}>{plainSummary}</p>
                <div className={styles.newsCardFooter}>
                    <span className={styles.newsCardSource}>{item.source || "Web"}</span>
                    <span className={styles.newsCardDate}>{formatDate(item.publishedAt)}</span>
                </div>
            </div>
        </article>
    );
}

/**
 * Main News Dashboard component.
 */
export function Component() {
    const navigate = useNavigate();
    // Only use MSAL instance if useLogin is true (Azure AD auth)
    // Otherwise, Beta Auth is used and token is retrieved differently
    const client = useLogin ? useMsal().instance : undefined;
    const {t} = useTranslation();

    const [preferences, setPreferences] = useState<NewsPreferencesResponse | null>(null);
    const [newsResult, setNewsResult] = useState<NewsSearchResult | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedItem, setSelectedItem] = useState<NewsItem | null>(null);
    const [showPreferences, setShowPreferences] = useState(false);
    const [showInfoDialog, setShowInfoDialog] = useState(false);

    /**
     * Load initial data: preferences and cached news.
     * News is pre-fetched by background scheduler, so we just display cached data.
     */
    const loadInitialData = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const token = client ? await getToken(client) : undefined;

            // Load preferences
            const prefsResponse = await getNewsPreferencesApi(token);
            setPreferences(prefsResponse);

            // Load cached news if user has search terms
            if (prefsResponse.searchTerms.length > 0) {
                const cachedNews = await getCachedNewsApi(token);
                setNewsResult(cachedNews);
            }
        } catch (err) {
            console.error("Error loading news data:", err);
            setError(err instanceof Error ? err.message : "Failed to load news data");
        } finally {
            setIsLoading(false);
        }
    }, [client]);

    /**
     * Handle preferences update.
     * When new topics are added, the backend triggers a background refresh.
     * We reload cached news after a short delay to show the new content.
     */
    const handlePreferencesUpdate = useCallback(async (newPrefs: NewsPreferencesResponse) => {
        setPreferences(newPrefs);

        if (newPrefs.searchTerms.length > 0) {
            // Wait a moment for background refresh to complete, then reload
            // The backend triggers an async refresh for new topics
            setTimeout(async () => {
                try {
                    const token = client ? await getToken(client) : undefined;
                    const cachedNews = await getCachedNewsApi(token);
                    setNewsResult(cachedNews);
                } catch (err) {
                    console.error("Error reloading cached news:", err);
                }
            }, 3000); // Wait 3 seconds for background refresh
        } else {
            setNewsResult(null);
        }
    }, [client]);

    // Load data on mount
    useEffect(() => {
        loadInitialData();
    }, [loadInitialData]);

    // Render loading state
    if (isLoading) {
        return (
            <div className={styles.container}>
                <header className={styles.header}>
                    <div className={styles.headerLeft}>
                        <h1 className={styles.title}>{t("news.title")}</h1>
                        <p className={styles.subtitle}>{t("news.subtitle")}</p>
                    </div>
                </header>
                <div className={styles.content}>
                    <div className={styles.loadingState}>
                        <Spinner size={SpinnerSize.large}/>
                        <p className={styles.loadingText}>{t("news.loading")}</p>
                    </div>
                </div>
            </div>
        );
    }

    // Render empty/error state - show friendly message to configure topics
    if (error || !preferences?.searchTerms.length) {
        return (
            <div className={styles.container}>
                <header className={styles.header}>
                    <div className={styles.headerLeft}>
                        <h1 className={styles.title}>{t("news.title")}</h1>
                        <p className={styles.subtitle}>{t("news.subtitle")}</p>
                    </div>
                    <div className={styles.headerActions}>
                        <button
                            className={styles.infoButton}
                            onClick={() => setShowInfoDialog(true)}
                            title={t("news.explainFunction")}
                        >
                            <Info24Regular/>
                            {t("news.explainFunction")}
                        </button>
                        <button className={styles.backButton} onClick={() => navigate("/")}>
                            <ArrowLeft24Regular/>
                            {t("news.backToChat")}
                        </button>
                    </div>
                </header>
                <div className={styles.content}>
                    <div className={styles.emptyState}>
                        <News24Regular className={styles.emptyStateIcon}/>
                        <h2 className={styles.emptyStateTitle}>{t("news.emptyTitle")}</h2>
                        <p className={styles.emptyStateDescription}>{t("news.emptyDescription")}</p>
                        <button className={styles.emptyStateButton} onClick={() => setShowPreferences(true)}>
                            <Settings24Regular/>
                            {t("news.configureTopics")}
                        </button>
                    </div>
                </div>
                {showPreferences && (
                    <NewsPreferencesModal
                        preferences={preferences || {searchTerms: [], updatedAt: 0, maxTerms: 10}}
                        onClose={() => setShowPreferences(false)}
                        onUpdate={handlePreferencesUpdate}
                    />
                )}
                {showInfoDialog && (
                    <NewsInfoDialog onClose={() => setShowInfoDialog(false)}/>
                )}
            </div>
        );
    }

    // Render news grid
    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.headerLeft}>
                    <h1 className={styles.title}>{t("news.title")}</h1>
                    <p className={styles.subtitle}>{t("news.subtitle")}</p>
                </div>
                <div className={styles.headerActions}>
                    <button
                        className={styles.infoButton}
                        onClick={() => setShowInfoDialog(true)}
                        title={t("news.explainFunction")}
                    >
                        <Info24Regular/>
                        {t("news.explainFunction")}
                    </button>
                    <button className={styles.settingsButton} onClick={() => setShowPreferences(true)}>
                        <Settings24Regular/>
                        {t("news.settings")}
                    </button>
                    <button className={styles.backButton} onClick={() => navigate("/")}>
                        <ArrowLeft24Regular/>
                        {t("news.backToChat")}
                    </button>
                </div>
            </header>
            <div className={styles.content}>
                {newsResult?.items.length ? (
                    <div className={styles.newsGrid}>
                        {newsResult.items.map(item => (
                            <NewsCard key={item.id} item={item} onClick={() => setSelectedItem(item)}/>
                        ))}
                    </div>
                ) : (
                    <div className={styles.emptyState}>
                        <News24Regular className={styles.emptyStateIcon}/>
                        <h2 className={styles.emptyStateTitle}>{t("news.noNewsTitle")}</h2>
                    </div>
                )}
            </div>

            {/* Detail Modal */}
            {selectedItem && (
                <NewsDetailModal item={selectedItem} onClose={() => setSelectedItem(null)}/>
            )}

            {/* Preferences Modal */}
            {showPreferences && preferences && (
                <NewsPreferencesModal
                    preferences={preferences}
                    onClose={() => setShowPreferences(false)}
                    onUpdate={handlePreferencesUpdate}
                />
            )}

            {/* Info Dialog */}
            {showInfoDialog && (
                <NewsInfoDialog onClose={() => setShowInfoDialog(false)}/>
            )}
        </div>
    );
}

