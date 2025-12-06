const BACKEND_URI = "";

import {
    ChatAppResponse,
    ChatAppResponseOrError,
    ChatAppRequest,
    Config,
    SimpleAPIResponse,
    HistoryListApiResponse,
    HistoryApiResponse,
    EnhancePromptResponse,
    NewsPreferencesResponse,
    NewsSearchResult,
    Idea,
    IdeaSubmission,
    IdeaUpdate,
    IdeaListResponse,
    SimilarIdeasResponse,
    IdeaLike,
    IdeaComment,
    IdeaCommentsResponse,
    IdeaEngagement,
    CommentSubmission,
    CommentUpdate
} from "./models";
import { useLogin, getToken, isUsingAppServicesLogin } from "../authConfig";

export async function getHeaders(idToken: string | undefined): Promise<Record<string, string>> {
    // Check for beta auth token first
    const betaToken = localStorage.getItem("beta_auth_token");
    if (betaToken) {
        return { Authorization: `Bearer ${betaToken}` };
    }

    // If using login and not using app services, add the id token of the logged in account as the authorization
    if (useLogin && !isUsingAppServicesLogin) {
        if (idToken) {
            return { Authorization: `Bearer ${idToken}` };
        }
    }

    return {};
}

export async function configApi(): Promise<Config> {
    const response = await fetch(`${BACKEND_URI}/config`, {
        method: "GET"
    });

    return (await response.json()) as Config;
}

export async function askApi(request: ChatAppRequest, idToken: string | undefined): Promise<ChatAppResponse> {
    const headers = await getHeaders(idToken);
    const response = await fetch(`${BACKEND_URI}/ask`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify(request)
    });

    if (response.status > 299 || !response.ok) {
        throw Error(`Request failed with status ${response.status}`);
    }
    const parsedResponse: ChatAppResponseOrError = await response.json();
    if (parsedResponse.error) {
        throw Error(parsedResponse.error);
    }

    return parsedResponse as ChatAppResponse;
}

export async function chatApi(request: ChatAppRequest, shouldStream: boolean, idToken: string | undefined): Promise<Response> {
    let url = `${BACKEND_URI}/chat`;
    if (shouldStream) {
        url += "/stream";
    }
    const headers = await getHeaders(idToken);
    return await fetch(url, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify(request)
    });
}

export async function getSpeechApi(text: string): Promise<string | null> {
    return await fetch("/speech", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            text: text
        })
    })
        .then(response => {
            if (response.status == 200) {
                return response.blob();
            } else if (response.status == 400) {
                console.log("Speech synthesis is not enabled.");
                return null;
            } else {
                console.error("Unable to get speech synthesis.");
                return null;
            }
        })
        .then(blob => (blob ? URL.createObjectURL(blob) : null));
}

export function getCitationFilePath(citation: string): string {
    // If there are parentheses at end of citation, remove part in parentheses
    const cleanedCitation = citation.replace(/\s*\(.*?\)\s*$/, "").trim();
    return `${BACKEND_URI}/content/${cleanedCitation}`;
}

export async function uploadFileApi(request: FormData, idToken: string): Promise<SimpleAPIResponse> {
    const response = await fetch("/upload", {
        method: "POST",
        headers: await getHeaders(idToken),
        body: request
    });

    if (!response.ok) {
        throw new Error(`Uploading files failed: ${response.statusText}`);
    }

    const dataResponse: SimpleAPIResponse = await response.json();
    return dataResponse;
}

export async function deleteUploadedFileApi(filename: string, idToken: string): Promise<SimpleAPIResponse> {
    const headers = await getHeaders(idToken);
    const response = await fetch("/delete_uploaded", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ filename })
    });

    if (!response.ok) {
        throw new Error(`Deleting file failed: ${response.statusText}`);
    }

    const dataResponse: SimpleAPIResponse = await response.json();
    return dataResponse;
}

export async function listUploadedFilesApi(idToken: string): Promise<string[]> {
    const response = await fetch(`/list_uploaded`, {
        method: "GET",
        headers: await getHeaders(idToken)
    });

    if (!response.ok) {
        throw new Error(`Listing files failed: ${response.statusText}`);
    }

    const dataResponse: string[] = await response.json();
    return dataResponse;
}

