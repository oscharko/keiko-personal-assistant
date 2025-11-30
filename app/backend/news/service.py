"""
News service for fetching and summarizing news using web search and OpenAI.
Uses DuckDuckGo for news search and LLM for summarization.
"""

import logging
import time
import uuid
from typing import Any, Optional

from azure.cosmos.aio import ContainerProxy
from openai import AsyncOpenAI

from .models import (
    Citation,
    FetchedArticlesTracker,
    NewsCacheItem,
    NewsItem,
    NewsPreferences,
    NewsSearchResult,
)

logger = logging.getLogger(__name__)


class NewsService:
    """
    Service for managing news preferences and fetching personalized news.
    Uses DuckDuckGo for news search and OpenAI for summarization.
    """

    # System prompt for news summarization - expects multiple news articles
    NEWS_SUMMARY_PROMPT = """You are a professional news curator. Your task is to:
1. Analyze the provided news articles about a specific topic
2. Select the 2-3 most relevant and recent news items
3. Create a brief summary for each selected article
4. Preserve the original URLs for citations

Format your response as JSON with the following structure:
{
    "articles": [
        {
            "title": "Original article headline",
            "summary": "Brief 1-2 sentence summary of this article",
            "url": "Original URL of the article",
            "source": "Name of the news source"
        }
    ],
    "relatedTopics": ["topic1", "topic2", "topic3"]
}

IMPORTANT:
- Include 2-3 articles maximum
- Use the EXACT URLs from the provided news results
- Keep summaries concise (1-2 sentences each)
- Focus on the most recent and relevant news

If no relevant news is found, return:
{
    "articles": [],
    "relatedTopics": []
}
"""

    def __init__(
        self,
        openai_client: AsyncOpenAI,
        chatgpt_model: str,
        chatgpt_deployment: Optional[str] = None,
        preferences_container: Optional[ContainerProxy] = None,
        cache_container: Optional[ContainerProxy] = None,
        knowledgebase_client: Optional[Any] = None,
    ):
        """
        Initialize the news service.

        Args:
            openai_client: AsyncOpenAI client for LLM calls
            chatgpt_model: Model name for chat completions
            chatgpt_deployment: Azure OpenAI deployment name (optional)
            preferences_container: Cosmos DB container for user preferences
            cache_container: Cosmos DB container for news cache
            knowledgebase_client: Azure AI Search knowledge base client with web source
        """
        self.openai_client = openai_client
        self.chatgpt_model = chatgpt_model
        self.chatgpt_deployment = chatgpt_deployment
        self.preferences_container = preferences_container
        self.cache_container = cache_container
        self.knowledgebase_client = knowledgebase_client

    async def get_preferences(self, user_oid: str) -> NewsPreferences:
        """
        Get news preferences for a user.

        Args:
            user_oid: User's unique identifier

        Returns:
            NewsPreferences object (empty if not found)
        """
        if not self.preferences_container:
            logger.warning("Preferences container not configured")
            return NewsPreferences(user_oid=user_oid)

        try:
            item = await self.preferences_container.read_item(item=user_oid, partition_key=user_oid)
            return NewsPreferences.from_cosmos_item(item)
        except Exception as e:
            # Item not found or other error - return empty preferences
            logger.debug(f"No preferences found for user {user_oid}: {e}")
            return NewsPreferences(user_oid=user_oid)

    async def save_preferences(self, preferences: NewsPreferences) -> NewsPreferences:
        """
        Save or update user news preferences.

        Args:
            preferences: NewsPreferences object to save

        Returns:
            Updated NewsPreferences object
        """
        if not self.preferences_container:
            raise ValueError("Preferences container not configured")

        preferences.updated_at = int(time.time() * 1000)
        await self.preferences_container.upsert_item(preferences.to_cosmos_item())
        return preferences

    async def add_search_term(self, user_oid: str, term: str) -> NewsPreferences:
        """
        Add a search term to user's preferences.

        Args:
            user_oid: User's unique identifier
            term: Search term to add

        Returns:
            Updated NewsPreferences object

        Raises:
            ValueError: If term is invalid or limit reached
        """
        preferences = await self.get_preferences(user_oid)

        if not preferences.add_term(term):
            if len(preferences.search_terms) >= NewsPreferences.MAX_SEARCH_TERMS:
                raise ValueError(f"Maximum of {NewsPreferences.MAX_SEARCH_TERMS} search terms allowed")
            raise ValueError("Invalid or duplicate search term")

        return await self.save_preferences(preferences)

    async def remove_search_term(
        self, user_oid: str, term: str, delete_cache: bool = True
    ) -> NewsPreferences:
        """
        Remove a search term from user's preferences.

        Args:
            user_oid: User's unique identifier
            term: Search term to remove
            delete_cache: If True, also delete cached news for this term

        Returns:
            Updated NewsPreferences object

        Raises:
            ValueError: If term not found
        """
        preferences = await self.get_preferences(user_oid)

        if not preferences.remove_term(term):
            raise ValueError("Search term not found")

        # Delete cached news for this term (cascade delete)
        if delete_cache:
            await self._delete_cached_news(term)

        return await self.save_preferences(preferences)

    async def _delete_cached_news(self, search_term: str) -> bool:
        """
        Delete cached news for a specific search term.

        Args:
            search_term: The search term whose cache should be deleted

        Returns:
            True if deleted successfully, False otherwise
        """
        if not self.cache_container:
            logger.warning("Cache container not configured - cannot delete cache")
            return False

        try:
            # The document ID is normalized (lowercase, underscores)
            cache_id = search_term.lower().replace(" ", "_")
            # The partition key is the original search_term
            await self.cache_container.delete_item(
                item=cache_id, partition_key=search_term
            )
            logger.info(f"Deleted cached news for search term: {search_term}")
            return True
        except Exception as e:
            # Log but don't fail - the cache might not exist
            logger.debug(f"Could not delete cache for {search_term}: {e}")
            return False

    async def _get_cached_news(self, search_term: str) -> Optional[NewsCacheItem]:
        """
        Get cached news for a search term if available and not expired.

        Args:
            search_term: The search term to look up

        Returns:
            NewsCacheItem if found and valid, None otherwise
        """
        if not self.cache_container:
            return None

        try:
            # The document ID is normalized (lowercase, underscores)
            cache_id = search_term.lower().replace(" ", "_")
            # The partition key is the original search_term (as stored in the document)
            # The container uses /search_term as partition key path
            item = await self.cache_container.read_item(
                item=cache_id, partition_key=search_term
            )
            cache_item = NewsCacheItem.from_cosmos_item(item)

            if not cache_item.is_expired():
                logger.info(f"Cache hit for search term: {search_term}")
                return cache_item

            logger.info(f"Cache expired for search term: {search_term}")
            return None
        except Exception as e:
            logger.debug(f"No cache found for {search_term}: {e}")
            return None

    async def _cache_news(self, search_term: str, items: list[NewsItem]) -> None:
        """
        Cache news items for a search term.

        Args:
            search_term: The search term
            items: List of news items to cache
        """
        if not self.cache_container:
            return

        try:
            cache_item = NewsCacheItem(search_term=search_term, items=items)
            await self.cache_container.upsert_item(cache_item.to_cosmos_item())
            logger.info(f"Cached {len(items)} items for search term: {search_term}")
        except Exception as e:
            logger.warning(f"Failed to cache news for {search_term}: {e}")

    async def _get_fetched_tracker(self, search_term: str) -> FetchedArticlesTracker:
        """
        Get the tracker for articles already fetched for a search term.

        Args:
            search_term: The search term to get tracker for

        Returns:
            FetchedArticlesTracker object (empty if not found or expired)
        """
        if not self.cache_container:
            return FetchedArticlesTracker(search_term=search_term)

        try:
            doc_id = f"fetched_{search_term.lower().replace(' ', '_')}"
            item = await self.cache_container.read_item(
                item=doc_id, partition_key=search_term
            )
            tracker = FetchedArticlesTracker.from_cosmos_item(item)

            # Reset if older than 24 hours
            if tracker.should_reset():
                logger.info(f"Resetting fetched tracker for {search_term} (older than 24h)")
                tracker.reset()

            return tracker
        except Exception as e:
            logger.debug(f"No fetched tracker found for {search_term}: {e}")
            return FetchedArticlesTracker(search_term=search_term)

    async def _save_fetched_tracker(self, tracker: FetchedArticlesTracker) -> None:
        """
        Save the fetched articles tracker.

        Args:
            tracker: FetchedArticlesTracker object to save
        """
        if not self.cache_container:
            return

        try:
            await self.cache_container.upsert_item(tracker.to_cosmos_item())
            logger.debug(
                f"Saved {len(tracker.fetched_hashes)} fetched article hashes "
                f"for search term {tracker.search_term}"
            )
        except Exception as e:
            logger.warning(f"Failed to save fetched tracker: {e}")

    async def _summarize_with_llm(
        self, search_term: str, web_content: str, existing_citations: Optional[list[Citation]] = None
    ) -> NewsItem:
        """
        Use LLM to curate and summarize web search results into a news item.

        The LLM selects 2-3 most relevant articles and provides brief summaries.

        Args:
            search_term: The original search term
            web_content: Raw content from web search
            existing_citations: Citations already extracted from web search

        Returns:
            NewsItem with curated articles and summaries
        """
        import json

        # If no web content, return empty result
        if not web_content.strip():
            return NewsItem(
                id=str(uuid.uuid4()),
                search_term=search_term,
                title=f"News about {search_term}",
                summary="No news articles found for this topic.",
                published_at=int(time.time() * 1000),
            )

        try:
            messages = [
                {"role": "system", "content": self.NEWS_SUMMARY_PROMPT},
                {
                    "role": "user",
                    "content": f"Search term: {search_term}\n\nNews articles found:\n{web_content}",
                },
            ]

            # Use Azure OpenAI deployment if available
            model = self.chatgpt_deployment or self.chatgpt_model

            response = await self.openai_client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=0.3,
                max_tokens=1024,
                response_format={"type": "json_object"},
            )

            content = response.choices[0].message.content
            if not content:
                raise ValueError("Empty response from LLM")

            result = json.loads(content)

            # Build citations from the curated articles
            articles = result.get("articles", [])
            citations = []
            summary_parts = []

            for article in articles[:3]:  # Limit to 3 articles
                title = article.get("title", "")
                url = article.get("url", "")
                article_summary = article.get("summary", "")
                source = article.get("source", "")

                if url:
                    citations.append(Citation(title=title, url=url))
                    # Format each article as a bullet point with link
                    source_info = f" ({source})" if source else ""
                    summary_parts.append(f"- **{title}**{source_info}: {article_summary}\n  {url}")

            # Combine all article summaries
            combined_summary = "\n\n".join(summary_parts) if summary_parts else "No relevant articles found."

            # Get primary URL and source from first citation
            original_url = citations[0].url if citations else None
            source = citations[0].title if citations else None

            return NewsItem(
                id=str(uuid.uuid4()),
                search_term=search_term,
                title=f"News: {search_term}",
                summary=combined_summary,
                original_url=original_url,
                source=source,
                published_at=int(time.time() * 1000),
                citations=citations,
                related_topics=result.get("relatedTopics", []),
            )

        except Exception as e:
            logger.error(f"Error summarizing news for {search_term}: {e}")
            # Fallback: Use existing citations directly without LLM
            if existing_citations:
                summary_parts = []
                for cit in existing_citations[:3]:
                    summary_parts.append(f"- {cit.title}\n  {cit.url}")
                return NewsItem(
                    id=str(uuid.uuid4()),
                    search_term=search_term,
                    title=f"News: {search_term}",
                    summary="\n\n".join(summary_parts),
                    original_url=existing_citations[0].url,
                    source=existing_citations[0].title,
                    published_at=int(time.time() * 1000),
                    citations=existing_citations[:3],
                )
            return NewsItem(
                id=str(uuid.uuid4()),
                search_term=search_term,
                title=f"News about {search_term}",
                summary=f"Unable to load news for this topic. Error: {str(e)}",
                published_at=int(time.time() * 1000),
            )

    async def _search_web_for_news(self, search_term: str) -> tuple[str, list[Citation]]:
        """
        Search the web for news about a topic using DuckDuckGo.

        Args:
            search_term: The topic to search for

        Returns:
            Tuple of (web content as string, list of citations)
        """
        try:
            return await self._search_with_gnews(search_term)
        except Exception as e:
            logger.error(f"GNews search failed for '{search_term}': {e}")
            return "", []

    async def _search_with_gnews(self, search_term: str) -> tuple[str, list[Citation]]:
        """
        Use GNews.io API to search for news articles.

        GNews.io is a professional news API service that provides reliable
        access to news articles from various sources worldwide.

        Args:
            search_term: The topic to search for

        Returns:
            Tuple of (formatted news content, list of citations)
        """
        import aiohttp
        import os
        import urllib.parse

        # GNews.io API configuration
        api_key = os.getenv("GNEWS_API_KEY", "")
        if not api_key:
            logger.error("GNEWS_API_KEY environment variable is not set")
            return "", []

        try:
            # URL encode the search term
            encoded_term = urllib.parse.quote(search_term)

            # Build the API URL
            # Using German language and country, max 10 articles
            api_url = (
                f"https://gnews.io/api/v4/search?"
                f"q={encoded_term}"
                f"&lang=de"
                f"&country=de"
                f"&max=10"
                f"&apikey={api_key}"
            )

            async with aiohttp.ClientSession() as session:
                async with session.get(api_url, timeout=30) as response:
                    if response.status != 200:
                        error_text = await response.text()
                        logger.error(
                            f"GNews.io API returned status {response.status}: {error_text}"
                        )
                        return "", []

                    data = await response.json()

            articles = data.get("articles", [])
            if not articles:
                logger.warning(
                    f"GNews.io API returned no results for: {search_term}"
                )
                return "", []

            # Get the tracker for already fetched articles
            tracker = await self._get_fetched_tracker(search_term)

            # Ensure we have at least 5 articles if available
            # GNews API returns up to 10 articles (max=10 in request)
            min_articles = 5
            max_articles = 10

            if len(articles) < min_articles:
                logger.warning(
                    f"GNews.io API returned only {len(articles)} articles for: {search_term} "
                    f"(minimum desired: {min_articles})"
                )

            citations = []
            content_parts = []
            new_articles_count = 0
            skipped_articles_count = 0

            for article in articles[:max_articles]:  # Process up to 10 articles
                title = article.get("title", "")
                url = article.get("url", "")
                description = article.get("description", "")
                source = article.get("source", {})
                source_name = source.get("name", "") if isinstance(source, dict) else ""
                published_at = article.get("publishedAt", "")

                if not title or not url:
                    continue

                # Skip articles that were already fetched in the last 24 hours
                if tracker.is_fetched(url):
                    skipped_articles_count += 1
                    logger.debug(f"Skipping already fetched article: {title[:50]}")
                    continue

                # Mark this article as fetched
                tracker.mark_fetched(url)
                new_articles_count += 1

                citations.append(Citation(title=title, url=url))
                content_parts.append(
                    f"Article: {title}\n"
                    f"URL: {url}\n"
                    f"Source: {source_name}\n"
                    f"Date: {published_at}\n"
                    f"Snippet: {description}\n"
                )

            # Save the updated tracker
            await self._save_fetched_tracker(tracker)

            if skipped_articles_count > 0:
                logger.info(
                    f"Skipped {skipped_articles_count} already fetched articles for: {search_term}"
                )

            web_content = "\n\n".join(content_parts) if content_parts else ""
            logger.info(
                f"GNews.io API returned {len(citations)} results for: {search_term}"
            )

            return web_content, citations

        except Exception as e:
            logger.error(f"GNews.io API search failed for '{search_term}': {e}")
            return "", []

    async def refresh_news(self, user_oid: str, force_refresh: bool = False) -> NewsSearchResult:
        """
        Refresh news for all of a user's search terms.

        Args:
            user_oid: User's unique identifier
            force_refresh: If True, bypass cache

        Returns:
            NewsSearchResult with all news items
        """
        preferences = await self.get_preferences(user_oid)

        if not preferences.search_terms:
            return NewsSearchResult(
                user_oid=user_oid,
                error="No search terms configured. Add topics in your news preferences.",
            )

        all_items: list[NewsItem] = []

        for term in preferences.search_terms:
            try:
                # Check cache first (unless force refresh)
                if not force_refresh:
                    cached = await self._get_cached_news(term)
                    if cached:
                        all_items.extend(cached.items)
                        continue

                # Search web and summarize
                web_content, web_citations = await self._search_web_for_news(term)
                news_item = await self._summarize_with_llm(term, web_content, web_citations)
                all_items.append(news_item)

                # Cache the result
                await self._cache_news(term, [news_item])

            except Exception as e:
                logger.error(f"Error fetching news for term '{term}': {e}")
                # Add error item for this term
                all_items.append(
                    NewsItem(
                        id=str(uuid.uuid4()),
                        search_term=term,
                        title=f"Error loading news for {term}",
                        summary=f"Unable to fetch news: {str(e)}",
                        published_at=int(time.time() * 1000),
                    )
                )

        return NewsSearchResult(user_oid=user_oid, items=all_items)

