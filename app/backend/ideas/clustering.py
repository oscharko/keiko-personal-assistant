"""
Batch clustering for Ideas Hub.

Implements algorithmic clustering using K-Means or HDBSCAN to group
ideas by semantic similarity based on their embeddings.
"""

import logging
from typing import TYPE_CHECKING, Any, Optional

import numpy as np
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score

if TYPE_CHECKING:
    from openai import AsyncOpenAI

logger = logging.getLogger(__name__)


class IdeaClusterer:
    """
    Clusters ideas based on their embeddings using K-Means algorithm.

    Uses silhouette score to determine optimal number of clusters.
    """

    def __init__(
        self,
        openai_client: Optional["AsyncOpenAI"] = None,
        chatgpt_model: str = "gpt-4o-mini",
        chatgpt_deployment: Optional[str] = None,
        min_clusters: int = 3,
        max_clusters: int = 10,
        min_ideas_per_cluster: int = 3,
    ):
        """
        Initialize the idea clusterer.

        Args:
            openai_client: AsyncOpenAI client for LLM calls.
            chatgpt_model: Model name for chat completions.
            chatgpt_deployment: Azure OpenAI deployment name (optional).
            min_clusters: Minimum number of clusters to try.
            max_clusters: Maximum number of clusters to try.
            min_ideas_per_cluster: Minimum ideas required per cluster.
        """
        self.openai_client = openai_client
        self.chatgpt_model = chatgpt_model
        self.chatgpt_deployment = chatgpt_deployment
        self.min_clusters = min_clusters
        self.max_clusters = max_clusters
        self.min_ideas_per_cluster = min_ideas_per_cluster

    def _find_optimal_clusters(
        self,
        embeddings: np.ndarray,
    ) -> int:
        """
        Find optimal number of clusters using silhouette score.

        Args:
            embeddings: Array of embeddings (n_samples, n_features).

        Returns:
            Optimal number of clusters.
        """
        n_samples = len(embeddings)

        # Adjust max_clusters based on available samples
        max_k = min(self.max_clusters, n_samples // self.min_ideas_per_cluster)
        min_k = min(self.min_clusters, max_k)

        if max_k < min_k:
            logger.warning(
                f"Not enough ideas for clustering: {n_samples} ideas, "
                f"need at least {self.min_clusters * self.min_ideas_per_cluster}"
            )
            return min_k

        best_score = -1
        best_k = min_k

        for k in range(min_k, max_k + 1):
            try:
                kmeans = KMeans(n_clusters=k, random_state=42, n_init=10)
                labels = kmeans.fit_predict(embeddings)

                # Calculate silhouette score
                score = silhouette_score(embeddings, labels)

                logger.debug(f"K={k}, silhouette score={score:.3f}")

                if score > best_score:
                    best_score = score
                    best_k = k

            except Exception as e:
                logger.warning(f"Error calculating silhouette for k={k}: {e}")
                continue

        logger.info(
            f"Optimal number of clusters: {best_k} "
            f"(silhouette score: {best_score:.3f})"
        )
        return best_k

    def cluster_ideas(
        self,
        embeddings: list[list[float]],
        n_clusters: Optional[int] = None,
    ) -> tuple[list[int], int]:
        """
        Cluster ideas based on their embeddings.

        Args:
            embeddings: List of embedding vectors.
            n_clusters: Number of clusters (if None, will be determined automatically).

        Returns:
            Tuple of (cluster labels, number of clusters).
        """
        if not embeddings:
            logger.warning("No embeddings provided for clustering")
            return [], 0

        # Convert to numpy array
        embeddings_array = np.array(embeddings)

        # Determine optimal number of clusters if not provided
        if n_clusters is None:
            n_clusters = self._find_optimal_clusters(embeddings_array)

        # Perform clustering
        try:
            kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
            labels = kmeans.fit_predict(embeddings_array)

            logger.info(
                f"Clustered {len(embeddings)} ideas into {n_clusters} clusters"
            )

            return labels.tolist(), n_clusters

        except Exception as e:
            logger.error(f"Error during clustering: {e}")
            return [0] * len(embeddings), 1

    async def generate_cluster_label(
        self,
        idea_titles: list[str],
        idea_summaries: list[str],
    ) -> str:
        """
        Generate a descriptive label for a cluster using LLM.

        Args:
            idea_titles: List of idea titles in the cluster.
            idea_summaries: List of idea summaries in the cluster.

        Returns:
            Generated cluster label.
        """
        if not self.openai_client:
            logger.warning("OpenAI client not available for cluster labeling")
            return "Uncategorized"

        if not idea_titles:
            return "Empty Cluster"

        try:
            # Prepare ideas text
            ideas_text = "\n".join(
                f"- {title}: {summary}"
                for title, summary in zip(idea_titles, idea_summaries)
            )

            # Prepare prompt
            prompt = f"""Analyze the following ideas and generate a short, descriptive theme label (2-4 words) that captures their common topic.

Ideas:
{ideas_text}

Generate a concise theme label in German that describes what these ideas have in common.
Examples: "Prozessautomatisierung", "Kundensupport", "Entwicklungsprozesse", "Vertrieb & Marketing"

Theme label:"""

            # Call LLM
            kwargs: dict[str, Any] = {
                "model": self.chatgpt_model,
                "messages": [
                    {
                        "role": "system",
                        "content": "You are an expert at analyzing and categorizing business ideas.",
                    },
                    {"role": "user", "content": prompt},
                ],
                "temperature": 0.3,
                "max_tokens": 50,
            }

            if self.chatgpt_deployment:
                kwargs["model"] = self.chatgpt_deployment

            response = await self.openai_client.chat.completions.create(**kwargs)

            label = response.choices[0].message.content.strip()

            # Clean up the label
            label = label.strip('"').strip("'").strip()

            logger.info(f"Generated cluster label: {label}")
            return label

        except Exception as e:
            logger.error(f"Error generating cluster label: {e}")
            return "Uncategorized"