export async function postChatHistoryApi(item: any, idToken: string): Promise<any> {
    const headers = await getHeaders(idToken);
    const response = await fetch("/chat_history", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify(item)
    });

    if (!response.ok) {
        throw new Error(`Posting chat history failed: ${response.statusText}`);
    }

    const dataResponse: any = await response.json();
    return dataResponse;
}

export async function getChatHistoryListApi(count: number, continuationToken: string | undefined, idToken: string): Promise<HistoryListApiResponse> {
    const headers = await getHeaders(idToken);
    let url = `${BACKEND_URI}/chat_history/sessions?count=${count}`;
    if (continuationToken) {
        url += `&continuationToken=${continuationToken}`;
    }

    const response = await fetch(url.toString(), {
        method: "GET",
        headers: { ...headers, "Content-Type": "application/json" }
    });

    if (!response.ok) {
        throw new Error(`Getting chat histories failed: ${response.statusText}`);
    }

    const dataResponse: HistoryListApiResponse = await response.json();
    return dataResponse;
}

export async function getChatHistoryApi(id: string, idToken: string): Promise<HistoryApiResponse> {
    const headers = await getHeaders(idToken);
    const response = await fetch(`/chat_history/sessions/${id}`, {
        method: "GET",
        headers: { ...headers, "Content-Type": "application/json" }
    });

    if (!response.ok) {
        throw new Error(`Getting chat history failed: ${response.statusText}`);
    }

    const dataResponse: HistoryApiResponse = await response.json();
    return dataResponse;
}

export async function deleteChatHistoryApi(id: string, idToken: string): Promise<any> {
    const headers = await getHeaders(idToken);
    const response = await fetch(`/chat_history/sessions/${id}`, {
        method: "DELETE",
        headers: { ...headers, "Content-Type": "application/json" }
    });

    if (!response.ok) {
        throw new Error(`Deleting chat history failed: ${response.statusText}`);
    }
}

/**
 * Enhance a user prompt using the LLM to make it more specific and effective.
 * This helps users learn how to write better prompts for AI assistants.
 */
export async function enhancePromptApi(prompt: string, idToken: string | undefined): Promise<EnhancePromptResponse> {
    const headers = await getHeaders(idToken);
    const response = await fetch(`${BACKEND_URI}/enhance_prompt`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ prompt })
    });

    if (!response.ok) {
        throw new Error(`Enhancing prompt failed: ${response.statusText}`);
    }

    const dataResponse: EnhancePromptResponse = await response.json();
    return dataResponse;
}

// News Dashboard API Functions

/**
 * Get the current user's news preferences (search terms).
 */
export async function getNewsPreferencesApi(idToken: string | undefined): Promise<NewsPreferencesResponse> {
    const headers = await getHeaders(idToken);
    const response = await fetch(`${BACKEND_URI}/api/user/news-preferences`, {
        method: "GET",
        headers: { ...headers, "Content-Type": "application/json" }
    });

    if (!response.ok) {
        throw new Error(`Getting news preferences failed: ${response.statusText}`);
    }

    return await response.json();
}

/**
 * Add a new search term to the user's news preferences.
 */
export async function addNewsSearchTermApi(term: string, idToken: string | undefined): Promise<NewsPreferencesResponse> {
    const headers = await getHeaders(idToken);
    const response = await fetch(`${BACKEND_URI}/api/user/news-preferences`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ addTerm: term })
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Adding search term failed: ${response.statusText}`);
    }

    return await response.json();
}

/**
 * Update all search terms for the user's news preferences.
 */
export async function updateNewsPreferencesApi(
    searchTerms: string[],
    idToken: string | undefined
): Promise<NewsPreferencesResponse> {
    const headers = await getHeaders(idToken);
    const response = await fetch(`${BACKEND_URI}/api/user/news-preferences`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ searchTerms })
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Updating news preferences failed: ${response.statusText}`);
    }

    return await response.json();
}

