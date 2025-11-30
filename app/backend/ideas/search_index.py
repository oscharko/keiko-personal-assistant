"""
Azure AI Search index schema and management for the Ideas Hub module.

This module defines the search index schema for ideas with text fields,
vector fields for similarity search, and filterable metadata fields.
"""

import logging
from typing import Any, Optional

from azure.core.credentials import AzureKeyCredential, TokenCredential
from azure.search.documents.indexes import SearchIndexClient
from azure.search.documents.indexes.models import (
    HnswAlgorithmConfiguration,
    SearchableField,
    SearchField,
    SearchFieldDataType,
    SearchIndex,
    SimpleField,
    VectorSearch,
    VectorSearchProfile,
)

logger = logging.getLogger(__name__)

# Default index name for ideas
IDEAS_INDEX_NAME = "ideas-index"

# Embedding dimensions for text-embedding-ada-002
EMBEDDING_DIMENSIONS = 1536


class IdeasSearchIndexManager:
    """
    Manages the Azure AI Search index for ideas.

    Handles index creation, updates, and schema management.
    """

    def __init__(
        self,
        endpoint: str,
        credential: TokenCredential | AzureKeyCredential,
        index_name: str = IDEAS_INDEX_NAME,
        embedding_dimensions: int = EMBEDDING_DIMENSIONS,
    ):
        """
        Initialize the search index manager.

        Args:
            endpoint: Azure AI Search endpoint URL.
            credential: Azure credential for authentication.
            index_name: Name of the search index.
            embedding_dimensions: Dimensions of the embedding vectors.
        """
        self.endpoint = endpoint
        self.credential = credential
        self.index_name = index_name
        self.embedding_dimensions = embedding_dimensions
        self._client: Optional[SearchIndexClient] = None

    @property
    def client(self) -> SearchIndexClient:
        """Get or create the search index client."""
        if self._client is None:
            self._client = SearchIndexClient(
                endpoint=self.endpoint,
                credential=self.credential
            )
        return self._client

    def get_index_schema(self) -> SearchIndex:
        """
        Get the search index schema for ideas.

        Returns:
            SearchIndex object with the complete schema definition.
        """
        # Vector search configuration
        vector_search = VectorSearch(
            algorithms=[
                HnswAlgorithmConfiguration(
                    name="ideas-hnsw-config",
                    parameters={
                        "m": 4,
                        "efConstruction": 400,
                        "efSearch": 500,
                        "metric": "cosine"
                    }
                )
            ],
            profiles=[
                VectorSearchProfile(
                    name="ideas-vector-profile",
                    algorithm_configuration_name="ideas-hnsw-config"
                )
            ]
        )

        # Define fields
        fields = [
            # Primary key
            SimpleField(
                name="id",
                type=SearchFieldDataType.String,
                key=True,
                filterable=True
            ),
            # Core text fields (searchable)
            SearchableField(
                name="title",
                type=SearchFieldDataType.String,
                searchable=True,
                filterable=False,
                sortable=True
            ),
            SearchableField(
                name="description",
                type=SearchFieldDataType.String,
                searchable=True,
                filterable=False,
                sortable=False
            ),
            SearchableField(
                name="problemDescription",
                type=SearchFieldDataType.String,
                searchable=True,
                filterable=False,
                sortable=False
            ),
            SearchableField(
                name="expectedBenefit",
                type=SearchFieldDataType.String,
                searchable=True,
                filterable=False,
                sortable=False
            ),
            # LLM-generated summary (searchable)
            SearchableField(
                name="summary",
                type=SearchFieldDataType.String,
                searchable=True,
                filterable=False,
                sortable=False
            ),
            # Tags (searchable and filterable)
            SearchField(
                name="tags",
                type=SearchFieldDataType.Collection(SearchFieldDataType.String),
                searchable=True,
                filterable=True,
                facetable=True
            ),
            # Metadata fields (filterable)
            SimpleField(
                name="submitterId",
                type=SearchFieldDataType.String,
                filterable=True,
                facetable=False
            ),
            SimpleField(
                name="department",
                type=SearchFieldDataType.String,
                filterable=True,
                facetable=True
            ),
            SimpleField(
                name="status",
                type=SearchFieldDataType.String,
                filterable=True,
                facetable=True
            ),
            # Timestamps
            SimpleField(
                name="createdAt",
                type=SearchFieldDataType.Int64,
                filterable=True,
                sortable=True
            ),
            SimpleField(
                name="updatedAt",
                type=SearchFieldDataType.Int64,
                filterable=True,
                sortable=True
            ),
            # Scoring fields (filterable and sortable)
            SimpleField(
                name="impactScore",
                type=SearchFieldDataType.Double,
                filterable=True,
                sortable=True,
                facetable=False
            ),
            SimpleField(
                name="feasibilityScore",
                type=SearchFieldDataType.Double,
                filterable=True,
                sortable=True,
                facetable=False
            ),
            SimpleField(
                name="recommendationClass",
                type=SearchFieldDataType.String,
                filterable=True,
                facetable=True
            ),
            # Clustering
            SimpleField(
                name="clusterLabel",
                type=SearchFieldDataType.String,
                filterable=True,
                facetable=True
            ),
            # Vector embedding field for similarity search
            SearchField(
                name="embedding",
                type=SearchFieldDataType.Collection(SearchFieldDataType.Single),
                searchable=True,
                vector_search_dimensions=self.embedding_dimensions,
                vector_search_profile_name="ideas-vector-profile"
            ),
        ]

        return SearchIndex(
            name=self.index_name,
            fields=fields,
            vector_search=vector_search
        )

    async def create_or_update_index(self) -> bool:
        """
        Create or update the search index.

        Returns:
            True if successful, False otherwise.
        """
        try:
            index_schema = self.get_index_schema()
            self.client.create_or_update_index(index_schema)
            logger.info(f"Successfully created/updated search index: {self.index_name}")
            return True
        except Exception as e:
            logger.error(f"Failed to create/update search index: {e}")
            return False

    async def delete_index(self) -> bool:
        """
        Delete the search index.

        Returns:
            True if successful, False otherwise.
        """
        try:
            self.client.delete_index(self.index_name)
            logger.info(f"Successfully deleted search index: {self.index_name}")
            return True
        except Exception as e:
            logger.error(f"Failed to delete search index: {e}")
            return False

    async def index_exists(self) -> bool:
        """
        Check if the search index exists.

        Returns:
            True if the index exists, False otherwise.
        """
        try:
            index_names = [name for name in self.client.list_index_names()]
            return self.index_name in index_names
        except Exception as e:
            logger.error(f"Failed to check index existence: {e}")
            return False

