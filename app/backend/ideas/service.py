"""
Service layer for the Ideas Hub module.

This module contains the business logic for idea management,
including CRUD operations, LLM-based analysis, and duplicate detection.
"""

import json
import logging
import time
from typing import Any, Optional

from azure.cosmos.aio import ContainerProxy
from azure.cosmos.exceptions import CosmosResourceNotFoundError
from openai import AsyncOpenAI

import uuid

from .audit import AuditAction, AuditLogger
from .models import (
    Idea,
    IdeaComment,
    IdeaCommentsResponse,
    IdeaEngagement,
    IdeaLike,
    IdeaListResponse,
    IdeaStatus,
    SimilarIdea,
    SimilarIdeasResponse,
)
from .scoring import IdeaScorer, ScoringConfig

logger = logging.getLogger(__name__)

# System prompt for idea summary generation
IDEA_SUMMARY_PROMPT = """You are an expert at summarizing business improvement ideas.
Your task is to create a concise summary of the submitted idea that captures:
1. The core problem or opportunity being addressed
2. The proposed solution or improvement
3. The expected benefit or impact

Create a summary in 2-3 sentences that is clear, professional, and actionable.
The summary should help decision-makers quickly understand the idea's value.

Respond in the same language as the input (German if the idea is in German).

Format your response as JSON:
{
    "summary": "Your 2-3 sentence summary here"
}
"""

# System prompt for tag extraction
IDEA_TAGS_PROMPT = """You are an expert at categorizing business improvement ideas.
Your task is to extract 3-7 relevant tags that categorize the idea by:
1. Domain/Area (e.g., HR, Finance, IT, Operations, Customer Service)
2. Technology (e.g., AI, Automation, Cloud, Mobile, Analytics)
3. Impact Type (e.g., Cost Reduction, Efficiency, Quality, Employee Satisfaction)
4. Implementation Scope (e.g., Quick Win, Strategic, Department-wide, Company-wide)

Tags should be concise (1-3 words each) and in the same language as the input.

Format your response as JSON:
{
    "tags": ["tag1", "tag2", "tag3", ...]
}
"""

# System prompt for KPI extraction
IDEA_KPI_PROMPT = """You are an expert business analyst specializing in evaluating improvement ideas.
Your task is to estimate the potential KPIs (Key Performance Indicators) for the submitted idea.

Analyze the idea and provide realistic estimates for the following metrics:
1. time_savings_hours: Estimated hours saved per month (0-1000)
2. cost_reduction_eur: Estimated cost reduction in EUR per year (0-1000000)
3. quality_improvement_percent: Estimated quality improvement percentage (0-100)
4. employee_satisfaction_impact: Impact on employee satisfaction (-100 to 100, negative means decrease)
5. scalability_potential: How scalable is this idea (0-100, 100 = highly scalable)
6. implementation_effort_days: Estimated implementation effort in person-days (1-365)
7. risk_level: Implementation risk level ("low", "medium", "high")

Be conservative in your estimates. If you cannot estimate a metric, use null.
Consider the scope, complexity, and potential impact of the idea.

Format your response as JSON:
{
    "timeSavingsHours": <number or null>,
    "costReductionEur": <number or null>,
    "qualityImprovementPercent": <number or null>,
    "employeeSatisfactionImpact": <number or null>,
    "scalabilityPotential": <number or null>,
    "implementationEffortDays": <number or null>,
    "riskLevel": <"low" | "medium" | "high" | null>
}
"""

# System prompt for theme classification
IDEA_THEME_PROMPT = """You are an expert at categorizing business improvement ideas into strategic themes.
Your task is to classify the submitted idea into one primary theme category.

Available theme categories:
1. process_automation - Ideas focused on automating manual processes, workflows, or repetitive tasks
2. customer_experience - Ideas to improve customer satisfaction, service quality, or customer journey
3. data_analytics - Ideas involving data analysis, reporting, insights, or business intelligence
4. cost_optimization - Ideas focused on reducing costs, improving efficiency, or resource optimization
5. employee_experience - Ideas to improve employee satisfaction, productivity, or workplace culture
6. digital_transformation - Ideas involving new technologies, digital tools, or modernization
7. quality_improvement - Ideas focused on improving product/service quality or reducing errors
8. innovation - Ideas introducing new products, services, or business models
9. sustainability - Ideas focused on environmental impact, green initiatives, or social responsibility
10. compliance_security - Ideas related to regulatory compliance, security, or risk management

Analyze the idea and select the SINGLE most appropriate theme category.
Consider the primary focus and main objective of the idea.

Format your response as JSON:
{
    "theme": "<theme_category>",
    "confidence": <0.0-1.0>,
    "reasoning": "<brief explanation>"
}
"""