/**
 * Delete a search term from the user's news preferences.
 */
export async function deleteNewsSearchTermApi(term: string, idToken: string | undefined): Promise<NewsPreferencesResponse> {
    const headers = await getHeaders(idToken);
    const encodedTerm = encodeURIComponent(term);
    const response = await fetch(`${BACKEND_URI}/api/user/news-preferences/${encodedTerm}`, {
        method: "DELETE",
        headers: { ...headers, "Content-Type": "application/json" }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Deleting search term failed: ${response.statusText}`);
    }

    return await response.json();
}

/**
 * Refresh news for all of the user's search terms.
 */
export async function refreshNewsApi(forceRefresh: boolean, idToken: string | undefined): Promise<NewsSearchResult> {
    const headers = await getHeaders(idToken);
    const response = await fetch(`${BACKEND_URI}/api/user/news/refresh`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ forceRefresh })
    });

    if (!response.ok) {
        throw new Error(`Refreshing news failed: ${response.statusText}`);
    }

    return await response.json();
}

/**
 * Get cached news for the user's search terms without triggering a refresh.
 */
export async function getCachedNewsApi(idToken: string | undefined): Promise<NewsSearchResult> {
    const headers = await getHeaders(idToken);
    const response = await fetch(`${BACKEND_URI}/api/user/news`, {
        method: "GET",
        headers: { ...headers, "Content-Type": "application/json" }
    });

    if (!response.ok) {
        throw new Error(`Getting cached news failed: ${response.statusText}`);
    }

    return await response.json();
}

// Ideas Hub API Functions

/**
 * Create a new idea.
 */
export async function createIdeaApi(idea: IdeaSubmission, idToken: string | undefined): Promise<Idea> {
    const headers = await getHeaders(idToken);
    const response = await fetch(`${BACKEND_URI}/api/ideas`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify(idea)
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Creating idea failed: ${response.statusText}`);
    }

    return await response.json();
}

/**
 * Get a list of ideas with pagination and optional filtering.
 */
export async function getIdeasApi(
    idToken: string | undefined,
    options?: {
        page?: number;
        pageSize?: number;
        status?: string;
        department?: string;
        sortBy?: string;
        sortOrder?: "asc" | "desc";
        myIdeas?: boolean;
    }
): Promise<IdeaListResponse> {
    const headers = await getHeaders(idToken);

    // Build query parameters
    const params = new URLSearchParams();
    if (options?.page !== undefined) params.append("page", options.page.toString());
    if (options?.pageSize !== undefined) params.append("pageSize", options.pageSize.toString());
    if (options?.status) params.append("status", options.status);
    if (options?.department) params.append("department", options.department);
    if (options?.sortBy) params.append("sortBy", options.sortBy);
    if (options?.sortOrder) params.append("sortOrder", options.sortOrder);
    if (options?.myIdeas) params.append("myIdeas", "true");

    const queryString = params.toString();
    const url = `${BACKEND_URI}/api/ideas${queryString ? `?${queryString}` : ""}`;

    const response = await fetch(url, {
        method: "GET",
        headers: { ...headers, "Content-Type": "application/json" }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Getting ideas failed: ${response.statusText}`);
    }

    return await response.json();
}

/**
 * Get a single idea by ID.
 */
export async function getIdeaApi(ideaId: string, idToken: string | undefined): Promise<Idea> {
    const headers = await getHeaders(idToken);
    const response = await fetch(`${BACKEND_URI}/api/ideas/${ideaId}`, {
        method: "GET",
        headers: { ...headers, "Content-Type": "application/json" }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Getting idea failed: ${response.statusText}`);
    }

    return await response.json();
}

/**
 * Update an existing idea.
 */
