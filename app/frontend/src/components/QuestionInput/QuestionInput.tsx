import {useContext, useEffect, useState} from "react";
import {Stack, TextField} from "@fluentui/react";
import {Button, Spinner, Tooltip} from "@fluentui/react-components";
import {Send28Filled, Sparkle28Regular} from "@fluentui/react-icons";
import {useTranslation} from "react-i18next";
import {useMsal} from "@azure/msal-react";

import styles from "./QuestionInput.module.css";
import {SpeechInput} from "./SpeechInput";
import {LoginContext} from "../../loginContext";
import {requireLogin, getToken, useLogin} from "../../authConfig";
import {enhancePromptApi} from "../../api";

interface Props {
    onSend: (question: string) => void;
    disabled: boolean;
    initQuestion?: string;
    placeholder?: string;
    clearOnSend?: boolean;
    showSpeechInput?: boolean;
}

export const QuestionInput = ({onSend, disabled, placeholder, clearOnSend, initQuestion, showSpeechInput}: Props) => {
    const [question, setQuestion] = useState<string>("");
    const {loggedIn} = useContext(LoginContext);
    const {t} = useTranslation();
    const [isComposing, setIsComposing] = useState(false);
    const [isEnhancing, setIsEnhancing] = useState(false);

    // Get MSAL instance for token retrieval (only if useLogin is enabled)
    const msalContext = useLogin ? useMsal() : null;
    const client = msalContext?.instance;

    useEffect(() => {
        initQuestion && setQuestion(initQuestion);
    }, [initQuestion]);

    const sendQuestion = () => {
        if (disabled || !question.trim()) {
            return;
        }

        onSend(question);

        if (clearOnSend) {
            setQuestion("");
        }
    };

    /**
     * Enhance the current prompt using the LLM to make it more specific and effective.
     * The enhanced prompt replaces the current text, allowing users to see and learn
     * how to write better prompts.
     */
    const enhancePrompt = async () => {
        if (!question.trim() || isEnhancing) {
            return;
        }

        setIsEnhancing(true);
        try {
            const idToken = client ? await getToken(client) : undefined;
            const response = await enhancePromptApi(question, idToken);
            setQuestion(response.enhanced_prompt);
        } catch (error) {
            console.error("Error enhancing prompt:", error);
            // Keep the original question on error
        } finally {
            setIsEnhancing(false);
        }
    };

    const onEnterPress = (ev: React.KeyboardEvent<Element>) => {
        if (isComposing) return;

        if (ev.key === "Enter" && !ev.shiftKey) {
            ev.preventDefault();
            sendQuestion();
        }
    };

    const handleCompositionStart = () => {
        setIsComposing(true);
    };
    const handleCompositionEnd = () => {
        setIsComposing(false);
    };

    const onQuestionChange = (_ev: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>, newValue?: string) => {
        if (!newValue) {
            setQuestion("");
        } else if (newValue.length <= 1000) {
            setQuestion(newValue);
        }
    };

    const disableRequiredAccessControl = requireLogin && !loggedIn;
    const sendQuestionDisabled = disabled || !question.trim() || disableRequiredAccessControl;
    const enhanceDisabled = disabled || !question.trim() || disableRequiredAccessControl || isEnhancing;

    if (disableRequiredAccessControl) {
        placeholder = "Please login to continue...";
    }

    return (
        <Stack className={styles.questionInputContainer}>
            <div className={styles.questionInputTextAreaRow}>
                <TextField
                    className={styles.questionInputTextArea}
                    disabled={disableRequiredAccessControl || isEnhancing}
                    placeholder={placeholder}
                    multiline
                    resizable={false}
                    borderless
                    value={question}
                    onChange={onQuestionChange}
                    onKeyDown={onEnterPress}
                    onCompositionStart={handleCompositionStart}
                    onCompositionEnd={handleCompositionEnd}
                />
            </div>
            <div className={styles.questionInputControlsRow}>
                <div className={styles.questionInputButtonsContainer}>
                    <Tooltip content={t("tooltips.enhancePrompt")} relationship="label">
                        <Button
                            size="large"
                            icon={isEnhancing ? <Spinner size="tiny" /> : <Sparkle28Regular primaryFill="#333333"/>}
                            disabled={enhanceDisabled}
                            onClick={enhancePrompt}
                        />
                    </Tooltip>
                    <Tooltip content={t("tooltips.submitQuestion")} relationship="label">
                        <Button size="large" icon={<Send28Filled primaryFill="#333333"/>}
                                disabled={sendQuestionDisabled} onClick={sendQuestion}/>
                    </Tooltip>
                </div>
                {showSpeechInput && <SpeechInput updateQuestion={setQuestion}/>}
            </div>
        </Stack>
    );
};
