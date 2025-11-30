"""
Background scheduler for automated news refresh.
Runs daily at noon to pre-fetch news for all user topics.
"""

import asyncio
import logging
from datetime import datetime
from typing import TYPE_CHECKING, Optional

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from azure.cosmos.aio import ContainerProxy

if TYPE_CHECKING:
    from openai import AsyncOpenAI

logger = logging.getLogger(__name__)

# Global scheduler instance
_scheduler: Optional[AsyncIOScheduler] = None


class NewsScheduler:
    """
    Manages background news refresh jobs.
    Runs daily at noon to refresh news for all user topics.
    """

    def __init__(
        self,
        preferences_container: ContainerProxy,
        cache_container: ContainerProxy,
        openai_client: "AsyncOpenAI",
        chatgpt_model: str,
        chatgpt_deployment: Optional[str] = None,
    ):
        """
        Initialize the news scheduler.

        Args:
            preferences_container: Cosmos DB container for user preferences
            cache_container: Cosmos DB container for news cache
            openai_client: AsyncOpenAI client for LLM calls
            chatgpt_model: Model name for chat completions
            chatgpt_deployment: Azure OpenAI deployment name (optional)
        """
        self.preferences_container = preferences_container
        self.cache_container = cache_container
        self.openai_client = openai_client
        self.chatgpt_model = chatgpt_model
        self.chatgpt_deployment = chatgpt_deployment
        self._scheduler: Optional[AsyncIOScheduler] = None

    async def _get_all_unique_topics(self) -> set[str]:
        """
        Get all unique topics from all users' preferences.

        Returns:
            Set of unique search terms across all users
        """
        topics: set[str] = set()

        try:
            query = "SELECT c.search_terms FROM c WHERE c.type = 'news_preferences'"
            async for item in self.preferences_container.query_items(query=query):
                search_terms = item.get("search_terms", [])
                for term in search_terms:
                    if term and isinstance(term, str):
                        topics.add(term)

            logger.info(f"Found {len(topics)} unique topics across all users")
            return topics

        except Exception as e:
            logger.error(f"Error fetching topics from preferences: {e}")
            return set()

    async def _refresh_topic(self, topic: str) -> bool:
        """
        Refresh news for a single topic if cache is expired.

        Args:
            topic: The search term to refresh

        Returns:
            True if refresh was performed, False if skipped (cache valid)
        """
        from .models import NewsCacheItem
        from .service import NewsService

        try:
            # Check if cache exists and is still valid
            cache_id = topic.lower().replace(" ", "_")
            try:
                item = await self.cache_container.read_item(
                    item=cache_id, partition_key=cache_id
                )
                cache_item = NewsCacheItem.from_cosmos_item(item)

                if not cache_item.is_expired():
                    age_hours = cache_item.get_age_hours()
                    logger.debug(
                        f"Skipping '{topic}' - cache is {age_hours:.1f} hours old"
                    )
                    return False
            except Exception:
                # Cache doesn't exist, proceed with refresh
                pass

            # Create service instance for this refresh
            service = NewsService(
                openai_client=self.openai_client,
                chatgpt_model=self.chatgpt_model,
                chatgpt_deployment=self.chatgpt_deployment,
                preferences_container=self.preferences_container,
                cache_container=self.cache_container,
            )

            # Perform the search and cache
            web_content, web_citations = await service._search_web_for_news(topic)
            news_item = await service._summarize_with_llm(topic, web_content, web_citations)
            await service._cache_news(topic, [news_item])

            logger.info(f"Successfully refreshed news for topic: {topic}")
            return True

        except Exception as e:
            logger.error(f"Error refreshing topic '{topic}': {e}")
            return False

    async def run_scheduled_refresh(self) -> None:
        """
        Run the scheduled news refresh job.
        Refreshes all unique topics from all users' preferences.
        """
        start_time = datetime.now()
        logger.info(f"Starting scheduled news refresh at {start_time}")

        try:
            topics = await self._get_all_unique_topics()

            if not topics:
                logger.info("No topics found to refresh")
                return

            refreshed_count = 0
            skipped_count = 0

            for topic in topics:
                try:
                    was_refreshed = await self._refresh_topic(topic)
                    if was_refreshed:
                        refreshed_count += 1
                    else:
                        skipped_count += 1

                    # Small delay between requests to avoid rate limiting
                    await asyncio.sleep(1)

                except Exception as e:
                    logger.error(f"Error processing topic '{topic}': {e}")

            duration = (datetime.now() - start_time).total_seconds()
            logger.info(
                f"Scheduled refresh completed in {duration:.1f}s: "
                f"{refreshed_count} refreshed, {skipped_count} skipped (cache valid)"
            )

        except Exception as e:
            logger.error(f"Scheduled refresh failed: {e}")

    def start(self) -> None:
        """
        Start the background scheduler.
        Schedules:
        1. Daily refresh at noon (12:00)
        2. Immediate startup refresh for all expired topics
        """
        if self._scheduler is not None:
            logger.warning("Scheduler already running")
            return

        self._scheduler = AsyncIOScheduler()

        # Schedule daily refresh at noon (12:00)
        self._scheduler.add_job(
            self.run_scheduled_refresh,
            trigger=CronTrigger(hour=12, minute=0),
            id="daily_news_refresh",
            name="Daily News Refresh",
            replace_existing=True,
        )

        self._scheduler.start()
        logger.info("News scheduler started - daily refresh scheduled at 12:00")

        # Trigger immediate refresh on startup (for new deployments)
        # This runs asynchronously in the background
        asyncio.create_task(self._run_startup_refresh())

    async def _run_startup_refresh(self) -> None:
        """
        Run a startup refresh for all topics with expired cache.
        This ensures fresh news after each deployment.
        """
        # Small delay to allow app to fully initialize
        await asyncio.sleep(5)
        logger.info("Running startup refresh after deployment...")
        await self.run_scheduled_refresh()

    def stop(self) -> None:
        """Stop the background scheduler."""
        if self._scheduler is not None:
            self._scheduler.shutdown(wait=False)
            self._scheduler = None
            logger.info("News scheduler stopped")

    async def trigger_immediate_refresh(self) -> None:
        """Trigger an immediate refresh (for testing or manual trigger)."""
        logger.info("Triggering immediate news refresh")
        await self.run_scheduled_refresh()