export async function updateIdeaApi(ideaId: string, updates: IdeaUpdate, idToken: string | undefined): Promise<Idea> {
    const headers = await getHeaders(idToken);
    const response = await fetch(`${BACKEND_URI}/api/ideas/${ideaId}`, {
        method: "PUT",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify(updates)
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Updating idea failed: ${response.statusText}`);
    }

    return await response.json();
}

/**
 * Delete an idea.
 */
export async function deleteIdeaApi(ideaId: string, idToken: string | undefined): Promise<void> {
    const headers = await getHeaders(idToken);
    const response = await fetch(`${BACKEND_URI}/api/ideas/${ideaId}`, {
        method: "DELETE",
        headers: { ...headers, "Content-Type": "application/json" }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Deleting idea failed: ${response.statusText}`);
    }
}

/**
 * Trigger LLM-based review of an idea (Phase 2 - Hybrid Approach).
 * Only users with REVIEWER or ADMIN role can trigger reviews.
 */
export async function reviewIdeaApi(ideaId: string, idToken: string | undefined): Promise<Idea> {
    const headers = await getHeaders(idToken);
    const response = await fetch(`${BACKEND_URI}/api/ideas/${ideaId}/review`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Reviewing idea failed: ${response.statusText}`);
    }

    return await response.json();
}

/**
 * Update the status of an idea.
 * Only users with REVIEWER or ADMIN role can change status.
 *
 * Valid status transitions:
 * - UNDER_REVIEW -> APPROVED, REJECTED
 * - APPROVED -> IMPLEMENTED
 */
export async function updateIdeaStatusApi(
    ideaId: string,
    status: "approved" | "rejected" | "implemented",
    idToken: string | undefined,
    reason?: string
): Promise<Idea> {
    const headers = await getHeaders(idToken);
    const response = await fetch(`${BACKEND_URI}/api/ideas/${ideaId}/status`, {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ status, reason })
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Updating idea status failed: ${response.statusText}`);
    }

    return await response.json();
}

/**
 * Find similar ideas based on text content.
 * Used for duplicate detection before submission.
 */
export async function getSimilarIdeasApi(
    text: string,
    idToken: string | undefined,
    options?: {
        threshold?: number;
        limit?: number;
        excludeId?: string;
    }
): Promise<SimilarIdeasResponse> {
    const headers = await getHeaders(idToken);

    // Build query parameters
    const params = new URLSearchParams();
    params.append("text", text);
    if (options?.threshold !== undefined) params.append("threshold", options.threshold.toString());
    if (options?.limit !== undefined) params.append("limit", options.limit.toString());
    if (options?.excludeId) params.append("excludeId", options.excludeId);

    const response = await fetch(`${BACKEND_URI}/api/ideas/similar?${params.toString()}`, {
        method: "GET",
        headers: { ...headers, "Content-Type": "application/json" }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Finding similar ideas failed: ${response.statusText}`);
    }

    return await response.json();
}

// Ideas Hub - Like API Functions

/**
 * Add a like to an idea.
 */
export async function addIdeaLikeApi(ideaId: string, idToken: string | undefined): Promise<{ success: boolean; like: IdeaLike }> {
    const headers = await getHeaders(idToken);
    const response = await fetch(`${BACKEND_URI}/api/ideas/${ideaId}/likes`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Adding like failed: ${response.statusText}`);
    }

    return await response.json();
}

/**
 * Remove a like from an idea.
 */
export async function removeIdeaLikeApi(ideaId: string, idToken: string | undefined): Promise<{ success: boolean; message: string }> {
    const headers = await getHeaders(idToken);
    const response = await fetch(`${BACKEND_URI}/api/ideas/${ideaId}/likes`, {
        method: "DELETE",
        headers: { ...headers, "Content-Type": "application/json" }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Removing like failed: ${response.statusText}`);
    }

    return await response.json();
}

/**
 * Get like count and user's like status for an idea.
 */
export async function getIdeaLikesApi(
    ideaId: string,
    idToken: string | undefined
): Promise<{ ideaId: string; likeCount: number; userHasLiked: boolean }> {
    const headers = await getHeaders(idToken);
    const response = await fetch(`${BACKEND_URI}/api/ideas/${ideaId}/likes`, {
        method: "GET",
        headers: { ...headers, "Content-Type": "application/json" }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Getting likes failed: ${response.statusText}`);
    }

    return await response.json();
}

/**
 * Get aggregated engagement metrics for an idea.
 */
