/**
 * Playground page component for RAG system parameter experimentation.
 * Provides a standalone, user-friendly interface for configuring and
 * understanding RAG (Retrieval-Augmented Generation) system parameters.
 * Now includes full API integration for testing parameters in real-time.
 */
import React, {useContext, useEffect, useRef, useState} from "react";
import {useNavigate} from "react-router-dom";
import {
    Dropdown,
    Icon,
    IDropdownOption,
    MessageBar,
    MessageBarType,
    Slider,
    Spinner,
    SpinnerSize,
    TextField,
    Toggle,
    TooltipHost
} from "@fluentui/react";
import {useTranslation} from "react-i18next";
import {Helmet} from "react-helmet-async";
import {ChevronDown24Regular, ChevronUp24Regular, Info16Regular, Info24Regular} from "@fluentui/react-icons";
import {useMsal} from "@azure/msal-react";

import styles from "./Playground.module.css";
import {
    chatApi,
    ChatAppRequest,
    ChatAppRequestOverrides,
    ChatAppResponse,
    ChatAppResponseOrError,
    configApi,
    RetrievalMode
} from "../../api";
import {VectorSettings} from "../../components/VectorSettings";
import {PlaygroundInfoDialog} from "./PlaygroundInfoDialog";
import {QuestionInput} from "../../components/QuestionInput";
import {Answer} from "../../components/Answer";
import {getToken, useLogin} from "../../authConfig";
import {LoginContext} from "../../loginContext";

/**
 * Parameter card component for displaying individual settings with explanations.
 */
interface ParameterCardProps {
    title: string;
    description: string;
    children: React.ReactNode;
    icon?: string;
}

const ParameterCard: React.FC<ParameterCardProps> = ({title, description, children, icon}) => {
    return (
        <div className={styles.parameterCard}>
            <div className={styles.parameterHeader}>
                {icon && <Icon iconName={icon} className={styles.parameterIcon}/>}
                <h3 className={styles.parameterTitle}>{title}</h3>
                <TooltipHost content={description}>
                    <Info16Regular className={styles.infoIcon}/>
                </TooltipHost>
            </div>
            <p className={styles.parameterDescription}>{description}</p>
            <div className={styles.parameterControl}>
                {children}
            </div>
        </div>
    );
};

/**
 * Helper function to read NDJSON stream from the API response.
 */
async function* readNDJSONStream(reader: ReadableStream<any>) {
    const textDecoder = new TextDecoder();
    const streamReader = reader.getReader();
    let buffer = "";

    try {
        while (true) {
            const {done, value} = await streamReader.read();
            if (done) break;

            buffer += textDecoder.decode(value, {stream: true});
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
                if (line.trim()) {
                    yield JSON.parse(line);
                }
            }
        }
        if (buffer.trim()) {
            yield JSON.parse(buffer);
        }
    } finally {
        streamReader.releaseLock();
    }
}

