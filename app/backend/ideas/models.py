"""
Data models for the Ideas Hub module.

This module defines the data structures for idea submission, analysis,
and management. Models follow the dataclass pattern with Cosmos DB
serialization support.
"""

import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Any


class IdeaStatus(str, Enum):
    """Status of an idea in the workflow."""

    DRAFT = "draft"
    SUBMITTED = "submitted"
    UNDER_REVIEW = "under_review"
    APPROVED = "approved"
    REJECTED = "rejected"
    IMPLEMENTED = "implemented"


class RecommendationClass(str, Enum):
    """Recommendation classification based on impact and feasibility scores."""

    QUICK_WIN = "quick_win"  # High feasibility, medium+ impact
    HIGH_LEVERAGE = "high_leverage"  # High impact, high feasibility
    STRATEGIC = "strategic"  # High impact, lower feasibility
    EVALUATE = "evaluate"  # Lower scores, needs review
    UNCLASSIFIED = "unclassified"  # Not yet classified


@dataclass
class IdeaKPIEstimates:
    """
    KPI estimates extracted from an idea by LLM analysis.

    All values are estimates and may be None if not applicable.
    """

    time_savings_hours: float | None = None
    cost_reduction_eur: float | None = None
    quality_improvement_percent: float | None = None
    employee_satisfaction_impact: float | None = None  # -100 to 100
    scalability_potential: float | None = None  # 0 to 100
    implementation_effort_days: float | None = None
    risk_level: str | None = None  # low, medium, high

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "timeSavingsHours": self.time_savings_hours,
            "costReductionEur": self.cost_reduction_eur,
            "qualityImprovementPercent": self.quality_improvement_percent,
            "employeeSatisfactionImpact": self.employee_satisfaction_impact,
            "scalabilityPotential": self.scalability_potential,
            "implementationEffortDays": self.implementation_effort_days,
            "riskLevel": self.risk_level,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "IdeaKPIEstimates":
        """Create instance from dictionary."""
        return cls(
            time_savings_hours=data.get("timeSavingsHours"),
            cost_reduction_eur=data.get("costReductionEur"),
            quality_improvement_percent=data.get("qualityImprovementPercent"),
            employee_satisfaction_impact=data.get("employeeSatisfactionImpact"),
            scalability_potential=data.get("scalabilityPotential"),
            implementation_effort_days=data.get("implementationEffortDays"),
            risk_level=data.get("riskLevel"),
        )


