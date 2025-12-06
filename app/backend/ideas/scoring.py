"""
Scoring module for the Ideas Hub.

This module implements the scoring algorithms for calculating impact
and feasibility scores based on KPI estimates and configurable weights.
"""

import logging
from dataclasses import dataclass
from typing import Any

from .models import RecommendationClass

logger = logging.getLogger(__name__)


# Default weights for impact score calculation
DEFAULT_IMPACT_WEIGHTS = {
    "time_savings": 0.20,
    "cost_reduction": 0.25,
    "quality_improvement": 0.20,
    "employee_satisfaction": 0.15,
    "scalability": 0.20,
}

# Default weights for feasibility score calculation
DEFAULT_FEASIBILITY_WEIGHTS = {
    "implementation_effort": 0.35,
    "risk_level": 0.35,
    "complexity": 0.30,
}

# Normalization ranges for KPI values
KPI_NORMALIZATION_RANGES = {
    "timeSavingsHours": (0, 500),  # 0-500 hours/month
    "costReductionEur": (0, 500000),  # 0-500k EUR/year
    "qualityImprovementPercent": (0, 100),  # 0-100%
    "employeeSatisfactionImpact": (-100, 100),  # -100 to 100
    "scalabilityPotential": (0, 100),  # 0-100
    "implementationEffortDays": (1, 365),  # 1-365 days (inverted)
}

# Risk level to score mapping
RISK_LEVEL_SCORES = {
    "low": 100,
    "medium": 50,
    "high": 10,
}


@dataclass
class ScoringConfig:
    """Configuration for scoring calculations."""

    impact_weights: dict[str, float]
    feasibility_weights: dict[str, float]

    @classmethod
    def default(cls) -> "ScoringConfig":
        """Create default scoring configuration."""
        return cls(
            impact_weights=DEFAULT_IMPACT_WEIGHTS.copy(),
            feasibility_weights=DEFAULT_FEASIBILITY_WEIGHTS.copy(),
        )

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "ScoringConfig":
        """Create configuration from dictionary."""
        return cls(
            impact_weights=data.get("impactWeights", DEFAULT_IMPACT_WEIGHTS.copy()),
            feasibility_weights=data.get(
                "feasibilityWeights", DEFAULT_FEASIBILITY_WEIGHTS.copy()
            ),
        )