export function Component(): JSX.Element {
    const {t, i18n} = useTranslation();
    const navigate = useNavigate();

    // Authentication
    const client = useLogin ? useMsal().instance : undefined;
    const {loggedIn} = useContext(LoginContext);

    // Info dialog state
    const [showInfoDialog, setShowInfoDialog] = useState<boolean>(false);

    // Configuration state
    const [showMultimodalOptions, setShowMultimodalOptions] = useState<boolean>(false);
    const [showSemanticRankerOption, setShowSemanticRankerOption] = useState<boolean>(false);
    const [showQueryRewritingOption, setShowQueryRewritingOption] = useState<boolean>(false);
    const [showReasoningEffortOption, setShowReasoningEffortOption] = useState<boolean>(false);
    const [showVectorOption, setShowVectorOption] = useState<boolean>(false);
    const [showAgenticRetrievalOption, setShowAgenticRetrievalOption] = useState<boolean>(false);
    const [webSourceSupported, setWebSourceSupported] = useState<boolean>(false);
    const [sharePointSourceSupported, setSharePointSourceSupported] = useState<boolean>(false);
    const [streamingEnabled, setStreamingEnabled] = useState<boolean>(true);

    // Parameter state
    const [promptTemplate, setPromptTemplate] = useState<string>("");
    const [temperature, setTemperature] = useState<number>(0.3);
    const [seed, setSeed] = useState<number | null>(null);
    const [minimumRerankerScore, setMinimumRerankerScore] = useState<number>(1.9);
    const [minimumSearchScore, setMinimumSearchScore] = useState<number>(0);
    const [retrieveCount, setRetrieveCount] = useState<number>(3);
    const [agenticReasoningEffort, setAgenticReasoningEffort] = useState<string>("minimal");
    const [retrievalMode, setRetrievalMode] = useState<RetrievalMode>(RetrievalMode.Hybrid);
    const [useSemanticRanker, setUseSemanticRanker] = useState<boolean>(true);
    const [useQueryRewriting, setUseQueryRewriting] = useState<boolean>(false);
    const [reasoningEffort, setReasoningEffort] = useState<string>("medium");
    const [useSemanticCaptions, setUseSemanticCaptions] = useState<boolean>(false);
    const [shouldStream, setShouldStream] = useState<boolean>(true);
    const [useSuggestFollowupQuestions, setUseSuggestFollowupQuestions] = useState<boolean>(false);
    const [searchTextEmbeddings, setSearchTextEmbeddings] = useState<boolean>(true);
    const [searchImageEmbeddings, setSearchImageEmbeddings] = useState<boolean>(false);
    const [sendTextSources, setSendTextSources] = useState<boolean>(true);
    const [sendImageSources, setSendImageSources] = useState<boolean>(false);
    const [useAgenticKnowledgeBase, setUseAgenticKnowledgeBase] = useState<boolean>(false);
    const [useWebSource, setUseWebSource] = useState<boolean>(false);
    const [useSharePointSource, setUseSharePointSource] = useState<boolean>(false);
    const [includeCategory, setIncludeCategory] = useState<string>("");
    const [excludeCategory, setExcludeCategory] = useState<string>("");

    // High Priority parameters
    const [maxResponseTokens, setMaxResponseTokens] = useState<number>(1024);
    const [frequencyPenalty, setFrequencyPenalty] = useState<number>(0);
    const [presencePenalty, setPresencePenalty] = useState<number>(0);

    // Medium Priority parameters
    const [topP, setTopP] = useState<number>(1.0);
    const [vectorK, setVectorK] = useState<number>(50);

    // Lower Priority parameters
    const [useQueryAnswer, setUseQueryAnswer] = useState<boolean>(false);
    const [stopSequences, setStopSequences] = useState<string>("");

    // Chat state for API integration
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isStreaming, setIsStreaming] = useState<boolean>(false);
    const [error, setError] = useState<Error | null>(null);
    const [answer, setAnswer] = useState<ChatAppResponse | null>(null);
    const [streamedAnswer, setStreamedAnswer] = useState<ChatAppResponse | null>(null);
    const [lastQuestion, setLastQuestion] = useState<string>("");

    // Debug panel state
    const [showDebugPanel, setShowDebugPanel] = useState<boolean>(false);
    const [lastOverrides, setLastOverrides] = useState<ChatAppRequestOverrides | null>(null);

    // Dummy speech config for Answer component (not used in playground)
    const dummySpeechConfig = {
        speechUrls: [],
        setSpeechUrls: () => {
        },
        audio: useRef(new Audio()).current,
        isPlaying: false,
        setIsPlaying: () => {
        }
    };

    // Load configuration on mount
    useEffect(() => {
        configApi().then(config => {
            setShowMultimodalOptions(config.showMultimodalOptions);
            if (config.showMultimodalOptions) {
                setSendTextSources(config.ragSendTextSources !== undefined ? config.ragSendTextSources : true);
                setSendImageSources(config.ragSendImageSources);
                setSearchTextEmbeddings(config.ragSearchTextEmbeddings);
                setSearchImageEmbeddings(config.ragSearchImageEmbeddings);
            }
            setUseSemanticRanker(config.showSemanticRankerOption);
            setShowSemanticRankerOption(config.showSemanticRankerOption);
            setUseQueryRewriting(config.showQueryRewritingOption);
            setShowQueryRewritingOption(config.showQueryRewritingOption);
            setShowReasoningEffortOption(config.showReasoningEffortOption);
            setStreamingEnabled(config.streamingEnabled);
            if (config.showReasoningEffortOption) {
                setReasoningEffort(config.defaultReasoningEffort);
            }
            setShowVectorOption(config.showVectorOption);
            if (!config.showVectorOption) {
                setRetrievalMode(RetrievalMode.Text);
            }
            setShowAgenticRetrievalOption(config.showAgenticRetrievalOption);
            setUseAgenticKnowledgeBase(config.showAgenticRetrievalOption);
            setWebSourceSupported(config.webSourceEnabled);
            setUseWebSource(config.webSourceEnabled);
            setSharePointSourceSupported(config.sharepointSourceEnabled);
            setUseSharePointSource(config.sharepointSourceEnabled);
            if (config.showAgenticRetrievalOption) {
                setRetrieveCount(10);
            }
            const defaultRetrievalEffort = config.defaultRetrievalReasoningEffort ?? "minimal";
            setAgenticReasoningEffort(defaultRetrievalEffort);
        });
    }, []);

    const retrievalReasoningOptions: IDropdownOption[] = [
        {key: "minimal", text: t("labels.agenticReasoningEffortOptions.minimal")},
        {key: "low", text: t("labels.agenticReasoningEffortOptions.low")},
        {key: "medium", text: t("labels.agenticReasoningEffortOptions.medium")}
    ];

    const reasoningEffortOptions: IDropdownOption[] = [
        {key: "minimal", text: t("labels.reasoningEffortOptions.minimal")},
        {key: "low", text: t("labels.reasoningEffortOptions.low")},
        {key: "medium", text: t("labels.reasoningEffortOptions.medium")},
        {key: "high", text: t("labels.reasoningEffortOptions.high")}
    ];

    /**
     * Build the overrides object from current state.
     * This is used both for the API request and for the debug panel.
     */
    const buildOverrides = (): ChatAppRequestOverrides => {
        return {
            prompt_template: promptTemplate.length === 0 ? undefined : promptTemplate,
            include_category: includeCategory.length === 0 ? undefined : includeCategory,
            exclude_category: excludeCategory.length === 0 ? undefined : excludeCategory,
            top: retrieveCount,
            ...(useAgenticKnowledgeBase ? {retrieval_reasoning_effort: agenticReasoningEffort} : {}),
            temperature: temperature,
            minimum_reranker_score: minimumRerankerScore,
            minimum_search_score: minimumSearchScore,
            retrieval_mode: retrievalMode,
            semantic_ranker: useSemanticRanker,
            semantic_captions: useSemanticCaptions,
            query_rewriting: useQueryRewriting,
            query_answer: useQueryAnswer,
            reasoning_effort: reasoningEffort,
            suggest_followup_questions: useSuggestFollowupQuestions,
            search_text_embeddings: searchTextEmbeddings,
            search_image_embeddings: searchImageEmbeddings,
            send_text_sources: sendTextSources,
            send_image_sources: sendImageSources,
            language: i18n.language,
            use_agentic_knowledgebase: useAgenticKnowledgeBase,
            use_web_source: webSourceSupported ? useWebSource : false,
            use_sharepoint_source: sharePointSourceSupported ? useSharePointSource : false,
            // Additional LLM parameters
            max_response_tokens: maxResponseTokens,
            frequency_penalty: frequencyPenalty,
            presence_penalty: presencePenalty,
            top_p: topP,
            // Additional retrieval parameters
            vector_k: vectorK,
            ...(stopSequences.length > 0 ? {stop_sequences: stopSequences.split(",").map(s => s.trim())} : {}),
            ...(seed !== null ? {seed: seed} : {})
        };
    };

    /**
     * Handle streaming response from the API.
     */
    const handleAsyncRequest = async (question: string, responseBody: ReadableStream<any>): Promise<ChatAppResponse> => {
        let answerContent: string = "";
        let askResponse: ChatAppResponse = {} as ChatAppResponse;

        const updateState = (newContent: string) => {
            return new Promise(resolve => {
                setTimeout(() => {
                    answerContent += newContent;
                    const latestResponse: ChatAppResponse = {
                        ...askResponse,
                        message: {content: answerContent, role: askResponse.message.role}
                    };
                    setStreamedAnswer(latestResponse);
                    resolve(null);
                }, 33);
            });
        };

        try {
            setIsStreaming(true);
            for await (const event of readNDJSONStream(responseBody)) {
                if (event["context"] && event["context"]["data_points"]) {
                    event["message"] = event["delta"];
                    askResponse = event as ChatAppResponse;
                } else if (event["delta"] && event["delta"]["content"]) {
                    setIsLoading(false);
                    await updateState(event["delta"]["content"]);
                } else if (event["context"]) {
                    askResponse.context = {...askResponse.context, ...event["context"]};
                } else if (event["error"]) {
                    throw Error(event["error"]);
                }
            }
        } finally {
            setIsStreaming(false);
        }

        return {
            ...askResponse,
            message: {content: answerContent, role: askResponse.message.role}
        };
    };

    /**
     * Make API request with current parameters.
     */
    const makeApiRequest = async (question: string) => {
        setLastQuestion(question);
        error && setError(null);
        setIsLoading(true);
        setAnswer(null);
        setStreamedAnswer(null);

        const token = client ? await getToken(client) : undefined;
        const overrides = buildOverrides();
        setLastOverrides(overrides);

        try {
            const request: ChatAppRequest = {
                messages: [{content: question, role: "user"}],
                context: {overrides},
                session_state: null
            };

            const response = await chatApi(request, shouldStream, token);
            if (!response.body) {
                throw Error("No response body");
            }
            if (response.status > 299 || !response.ok) {
                throw Error(`Request failed with status ${response.status}`);
            }

            if (shouldStream) {
                const parsedResponse = await handleAsyncRequest(question, response.body);
                setAnswer(parsedResponse);
            } else {
                const parsedResponse: ChatAppResponseOrError = await response.json();
                if (parsedResponse.error) {
                    throw Error(parsedResponse.error);
                }
                setAnswer(parsedResponse as ChatAppResponse);
            }
        } catch (e) {
            setError(e instanceof Error ? e : new Error(String(e)));
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * Clear the current answer and reset state.
     */
    const clearAnswer = () => {
        setAnswer(null);
        setStreamedAnswer(null);
        setLastQuestion("");
        setError(null);
        setLastOverrides(null);
    };

    // Get the current answer to display (streamed or final)
    const displayAnswer = streamedAnswer || answer;

    return (
        <div className={styles.container}>
            <Helmet>
                <title>{t("playground.title")} - Keiko</title>
            </Helmet>

            <div className={styles.header}>
                <div className={styles.headerLeft}>
                    <h1 className={styles.title}>{t("playground.title")}</h1>
                    <p className={styles.subtitle}>{t("playground.subtitle")}</p>
                </div>
                <div className={styles.headerActions}>
                    <button
                        className={styles.infoButton}
                        onClick={() => setShowInfoDialog(true)}
                        title={t("playground.explainFunction")}
                    >
                        <Info24Regular/>
                        {t("playground.explainFunction")}
                    </button>
                    <button className={styles.backButton} onClick={() => navigate("/")}>
                        <Icon iconName="Back"/>
                        {t("playground.backToChat")}
                    </button>
                </div>
            </div>

            <div className={styles.content}>
                {/* Response Settings Section */}
                <section className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <Icon iconName="Chat" className={styles.sectionIcon}/>
                        <h2 className={styles.sectionTitle}>{t("playground.sections.response")}</h2>
                    </div>
                    <div className={styles.sectionDescription}>
                        {t("playground.sections.responseDescription")}
                    </div>
                    <div className={styles.parameterGrid}>
                        {streamingEnabled && (
                            <ParameterCard
                                title={t("labels.shouldStream")}
                                description={t("playground.explanations.streaming")}
                                icon="Play"
                            >
                                <Toggle
                                    checked={shouldStream}
                                    onChange={(_, checked) => setShouldStream(!!checked)}
                                    onText={t("playground.enabled")}
                                    offText={t("playground.disabled")}
                                />
                            </ParameterCard>
                        )}

                        <ParameterCard
                            title={t("labels.useSuggestFollowupQuestions")}
                            description={t("playground.explanations.followupQuestions")}
                            icon="QuestionCircle"
                        >
                            <Toggle
                                checked={useSuggestFollowupQuestions}
                                onChange={(_, checked) => setUseSuggestFollowupQuestions(!!checked)}
                                onText={t("playground.enabled")}
                                offText={t("playground.disabled")}
                            />
                        </ParameterCard>
                    </div>
                </section>

                {/* Search Settings Section */}
                <section className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <Icon iconName="Search" className={styles.sectionIcon}/>
                        <h2 className={styles.sectionTitle}>{t("playground.sections.search")}</h2>
                    </div>
                    <div className={styles.sectionDescription}>
                        {t("playground.sections.searchDescription")}
                    </div>
                    <div className={styles.parameterGrid}>
                        {showAgenticRetrievalOption && (
                            <ParameterCard
                                title={t("labels.useAgenticKnowledgeBase")}
                                description={t("playground.explanations.agenticRetrieval")}
                                icon="Robot"
                            >
                                <Toggle
                                    checked={useAgenticKnowledgeBase}
                                    onChange={(_, checked) => setUseAgenticKnowledgeBase(!!checked)}
                                    onText={t("playground.enabled")}
                                    offText={t("playground.disabled")}
                                />
                            </ParameterCard>
                        )}

                        {showAgenticRetrievalOption && useAgenticKnowledgeBase && (
                            <ParameterCard
                                title={t("labels.agenticReasoningEffort")}
                                description={t("playground.explanations.agenticReasoningEffort")}
                                icon="Brain"
                            >
                                <Dropdown
                                    selectedKey={agenticReasoningEffort}
                                    options={retrievalReasoningOptions}
                                    onChange={(_, option) => setAgenticReasoningEffort(option?.key?.toString() ?? "minimal")}
                                    className={styles.dropdown}
                                />
                            </ParameterCard>
                        )}

                        {showAgenticRetrievalOption && useAgenticKnowledgeBase && webSourceSupported && (
                            <ParameterCard
                                title={t("labels.useWebSource")}
                                description={t("playground.explanations.webSource")}
                                icon="Globe"
                            >
                                <Toggle
                                    checked={useWebSource}
                                    onChange={(_, checked) => setUseWebSource(!!checked)}
                                    disabled={agenticReasoningEffort === "minimal"}
                                    onText={t("playground.enabled")}
                                    offText={t("playground.disabled")}
                                />
                            </ParameterCard>
                        )}

                        {showAgenticRetrievalOption && useAgenticKnowledgeBase && sharePointSourceSupported && (
                            <ParameterCard
                                title={t("labels.useSharePointSource")}
                                description={t("playground.explanations.sharePointSource")}
                                icon="SharepointLogo"
                            >
                                <Toggle
                                    checked={useSharePointSource}
                                    onChange={(_, checked) => setUseSharePointSource(!!checked)}
                                    onText={t("playground.enabled")}
                                    offText={t("playground.disabled")}
                                />
                            </ParameterCard>
                        )}

                        {!useAgenticKnowledgeBase && (
                            <>
                                <ParameterCard
                                    title={t("labels.minimumSearchScore")}
                                    description={t("playground.explanations.searchScore")}
                                    icon="Filter"
                                >
                                    <Slider
                                        min={0}
                                        max={1}
                                        step={0.01}
                                        value={minimumSearchScore}
                                        onChange={setMinimumSearchScore}
                                        showValue
                                        valueFormat={(value) => value.toFixed(2)}
                                    />
                                </ParameterCard>

                                <ParameterCard
                                    title={t("labels.retrieveCount")}
                                    description={t("playground.explanations.retrieveCount")}
                                    icon="NumberField"
                                >
                                    <Slider
                                        min={1}
                                        max={50}
                                        step={1}
                                        value={retrieveCount}
                                        onChange={setRetrieveCount}
                                        showValue
                                    />
                                </ParameterCard>
                            </>
                        )}

                        {showSemanticRankerOption && (
                            <ParameterCard
                                title={t("labels.minimumRerankerScore")}
                                description={t("playground.explanations.rerankerScore")}
                                icon="SortLines"
                            >
                                <Slider
                                    min={1}
                                    max={4}
                                    step={0.1}
                                    value={minimumRerankerScore}
                                    onChange={setMinimumRerankerScore}
                                    showValue
                                    valueFormat={(value) => value.toFixed(1)}
                                />
                            </ParameterCard>
                        )}

                        {showSemanticRankerOption && !useAgenticKnowledgeBase && (
                            <>
                                <ParameterCard
                                    title={t("labels.useSemanticRanker")}
                                    description={t("playground.explanations.semanticRanker")}
                                    icon="Ranking"
                                >
                                    <Toggle
                                        checked={useSemanticRanker}
                                        onChange={(_, checked) => setUseSemanticRanker(!!checked)}
                                        onText={t("playground.enabled")}
                                        offText={t("playground.disabled")}
                                    />
                                </ParameterCard>

                                <ParameterCard
                                    title={t("labels.useSemanticCaptions")}
                                    description={t("playground.explanations.semanticCaptions")}
                                    icon="TextDocument"
                                >
                                    <Toggle
                                        checked={useSemanticCaptions}
                                        onChange={(_, checked) => setUseSemanticCaptions(!!checked)}
                                        disabled={!useSemanticRanker}
                                        onText={t("playground.enabled")}
                                        offText={t("playground.disabled")}
                                    />
                                </ParameterCard>

                                <ParameterCard
                                    title={t("labels.useQueryAnswer")}
                                    description={t("playground.explanations.queryAnswer")}
                                    icon="TextDocument"
                                >
                                    <Toggle
                                        checked={useQueryAnswer}
                                        onChange={(_, checked) => setUseQueryAnswer(!!checked)}
                                        disabled={!useSemanticRanker}
                                        onText={t("playground.enabled")}
                                        offText={t("playground.disabled")}
                                    />
                                </ParameterCard>
                            </>
                        )}

                        {showVectorOption && !useAgenticKnowledgeBase && (
                            <ParameterCard
                                title={t("labels.vectorK")}
                                description={t("playground.explanations.vectorK")}
                                icon="NumberField"
                            >
                                <Slider
                                    min={10}
                                    max={100}
                                    step={5}
                                    value={vectorK}
                                    onChange={setVectorK}
                                    showValue
                                />
                            </ParameterCard>
                        )}

                        {showQueryRewritingOption && !useAgenticKnowledgeBase && (
                            <ParameterCard
                                title={t("labels.useQueryRewriting")}
                                description={t("playground.explanations.queryRewriting")}
                                icon="Edit"
                            >
                                <Toggle
                                    checked={useQueryRewriting}
                                    onChange={(_, checked) => setUseQueryRewriting(!!checked)}
                                    disabled={!useSemanticRanker}
                                    onText={t("playground.enabled")}
                                    offText={t("playground.disabled")}
                                />
                            </ParameterCard>
                        )}

                        {showVectorOption && !useAgenticKnowledgeBase && (
                            <ParameterCard
                                title={t("labels.retrievalMode.label")}
                                description={t("playground.explanations.retrievalMode")}
                                icon="VectorLogoAzure"
                            >
                                <VectorSettings
                                    defaultRetrievalMode={retrievalMode}
                                    defaultSearchTextEmbeddings={searchTextEmbeddings}
                                    defaultSearchImageEmbeddings={searchImageEmbeddings}
                                    showImageOptions={showMultimodalOptions}
                                    updateRetrievalMode={setRetrievalMode}
                                    updateSearchTextEmbeddings={setSearchTextEmbeddings}
                                    updateSearchImageEmbeddings={setSearchImageEmbeddings}
                                />
                            </ParameterCard>
                        )}

                        <ParameterCard
                            title={t("labels.includeCategory")}
                            description={t("playground.explanations.includeCategory")}
                            icon="Tag"
                        >
                            <Dropdown
                                selectedKey={includeCategory}
                                options={[{key: "", text: t("labels.includeCategoryOptions.all")}]}
                                onChange={(_, option) => setIncludeCategory(option?.key?.toString() ?? "")}
                                className={styles.dropdown}
                            />
                        </ParameterCard>

                        <ParameterCard
                            title={t("labels.excludeCategory")}
                            description={t("playground.explanations.excludeCategory")}
                            icon="Cancel"
                        >
                            <TextField
                                value={excludeCategory}
                                onChange={(_, val) => setExcludeCategory(val || "")}
                                placeholder={t("playground.placeholders.excludeCategory")}
                            />
                        </ParameterCard>
                    </div>
                </section>

                {/* LLM Settings Section */}
                {!useWebSource && (
                    <section className={styles.section}>
                        <div className={styles.sectionHeader}>
                            <Icon iconName="MachineLearning" className={styles.sectionIcon}/>
                            <h2 className={styles.sectionTitle}>{t("playground.sections.llm")}</h2>
                        </div>
                        <div className={styles.sectionDescription}>
                            {t("playground.sections.llmDescription")}
                        </div>
                        <div className={styles.parameterGrid}>
                            <ParameterCard
                                title={t("labels.temperature")}
                                description={t("playground.explanations.temperature")}
                                icon="Frigid"
                            >
                                <Slider
                                    min={0}
                                    max={1}
                                    step={0.1}
                                    value={temperature}
                                    onChange={setTemperature}
                                    showValue
                                    valueFormat={(value) => value.toFixed(1)}
                                />
                                <div className={styles.sliderLabels}>
                                    <span>{t("playground.temperatureLabels.precise")}</span>
                                    <span>{t("playground.temperatureLabels.creative")}</span>
                                </div>
                            </ParameterCard>

                            <ParameterCard
                                title={t("labels.seed")}
                                description={t("playground.explanations.seed")}
                                icon="NumberSymbol"
                            >
                                <TextField
                                    type="number"
                                    value={seed?.toString() || ""}
                                    onChange={(_, val) => setSeed(val ? parseInt(val) : null)}
                                    placeholder={t("playground.placeholders.seed")}
                                />
                            </ParameterCard>

                            <ParameterCard
                                title={t("labels.maxResponseTokens")}
                                description={t("playground.explanations.maxResponseTokens")}
                                icon="NumberField"
                            >
                                <Slider
                                    min={100}
                                    max={4096}
                                    step={100}
                                    value={maxResponseTokens}
                                    onChange={setMaxResponseTokens}
                                    showValue
                                />
                            </ParameterCard>

                            <ParameterCard
                                title={t("labels.topP")}
                                description={t("playground.explanations.topP")}
                                icon="Filter"
                            >
                                <Slider
                                    min={0}
                                    max={1}
                                    step={0.05}
                                    value={topP}
                                    onChange={setTopP}
                                    showValue
                                    valueFormat={(value) => value.toFixed(2)}
                                />
                                <div className={styles.sliderLabels}>
                                    <span>{t("playground.topPLabels.focused")}</span>
                                    <span>{t("playground.topPLabels.diverse")}</span>
                                </div>
                            </ParameterCard>

                            <ParameterCard
                                title={t("labels.frequencyPenalty")}
                                description={t("playground.explanations.frequencyPenalty")}
                                icon="Refresh"
                            >
                                <Slider
                                    min={-2}
                                    max={2}
                                    step={0.1}
                                    value={frequencyPenalty}
                                    onChange={setFrequencyPenalty}
                                    showValue
                                    valueFormat={(value) => value.toFixed(1)}
                                />
                                <div className={styles.sliderLabels}>
                                    <span>{t("playground.penaltyLabels.allowRepetition")}</span>
                                    <span>{t("playground.penaltyLabels.reduceRepetition")}</span>
                                </div>
                            </ParameterCard>

                            <ParameterCard
                                title={t("labels.presencePenalty")}
                                description={t("playground.explanations.presencePenalty")}
                                icon="Add"
                            >
                                <Slider
                                    min={-2}
                                    max={2}
                                    step={0.1}
                                    value={presencePenalty}
                                    onChange={setPresencePenalty}
                                    showValue
                                    valueFormat={(value) => value.toFixed(1)}
                                />
                                <div className={styles.sliderLabels}>
                                    <span>{t("playground.penaltyLabels.stayOnTopic")}</span>
                                    <span>{t("playground.penaltyLabels.exploreTopics")}</span>
                                </div>
                            </ParameterCard>

                            <ParameterCard
                                title={t("labels.stopSequences")}
                                description={t("playground.explanations.stopSequences")}
                                icon="Stop"
                            >
                                <TextField
                                    value={stopSequences}
                                    onChange={(_, val) => setStopSequences(val || "")}
                                    placeholder={t("playground.placeholders.stopSequences")}
                                />
                            </ParameterCard>

                            {showReasoningEffortOption && (
                                <ParameterCard
                                    title={t("labels.reasoningEffort")}
                                    description={t("playground.explanations.reasoningEffort")}
                                    icon="Brain"
                                >
                                    <Dropdown
                                        selectedKey={reasoningEffort}
                                        options={reasoningEffortOptions}
                                        onChange={(_, option) => setReasoningEffort(option?.key?.toString() ?? "medium")}
                                        className={styles.dropdown}
                                    />
                                </ParameterCard>
                            )}

                            <ParameterCard
                                title={t("labels.promptTemplate")}
                                description={t("playground.explanations.promptTemplate")}
                                icon="TextDocument"
                            >
                                <TextField
                                    multiline
                                    rows={4}
                                    value={promptTemplate}
                                    onChange={(_, val) => setPromptTemplate(val || "")}
                                    placeholder={t("playground.placeholders.promptTemplate")}
                                    className={styles.textArea}
                                />
                            </ParameterCard>

                            {showMultimodalOptions && !useAgenticKnowledgeBase && (
                                <>
                                    <ParameterCard
                                        title={t("labels.llmInputsOptions.texts")}
                                        description={t("playground.explanations.textSources")}
                                        icon="TextDocument"
                                    >
                                        <Toggle
                                            checked={sendTextSources}
                                            onChange={(_, checked) => setSendTextSources(!!checked)}
                                            onText={t("playground.enabled")}
                                            offText={t("playground.disabled")}
                                        />
                                    </ParameterCard>

                                    <ParameterCard
                                        title={t("labels.llmInputsOptions.images")}
                                        description={t("playground.explanations.imageSources")}
                                        icon="Photo2"
                                    >
                                        <Toggle
                                            checked={sendImageSources}
                                            onChange={(_, checked) => setSendImageSources(!!checked)}
                                            onText={t("playground.enabled")}
                                            offText={t("playground.disabled")}
                                        />
                                    </ParameterCard>
                                </>
                            )}
                        </div>
                    </section>
                )}

                {/* Test Interface Section */}
                <section className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <Icon iconName="TestBeaker" className={styles.sectionIcon}/>
                        <h2 className={styles.sectionTitle}>{t("playground.sections.testInterface")}</h2>
                    </div>
                    <div className={styles.sectionDescription}>
                        {t("playground.sections.testInterfaceDescription")}
                    </div>

                    {/* Question Input */}
                    <div className={styles.testInputContainer}>
                        <QuestionInput
                            onSend={makeApiRequest}
                            disabled={isLoading}
                            placeholder={t("playground.testPlaceholder")}
                            clearOnSend={false}
                        />
                        {lastQuestion && (
                            <button
                                className={styles.clearButton}
                                onClick={clearAnswer}
                                disabled={isLoading}
                            >
                                <Icon iconName="Clear"/>
                                {t("playground.clearAnswer")}
                            </button>
                        )}
                    </div>

                    {/* Answer Display */}
                    <div className={styles.answerContainer}>
                        {isLoading && !streamedAnswer && (
                            <div className={styles.loadingContainer}>
                                <Spinner size={SpinnerSize.large} label={t("playground.loading")}/>
                            </div>
                        )}

                        {error && (
                            <MessageBar messageBarType={MessageBarType.error} isMultiline={true}>
                                {t("playground.error")}: {error.message}
                            </MessageBar>
                        )}

                        {displayAnswer && (
                            <Answer
                                answer={displayAnswer}
                                index={0}
                                speechConfig={dummySpeechConfig}
                                isSelected={false}
                                isStreaming={isStreaming}
                                onCitationClicked={() => {
                                }}
                                onThoughtProcessClicked={() => {
                                }}
                                onSupportingContentClicked={() => {
                                }}
                                showFollowupQuestions={false}
                            />
                        )}
                    </div>

                    {/* Debug Panel */}
                    <div className={styles.debugPanel}>
                        <button
                            className={styles.debugToggle}
                            onClick={() => setShowDebugPanel(!showDebugPanel)}
                        >
                            {showDebugPanel ? <ChevronUp24Regular/> : <ChevronDown24Regular/>}
                            {t("playground.debugPanel.title")}
                        </button>

                        {showDebugPanel && (
                            <div className={styles.debugContent}>
                                <div className={styles.debugSection}>
                                    <h4>{t("playground.debugPanel.overrides")}</h4>
                                    <pre className={styles.debugJson}>
                                        {lastOverrides
                                            ? JSON.stringify(lastOverrides, null, 2)
                                            : t("playground.debugPanel.noRequest")}
                                    </pre>
                                </div>
                                <div className={styles.debugSection}>
                                    <h4>{t("playground.debugPanel.response")}</h4>
                                    <pre className={styles.debugJson}>
                                        {displayAnswer
                                            ? JSON.stringify({
                                                message: displayAnswer.message,
                                                context: {
                                                    thoughts: displayAnswer.context?.thoughts,
                                                    data_points_count: {
                                                        text: displayAnswer.context?.data_points?.text?.length || 0,
                                                        images: displayAnswer.context?.data_points?.images?.length || 0,
                                                        citations: displayAnswer.context?.data_points?.citations?.length || 0
                                                    },
                                                    followup_questions: displayAnswer.context?.followup_questions
                                                }
                                            }, null, 2)
                                            : t("playground.debugPanel.noResponse")}
                                    </pre>
                                </div>
                            </div>
                        )}
                    </div>
                </section>
            </div>

            {/* Info Dialog */}
            {showInfoDialog && (
                <PlaygroundInfoDialog onClose={() => setShowInfoDialog(false)}/>
            )}
        </div>
    );
}

Component.displayName = "Playground";

