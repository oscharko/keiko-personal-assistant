/**
 * News Detail Modal component.
 * Displays full details of a news item including summary, citations, and related topics.
 */

import {useCallback, useEffect} from "react";
import {Link, Panel, PanelType} from "@fluentui/react";
import {News24Regular} from "@fluentui/react-icons";
import {useTranslation} from "react-i18next";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import {NewsItem} from "../../api/models";
import styles from "./NewsDetailModal.module.css";

interface NewsDetailModalProps {
    item: NewsItem;
    onClose: () => void;
}

/**
 * Format a timestamp to a readable date string.
 */
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
 * Remove HTTP/HTTPS links from text while preserving the rest of the content.
 * Removes markdown links [text](url) and plain URLs, but preserves line breaks for lists.
 */
function removeHttpLinks(text: string | undefined): string {
    if (!text) return "";
    // Remove markdown links but keep the link text: [text](url) -> text
    let cleaned = text.replace(/\[([^\]]+)\]\(https?:\/\/[^)]+\)/g, "$1");
    // Remove standalone URLs (preserve newlines, only remove spaces around URLs)
    cleaned = cleaned.replace(/[ \t]*https?:\/\/[^\s\n]+[ \t]*/g, "");
    // Clean up multiple spaces on the same line (but not newlines)
    cleaned = cleaned.replace(/[ \t]{2,}/g, " ");
    return cleaned;
}

export function NewsDetailModal({item, onClose}: NewsDetailModalProps) {
    const {t} = useTranslation();

    // Handle escape key to close modal
    const handleKeyDown = useCallback(
        (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                onClose();
            }
        },
        [onClose]
    );

    useEffect(() => {
        document.addEventListener("keydown", handleKeyDown);
        return () => {
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [handleKeyDown]);

    return (
        <Panel
            isOpen={true}
            onDismiss={onClose}
            type={PanelType.medium}
            headerText={item.title}
            closeButtonAriaLabel={t("news.close")}
            isLightDismiss
            className={styles.panel}
        >
            <div className={styles.content}>
                {/* Image */}
                {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.title} className={styles.image}/>
                ) : (
                    <div className={styles.imagePlaceholder}>
                        <News24Regular/>
                    </div>
                )}

                {/* Metadata */}
                <div className={styles.metadata}>
                    <span className={styles.searchTerm}>{item.searchTerm}</span>
                    {item.source && <span className={styles.source}>{item.source}</span>}
                    {item.publishedAt && <span className={styles.date}>{formatDate(item.publishedAt)}</span>}
                </div>

                {/* Summary */}
                <div className={styles.section}>
                    <h3 className={styles.sectionTitle}>{t("news.summary")}</h3>
                    <div className={styles.summary}>
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{removeHttpLinks(item.summary)}</ReactMarkdown>
                    </div>
                </div>

                {/* Citations */}
                {item.citations.length > 0 && (
                    <div className={styles.section}>
                        <h3 className={styles.sectionTitle}>{t("news.citations")}</h3>
                        <ul className={styles.citationsList}>
                            {item.citations.map((citation, index) => (
                                <li key={index} className={styles.citationItem}>
                                    <Link href={citation.url} target="_blank" rel="noopener noreferrer">
                                        {citation.title}
                                    </Link>
                                    {citation.source &&
                                        <span className={styles.citationSource}> - {citation.source}</span>}
                                    {citation.snippet && <p className={styles.citationSnippet}>{citation.snippet}</p>}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Related Topics */}
                {item.relatedTopics.length > 0 && (
                    <div className={styles.section}>
                        <h3 className={styles.sectionTitle}>{t("news.relatedTopics")}</h3>
                        <div className={styles.topicsList}>
                            {item.relatedTopics.map((topic, index) => (
                                <span key={index} className={styles.topicTag}>
                                    {topic}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </Panel>
    );
}