async def refresh_single_topic(
    topic: str,
    cache_container: ContainerProxy,
    preferences_container: ContainerProxy,
    openai_client: "AsyncOpenAI",
    chatgpt_model: str,
    chatgpt_deployment: Optional[str] = None,
) -> bool:
    """
    Refresh news for a single topic immediately.
    Used when a user adds a new topic to their preferences.

    Args:
        topic: The search term to refresh
        cache_container: Cosmos DB container for news cache
        preferences_container: Cosmos DB container for user preferences
        openai_client: AsyncOpenAI client for LLM calls
        chatgpt_model: Model name for chat completions
        chatgpt_deployment: Azure OpenAI deployment name (optional)

    Returns:
        True if refresh was successful, False otherwise
    """
    from .models import NewsCacheItem
    from .service import NewsService

    try:
        # Check if cache exists and is still valid (skip if < 24 hours old)
        cache_id = topic.lower().replace(" ", "_")
        try:
            item = await cache_container.read_item(item=cache_id, partition_key=cache_id)
            cache_item = NewsCacheItem.from_cosmos_item(item)

            if not cache_item.is_expired():
                logger.info(
                    f"Skipping refresh for '{topic}' - cache is still valid "
                    f"({cache_item.get_age_hours():.1f} hours old)"
                )
                return True  # Return True since we have valid cached data
        except Exception:
            # Cache doesn't exist, proceed with refresh
            pass

        # Create service instance for this refresh
        service = NewsService(
            openai_client=openai_client,
            chatgpt_model=chatgpt_model,
            chatgpt_deployment=chatgpt_deployment,
            preferences_container=preferences_container,
            cache_container=cache_container,
        )

        # Perform the search and cache
        web_content, web_citations = await service._search_web_for_news(topic)
        news_item = await service._summarize_with_llm(topic, web_content, web_citations)
        await service._cache_news(topic, [news_item])

        logger.info(f"Successfully refreshed news for new topic: {topic}")
        return True

    except Exception as e:
        logger.error(f"Error refreshing new topic '{topic}': {e}")
        return False

