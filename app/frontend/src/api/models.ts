export const enum RetrievalMode {
    Hybrid = "hybrid",
    Vectors = "vectors",
    Text = "text"
}

export type ChatAppRequestOverrides = {
    retrieval_mode?: RetrievalMode;
    semantic_ranker?: boolean;
    semantic_captions?: boolean;
    query_rewriting?: boolean;
    query_answer?: boolean;
    reasoning_effort?: string;
    include_category?: string;
    exclude_category?: string;
    seed?: number;
    top?: number;
    retrieval_reasoning_effort?: string;
    temperature?: number;
    minimum_search_score?: number;
    minimum_reranker_score?: number;
    prompt_template?: string;
    suggest_followup_questions?: boolean;
    send_text_sources: boolean;
    send_image_sources: boolean;
    search_text_embeddings: boolean;
    search_image_embeddings: boolean;
    language: string;
    use_agentic_knowledgebase: boolean;
    use_web_source?: boolean;
    use_sharepoint_source?: boolean;
    // LLM parameters
    max_response_tokens?: number;
    frequency_penalty?: number;
    presence_penalty?: number;
    top_p?: number;
    stop_sequences?: string[];
    // Retrieval parameters
    vector_k?: number;
};

export type ResponseMessage = {
    content: string;
    role: string;
};

export type Thoughts = {
    title: string;
    description: any; // It can be any output from the api
    props?: { [key: string]: any };
};

export type ActivityDetail = {
    id?: number;
    number?: number;
    type?: string;
    label?: string;
    source?: string;
    query?: string;
};

export type ExternalResultMetadata = {
    id?: string;
    title?: string;
    url?: string;
    snippet?: string;
    activity?: ActivityDetail;
};

export type CitationActivityDetail = {
    id?: string;
    number?: number;
    type?: string;
    source?: string;
    query?: string;
};

export type DataPoints = {
    text: string[];
    images: string[];
    citations: string[];
    citation_activity_details?: Record<string, CitationActivityDetail>;
    external_results_metadata?: ExternalResultMetadata[];
};

export type ResponseContext = {
    data_points: DataPoints;
    followup_questions: string[] | null;
    thoughts: Thoughts[];
    answer?: string;
};

export type ChatAppResponseOrError = {
    message: ResponseMessage;
    delta: ResponseMessage;
    context: ResponseContext;
    session_state: any;
    error?: string;
};

export type ChatAppResponse = {
    message: ResponseMessage;
    delta: ResponseMessage;
    context: ResponseContext;
    session_state: any;
};

export type ChatAppRequestContext = {
    overrides?: ChatAppRequestOverrides;
};

export type ChatAppRequest = {
    messages: ResponseMessage[];
    context?: ChatAppRequestContext;
    session_state: any;
};

export type Config = {
    defaultReasoningEffort: string;
    defaultRetrievalReasoningEffort: string;
    showMultimodalOptions: boolean;
    showSemanticRankerOption: boolean;
    showQueryRewritingOption: boolean;
    showReasoningEffortOption: boolean;
    streamingEnabled: boolean;
    showVectorOption: boolean;
    showUserUpload: boolean;
    showLanguagePicker: boolean;
    showSpeechInput: boolean;
    showSpeechOutputBrowser: boolean;
    showSpeechOutputAzure: boolean;
    showChatHistoryBrowser: boolean;
    showChatHistoryCosmos: boolean;
    showAgenticRetrievalOption: boolean;
    ragSearchTextEmbeddings: boolean;
    ragSearchImageEmbeddings: boolean;
    ragSendTextSources: boolean;
    ragSendImageSources: boolean;
    webSourceEnabled: boolean;
    sharepointSourceEnabled: boolean;
};

export type SimpleAPIResponse = {
    message?: string;
};

export interface SpeechConfig {
    speechUrls: (string | null)[];
    setSpeechUrls: (urls: (string | null)[]) => void;
    audio: HTMLAudioElement;
    isPlaying: boolean;
    setIsPlaying: (isPlaying: boolean) => void;
}

export type HistoryListApiResponse = {
    sessions: {
        id: string;
        entra_oid: string;
        title: string;
        timestamp: number;
    }[];
    continuation_token?: string;
};

export type HistoryApiResponse = {
    id: string;
    entra_oid: string;
    answers: any;
};

export type EnhancePromptResponse = {
    original_prompt: string;
    enhanced_prompt: string;
};

// News Dashboard Types
export type NewsCitation = {
    title: string;
    url: string;
    source?: string;
    snippet?: string;
};