class IdeasService:
    """
    Service class for managing ideas.

    Handles all business logic including Cosmos DB operations,
    LLM-based analysis, and Azure AI Search integration.
    """

    def __init__(
        self,
        openai_client: Optional[AsyncOpenAI] = None,
        chatgpt_model: str = "gpt-4o-mini",
        chatgpt_deployment: Optional[str] = None,
        embedding_model: str = "text-embedding-ada-002",
        embedding_deployment: Optional[str] = None,
        ideas_container: Optional[ContainerProxy] = None,
        search_client: Optional[Any] = None,
        scoring_config: Optional[ScoringConfig] = None,
        audit_container: Optional[ContainerProxy] = None,
    ):
        """
        Initialize the Ideas service.

        Args:
            openai_client: Azure OpenAI client for LLM operations.
            chatgpt_model: Model name for chat completions.
            chatgpt_deployment: Deployment name for chat completions.
            embedding_model: Model name for embeddings.
            embedding_deployment: Deployment name for embeddings.
            ideas_container: Cosmos DB container for ideas storage.
            search_client: Azure AI Search client for similarity search.
            scoring_config: Configuration for scoring calculations.
            audit_container: Cosmos DB container for audit logging.
        """
        self.openai_client = openai_client
        self.chatgpt_model = chatgpt_model
        self.chatgpt_deployment = chatgpt_deployment
        self.embedding_model = embedding_model
        self.embedding_deployment = embedding_deployment
        self.ideas_container = ideas_container
        self.search_client = search_client
        self.scorer = IdeaScorer(scoring_config)
        self.audit_logger = AuditLogger(audit_container)

    async def create_idea(self, idea: Idea, user_id: str | None = None) -> Idea:
        """
        Create a new idea in the database.

        Args:
            idea: The idea to create.
            user_id: ID of the user creating the idea (for audit).

        Returns:
            The created idea with generated fields populated.
        """
        if not self.ideas_container:
            raise ValueError("Ideas container not configured")

        # Ensure timestamps are set
        current_time = int(time.time() * 1000)
        if not idea.created_at:
            idea.created_at = current_time
        if not idea.updated_at:
            idea.updated_at = current_time

        # Save to Cosmos DB
        cosmos_item = idea.to_cosmos_item()
        await self.ideas_container.create_item(body=cosmos_item)

        # Log audit entry
        await self.audit_logger.log_create(
            idea_id=idea.idea_id,
            user_id=user_id or idea.submitter_id,
            idea_data={"title": idea.title},
        )

        logger.info(f"Created idea {idea.idea_id}")
        return idea

    async def get_idea(self, idea_id: str) -> Idea | None:
        """
        Retrieve an idea by its ID.

        Args:
            idea_id: The unique identifier of the idea.

        Returns:
            The idea if found, None otherwise.
        """
        if not self.ideas_container:
            logger.warning("Ideas container not configured")
            return None

        try:
            item = await self.ideas_container.read_item(
                item=idea_id,
                partition_key=idea_id
            )
            return Idea.from_cosmos_item(item)
        except CosmosResourceNotFoundError:
            logger.debug(f"Idea {idea_id} not found")
            return None
        except Exception as e:
            logger.error(f"Error getting idea {idea_id}: {e}")
            return None

    async def list_ideas(
        self,
        page: int = 1,
        page_size: int = 20,
        status: str | None = None,
        department: str | None = None,
        submitter_id: str | None = None,
        recommendation_class: str | None = None,
        sort_by: str = "createdAt",
        sort_order: str = "desc",
    ) -> IdeaListResponse:
        """
        List ideas with pagination and filtering.

        Args:
            page: Page number (1-indexed).
            page_size: Number of items per page.
            status: Filter by idea status.
            department: Filter by department.
            submitter_id: Filter by submitter.
            recommendation_class: Filter by recommendation class.
            sort_by: Field to sort by.
            sort_order: Sort direction (asc/desc).

        Returns:
            Paginated list of ideas.
        """
        if not self.ideas_container:
            logger.warning("Ideas container not configured")
            return IdeaListResponse(
                ideas=[],
                total_count=0,
                page=page,
                page_size=page_size,
                has_more=False
            )

        # Build query with filters
        conditions = ["c.type = 'idea'"]
        parameters: list[dict[str, Any]] = []

        if status:
            conditions.append("c.status = @status")
            parameters.append({"name": "@status", "value": status})

        if department:
            conditions.append("c.department = @department")
            parameters.append({"name": "@department", "value": department})

        if submitter_id:
            conditions.append("c.submitterId = @submitterId")
            parameters.append({"name": "@submitterId", "value": submitter_id})

        if recommendation_class:
            conditions.append("c.recommendationClass = @recommendationClass")
            parameters.append({"name": "@recommendationClass", "value": recommendation_class})

        where_clause = " AND ".join(conditions)

        # Validate sort field
        allowed_sort_fields = ["createdAt", "updatedAt", "title", "impactScore", "feasibilityScore"]
        if sort_by not in allowed_sort_fields:
            sort_by = "createdAt"

        order_direction = "DESC" if sort_order.lower() == "desc" else "ASC"

        # Count query
        count_query = f"SELECT VALUE COUNT(1) FROM c WHERE {where_clause}"
        count_result = self.ideas_container.query_items(
            query=count_query,
            parameters=parameters,
        )
        total_count = 0
        async for count in count_result:
            total_count = count
            break

        # Data query with pagination
        offset = (page - 1) * page_size
        data_query = f"""
            SELECT * FROM c
            WHERE {where_clause}
            ORDER BY c.{sort_by} {order_direction}
            OFFSET @offset LIMIT @limit
        """
        data_parameters = parameters + [
            {"name": "@offset", "value": offset},
            {"name": "@limit", "value": page_size}
        ]

        ideas = []
        items = self.ideas_container.query_items(
            query=data_query,
            parameters=data_parameters,
        )
        async for item in items:
            ideas.append(Idea.from_cosmos_item(item))

        has_more = (offset + len(ideas)) < total_count

        return IdeaListResponse(
            ideas=ideas,
            total_count=total_count,
            page=page,
            page_size=page_size,
            has_more=has_more
        )

    async def update_idea(
        self,
        idea_id: str,
        updates: dict[str, Any],
        user_id: str | None = None,
    ) -> Idea | None:
        """
        Update an existing idea.

        Args:
            idea_id: The unique identifier of the idea.
            updates: Dictionary of fields to update.
            user_id: ID of the user performing the update (for audit).

        Returns:
            The updated idea if found, None otherwise.
        """
        if not self.ideas_container:
            raise ValueError("Ideas container not configured")

        # Get existing idea
        existing_idea = await self.get_idea(idea_id)
        if not existing_idea:
            return None

        # Store old values for audit
        old_values = existing_idea.to_dict()
        old_status = existing_idea.status.value if existing_idea.status else None

        # Map camelCase API fields to snake_case model fields
        field_mapping = {
            "title": "title",
            "description": "description",
            "problemDescription": "problem_description",
            "expectedBenefit": "expected_benefit",
            "affectedProcesses": "affected_processes",
            "targetUsers": "target_users",
            "department": "department",
            "status": "status",
        }

        # Apply updates
        for api_field, model_field in field_mapping.items():
            if api_field in updates:
                value = updates[api_field]
                if api_field == "status":
                    try:
                        value = IdeaStatus(value)
                    except ValueError:
                        logger.warning(f"Invalid status value: {value}")
                        continue
                setattr(existing_idea, model_field, value)

        # Update timestamp
        existing_idea.update_timestamp()

        # Save to Cosmos DB
        cosmos_item = existing_idea.to_cosmos_item()
        await self.ideas_container.upsert_item(body=cosmos_item)

        # Log audit entry
        new_status = existing_idea.status.value if existing_idea.status else None
        if old_status != new_status:
            await self.audit_logger.log_status_change(
                idea_id=idea_id,
                user_id=user_id or existing_idea.submitter_id,
                old_status=old_status or "",
                new_status=new_status or "",
            )
        else:
            await self.audit_logger.log_update(
                idea_id=idea_id,
                user_id=user_id or existing_idea.submitter_id,
                old_values=old_values,
                new_values=existing_idea.to_dict(),
            )

        logger.info(f"Updated idea {idea_id}")
        return existing_idea

    async def delete_idea(
        self,
        idea_id: str,
        user_id: str | None = None,
    ) -> bool:
        """
        Delete an idea from the database.

        Args:
            idea_id: The unique identifier of the idea.
            user_id: ID of the user performing the deletion (for audit).

        Returns:
            True if deleted, False if not found.
        """
        if not self.ideas_container:
            raise ValueError("Ideas container not configured")

        # Get idea title for audit before deletion
        existing_idea = await self.get_idea(idea_id)
        idea_title = existing_idea.title if existing_idea else ""

        try:
            await self.ideas_container.delete_item(
                item=idea_id,
                partition_key=idea_id
            )

            # Log audit entry
            await self.audit_logger.log_delete(
                idea_id=idea_id,
                user_id=user_id or (existing_idea.submitter_id if existing_idea else "unknown"),
                idea_title=idea_title,
            )

            logger.info(f"Deleted idea {idea_id}")
            return True
        except CosmosResourceNotFoundError:
            logger.debug(f"Idea {idea_id} not found for deletion")
            return False
        except Exception as e:
            logger.error(f"Error deleting idea {idea_id}: {e}")
            return False

    async def get_audit_trail(self, idea_id: str, limit: int = 50) -> list[dict]:
        """
        Get the audit trail for an idea.

        Args:
            idea_id: The unique identifier of the idea.
            limit: Maximum number of entries to return.

        Returns:
            List of audit entries as dictionaries.
        """
        entries = await self.audit_logger.get_audit_trail(idea_id, limit)
        return [entry.to_dict() for entry in entries]

    async def generate_summary(self, idea: Idea) -> str:
        """
        Generate a summary for an idea using LLM.

        Args:
            idea: The idea to summarize.

        Returns:
            Generated summary text.
        """
        if not self.openai_client:
            logger.warning("OpenAI client not configured, skipping summary generation")
            return ""

        try:
            # Build the idea content for summarization
            idea_content = self._build_idea_content(idea)

            messages = [
                {"role": "system", "content": IDEA_SUMMARY_PROMPT},
                {"role": "user", "content": idea_content},
            ]

            # Use Azure OpenAI deployment if available
            model = self.chatgpt_deployment or self.chatgpt_model

            response = await self.openai_client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=0.3,
                max_tokens=512,
                response_format={"type": "json_object"},
            )

            content = response.choices[0].message.content
            if not content:
                logger.warning("Empty response from LLM for summary generation")
                return ""

            result = json.loads(content)
            summary = result.get("summary", "")

            logger.info(f"Generated summary for idea {idea.idea_id}")
            return summary

        except Exception as e:
            logger.error(f"Error generating summary for idea {idea.idea_id}: {e}")
            return ""

    def _build_idea_content(self, idea: Idea) -> str:
        """
        Build a formatted string of idea content for LLM processing.

        Args:
            idea: The idea to format.

        Returns:
            Formatted idea content string.
        """
        parts = [
            f"Title: {idea.title}",
            f"Description: {idea.description}",
        ]

        if idea.problem_description:
            parts.append(f"Problem: {idea.problem_description}")

        if idea.expected_benefit:
            parts.append(f"Expected Benefit: {idea.expected_benefit}")

        if idea.affected_processes:
            parts.append(f"Affected Processes: {', '.join(idea.affected_processes)}")

        if idea.target_users:
            parts.append(f"Target Users: {', '.join(idea.target_users)}")

        if idea.department:
            parts.append(f"Department: {idea.department}")

        return "\n".join(parts)

    async def extract_tags(self, idea: Idea) -> list[str]:
        """
        Extract tags from an idea using LLM.

        Args:
            idea: The idea to analyze.

        Returns:
            List of extracted tags.
        """
        if not self.openai_client:
            logger.warning("OpenAI client not configured, skipping tag extraction")
            return []

        try:
            # Build the idea content for tag extraction
            idea_content = self._build_idea_content(idea)

            messages = [
                {"role": "system", "content": IDEA_TAGS_PROMPT},
                {"role": "user", "content": idea_content},
            ]

            # Use Azure OpenAI deployment if available
            model = self.chatgpt_deployment or self.chatgpt_model

            response = await self.openai_client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=0.3,
                max_tokens=256,
                response_format={"type": "json_object"},
            )

            content = response.choices[0].message.content
            if not content:
                logger.warning("Empty response from LLM for tag extraction")
                return []

            result = json.loads(content)
            tags = result.get("tags", [])

            # Ensure tags is a list of strings
            if not isinstance(tags, list):
                logger.warning(f"Invalid tags format: {type(tags)}")
                return []

            # Filter and clean tags
            cleaned_tags = [
                str(tag).strip()
                for tag in tags
                if tag and isinstance(tag, (str, int, float))
            ][:7]  # Limit to 7 tags

            logger.info(f"Extracted {len(cleaned_tags)} tags for idea {idea.idea_id}")
            return cleaned_tags

        except Exception as e:
            logger.error(f"Error extracting tags for idea {idea.idea_id}: {e}")
            return []

    async def extract_kpis(self, idea: Idea) -> dict[str, Any]:
        """
        Extract KPI estimates from an idea using LLM.

        Analyzes the idea content and generates estimates for various
        business KPIs such as time savings, cost reduction, and quality
        improvement.

        Args:
            idea: The idea to analyze.

        Returns:
            Dictionary containing KPI estimates.
        """
        if not self.openai_client:
            logger.warning("OpenAI client not configured, skipping KPI extraction")
            return {}

        try:
            # Build the idea content for KPI extraction
            idea_content = self._build_idea_content(idea)

            messages = [
                {"role": "system", "content": IDEA_KPI_PROMPT},
                {"role": "user", "content": idea_content},
            ]

            # Use Azure OpenAI deployment if available
            model = self.chatgpt_deployment or self.chatgpt_model

            response = await self.openai_client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=0.3,
                max_tokens=512,
                response_format={"type": "json_object"},
            )

            content = response.choices[0].message.content
            if not content:
                logger.warning("Empty response from LLM for KPI extraction")
                return {}

            result = json.loads(content)

            # Validate and clean the KPI estimates
            kpi_estimates = self._validate_kpi_estimates(result)

            logger.info(f"Extracted KPIs for idea {idea.idea_id}: {kpi_estimates}")
            return kpi_estimates

        except Exception as e:
            logger.error(f"Error extracting KPIs for idea {idea.idea_id}: {e}")
            return {}

    def _validate_kpi_estimates(self, raw_kpis: dict[str, Any]) -> dict[str, Any]:
        """
        Validate and clean KPI estimates from LLM response.

        Args:
            raw_kpis: Raw KPI dictionary from LLM.

        Returns:
            Validated and cleaned KPI dictionary.
        """
        validated = {}

        # Validate numeric fields with ranges
        numeric_fields = {
            "timeSavingsHours": (0, 1000),
            "costReductionEur": (0, 1000000),
            "qualityImprovementPercent": (0, 100),
            "employeeSatisfactionImpact": (-100, 100),
            "scalabilityPotential": (0, 100),
            "implementationEffortDays": (1, 365),
        }

        for field, (min_val, max_val) in numeric_fields.items():
            value = raw_kpis.get(field)
            if value is not None:
                try:
                    num_value = float(value)
                    # Clamp to valid range
                    validated[field] = max(min_val, min(max_val, num_value))
                except (ValueError, TypeError):
                    validated[field] = None
            else:
                validated[field] = None

        # Validate risk level
        risk_level = raw_kpis.get("riskLevel")
        if risk_level in ("low", "medium", "high"):
            validated["riskLevel"] = risk_level
        else:
            validated["riskLevel"] = None

        return validated

    async def classify_theme(self, idea: Idea) -> str:
        """
        Classify an idea into a theme category using LLM.

        Analyzes the idea content and assigns it to one of the predefined
        theme categories such as process_automation, customer_experience, etc.

        Args:
            idea: The idea to classify.

        Returns:
            Theme category string (e.g., "process_automation").
        """
        if not self.openai_client:
            logger.warning("OpenAI client not configured, skipping theme classification")
            return ""

        try:
            # Build the idea content for classification
            idea_content = self._build_idea_content(idea)

            messages = [
                {"role": "system", "content": IDEA_THEME_PROMPT},
                {"role": "user", "content": idea_content},
            ]

            # Use Azure OpenAI deployment if available
            model = self.chatgpt_deployment or self.chatgpt_model

            response = await self.openai_client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=0.2,
                max_tokens=256,
                response_format={"type": "json_object"},
            )

            content = response.choices[0].message.content
            if not content:
                logger.warning("Empty response from LLM for theme classification")
                return ""

            result = json.loads(content)

            # Validate the theme
            theme = self._validate_theme(result.get("theme", ""))

            logger.info(
                f"Classified idea {idea.idea_id} as theme '{theme}' "
                f"(confidence: {result.get('confidence', 'N/A')})"
            )
            return theme

        except Exception as e:
            logger.error(f"Error classifying theme for idea {idea.idea_id}: {e}")
            return ""

    def _validate_theme(self, theme: str) -> str:
        """
        Validate that the theme is one of the allowed categories.

        Args:
            theme: Theme string from LLM response.

        Returns:
            Validated theme string or empty string if invalid.
        """
        valid_themes = {
            "process_automation",
            "customer_experience",
            "data_analytics",
            "cost_optimization",
            "employee_experience",
            "digital_transformation",
            "quality_improvement",
            "innovation",
            "sustainability",
            "compliance_security",
        }

        theme_lower = theme.lower().strip() if theme else ""
        if theme_lower in valid_themes:
            return theme_lower
        return ""

    async def generate_embedding(self, text: str) -> list[float]:
        """
        Generate embedding vector for text.

        Uses Azure OpenAI embedding model to generate a vector representation
        of the input text for similarity search.

        Args:
            text: Text to embed.

        Returns:
            Embedding vector as list of floats.
        """
        if not self.openai_client:
            logger.warning("OpenAI client not configured, skipping embedding generation")
            return []

        if not text or not text.strip():
            logger.warning("Empty text provided for embedding generation")
            return []

        try:
            # Use Azure OpenAI deployment if available
            model = self.embedding_deployment or self.embedding_model

            # Truncate text if too long (embedding models have token limits)
            # text-embedding-ada-002 has 8191 token limit, roughly 4 chars per token
            max_chars = 30000
            if len(text) > max_chars:
                logger.info(f"Truncating text from {len(text)} to {max_chars} chars")
                text = text[:max_chars]

            response = await self.openai_client.embeddings.create(
                model=model,
                input=text,
            )

            embedding = response.data[0].embedding
            logger.info(
                f"Generated embedding with {len(embedding)} dimensions "
                f"for text of {len(text)} characters"
            )
            return embedding

        except Exception as e:
            logger.error(f"Error generating embedding: {e}")
            return []

    async def find_similar_ideas(
        self,
        text: str,
        threshold: float = 0.7,
        limit: int = 5,
        exclude_id: str | None = None,
    ) -> SimilarIdeasResponse:
        """
        Find ideas similar to the given text using vector similarity search.

        Uses Azure AI Search to find ideas with similar embeddings.
        Falls back to Cosmos DB query if search client is not available.

        Args:
            text: Text to find similar ideas for.
            threshold: Minimum similarity score (0-1).
            limit: Maximum number of results.
            exclude_id: Idea ID to exclude from results.

        Returns:
            Response containing similar ideas with scores.
        """
        similar_ideas: list[SimilarIdea] = []

        if not text or not text.strip():
            return SimilarIdeasResponse(similar_ideas=[], threshold=threshold)

        # Generate embedding for the input text
        query_embedding = await self.generate_embedding(text)
        if not query_embedding:
            logger.warning("Could not generate embedding for similarity search")
            return SimilarIdeasResponse(similar_ideas=[], threshold=threshold)

        # Try Azure AI Search first
        if self.search_client:
            try:
                similar_ideas = await self._search_similar_with_ai_search(
                    query_embedding=query_embedding,
                    threshold=threshold,
                    limit=limit,
                    exclude_id=exclude_id,
                )
            except Exception as e:
                # Log at debug level - falling back to Cosmos DB is expected behavior
                logger.debug(f"AI Search not available, using Cosmos DB fallback: {e}")
                # Fall back to Cosmos DB
                similar_ideas = await self._search_similar_with_cosmos(
                    query_embedding=query_embedding,
                    threshold=threshold,
                    limit=limit,
                    exclude_id=exclude_id,
                )
        else:
            # Use Cosmos DB fallback
            similar_ideas = await self._search_similar_with_cosmos(
                query_embedding=query_embedding,
                threshold=threshold,
                limit=limit,
                exclude_id=exclude_id,
            )

        return SimilarIdeasResponse(similar_ideas=similar_ideas, threshold=threshold)

    async def _search_similar_with_ai_search(
        self,
        query_embedding: list[float],
        threshold: float,
        limit: int,
        exclude_id: str | None,
    ) -> list[SimilarIdea]:
        """
        Search for similar ideas using Azure AI Search vector search.

        Args:
            query_embedding: The embedding vector to search with.
            threshold: Minimum similarity score (0-1).
            limit: Maximum number of results.
            exclude_id: Idea ID to exclude from results.

        Returns:
            List of similar ideas with scores.
        """
        from azure.search.documents.models import VectorizedQuery

        similar_ideas: list[SimilarIdea] = []

        try:
            # Create vector query
            vector_query = VectorizedQuery(
                vector=query_embedding,
                k=limit + 1,  # Request one extra in case we need to exclude
                fields="embedding",
            )

            # Build filter to exclude specific idea if provided
            filter_expr = None
            if exclude_id:
                filter_expr = f"id ne '{exclude_id}'"

            # Execute search
            results = await self.search_client.search(
                search_text=None,
                vector_queries=[vector_query],
                filter=filter_expr,
                top=limit + 1,
            )

            async for result in results:
                # Get similarity score (Azure AI Search returns @search.score)
                score = result.get("@search.score", 0)

                # Skip if below threshold
                if score < threshold:
                    continue

                # Skip excluded ID
                idea_id = result.get("id")
                if exclude_id and idea_id == exclude_id:
                    continue

                # Create SimilarIdea from search result
                similar_idea = SimilarIdea(
                    idea_id=idea_id,
                    title=result.get("title", ""),
                    summary=result.get("summary", ""),
                    similarity_score=score,
                    status=result.get("status", "submitted"),
                )
                similar_ideas.append(similar_idea)

                # Stop if we have enough results
                if len(similar_ideas) >= limit:
                    break

            logger.info(f"Found {len(similar_ideas)} similar ideas via AI Search")
            return similar_ideas

        except Exception as e:
            # Log at debug level since this is expected when ideas index is not configured
            logger.debug(f"AI Search similarity search not available: {e}")
            raise

    async def _search_similar_with_cosmos(
        self,
        query_embedding: list[float],
        threshold: float,
        limit: int,
        exclude_id: str | None,
    ) -> list[SimilarIdea]:
        """
        Search for similar ideas using Cosmos DB with in-memory cosine similarity.

        This is a fallback when Azure AI Search is not available.
        Note: This approach is less efficient for large datasets.

        Args:
            query_embedding: The embedding vector to search with.
            threshold: Minimum similarity score (0-1).
            limit: Maximum number of results.
            exclude_id: Idea ID to exclude from results.

        Returns:
            List of similar ideas with scores.
        """
        if not self.ideas_container:
            return []

        similar_ideas: list[SimilarIdea] = []

        try:
            # Query all ideas with embeddings
            query = "SELECT * FROM c WHERE IS_DEFINED(c.embedding) AND ARRAY_LENGTH(c.embedding) > 0"
            items = self.ideas_container.query_items(
                query=query,
            )

            async for item in items:
                idea_id = item.get("id")

                # Skip excluded ID
                if exclude_id and idea_id == exclude_id:
                    continue

                # Get embedding
                item_embedding = item.get("embedding", [])
                if not item_embedding:
                    continue

                # Calculate cosine similarity
                score = self._cosine_similarity(query_embedding, item_embedding)

                # Skip if below threshold
                if score < threshold:
                    continue

                # Create SimilarIdea
                similar_idea = SimilarIdea(
                    idea_id=idea_id,
                    title=item.get("title", ""),
                    summary=item.get("summary", ""),
                    similarity_score=score,
                    status=item.get("status", "submitted"),
                )
                similar_ideas.append(similar_idea)

            # Sort by similarity score (descending) and limit
            similar_ideas.sort(key=lambda x: x.similarity_score, reverse=True)
            similar_ideas = similar_ideas[:limit]

            logger.info(f"Found {len(similar_ideas)} similar ideas via Cosmos DB")
            return similar_ideas

        except Exception as e:
            logger.error(f"Cosmos DB similarity search error: {e}")
            return []

    @staticmethod
    def _cosine_similarity(vec1: list[float], vec2: list[float]) -> float:
        """
        Calculate cosine similarity between two vectors.

        Args:
            vec1: First vector.
            vec2: Second vector.

        Returns:
            Cosine similarity score (0-1).
        """
        if len(vec1) != len(vec2):
            return 0.0

        dot_product = sum(a * b for a, b in zip(vec1, vec2))
        magnitude1 = sum(a * a for a in vec1) ** 0.5
        magnitude2 = sum(b * b for b in vec2) ** 0.5

        if magnitude1 == 0 or magnitude2 == 0:
            return 0.0

        return dot_product / (magnitude1 * magnitude2)

    async def analyze_idea(self, idea: Idea) -> Idea:
        """
        Perform full LLM analysis on an idea.

        Generates summary, tags, embedding, KPI estimates, scores, and theme.

        Args:
            idea: The idea to analyze.

        Returns:
            The idea with analysis fields populated.
        """
        # Generate summary
        idea.summary = await self.generate_summary(idea)

        # Extract tags
        idea.tags = await self.extract_tags(idea)

        # Generate embedding
        text_for_embedding = idea.get_text_for_embedding()
        idea.embedding = await self.generate_embedding(text_for_embedding)

        # Extract KPI estimates
        idea.kpi_estimates = await self.extract_kpis(idea)

        # Calculate scores based on KPI estimates
        if idea.kpi_estimates:
            impact, feasibility, recommendation = self.scorer.calculate_scores(
                idea.kpi_estimates
            )
            idea.impact_score = impact
            idea.feasibility_score = feasibility
            idea.recommendation_class = recommendation

        # Classify theme
        idea.cluster_label = await self.classify_theme(idea)

        # Update analysis metadata
        idea.analyzed_at = int(time.time() * 1000)
        idea.analysis_version = "1.3"

        return idea

    # =========================================================================
    # Like Management Methods
    # =========================================================================

    async def add_like(self, idea_id: str, user_id: str) -> IdeaLike | None:
        """
        Add a like to an idea.

        A user can only like an idea once. If the user has already liked
        the idea, this method returns None.

        Args:
            idea_id: The unique identifier of the idea.
            user_id: The ID of the user adding the like.

        Returns:
            The created IdeaLike if successful, None if already liked.
        """
        if not self.ideas_container:
            raise ValueError("Ideas container not configured")

        # Check if user already liked this idea
        existing_like = await self._get_user_like(idea_id, user_id)
        if existing_like:
            logger.debug(f"User {user_id} already liked idea {idea_id}")
            return None

        # Create the like
        like = IdeaLike(
            like_id=str(uuid.uuid4()),
            idea_id=idea_id,
            user_id=user_id,
        )

        try:
            await self.ideas_container.create_item(body=like.to_cosmos_item())
            logger.info(f"User {user_id} liked idea {idea_id}")
            return like
        except Exception as e:
            logger.error(f"Error adding like to idea {idea_id}: {e}")
            raise

    async def remove_like(self, idea_id: str, user_id: str) -> bool:
        """
        Remove a like from an idea.

        Args:
            idea_id: The unique identifier of the idea.
            user_id: The ID of the user removing the like.

        Returns:
            True if the like was removed, False if not found.
        """
        if not self.ideas_container:
            raise ValueError("Ideas container not configured")

        # Find the user's like
        existing_like = await self._get_user_like(idea_id, user_id)
        if not existing_like:
            logger.debug(f"User {user_id} has not liked idea {idea_id}")
            return False

        try:
            await self.ideas_container.delete_item(
                item=existing_like.like_id,
                partition_key=existing_like.like_id
            )
            logger.info(f"User {user_id} removed like from idea {idea_id}")
            return True
        except CosmosResourceNotFoundError:
            return False
        except Exception as e:
            logger.error(f"Error removing like from idea {idea_id}: {e}")
            raise

    async def _get_user_like(self, idea_id: str, user_id: str) -> IdeaLike | None:
        """
        Get a user's like for a specific idea.

        Args:
            idea_id: The unique identifier of the idea.
            user_id: The ID of the user.

        Returns:
            The IdeaLike if found, None otherwise.
        """
        if not self.ideas_container:
            return None

        try:
            query = """
                SELECT * FROM c
                WHERE c.type = 'idea_like'
                AND c.ideaId = @ideaId
                AND c.userId = @userId
            """
            parameters = [
                {"name": "@ideaId", "value": idea_id},
                {"name": "@userId", "value": user_id},
            ]

            async for item in self.ideas_container.query_items(
                query=query,
                parameters=parameters,
            ):
                return IdeaLike.from_cosmos_item(item)

            return None
        except Exception as e:
            logger.error(f"Error getting user like: {e}")
            return None

    async def get_like_count(self, idea_id: str) -> int:
        """
        Get the total number of likes for an idea.

        Args:
            idea_id: The unique identifier of the idea.

        Returns:
            The number of likes.
        """
        if not self.ideas_container:
            return 0

        try:
            query = """
                SELECT VALUE COUNT(1) FROM c
                WHERE c.type = 'idea_like'
                AND c.ideaId = @ideaId
            """
            parameters = [{"name": "@ideaId", "value": idea_id}]

            async for count in self.ideas_container.query_items(
                query=query,
                parameters=parameters,
            ):
                return count

            return 0
        except Exception as e:
            logger.error(f"Error getting like count for idea {idea_id}: {e}")
            return 0

    async def has_user_liked(self, idea_id: str, user_id: str) -> bool:
        """
        Check if a user has liked an idea.

        Args:
            idea_id: The unique identifier of the idea.
            user_id: The ID of the user.

        Returns:
            True if the user has liked the idea, False otherwise.
        """
        like = await self._get_user_like(idea_id, user_id)
        return like is not None

    # =========================================================================
    # Comment Management Methods
    # =========================================================================

    async def create_comment(
        self,
        idea_id: str,
        user_id: str,
        content: str,
    ) -> IdeaComment:
        """
        Create a new comment on an idea.

        Args:
            idea_id: The unique identifier of the idea.
            user_id: The ID of the user creating the comment.
            content: The comment content.

        Returns:
            The created IdeaComment.
        """
        if not self.ideas_container:
            raise ValueError("Ideas container not configured")

        if not content or not content.strip():
            raise ValueError("Comment content cannot be empty")

        comment = IdeaComment(
            comment_id=str(uuid.uuid4()),
            idea_id=idea_id,
            user_id=user_id,
            content=content.strip(),
        )

        try:
            await self.ideas_container.create_item(body=comment.to_cosmos_item())
            logger.info(f"User {user_id} commented on idea {idea_id}")
            return comment
        except Exception as e:
            logger.error(f"Error creating comment on idea {idea_id}: {e}")
            raise

    async def get_comment(self, comment_id: str) -> IdeaComment | None:
        """
        Get a comment by its ID.

        Args:
            comment_id: The unique identifier of the comment.

        Returns:
            The IdeaComment if found, None otherwise.
        """
        if not self.ideas_container:
            return None

        try:
            item = await self.ideas_container.read_item(
                item=comment_id,
                partition_key=comment_id
            )
            if item.get("type") == "idea_comment":
                return IdeaComment.from_cosmos_item(item)
            return None
        except CosmosResourceNotFoundError:
            return None
        except Exception as e:
            logger.error(f"Error getting comment {comment_id}: {e}")
            return None

    async def update_comment(
        self,
        comment_id: str,
        content: str,
        user_id: str,
    ) -> IdeaComment | None:
        """
        Update an existing comment.

        Only the comment owner can update their comment.

        Args:
            comment_id: The unique identifier of the comment.
            content: The new comment content.
            user_id: The ID of the user updating the comment.

        Returns:
            The updated IdeaComment if successful, None if not found.

        Raises:
            PermissionError: If the user is not the comment owner.
        """
        if not self.ideas_container:
            raise ValueError("Ideas container not configured")

        if not content or not content.strip():
            raise ValueError("Comment content cannot be empty")

        # Get existing comment
        existing_comment = await self.get_comment(comment_id)
        if not existing_comment:
            return None

        # Check ownership
        if not existing_comment.is_owner(user_id):
            raise PermissionError("You can only edit your own comments")

        # Update the comment
        existing_comment.content = content.strip()
        existing_comment.update_timestamp()

        try:
            await self.ideas_container.upsert_item(
                body=existing_comment.to_cosmos_item()
            )
            logger.info(f"User {user_id} updated comment {comment_id}")
            return existing_comment
        except Exception as e:
            logger.error(f"Error updating comment {comment_id}: {e}")
            raise

    async def delete_comment(
        self,
        comment_id: str,
        user_id: str,
        is_admin: bool = False,
    ) -> bool:
        """
        Delete a comment.

        Only the comment owner or an admin can delete a comment.

        Args:
            comment_id: The unique identifier of the comment.
            user_id: The ID of the user deleting the comment.
            is_admin: Whether the user has admin privileges.

        Returns:
            True if deleted, False if not found.

        Raises:
            PermissionError: If the user is not authorized to delete.
        """
        if not self.ideas_container:
            raise ValueError("Ideas container not configured")

        # Get existing comment
        existing_comment = await self.get_comment(comment_id)
        if not existing_comment:
            return False

        # Check authorization
        if not is_admin and not existing_comment.is_owner(user_id):
            raise PermissionError("You can only delete your own comments")

        try:
            await self.ideas_container.delete_item(
                item=comment_id,
                partition_key=comment_id
            )
            logger.info(f"User {user_id} deleted comment {comment_id}")
            return True
        except CosmosResourceNotFoundError:
            return False
        except Exception as e:
            logger.error(f"Error deleting comment {comment_id}: {e}")
            raise

    async def list_comments(
        self,
        idea_id: str,
        page: int = 1,
        page_size: int = 20,
        sort_order: str = "asc",
    ) -> IdeaCommentsResponse:
        """
        List comments for an idea with pagination.

        Args:
            idea_id: The unique identifier of the idea.
            page: Page number (1-indexed).
            page_size: Number of items per page.
            sort_order: Sort direction (asc/desc by creation time).

        Returns:
            Paginated list of comments.
        """
        if not self.ideas_container:
            return IdeaCommentsResponse(
                comments=[],
                total_count=0,
                page=page,
                page_size=page_size,
                has_more=False,
            )

        try:
            # Count query
            count_query = """
                SELECT VALUE COUNT(1) FROM c
                WHERE c.type = 'idea_comment'
                AND c.ideaId = @ideaId
            """
            parameters = [{"name": "@ideaId", "value": idea_id}]

            total_count = 0
            async for count in self.ideas_container.query_items(
                query=count_query,
                parameters=parameters,
            ):
                total_count = count
                break

            # Data query with pagination
            order_direction = "ASC" if sort_order.lower() == "asc" else "DESC"
            offset = (page - 1) * page_size

            data_query = f"""
                SELECT * FROM c
                WHERE c.type = 'idea_comment'
                AND c.ideaId = @ideaId
                ORDER BY c.createdAt {order_direction}
                OFFSET @offset LIMIT @limit
            """
            data_parameters = parameters + [
                {"name": "@offset", "value": offset},
                {"name": "@limit", "value": page_size},
            ]

            comments = []
            async for item in self.ideas_container.query_items(
                query=data_query,
                parameters=data_parameters,
            ):
                comments.append(IdeaComment.from_cosmos_item(item))

            has_more = (offset + len(comments)) < total_count

            return IdeaCommentsResponse(
                comments=comments,
                total_count=total_count,
                page=page,
                page_size=page_size,
                has_more=has_more,
            )

        except Exception as e:
            logger.error(f"Error listing comments for idea {idea_id}: {e}")
            return IdeaCommentsResponse(
                comments=[],
                total_count=0,
                page=page,
                page_size=page_size,
                has_more=False,
            )

    async def get_comment_count(self, idea_id: str) -> int:
        """
        Get the total number of comments for an idea.

        Args:
            idea_id: The unique identifier of the idea.

        Returns:
            The number of comments.
        """
        if not self.ideas_container:
            return 0

        try:
            query = """
                SELECT VALUE COUNT(1) FROM c
                WHERE c.type = 'idea_comment'
                AND c.ideaId = @ideaId
            """
            parameters = [{"name": "@ideaId", "value": idea_id}]

            async for count in self.ideas_container.query_items(
                query=query,
                parameters=parameters,
            ):
                return count

            return 0
        except Exception as e:
            logger.error(f"Error getting comment count for idea {idea_id}: {e}")
            return 0

    # =========================================================================
    # Engagement Aggregation Methods
    # =========================================================================

    async def get_idea_engagement(
        self,
        idea_id: str,
        user_id: str | None = None,
    ) -> IdeaEngagement:
        """
        Get aggregated engagement metrics for an idea.

        Args:
            idea_id: The unique identifier of the idea.
            user_id: Optional user ID to check if they have liked the idea.

        Returns:
            IdeaEngagement with like count, comment count, and user status.
        """
        like_count = await self.get_like_count(idea_id)
        comment_count = await self.get_comment_count(idea_id)
        user_has_liked = False

        if user_id:
            user_has_liked = await self.has_user_liked(idea_id, user_id)

        return IdeaEngagement(
            idea_id=idea_id,
            like_count=like_count,
            comment_count=comment_count,
            user_has_liked=user_has_liked,
        )

    async def get_bulk_engagement(
        self,
        idea_ids: list[str],
        user_id: str | None = None,
    ) -> dict[str, IdeaEngagement]:
        """
        Get engagement metrics for multiple ideas efficiently.

        Args:
            idea_ids: List of idea IDs.
            user_id: Optional user ID to check likes.

        Returns:
            Dictionary mapping idea IDs to their engagement metrics.
        """
        result = {}

        # For now, fetch individually (can be optimized with batch queries)
        for idea_id in idea_ids:
            result[idea_id] = await self.get_idea_engagement(idea_id, user_id)

        return result