class IdeaScorer:
    """
    Calculates impact and feasibility scores for ideas.

    Uses configurable weights and normalization to produce
    scores on a 0-100 scale.
    """

    def __init__(self, config: ScoringConfig | None = None):
        """
        Initialize the scorer.

        Args:
            config: Scoring configuration. Uses defaults if not provided.
        """
        self.config = config or ScoringConfig.default()

    def normalize_value(
        self,
        value: float | None,
        min_val: float,
        max_val: float,
        invert: bool = False,
    ) -> float:
        """
        Normalize a value to 0-100 scale.

        Args:
            value: The value to normalize.
            min_val: Minimum expected value.
            max_val: Maximum expected value.
            invert: If True, higher input values result in lower scores.

        Returns:
            Normalized value between 0 and 100.
        """
        if value is None:
            return 0.0

        # Clamp value to range
        clamped = max(min_val, min(max_val, value))

        # Calculate normalized value
        if max_val == min_val:
            normalized = 50.0
        else:
            normalized = ((clamped - min_val) / (max_val - min_val)) * 100

        if invert:
            normalized = 100 - normalized

        return normalized

    def calculate_impact_score(self, kpi_estimates: dict[str, Any]) -> float:
        """
        Calculate the impact score based on KPI estimates.

        Uses weighted sum of normalized KPI values.

        Args:
            kpi_estimates: Dictionary of KPI estimates.

        Returns:
            Impact score between 0 and 100.
        """
        if not kpi_estimates:
            return 0.0

        weights = self.config.impact_weights
        total_weight = 0.0
        weighted_sum = 0.0

        # Time savings contribution
        time_savings = kpi_estimates.get("timeSavingsHours")
        if time_savings is not None:
            min_val, max_val = KPI_NORMALIZATION_RANGES["timeSavingsHours"]
            normalized = self.normalize_value(time_savings, min_val, max_val)
            weighted_sum += normalized * weights.get("time_savings", 0.2)
            total_weight += weights.get("time_savings", 0.2)

        # Cost reduction contribution
        cost_reduction = kpi_estimates.get("costReductionEur")
        if cost_reduction is not None:
            min_val, max_val = KPI_NORMALIZATION_RANGES["costReductionEur"]
            normalized = self.normalize_value(cost_reduction, min_val, max_val)
            weighted_sum += normalized * weights.get("cost_reduction", 0.25)
            total_weight += weights.get("cost_reduction", 0.25)

        # Quality improvement contribution
        quality = kpi_estimates.get("qualityImprovementPercent")
        if quality is not None:
            min_val, max_val = KPI_NORMALIZATION_RANGES["qualityImprovementPercent"]
            normalized = self.normalize_value(quality, min_val, max_val)
            weighted_sum += normalized * weights.get("quality_improvement", 0.2)
            total_weight += weights.get("quality_improvement", 0.2)

        # Employee satisfaction contribution
        satisfaction = kpi_estimates.get("employeeSatisfactionImpact")
        if satisfaction is not None:
            min_val, max_val = KPI_NORMALIZATION_RANGES["employeeSatisfactionImpact"]
            normalized = self.normalize_value(satisfaction, min_val, max_val)
            weighted_sum += normalized * weights.get("employee_satisfaction", 0.15)
            total_weight += weights.get("employee_satisfaction", 0.15)

        # Scalability contribution
        scalability = kpi_estimates.get("scalabilityPotential")
        if scalability is not None:
            min_val, max_val = KPI_NORMALIZATION_RANGES["scalabilityPotential"]
            normalized = self.normalize_value(scalability, min_val, max_val)
            weighted_sum += normalized * weights.get("scalability", 0.2)
            total_weight += weights.get("scalability", 0.2)

        # Calculate final score
        if total_weight > 0:
            impact_score = weighted_sum / total_weight
        else:
            impact_score = 0.0

        return round(impact_score, 2)

    def calculate_feasibility_score(self, kpi_estimates: dict[str, Any]) -> float:
        """
        Calculate the feasibility score based on KPI estimates.

        Higher scores indicate easier implementation.

        Args:
            kpi_estimates: Dictionary of KPI estimates.

        Returns:
            Feasibility score between 0 and 100.
        """
        if not kpi_estimates:
            return 0.0

        weights = self.config.feasibility_weights
        total_weight = 0.0
        weighted_sum = 0.0

        # Implementation effort contribution (inverted - less effort = higher score)
        effort = kpi_estimates.get("implementationEffortDays")
        if effort is not None:
            min_val, max_val = KPI_NORMALIZATION_RANGES["implementationEffortDays"]
            normalized = self.normalize_value(effort, min_val, max_val, invert=True)
            weighted_sum += normalized * weights.get("implementation_effort", 0.35)
            total_weight += weights.get("implementation_effort", 0.35)

        # Risk level contribution
        risk_level = kpi_estimates.get("riskLevel")
        if risk_level is not None:
            risk_score = RISK_LEVEL_SCORES.get(risk_level, 50)
            weighted_sum += risk_score * weights.get("risk_level", 0.35)
            total_weight += weights.get("risk_level", 0.35)

        # Complexity contribution (derived from effort and risk)
        if effort is not None and risk_level is not None:
            # Complexity is a combination of effort and risk
            effort_norm = self.normalize_value(
                effort,
                *KPI_NORMALIZATION_RANGES["implementationEffortDays"],
                invert=True,
            )
            risk_score = RISK_LEVEL_SCORES.get(risk_level, 50)
            complexity_score = (effort_norm + risk_score) / 2
            weighted_sum += complexity_score * weights.get("complexity", 0.3)
            total_weight += weights.get("complexity", 0.3)

        # Calculate final score
        if total_weight > 0:
            feasibility_score = weighted_sum / total_weight
        else:
            feasibility_score = 0.0

        return round(feasibility_score, 2)

    def determine_recommendation_class(
        self,
        impact_score: float,
        feasibility_score: float,
    ) -> str:
        """
        Determine the recommendation class based on scores.

        Classification rules (according to specification):
        - Quick Win: impactScore >= 70 AND feasibilityScore >= 60
        - High Leverage: impactScore >= 80 AND feasibilityScore < 60
        - Strategic: impactScore >= 60 AND feasibilityScore >= 40
        - Evaluate: All other cases

        Args:
            impact_score: Impact score (0-100).
            feasibility_score: Feasibility score (0-100).

        Returns:
            Recommendation class value.
        """
        # Quick Win: High impact and high feasibility
        if impact_score >= 70 and feasibility_score >= 60:
            return RecommendationClass.QUICK_WIN.value

        # High Leverage: Very high impact but lower feasibility
        if impact_score >= 80 and feasibility_score < 60:
            return RecommendationClass.HIGH_LEVERAGE.value

        # Strategic: Good impact and reasonable feasibility
        if impact_score >= 60 and feasibility_score >= 40:
            return RecommendationClass.STRATEGIC.value

        # Evaluate: Lower scores, needs review
        return RecommendationClass.EVALUATE.value

    def calculate_scores(
        self,
        kpi_estimates: dict[str, Any],
    ) -> tuple[float, float, str]:
        """
        Calculate all scores for an idea.

        Args:
            kpi_estimates: Dictionary of KPI estimates.

        Returns:
            Tuple of (impact_score, feasibility_score, recommendation_class).
        """
        impact_score = self.calculate_impact_score(kpi_estimates)
        feasibility_score = self.calculate_feasibility_score(kpi_estimates)
        recommendation_class = self.determine_recommendation_class(
            impact_score, feasibility_score
        )

        logger.info(
            f"Calculated scores: impact={impact_score}, "
            f"feasibility={feasibility_score}, "
            f"recommendation={recommendation_class}"
        )

        return impact_score, feasibility_score, recommendation_class