export type NewsItem = {
    id: string;
    searchTerm: string;
    title: string;
    summary: string;
    imageUrl?: string;
    originalUrl?: string;
    source?: string;
    publishedAt?: number;
    citations: NewsCitation[];
    relatedTopics: string[];
};

export type NewsPreferencesResponse = {
    searchTerms: string[];
    updatedAt: number;
    maxTerms: number;
};

export type NewsSearchResult = {
    userOid: string;
    items: NewsItem[];
    searchedAt?: number;
    error?: string;
};

// Ideas Hub Types

/**
 * Status of an idea in the workflow.
 */
export const enum IdeaStatus {
    Draft = "draft",
    Submitted = "submitted",
    UnderReview = "under_review",
    Approved = "approved",
    Rejected = "rejected",
    Implemented = "implemented",
    Archived = "archived"
}

/**
 * Recommendation classification based on impact and feasibility scores.
 */
export const enum RecommendationClass {
    QuickWin = "quick_win",
    HighLeverage = "high_leverage",
    Strategic = "strategic",
    Evaluate = "evaluate",
    Unclassified = "unclassified"
}

/**
 * KPI estimates extracted from an idea.
 */
export type IdeaKPIEstimates = {
    timeSavingsHours?: number;
    costReductionEur?: number;
    qualityImprovementPercent?: number;
    employeeSatisfactionImpact?: number;
    scalabilityPotential?: number;
};

/**
 * Complete idea data model.
 */
export type Idea = {
    ideaId: string;
    title: string;
    description: string;
    problemDescription?: string;
    expectedBenefit?: string;
    affectedProcesses?: string[];
    targetUsers?: string[];
    submitterId: string;
    submitterName?: string;
    department?: string;
    status: IdeaStatus;
    createdAt: number;
    updatedAt: number;
    // LLM-generated fields
    summary?: string;
    tags?: string[];
    embedding?: number[];
    analyzedAt?: number;
    analysisVersion?: string;
    // Scoring fields (Phase 1 - Initial deterministic scores)
    impactScore?: number;
    feasibilityScore?: number;
    recommendationClass?: RecommendationClass;
    kpiEstimates?: IdeaKPIEstimates;
    // LLM Review fields (Phase 2 - Hybrid Approach)
    reviewImpactScore?: number;
    reviewFeasibilityScore?: number;
    reviewRecommendationClass?: RecommendationClass;
    reviewReasoning?: string;
    reviewedAt?: number;
    reviewedBy?: string;
    // Clustering
    clusterLabel?: string;
    // Similar ideas detected during creation
    similarIdeas?: SimilarIdea[];
};

/**
 * Request payload for creating a new idea.
 */
export type IdeaSubmission = {
    title: string;
    description: string;
    problemDescription?: string;
    expectedBenefit?: string;
    affectedProcesses?: string[];
    targetUsers?: string[];
    department?: string;
    status?: IdeaStatus;
    similarIdeas?: SimilarIdea[];
};

/**
 * Request payload for updating an existing idea.
 */
export type IdeaUpdate = {
    title?: string;
    description?: string;
    problemDescription?: string;
    expectedBenefit?: string;
    affectedProcesses?: string[];
    targetUsers?: string[];
    department?: string;
    status?: IdeaStatus;
};

/**
 * Response for listing ideas with pagination.
 */
export type IdeaListResponse = {
    ideas: Idea[];
    totalCount: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
};

/**
 * Similar idea with similarity score.
 */
export type SimilarIdea = {
    ideaId: string;
    title: string;
    summary?: string;
    similarityScore: number;
    status: string;
};

/**
 * Response for similar ideas search.
 */
export type SimilarIdeasResponse = {
    similarIdeas: SimilarIdea[];
    threshold: number;
};

/**
 * Represents a like on an idea.
 */
export type IdeaLike = {
    likeId: string;
    ideaId: string;
    userId: string;
    createdAt: number;
};

/**
 * Represents a comment on an idea.
 */
export type IdeaComment = {
    commentId: string;
    ideaId: string;
    userId: string;
    content: string;
    createdAt: number;
    updatedAt: number;
};

/**
 * Response for paginated comment list.
 */
export type IdeaCommentsResponse = {
    comments: IdeaComment[];
    totalCount: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
};

/**
 * Aggregated engagement metrics for an idea.
 */
export type IdeaEngagement = {
    ideaId: string;
    likeCount: number;
    commentCount: number;
    userHasLiked: boolean;
};

/**
 * Request payload for creating a comment.
 */
export type CommentSubmission = {
    content: string;
};

/**
 * Request payload for updating a comment.
 */
export type CommentUpdate = {
    content: string;
};
