/**
 * News Preferences Modal component.
 * Allows users to manage their news search terms.
 */

import { useState, useCallback } from "react";
import { Panel, PanelType, TextField, PrimaryButton, IconButton, MessageBar, MessageBarType } from "@fluentui/react";
import { Delete24Regular, Add24Regular } from "@fluentui/react-icons";
import { useMsal } from "@azure/msal-react";
import { useTranslation } from "react-i18next";

import { addNewsSearchTermApi, deleteNewsSearchTermApi } from "../../api";
import { NewsPreferencesResponse } from "../../api/models";
import { getToken, useLogin } from "../../authConfig";
import styles from "./NewsPreferencesModal.module.css";

interface NewsPreferencesModalProps {
    preferences: NewsPreferencesResponse;
    onClose: () => void;
    onUpdate: (preferences: NewsPreferencesResponse) => void;
}

export function NewsPreferencesModal({ preferences, onClose, onUpdate }: NewsPreferencesModalProps) {
    // Only use MSAL instance if useLogin is true (Azure AD auth)
    const client = useLogin ? useMsal().instance : undefined;
    const { t } = useTranslation();

    const [newTerm, setNewTerm] = useState("");
    const [isAdding, setIsAdding] = useState(false);
    const [deletingTerm, setDeletingTerm] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const canAddMore = preferences.searchTerms.length < preferences.maxTerms;

    /**
     * Add a new search term.
     */
    const handleAddTerm = useCallback(async () => {
        if (!newTerm.trim()) return;

        setIsAdding(true);
        setError(null);

        try {
            const token = client ? await getToken(client) : undefined;
            const updatedPrefs = await addNewsSearchTermApi(newTerm.trim(), token);
            onUpdate(updatedPrefs);
            setNewTerm("");
        } catch (err) {
            console.error("Error adding search term:", err);
            setError(err instanceof Error ? err.message : "Failed to add search term");
        } finally {
            setIsAdding(false);
        }
    }, [client, newTerm, onUpdate]);

    /**
     * Delete a search term.
     */
    const handleDeleteTerm = useCallback(
        async (term: string) => {
            setDeletingTerm(term);
            setError(null);

            try {
                const token = client ? await getToken(client) : undefined;
                const updatedPrefs = await deleteNewsSearchTermApi(term, token);
                onUpdate(updatedPrefs);
            } catch (err) {
                console.error("Error deleting search term:", err);
                setError(err instanceof Error ? err.message : "Failed to delete search term");
            } finally {
                setDeletingTerm(null);
            }
        },
        [client, onUpdate]
    );

    /**
     * Handle Enter key press in the input field.
     */
    const handleKeyPress = useCallback(
        (event: React.KeyboardEvent<HTMLInputElement>) => {
            if (event.key === "Enter" && canAddMore && newTerm.trim()) {
                handleAddTerm();
            }
        },
        [canAddMore, handleAddTerm, newTerm]
    );

    return (
        <Panel
            isOpen={true}
            onDismiss={onClose}
            type={PanelType.medium}
            headerText={t("news.preferencesTitle")}
            closeButtonAriaLabel={t("news.close")}
            isLightDismiss
            className={styles.panel}
        >
            <div className={styles.content}>
                <p className={styles.description}>{t("news.preferencesDescription")}</p>

                {/* Error Message */}
                {error && (
                    <MessageBar messageBarType={MessageBarType.error} onDismiss={() => setError(null)}>
                        {error}
                    </MessageBar>
                )}

                {/* Add New Term */}
                <div className={styles.addSection}>
                    <TextField
                        placeholder={t("news.addTermPlaceholder")}
                        value={newTerm}
                        onChange={(_, value) => setNewTerm(value || "")}
                        onKeyPress={handleKeyPress}
                        disabled={!canAddMore || isAdding}
                        className={styles.addInput}
                    />
                    <PrimaryButton
                        onClick={handleAddTerm}
                        disabled={!canAddMore || !newTerm.trim() || isAdding}
                        className={styles.addButton}
                    >
                        <Add24Regular />
                        {t("news.add")}
                    </PrimaryButton>
                </div>

                {/* Terms Counter */}
                <p className={styles.counter}>
                    {t("news.termsCount", {
                        current: preferences.searchTerms.length,
                        max: preferences.maxTerms
                    })}
                </p>

                {/* Terms List */}
                <div className={styles.termsList}>
                    {preferences.searchTerms.length === 0 ? (
                        <p className={styles.emptyMessage}>{t("news.noTermsConfigured")}</p>
                    ) : (
                        preferences.searchTerms.map(term => (
                            <div key={term} className={styles.termItem}>
                                <span className={styles.termText}>{term}</span>
                                <IconButton
                                    iconProps={{ iconName: "Delete" }}
                                    onClick={() => handleDeleteTerm(term)}
                                    disabled={deletingTerm === term}
                                    className={styles.deleteButton}
                                    ariaLabel={t("news.deleteTerm", { term })}
                                >
                                    <Delete24Regular />
                                </IconButton>
                            </div>
                        ))
                    )}
                </div>

                {/* Info Banner */}
                <div className={styles.infoBanner}>
                    <p>{t("news.preferencesInfo")}</p>
                </div>
            </div>
        </Panel>
    );
}