@dataclass
class Idea:
    """
    Represents an idea submitted by an employee.

    Contains both user-provided fields and LLM-generated analysis fields.
    """

    # Core identification
    idea_id: str
    submitter_id: str

    # User-provided content
    title: str
    description: str
    problem_description: str = ""
    expected_benefit: str = ""
    affected_processes: list[str] = field(default_factory=list)
    target_users: list[str] = field(default_factory=list)

    # Metadata
    department: str = ""
    status: IdeaStatus = IdeaStatus.SUBMITTED
    created_at: int = field(default_factory=lambda: int(time.time() * 1000))
    updated_at: int = field(default_factory=lambda: int(time.time() * 1000))

    # LLM-generated fields (populated after analysis)
    summary: str = ""
    tags: list[str] = field(default_factory=list)
    embedding: list[float] = field(default_factory=list)

    # Scoring fields (Phase 2)
    impact_score: float = 0.0
    feasibility_score: float = 0.0
    recommendation_class: str = RecommendationClass.UNCLASSIFIED.value

    # KPI estimates (Phase 2)
    kpi_estimates: dict[str, Any] = field(default_factory=dict)

    # Clustering (Phase 3)
    cluster_label: str = ""

    # Analysis metadata
    analyzed_at: int = 0
    analysis_version: str = ""

    def to_cosmos_item(self) -> dict[str, Any]:
        """
        Convert the idea to a Cosmos DB document format.

        Returns:
            Dictionary representation suitable for Cosmos DB storage.
        """
        return {
            "id": self.idea_id,
            "ideaId": self.idea_id,
            "type": "idea",
            "submitterId": self.submitter_id,
            "title": self.title,
            "description": self.description,
            "problemDescription": self.problem_description,
            "expectedBenefit": self.expected_benefit,
            "affectedProcesses": self.affected_processes,
            "targetUsers": self.target_users,
            "department": self.department,
            "status": self.status.value if isinstance(self.status, IdeaStatus) else self.status,
            "createdAt": self.created_at,
            "updatedAt": self.updated_at,
            "summary": self.summary,
            "tags": self.tags,
            "embedding": self.embedding,
            "impactScore": self.impact_score,
            "feasibilityScore": self.feasibility_score,
            "recommendationClass": self.recommendation_class,
            "kpiEstimates": self.kpi_estimates,
            "clusterLabel": self.cluster_label,
            "analyzedAt": self.analyzed_at,
            "analysisVersion": self.analysis_version,
        }

    @classmethod
    def from_cosmos_item(cls, item: dict[str, Any]) -> "Idea":
        """
        Create an Idea instance from a Cosmos DB document.

        Args:
            item: Dictionary from Cosmos DB query result.

        Returns:
            Idea instance populated with document data.
        """
        status_value = item.get("status", IdeaStatus.SUBMITTED.value)
        try:
            status = IdeaStatus(status_value)
        except ValueError:
            status = IdeaStatus.SUBMITTED

        return cls(
            idea_id=item.get("ideaId", item.get("id", "")),
            submitter_id=item.get("submitterId", ""),
            title=item.get("title", ""),
            description=item.get("description", ""),
            problem_description=item.get("problemDescription", ""),
            expected_benefit=item.get("expectedBenefit", ""),
            affected_processes=item.get("affectedProcesses", []),
            target_users=item.get("targetUsers", []),
            department=item.get("department", ""),
            status=status,
            created_at=item.get("createdAt", 0),
            updated_at=item.get("updatedAt", 0),
            summary=item.get("summary", ""),
            tags=item.get("tags", []),
            embedding=item.get("embedding", []),
            impact_score=item.get("impactScore", 0.0),
            feasibility_score=item.get("feasibilityScore", 0.0),
            recommendation_class=item.get("recommendationClass", RecommendationClass.UNCLASSIFIED.value),
            kpi_estimates=item.get("kpiEstimates", {}),
            cluster_label=item.get("clusterLabel", ""),
            analyzed_at=item.get("analyzedAt", 0),
            analysis_version=item.get("analysisVersion", ""),
        )

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary for JSON API response."""
        return self.to_cosmos_item()

    def update_timestamp(self) -> None:
        """Update the updated_at timestamp to current time."""
        self.updated_at = int(time.time() * 1000)

    def is_owner(self, user_id: str) -> bool:
        """Check if the given user is the owner of this idea."""
        return self.submitter_id == user_id

    def can_be_edited(self) -> bool:
        """Check if the idea can still be edited."""
        return self.status in [IdeaStatus.DRAFT, IdeaStatus.SUBMITTED]

    def get_text_for_embedding(self) -> str:
        """Get combined text for embedding generation."""
        parts = [self.title, self.description]
        if self.problem_description:
            parts.append(self.problem_description)
        if self.expected_benefit:
            parts.append(self.expected_benefit)
        return " ".join(parts)


@dataclass
class IdeaListResponse:
    """Response model for paginated idea list."""

    ideas: list[Idea]
    total_count: int
    page: int
    page_size: int
    has_more: bool

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary for JSON response."""
        return {
            "ideas": [idea.to_cosmos_item() for idea in self.ideas],
            "totalCount": self.total_count,
            "page": self.page,
            "pageSize": self.page_size,
            "hasMore": self.has_more,
        }


@dataclass
class SimilarIdea:
    """Represents a similar idea found during duplicate detection."""

    idea: Idea
    similarity_score: float

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary for JSON response."""
        return {
            "idea": self.idea.to_cosmos_item(),
            "similarityScore": self.similarity_score,
        }


@dataclass
class SimilarIdeasResponse:
    """Response model for similar ideas search."""

    similar_ideas: list[SimilarIdea]
    threshold: float

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary for JSON response."""
        return {
            "similarIdeas": [si.to_dict() for si in self.similar_ideas],
            "threshold": self.threshold,
        }


