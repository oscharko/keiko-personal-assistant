/**
 * Playground page component for RAG system parameter experimentation.
 * Provides a standalone, user-friendly interface for configuring and
 * understanding RAG (Retrieval-Augmented Generation) system parameters.
 */
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon, Slider, Toggle, Dropdown, IDropdownOption, TextField, TooltipHost } from "@fluentui/react";
import { useTranslation } from "react-i18next";
import { Helmet } from "react-helmet-async";
import { Info16Regular } from "@fluentui/react-icons";

import styles from "./Playground.module.css";
import { configApi, RetrievalMode } from "../../api";
import { VectorSettings } from "../../components/VectorSettings";

/**
 * Parameter card component for displaying individual settings with explanations.
 */
interface ParameterCardProps {
    title: string;
    description: string;
    children: React.ReactNode;
    icon?: string;
}

const ParameterCard: React.FC<ParameterCardProps> = ({ title, description, children, icon }) => {
    return (
        <div className={styles.parameterCard}>
            <div className={styles.parameterHeader}>
                {icon && <Icon iconName={icon} className={styles.parameterIcon} />}
                <h3 className={styles.parameterTitle}>{title}</h3>
                <TooltipHost content={description}>
                    <Info16Regular className={styles.infoIcon} />
                </TooltipHost>
            </div>
            <p className={styles.parameterDescription}>{description}</p>
            <div className={styles.parameterControl}>
                {children}
            </div>
        </div>
    );
};

export function Component(): JSX.Element {
    const { t } = useTranslation();
    const navigate = useNavigate();

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
    const [promptTemplatePrefix, setPromptTemplatePrefix] = useState<string>("");
    const [promptTemplateSuffix, setPromptTemplateSuffix] = useState<string>("");
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
    const [maxHistoryMessages, setMaxHistoryMessages] = useState<number>(10);
    const [useQueryAnswer, setUseQueryAnswer] = useState<boolean>(false);
    const [stopSequences, setStopSequences] = useState<string>("");

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
        { key: "minimal", text: t("labels.agenticReasoningEffortOptions.minimal") },
        { key: "low", text: t("labels.agenticReasoningEffortOptions.low") },
        { key: "medium", text: t("labels.agenticReasoningEffortOptions.medium") }
    ];

    const reasoningEffortOptions: IDropdownOption[] = [
        { key: "minimal", text: t("labels.reasoningEffortOptions.minimal") },
        { key: "low", text: t("labels.reasoningEffortOptions.low") },
        { key: "medium", text: t("labels.reasoningEffortOptions.medium") },
        { key: "high", text: t("labels.reasoningEffortOptions.high") }
    ];

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
                <button className={styles.backButton} onClick={() => navigate("/")}>
                    <Icon iconName="Back" />
                    {t("playground.backToChat")}
                </button>
            </div>

            <div className={styles.content}>
                {/* Response Settings Section */}
                <section className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <Icon iconName="Chat" className={styles.sectionIcon} />
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
                        <Icon iconName="Search" className={styles.sectionIcon} />
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
                                options={[{ key: "", text: t("labels.includeCategoryOptions.all") }]}
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
                            <Icon iconName="MachineLearning" className={styles.sectionIcon} />
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
                                title={t("labels.maxHistoryMessages")}
                                description={t("playground.explanations.maxHistoryMessages")}
                                icon="History"
                            >
                                <Slider
                                    min={0}
                                    max={20}
                                    step={1}
                                    value={maxHistoryMessages}
                                    onChange={setMaxHistoryMessages}
                                    showValue
                                />
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

                            <ParameterCard
                                title={t("labels.promptTemplatePrefix")}
                                description={t("playground.explanations.promptTemplatePrefix")}
                                icon="TextDocument"
                            >
                                <TextField
                                    multiline
                                    rows={3}
                                    value={promptTemplatePrefix}
                                    onChange={(_, val) => setPromptTemplatePrefix(val || "")}
                                    placeholder={t("playground.placeholders.promptTemplatePrefix")}
                                    className={styles.textArea}
                                />
                            </ParameterCard>

                            <ParameterCard
                                title={t("labels.promptTemplateSuffix")}
                                description={t("playground.explanations.promptTemplateSuffix")}
                                icon="TextDocument"
                            >
                                <TextField
                                    multiline
                                    rows={3}
                                    value={promptTemplateSuffix}
                                    onChange={(_, val) => setPromptTemplateSuffix(val || "")}
                                    placeholder={t("playground.placeholders.promptTemplateSuffix")}
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

                {/* Info Banner */}
                <div className={styles.infoBanner}>
                    <Icon iconName="Info" className={styles.infoBannerIcon} />
                    <div className={styles.infoBannerContent}>
                        <h3>{t("playground.info.title")}</h3>
                        <p>{t("playground.info.description")}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

Component.displayName = "Playground";

