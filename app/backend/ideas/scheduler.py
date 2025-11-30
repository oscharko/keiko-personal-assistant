"""
Background scheduler for automated ideas processing.

Handles batch processing tasks:
- Re-analyzing ideas that need updates
- Re-scoring ideas when weights change
- Periodic index synchronization
"""

import asyncio
import logging
from datetime import datetime
from typing import TYPE_CHECKING, Any, Optional

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger
from azure.cosmos.aio import ContainerProxy

if TYPE_CHECKING:
    from openai import AsyncOpenAI

from .models import Idea, IdeaStatus
from .scoring import IdeaScorer, ScoringConfig

logger = logging.getLogger(__name__)


class IdeasScheduler:
    """
    Manages background ideas processing jobs.

    Runs periodic tasks for:
    - Re-analyzing ideas that need updates (e.g., after model changes)
    - Re-scoring ideas when scoring weights are updated
    - Synchronizing ideas with the search index
    """

    def __init__(
        self,
        ideas_container: ContainerProxy,
        openai_client: Optional["AsyncOpenAI"] = None,
        chatgpt_model: str = "gpt-4o-mini",
        chatgpt_deployment: Optional[str] = None,
        embedding_model: str = "text-embedding-ada-002",
        embedding_deployment: Optional[str] = None,
        scoring_config: Optional[ScoringConfig] = None,
    ):
        """
        Initialize the ideas scheduler.

        Args:
            ideas_container: Cosmos DB container for ideas.
            openai_client: AsyncOpenAI client for LLM calls.
            chatgpt_model: Model name for chat completions.
            chatgpt_deployment: Azure OpenAI deployment name (optional).
            embedding_model: Model name for embeddings.
            embedding_deployment: Azure OpenAI embedding deployment (optional).
            scoring_config: Configuration for scoring calculations.
        """
        self.ideas_container = ideas_container
        self.openai_client = openai_client
        self.chatgpt_model = chatgpt_model
        self.chatgpt_deployment = chatgpt_deployment
        self.embedding_model = embedding_model
        self.embedding_deployment = embedding_deployment
        self.scoring_config = scoring_config
        self.scorer = IdeaScorer(scoring_config)
        self._scheduler: Optional[AsyncIOScheduler] = None

    async def _get_ideas_needing_analysis(
        self,
        analysis_version: str = "1.3",
        limit: int = 50,
    ) -> list[Idea]:
        """
        Get ideas that need re-analysis.

        Finds ideas with outdated analysis version or missing analysis.

        Args:
            analysis_version: Current analysis version to compare against.
            limit: Maximum number of ideas to return.

        Returns:
            List of ideas needing analysis.
        """
        ideas: list[Idea] = []

        try:
            # Query for ideas with outdated or missing analysis
            query = """
                SELECT * FROM c
                WHERE c.type = 'idea'
                AND (c.analysisVersion != @version OR NOT IS_DEFINED(c.analysisVersion))
                AND c.status != @archived
                ORDER BY c.createdAt DESC
                OFFSET 0 LIMIT @limit
            """
            parameters = [
                {"name": "@version", "value": analysis_version},
                {"name": "@archived", "value": IdeaStatus.ARCHIVED.value},
                {"name": "@limit", "value": limit},
            ]

            async for item in self.ideas_container.query_items(
                query=query,
                parameters=parameters,
            ):
                ideas.append(Idea.from_cosmos_item(item))

            logger.info(f"Found {len(ideas)} ideas needing analysis update")
            return ideas

        except Exception as e:
            logger.error(f"Error fetching ideas for analysis: {e}")
            return []

    async def _get_ideas_needing_rescoring(self, limit: int = 100) -> list[Idea]:
        """
        Get ideas that need re-scoring.

        Finds ideas with KPI estimates but missing or zero scores.

        Args:
            limit: Maximum number of ideas to return.

        Returns:
            List of ideas needing rescoring.
        """
        ideas: list[Idea] = []

        try:
            # Query for ideas with KPIs but missing scores
            query = """
                SELECT * FROM c
                WHERE c.type = 'idea'
                AND IS_DEFINED(c.kpiEstimates)
                AND (c.impactScore = 0 OR c.feasibilityScore = 0)
                AND c.status != @archived
                ORDER BY c.createdAt DESC
                OFFSET 0 LIMIT @limit
            """
            parameters = [
                {"name": "@archived", "value": IdeaStatus.ARCHIVED.value},
                {"name": "@limit", "value": limit},
            ]

            async for item in self.ideas_container.query_items(
                query=query,
                parameters=parameters,
            ):
                ideas.append(Idea.from_cosmos_item(item))

            logger.info(f"Found {len(ideas)} ideas needing rescoring")
            return ideas

        except Exception as e:
            logger.error(f"Error fetching ideas for rescoring: {e}")
            return []

    async def _rescore_idea(self, idea: Idea) -> bool:
        """
        Recalculate scores for an idea based on its KPI estimates.

        Args:
            idea: The idea to rescore.

        Returns:
            True if rescoring was successful, False otherwise.
        """
        try:
            if not idea.kpi_estimates:
                logger.debug(f"Skipping idea {idea.idea_id} - no KPI estimates")
                return False

            # Calculate new scores
            impact, feasibility, recommendation = self.scorer.calculate_scores(
                idea.kpi_estimates
            )

            # Update the idea
            idea.impact_score = impact
            idea.feasibility_score = feasibility
            idea.recommendation_class = recommendation

            # Save to Cosmos DB
            await self.ideas_container.upsert_item(idea.to_cosmos_item())

            logger.info(
                f"Rescored idea {idea.idea_id}: "
                f"impact={impact}, feasibility={feasibility}, "
                f"recommendation={recommendation}"
            )
            return True

        except Exception as e:
            logger.error(f"Error rescoring idea {idea.idea_id}: {e}")
            return False

    async def run_rescoring_job(self) -> dict[str, Any]:
        """
        Run the rescoring job for all ideas needing score updates.

        Returns:
            Dictionary with job results.
        """
        start_time = datetime.now()
        logger.info(f"Starting rescoring job at {start_time}")

        results = {
            "started_at": start_time.isoformat(),
            "rescored": 0,
            "skipped": 0,
            "errors": 0,
        }

        try:
            ideas = await self._get_ideas_needing_rescoring()

            for idea in ideas:
                try:
                    success = await self._rescore_idea(idea)
                    if success:
                        results["rescored"] += 1
                    else:
                        results["skipped"] += 1
                except Exception as e:
                    logger.error(f"Error processing idea {idea.idea_id}: {e}")
                    results["errors"] += 1

            duration = (datetime.now() - start_time).total_seconds()
            results["duration_seconds"] = duration
            results["completed_at"] = datetime.now().isoformat()

            logger.info(
                f"Rescoring job completed in {duration:.1f}s: "
                f"{results['rescored']} rescored, "
                f"{results['skipped']} skipped, "
                f"{results['errors']} errors"
            )

        except Exception as e:
            logger.error(f"Rescoring job failed: {e}")
            results["error"] = str(e)

        return results

    async def run_analysis_job(self) -> dict[str, Any]:
        """
        Run the analysis job for ideas needing updates.

        This job re-analyzes ideas with outdated analysis versions.

        Returns:
            Dictionary with job results.
        """
        start_time = datetime.now()
        logger.info(f"Starting analysis job at {start_time}")

        results = {
            "started_at": start_time.isoformat(),
            "analyzed": 0,
            "skipped": 0,
            "errors": 0,
        }

        try:
            # Import service here to avoid circular imports
            from .service import IdeasService

            ideas = await self._get_ideas_needing_analysis()

            if not ideas:
                logger.info("No ideas need analysis update")
                results["completed_at"] = datetime.now().isoformat()
                return results

            # Create service instance for analysis
            service = IdeasService(
                openai_client=self.openai_client,
                chatgpt_model=self.chatgpt_model,
                chatgpt_deployment=self.chatgpt_deployment,
                embedding_model=self.embedding_model,
                embedding_deployment=self.embedding_deployment,
                ideas_container=self.ideas_container,
                scoring_config=self.scoring_config,
            )

            for idea in ideas:
                try:
                    # Re-analyze the idea
                    analyzed_idea = await service.analyze_idea(idea)

                    # Save to Cosmos DB
                    await self.ideas_container.upsert_item(
                        analyzed_idea.to_cosmos_item()
                    )

                    results["analyzed"] += 1

                    # Small delay to avoid rate limiting
                    await asyncio.sleep(0.5)

                except Exception as e:
                    logger.error(f"Error analyzing idea {idea.idea_id}: {e}")
                    results["errors"] += 1

            duration = (datetime.now() - start_time).total_seconds()
            results["duration_seconds"] = duration
            results["completed_at"] = datetime.now().isoformat()

            logger.info(
                f"Analysis job completed in {duration:.1f}s: "
                f"{results['analyzed']} analyzed, "
                f"{results['errors']} errors"
            )

        except Exception as e:
            logger.error(f"Analysis job failed: {e}")
            results["error"] = str(e)

        return results

    def start(self) -> None:
        """
        Start the background scheduler.

        Schedules:
        1. Daily analysis job at 02:00 (for re-analyzing outdated ideas)
        2. Hourly rescoring job (for ideas with missing scores)
        """
        if self._scheduler is not None:
            logger.warning("Ideas scheduler already running")
            return

        self._scheduler = AsyncIOScheduler()

        # Schedule daily analysis job at 02:00
        self._scheduler.add_job(
            self.run_analysis_job,
            trigger=CronTrigger(hour=2, minute=0),
            id="daily_ideas_analysis",
            name="Daily Ideas Analysis",
            replace_existing=True,
        )

        # Schedule hourly rescoring job
        self._scheduler.add_job(
            self.run_rescoring_job,
            trigger=IntervalTrigger(hours=1),
            id="hourly_ideas_rescoring",
            name="Hourly Ideas Rescoring",
            replace_existing=True,
        )

        self._scheduler.start()
        logger.info(
            "Ideas scheduler started - "
            "analysis at 02:00, rescoring every hour"
        )

    def stop(self) -> None:
        """Stop the background scheduler."""
        if self._scheduler is not None:
            self._scheduler.shutdown(wait=False)
            self._scheduler = None
            logger.info("Ideas scheduler stopped")

    async def trigger_rescoring(self) -> dict[str, Any]:
        """Trigger an immediate rescoring job."""
        logger.info("Triggering immediate rescoring job")
        return await self.run_rescoring_job()

    async def trigger_analysis(self) -> dict[str, Any]:
        """Trigger an immediate analysis job."""
        logger.info("Triggering immediate analysis job")
        return await self.run_analysis_job()