@dataclass
class IdeaLike:
    """
    Represents a like on an idea.

    Stores the relationship between a user and an idea they liked.
    """

    like_id: str
    idea_id: str
    user_id: str
    created_at: int = field(default_factory=lambda: int(time.time() * 1000))

    def to_cosmos_item(self) -> dict[str, Any]:
        """Convert to Cosmos DB document format."""
        return {
            "id": self.like_id,
            "likeId": self.like_id,
            "ideaId": self.idea_id,
            "userId": self.user_id,
            "createdAt": self.created_at,
            "type": "idea_like",
        }

    @classmethod
    def from_cosmos_item(cls, item: dict[str, Any]) -> "IdeaLike":
        """Create an IdeaLike instance from a Cosmos DB document."""
        return cls(
            like_id=item.get("likeId", item.get("id", "")),
            idea_id=item.get("ideaId", ""),
            user_id=item.get("userId", ""),
            created_at=item.get("createdAt", 0),
        )

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary for JSON API response."""
        return {
            "likeId": self.like_id,
            "ideaId": self.idea_id,
            "userId": self.user_id,
            "createdAt": self.created_at,
        }


@dataclass
class IdeaComment:
    """
    Represents a comment on an idea.

    Allows team members to provide feedback and discuss ideas.
    """

    comment_id: str
    idea_id: str
    user_id: str
    content: str
    created_at: int = field(default_factory=lambda: int(time.time() * 1000))
    updated_at: int = field(default_factory=lambda: int(time.time() * 1000))

    def to_cosmos_item(self) -> dict[str, Any]:
        """Convert to Cosmos DB document format."""
        return {
            "id": self.comment_id,
            "commentId": self.comment_id,
            "ideaId": self.idea_id,
            "userId": self.user_id,
            "content": self.content,
            "createdAt": self.created_at,
            "updatedAt": self.updated_at,
            "type": "idea_comment",
        }

    @classmethod
    def from_cosmos_item(cls, item: dict[str, Any]) -> "IdeaComment":
        """Create an IdeaComment instance from a Cosmos DB document."""
        return cls(
            comment_id=item.get("commentId", item.get("id", "")),
            idea_id=item.get("ideaId", ""),
            user_id=item.get("userId", ""),
            content=item.get("content", ""),
            created_at=item.get("createdAt", 0),
            updated_at=item.get("updatedAt", 0),
        )

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary for JSON API response."""
        return {
            "commentId": self.comment_id,
            "ideaId": self.idea_id,
            "userId": self.user_id,
            "content": self.content,
            "createdAt": self.created_at,
            "updatedAt": self.updated_at,
        }

    def update_timestamp(self) -> None:
        """Update the updated_at timestamp to current time."""
        self.updated_at = int(time.time() * 1000)

    def is_owner(self, user_id: str) -> bool:
        """Check if the given user is the owner of this comment."""
        return self.user_id == user_id


@dataclass
class IdeaCommentsResponse:
    """Response model for paginated comment list."""

    comments: list[IdeaComment]
    total_count: int
    page: int
    page_size: int
    has_more: bool

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary for JSON response."""
        return {
            "comments": [comment.to_dict() for comment in self.comments],
            "totalCount": self.total_count,
            "page": self.page,
            "pageSize": self.page_size,
            "hasMore": self.has_more,
        }


@dataclass
class IdeaEngagement:
    """
    Aggregated engagement metrics for an idea.

    Contains like count, comment count, and user-specific status.
    """

    idea_id: str
    like_count: int = 0
    comment_count: int = 0
    user_has_liked: bool = False

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary for JSON API response."""
        return {
            "ideaId": self.idea_id,
            "likeCount": self.like_count,
            "commentCount": self.comment_count,
            "userHasLiked": self.user_has_liked,
        }