export async function getIdeaEngagementApi(ideaId: string, idToken: string | undefined): Promise<IdeaEngagement> {
    const headers = await getHeaders(idToken);
    const response = await fetch(`${BACKEND_URI}/api/ideas/${ideaId}/engagement`, {
        method: "GET",
        headers: { ...headers, "Content-Type": "application/json" }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Getting engagement failed: ${response.statusText}`);
    }

    return await response.json();
}

/**
 * Get aggregated engagement metrics for multiple ideas in a single request.
 * This is much more efficient than calling getIdeaEngagementApi for each idea.
 */
export async function getIdeaEngagementBatchApi(
    ideaIds: string[],
    idToken: string | undefined
): Promise<Record<string, IdeaEngagement>> {
    if (ideaIds.length === 0) {
        return {};
    }

    const headers = await getHeaders(idToken);
    const response = await fetch(`${BACKEND_URI}/api/ideas/engagement/batch`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ ideaIds })
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Getting batch engagement failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.engagements || {};
}

// Ideas Hub - Comment API Functions

/**
 * Create a new comment on an idea.
 */
export async function createIdeaCommentApi(
    ideaId: string,
    comment: CommentSubmission,
    idToken: string | undefined
): Promise<{ success: boolean; comment: IdeaComment }> {
    const headers = await getHeaders(idToken);
    const response = await fetch(`${BACKEND_URI}/api/ideas/${ideaId}/comments`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify(comment)
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Creating comment failed: ${response.statusText}`);
    }

    return await response.json();
}

/**
 * Get comments for an idea with pagination.
 */
export async function getIdeaCommentsApi(
    ideaId: string,
    idToken: string | undefined,
    options?: {
        page?: number;
        pageSize?: number;
        sortOrder?: "asc" | "desc";
    }
): Promise<IdeaCommentsResponse> {
    const headers = await getHeaders(idToken);

    // Build query parameters
    const params = new URLSearchParams();
    if (options?.page !== undefined) params.append("page", options.page.toString());
    if (options?.pageSize !== undefined) params.append("pageSize", options.pageSize.toString());
    if (options?.sortOrder) params.append("sortOrder", options.sortOrder);

    const queryString = params.toString();
    const url = `${BACKEND_URI}/api/ideas/${ideaId}/comments${queryString ? `?${queryString}` : ""}`;

    const response = await fetch(url, {
        method: "GET",
        headers: { ...headers, "Content-Type": "application/json" }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Getting comments failed: ${response.statusText}`);
    }

    return await response.json();
}

/**
 * Get a single comment by ID.
 */
export async function getIdeaCommentApi(
    ideaId: string,
    commentId: string,
    idToken: string | undefined
): Promise<IdeaComment> {
    const headers = await getHeaders(idToken);
    const response = await fetch(`${BACKEND_URI}/api/ideas/${ideaId}/comments/${commentId}`, {
        method: "GET",
        headers: { ...headers, "Content-Type": "application/json" }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Getting comment failed: ${response.statusText}`);
    }

    return await response.json();
}

/**
 * Update an existing comment.
 */
export async function updateIdeaCommentApi(
    ideaId: string,
    commentId: string,
    update: CommentUpdate,
    idToken: string | undefined
): Promise<{ success: boolean; comment: IdeaComment }> {
    const headers = await getHeaders(idToken);
    const response = await fetch(`${BACKEND_URI}/api/ideas/${ideaId}/comments/${commentId}`, {
        method: "PUT",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify(update)
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Updating comment failed: ${response.statusText}`);
    }

    return await response.json();
}

/**
 * Delete a comment.
 */
export async function deleteIdeaCommentApi(
    ideaId: string,
    commentId: string,
    idToken: string | undefined
): Promise<{ success: boolean; message: string }> {
    const headers = await getHeaders(idToken);
    const response = await fetch(`${BACKEND_URI}/api/ideas/${ideaId}/comments/${commentId}`, {
        method: "DELETE",
        headers: { ...headers, "Content-Type": "application/json" }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Deleting comment failed: ${response.statusText}`);
    }

    return await response.json();
}
