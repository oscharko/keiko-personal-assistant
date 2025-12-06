/**
 * Idea Submission Form Modal component.
 * Allows users to submit new ideas with validation and duplicate detection.
 */

import { useState, useCallback, useEffect, useMemo } from "react";
import { Panel, PanelType, TextField, PrimaryButton, DefaultButton, MessageBar, MessageBarType, Spinner, SpinnerSize, Dialog, DialogType, DialogFooter } from "@fluentui/react";
import { Warning24Regular, Dismiss12Regular, Info24Regular } from "@fluentui/react-icons";

import { SimilarIdeaDetailDialog } from "./SimilarIdeaDetailDialog";
import { useMsal } from "@azure/msal-react";
import { useTranslation } from "react-i18next";

import { createIdeaApi, getSimilarIdeasApi } from "../../api";
import { Idea, IdeaSubmission, SimilarIdea, IdeaStatus } from "../../api/models";
import { getToken, useLogin } from "../../authConfig";
import styles from "./IdeaSubmissionForm.module.css";

interface IdeaSubmissionFormProps {
    onClose: () => void;
    onSubmitted: (idea: Idea) => void;
}

// Debounce delay for duplicate detection (ms)
const DUPLICATE_CHECK_DELAY = 1000;

export function IdeaSubmissionForm({ onClose, onSubmitted }: IdeaSubmissionFormProps) {
    // Only use MSAL instance if useLogin is true (Azure AD auth)
    const client = useLogin ? useMsal().instance : undefined;
    const { t } = useTranslation();

    // Form state
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [problemDescription, setProblemDescription] = useState("");
    const [expectedBenefit, setExpectedBenefit] = useState("");
    const [affectedProcesses, setAffectedProcesses] = useState<string[]>([]);
    const [processInput, setProcessInput] = useState("");
    const [targetUsers, setTargetUsers] = useState<string[]>([]);
    const [userInput, setUserInput] = useState("");
    const [department, setDepartment] = useState("");

    // UI state
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isCheckingDuplicates, setIsCheckingDuplicates] = useState(false);
    const [similarIdeas, setSimilarIdeas] = useState<SimilarIdea[]>([]);
    const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
    const [selectedSimilarIdea, setSelectedSimilarIdea] = useState<SimilarIdea | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
    const [showDiscardConfirmation, setShowDiscardConfirmation] = useState(false);

    /**
     * Check if the form has any data entered.
     */
    const hasFormData = useMemo(() => {
        return (
            title.trim() !== "" ||
            description.trim() !== "" ||
            problemDescription.trim() !== "" ||
            expectedBenefit.trim() !== "" ||
            affectedProcesses.length > 0 ||
            targetUsers.length > 0 ||
            department.trim() !== ""
        );
    }, [title, description, problemDescription, expectedBenefit, affectedProcesses, targetUsers, department]);

    /**
     * Handle close request - show confirmation if form has data.
     */
    const handleCloseRequest = useCallback(() => {
        console.log('[DEBUG] handleCloseRequest called, hasFormData:', hasFormData);
        console.trace('[DEBUG] handleCloseRequest stack trace');
        if (hasFormData) {
            setShowDiscardConfirmation(true);
        } else {
            onClose();
        }
    }, [hasFormData, onClose]);

    /**
     * Confirm discard and close the panel.
     */
    const handleConfirmDiscard = useCallback(() => {
        setShowDiscardConfirmation(false);
        onClose();
    }, [onClose]);

    /**
     * Cancel discard and keep the panel open.
     */
    const handleCancelDiscard = useCallback(() => {
        setShowDiscardConfirmation(false);
    }, []);

    /**
     * Validate form fields.
     */
    const validateForm = useCallback((): boolean => {
        const errors: Record<string, string> = {};

        if (!title.trim()) {
            errors.title = t("ideas.validation.titleRequired");
        } else if (title.length < 5) {
            errors.title = t("ideas.validation.titleTooShort");
        } else if (title.length > 200) {
            errors.title = t("ideas.validation.titleTooLong");
        }

        if (!description.trim()) {
            errors.description = t("ideas.validation.descriptionRequired");
        } else if (description.length < 20) {
            errors.description = t("ideas.validation.descriptionTooShort");
        }

        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    }, [title, description, t]);

    /**
     * Check for similar ideas (duplicate detection).
     * Combines title, description, and problem description for semantic comparison.
     */
    const checkForDuplicates = useCallback(async () => {
        const textToCheck = `${title} ${description} ${problemDescription}`.trim();
        if (textToCheck.length < 20) {
            setSimilarIdeas([]);
            return;
        }

        setIsCheckingDuplicates(true);
        try {
            const token = client ? await getToken(client) : undefined;
            const response = await getSimilarIdeasApi(textToCheck, token, {
                threshold: 0.7,
                limit: 5
            });
            setSimilarIdeas(response.similarIdeas);
            if (response.similarIdeas.length > 0) {
                setShowDuplicateWarning(true);
            }
        } catch (err) {
            console.error("Error checking for duplicates:", err);
            // Don't show error to user, just continue without duplicate check
        } finally {
            setIsCheckingDuplicates(false);
        }
    }, [client, title, description, problemDescription]);

    // Debounced duplicate check when title, description, or problem description changes
    useEffect(() => {
        const timer = setTimeout(() => {
            if (title.length >= 5 && description.length >= 10) {
                checkForDuplicates();
            }
        }, DUPLICATE_CHECK_DELAY);

        return () => clearTimeout(timer);
    }, [title, description, problemDescription, checkForDuplicates]);

    /**
     * Handle form submission.
     */
    const handleSubmit = useCallback(async () => {
        if (!validateForm()) return;

        setIsSubmitting(true);
        setError(null);

        try {
            const token = client ? await getToken(client) : undefined;

            const ideaData: IdeaSubmission = {
                title: title.trim(),
                description: description.trim(),
                problemDescription: problemDescription.trim() || undefined,
                expectedBenefit: expectedBenefit.trim() || undefined,
                affectedProcesses: affectedProcesses.length > 0 ? affectedProcesses : undefined,
                targetUsers: targetUsers.length > 0 ? targetUsers : undefined,
                department: department.trim() || undefined,
                status: IdeaStatus.Submitted,
                similarIdeas: similarIdeas.length > 0 ? similarIdeas : undefined
            };

            const newIdea = await createIdeaApi(ideaData, token);
            onSubmitted(newIdea);
        } catch (err) {
            console.error("Error submitting idea:", err);
            setError(err instanceof Error ? err.message : t("ideas.submitError"));
        } finally {
            setIsSubmitting(false);
        }
    }, [client, title, description, problemDescription, expectedBenefit, affectedProcesses, targetUsers, department, similarIdeas, validateForm, onSubmitted, t]);

    /**
     * Handle adding a process tag.
     */
    const handleAddProcess = useCallback(() => {
        const value = processInput.trim();
        if (value && !affectedProcesses.includes(value)) {
            setAffectedProcesses([...affectedProcesses, value]);
            setProcessInput("");
        }
    }, [processInput, affectedProcesses]);

    /**
     * Handle adding a target user tag.
     */
    const handleAddUser = useCallback(() => {
        const value = userInput.trim();
        if (value && !targetUsers.includes(value)) {
            setTargetUsers([...targetUsers, value]);
            setUserInput("");
        }
    }, [userInput, targetUsers]);

    /**
     * Handle key press in tag inputs.
     */
    const handleTagKeyPress = useCallback((event: React.KeyboardEvent, addFn: () => void) => {
        if (event.key === "Enter" || event.key === ",") {
            event.preventDefault();
            addFn();
        }
    }, []);

    return (
        <>
        <Panel
            isOpen={true}
            onDismiss={handleCloseRequest}
            type={PanelType.medium}
            headerText={t("ideas.submitIdeaTitle")}
            closeButtonAriaLabel={t("ideas.close")}
            isLightDismiss={false}
            className={styles.panel}
            focusTrapZoneProps={{
                disabled: !!selectedSimilarIdea
            }}
            layerProps={{
                eventBubblingEnabled: false
            }}
        >
            <div className={styles.content}>
                <p className={styles.description}>{t("ideas.submitDescription")}</p>

                {/* Error Message */}
                {error && (
                    <MessageBar messageBarType={MessageBarType.error} onDismiss={() => setError(null)}>
                        {error}
                    </MessageBar>
                )}

                {/* Similar Ideas Warning */}
                {showDuplicateWarning && similarIdeas.length > 0 && (
                    <div className={styles.warningSection}>
                        <h4 className={styles.warningTitle}>
                            <Warning24Regular />
                            {t("ideas.similarIdeasFound")}
                        </h4>
                        <div className={styles.warningList}>
                            {similarIdeas.slice(0, 3).map(idea => (
                                <button
                                    key={idea.ideaId}
                                    className={styles.warningItemClickable}
                                    onClick={() => setSelectedSimilarIdea(idea)}
                                    type="button"
                                >
                                    <span className={styles.warningItemTitle}>{idea.title}</span>
                                    <span className={styles.warningItemMeta}>
                                        <span className={styles.warningItemScore}>
                                            {Math.round(idea.similarityScore * 100)}% {t("ideas.similar")}
                                        </span>
                                        <Info24Regular className={styles.warningItemIcon} />
                                    </span>
                                </button>
                            ))}
                        </div>
                        <div className={styles.warningActions}>
                            <button
                                className={`${styles.warningButton} ${styles.warningButtonPrimary}`}
                                onClick={() => setShowDuplicateWarning(false)}
                            >
                                {t("ideas.continueAnyway")}
                            </button>
                        </div>
                    </div>
                )}

                {/* Title Field */}
                <div className={styles.formGroup}>
                    <label className={`${styles.formLabel} ${styles.formLabelRequired}`}>
                        {t("ideas.form.title")}
                    </label>
                    <TextField
                        value={title}
                        onChange={(_, value) => setTitle(value || "")}
                        placeholder={t("ideas.form.titlePlaceholder")}
                        className={styles.formInput}
                        disabled={isSubmitting}
                        errorMessage={validationErrors.title}
                    />
                </div>

                {/* Description Field */}
                <div className={styles.formGroup}>
                    <label className={`${styles.formLabel} ${styles.formLabelRequired}`}>
                        {t("ideas.form.description")}
                    </label>
                    <TextField
                        value={description}
                        onChange={(_, value) => setDescription(value || "")}
                        placeholder={t("ideas.form.descriptionPlaceholder")}
                        multiline
                        rows={4}
                        className={`${styles.formInput} ${styles.formTextarea}`}
                        disabled={isSubmitting}
                        errorMessage={validationErrors.description}
                    />
                    <span className={styles.formHint}>{t("ideas.form.descriptionHint")}</span>
                </div>

                {/* Problem Description Field */}
                <div className={styles.formGroup}>
                    <label className={styles.formLabel}>{t("ideas.form.problemDescription")}</label>
                    <TextField
                        value={problemDescription}
                        onChange={(_, value) => setProblemDescription(value || "")}
                        placeholder={t("ideas.form.problemDescriptionPlaceholder")}
                        multiline
                        rows={3}
                        className={`${styles.formInput} ${styles.formTextarea}`}
                        disabled={isSubmitting}
                    />
                </div>

                {/* Expected Benefit Field */}
                <div className={styles.formGroup}>
                    <label className={styles.formLabel}>{t("ideas.form.expectedBenefit")}</label>
                    <TextField
                        value={expectedBenefit}
                        onChange={(_, value) => setExpectedBenefit(value || "")}
                        placeholder={t("ideas.form.expectedBenefitPlaceholder")}
                        multiline
                        rows={3}
                        className={`${styles.formInput} ${styles.formTextarea}`}
                        disabled={isSubmitting}
                    />
                </div>

                {/* Affected Processes */}
                <div className={styles.formGroup}>
                    <label className={styles.formLabel}>{t("ideas.form.affectedProcesses")}</label>
                    <div className={styles.tagsContainer}>
                        {affectedProcesses.map(process => (
                            <span key={process} className={styles.tag}>
                                {process}
                                <button
                                    className={styles.tagRemove}
                                    onClick={() => setAffectedProcesses(affectedProcesses.filter(p => p !== process))}
                                    disabled={isSubmitting}
                                >
                                    <Dismiss12Regular />
                                </button>
                            </span>
                        ))}
                        <input
                            type="text"
                            value={processInput}
                            onChange={(e) => setProcessInput(e.target.value)}
                            onKeyPress={(e) => handleTagKeyPress(e, handleAddProcess)}
                            onBlur={handleAddProcess}
                            placeholder={affectedProcesses.length === 0 ? t("ideas.form.affectedProcessesPlaceholder") : ""}
                            className={styles.tagInput}
                            disabled={isSubmitting}
                        />
                    </div>
                </div>

                {/* Target Users */}
                <div className={styles.formGroup}>
                    <label className={styles.formLabel}>{t("ideas.form.targetUsers")}</label>
                    <div className={styles.tagsContainer}>
                        {targetUsers.map(user => (
                            <span key={user} className={styles.tag}>
                                {user}
                                <button
                                    className={styles.tagRemove}
                                    onClick={() => setTargetUsers(targetUsers.filter(u => u !== user))}
                                    disabled={isSubmitting}
                                >
                                    <Dismiss12Regular />
                                </button>
                            </span>
                        ))}
                        <input
                            type="text"
                            value={userInput}
                            onChange={(e) => setUserInput(e.target.value)}
                            onKeyPress={(e) => handleTagKeyPress(e, handleAddUser)}
                            onBlur={handleAddUser}
                            placeholder={targetUsers.length === 0 ? t("ideas.form.targetUsersPlaceholder") : ""}
                            className={styles.tagInput}
                            disabled={isSubmitting}
                        />
                    </div>
                </div>

                {/* Department Field */}
                <div className={styles.formGroup}>
                    <label className={styles.formLabel}>{t("ideas.form.department")}</label>
                    <TextField
                        value={department}
                        onChange={(_, value) => setDepartment(value || "")}
                        placeholder={t("ideas.form.departmentPlaceholder")}
                        className={styles.formInput}
                        disabled={isSubmitting}
                    />
                </div>

                {/* Actions */}
                <div className={styles.actions}>
                    <DefaultButton
                        onClick={handleCloseRequest}
                        disabled={isSubmitting}
                        className={styles.cancelButton}
                    >
                        {t("ideas.cancel")}
                    </DefaultButton>
                    <PrimaryButton
                        onClick={handleSubmit}
                        disabled={isSubmitting || !title.trim() || !description.trim()}
                        className={styles.submitButton}
                    >
                        {isSubmitting ? <Spinner size={SpinnerSize.small} /> : t("ideas.submit")}
                    </PrimaryButton>
                </div>

                {/* Duplicate Check Indicator */}
                {isCheckingDuplicates && (
                    <div className={styles.infoBanner}>
                        <p>{t("ideas.checkingForDuplicates")}</p>
                    </div>
                )}

                {/* Similar Idea Detail Dialog - rendered INSIDE Panel to prevent outer click detection */}
                {selectedSimilarIdea && (
                    <SimilarIdeaDetailDialog
                        similarIdea={selectedSimilarIdea}
                        onClose={() => setSelectedSimilarIdea(null)}
                    />
                )}
            </div>
        </Panel>

        {/* Discard Confirmation Dialog */}
        <Dialog
            hidden={!showDiscardConfirmation}
            onDismiss={handleCancelDiscard}
            dialogContentProps={{
                type: DialogType.normal,
                title: t("ideas.discardChangesTitle"),
                subText: t("ideas.discardChangesMessage")
            }}
            modalProps={{
                isBlocking: true,
                styles: {
                    main: { maxWidth: 450 },
                    root: { zIndex: 3000000 }
                }
            }}
        >
            <DialogFooter>
                <PrimaryButton onClick={handleConfirmDiscard} text={t("ideas.discardChangesConfirm")} />
                <DefaultButton onClick={handleCancelDiscard} text={t("ideas.discardChangesCancel")} />
            </DialogFooter>
        </Dialog>
        </>
    );
}

