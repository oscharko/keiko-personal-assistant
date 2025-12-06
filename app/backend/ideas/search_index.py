"""
Azure AI Search index schema and management for the Ideas Hub module.

This module defines the search index schema for ideas with text fields,
vector fields for similarity search, and filterable metadata fields.
"""

import logging
from typing import Any, Optional

from azure.core.credentials import AzureKeyCredential, TokenCredential
from azure.search.documents.aio import SearchClient
from azure.search.documents.indexes.aio import SearchIndexClient
from azure.search.documents.indexes.models import (
    HnswAlgorithmConfiguration,
    SearchableField,
    SearchField,
    SearchFieldDataType,
    SearchIndex,
    SemanticConfiguration,
    SemanticField,
    SemanticPrioritizedFields,
    SemanticSearch,
    SimpleField,
    ScoringProfile,
    VectorSearch,
    VectorSearchProfile,
)

logger = logging.getLogger(__name__)

# Default index name for ideas
IDEAS_INDEX_NAME = "ideas-index"

# Embedding dimensions for text-embedding-3-large (best quality)
EMBEDDING_DIMENSIONS = 3072


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
        self._index_client: Optional[SearchIndexClient] = None
        self._search_client: Optional[SearchClient] = None

    @property
    def index_client(self) -> SearchIndexClient:
        """Get or create the search index client."""
        if self._index_client is None:
            self._index_client = SearchIndexClient(
                endpoint=self.endpoint,
                credential=self.credential
            )
        return self._index_client

    @property
    def search_client(self) -> SearchClient:
        """Get or create the search client for document operations."""
        if self._search_client is None:
            self._search_client = SearchClient(
                endpoint=self.endpoint,
                index_name=self.index_name,
                credential=self.credential
            )
        return self._search_client

    async def close(self) -> None:
        """Close the search clients to avoid resource leaks."""
        if self._search_client is not None:
            await self._search_client.close()
            self._search_client = None
        if self._index_client is not None:
            await self._index_client.close()
            self._index_client = None

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

        # Semantic search configuration
        semantic_search = SemanticSearch(
            configurations=[
                SemanticConfiguration(
                    name="ideas-semantic-config",
                    prioritized_fields=SemanticPrioritizedFields(
                        title_field=SemanticField(field_name="title"),
                        content_fields=[
                            SemanticField(field_name="description"),
                            SemanticField(field_name="summary"),
                            SemanticField(field_name="problemDescription"),
                            SemanticField(field_name="expectedBenefit"),
                        ],
                        keywords_fields=[
                            SemanticField(field_name="tags"),
                        ]
                    )
                )
            ]
        )

        # Scoring profiles for ranking by impact/feasibility
        scoring_profiles = [
            ScoringProfile(
                name="impact-boost",
                text_weights=None,
                function_aggregation="sum",
                functions=[
                    {
                        "type": "magnitude",
                        "field_name": "impactScore",
                        "boost": 2.0,
                        "interpolation": "linear",
                        "magnitude": {
                            "boosting_range_start": 0,
                            "boosting_range_end": 100,
                            "constant_boost_beyond_range": False
                        }
                    }
                ]
            ),
            ScoringProfile(
                name="feasibility-boost",
                text_weights=None,
                function_aggregation="sum",
                functions=[
                    {
                        "type": "magnitude",
                        "field_name": "feasibilityScore",
                        "boost": 2.0,
                        "interpolation": "linear",
                        "magnitude": {
                            "boosting_range_start": 0,
                            "boosting_range_end": 100,
                            "constant_boost_beyond_range": False
                        }
                    }
                ]
            ),
            ScoringProfile(
                name="balanced-boost",
                text_weights=None,
                function_aggregation="sum",
                functions=[
                    {
                        "type": "magnitude",
                        "field_name": "impactScore",
                        "boost": 1.5,
                        "interpolation": "linear",
                        "magnitude": {
                            "boosting_range_start": 0,
                            "boosting_range_end": 100,
                            "constant_boost_beyond_range": False
                        }
                    },
                    {
                        "type": "magnitude",
                        "field_name": "feasibilityScore",
                        "boost": 1.5,
                        "interpolation": "linear",
                        "magnitude": {
                            "boosting_range_start": 0,
                            "boosting_range_end": 100,
                            "constant_boost_beyond_range": False
                        }
                    }
                ]
            )
        ]

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
            # LLM Review fields (Phase 2 - Hybrid Approach)
            SimpleField(
                name="reviewImpactScore",
                type=SearchFieldDataType.Double,
                filterable=True,
                sortable=True,
                facetable=False
            ),
            SimpleField(
                name="reviewFeasibilityScore",
                type=SearchFieldDataType.Double,
                filterable=True,
                sortable=True,
                facetable=False
            ),
            SimpleField(
                name="reviewRecommendationClass",
                type=SearchFieldDataType.String,
                filterable=True,
                facetable=True
            ),
            SearchableField(
                name="reviewReasoning",
                type=SearchFieldDataType.String,
                searchable=True,
                filterable=False,
                sortable=False
            ),
            SimpleField(
                name="reviewedAt",
                type=SearchFieldDataType.Int64,
                filterable=True,
                sortable=True
            ),
            SimpleField(
                name="reviewedBy",
                type=SearchFieldDataType.String,
                filterable=True,
                facetable=False
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
            vector_search=vector_search,
            semantic_search=semantic_search,
            scoring_profiles=scoring_profiles
        )

    async def create_or_update_index(self) -> bool:
        """
        Create or update the search index.

        Returns:
            True if successful, False otherwise.
        """
        try:
            index_schema = self.get_index_schema()
            await self.index_client.create_or_update_index(index_schema)
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
            await self.index_client.delete_index(self.index_name)
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
            index_names = [name async for name in self.index_client.list_index_names()]
            return self.index_name in index_names
        except Exception as e:
            logger.error(f"Failed to check index existence: {e}")
            return False

    def _map_to_search_document(self, document: dict[str, Any]) -> dict[str, Any]:
        """
        Map a Cosmos DB document to the search index schema.

        Only includes fields that are defined in the search index schema.

        Args:
            document: Cosmos DB document (idea).

        Returns:
            Document with only the fields defined in the search index.
        """
        # Define the fields that exist in the search index
        search_fields = {
            "id", "title", "description", "problemDescription", "expectedBenefit",
            "summary", "tags", "submitterId", "department", "status",
            "createdAt", "updatedAt", "impactScore", "feasibilityScore",
            "recommendationClass", "reviewImpactScore", "reviewFeasibilityScore",
            "reviewRecommendationClass", "reviewReasoning", "reviewedAt",
            "reviewedBy", "clusterLabel", "embedding"
        }

        # Extract only the fields that exist in the search index
        search_doc = {}
        for field in search_fields:
            if field in document:
                search_doc[field] = document[field]

        return search_doc

    async def index_document(self, document: dict[str, Any]) -> bool:
        """
        Index a single document in the search index.

        Args:
            document: Document to index (must include 'id' field).

        Returns:
            True if successful, False otherwise.
        """
        try:
            search_doc = self._map_to_search_document(document)
            result = await self.search_client.upload_documents(documents=[search_doc])
            if result and len(result) > 0 and result[0].succeeded:
                logger.debug(f"Successfully indexed document: {document.get('id')}")
                return True
            else:
                error_msg = result[0].error_message if result and len(result) > 0 else "Unknown error"
                logger.error(f"Failed to index document {document.get('id')}: {error_msg}")
                return False
        except Exception as e:
            logger.error(f"Failed to index document: {e}")
            return False

    async def index_documents(self, documents: list[dict[str, Any]]) -> int:
        """
        Index multiple documents in the search index.

        Args:
            documents: List of documents to index (each must include 'id' field).

        Returns:
            Number of successfully indexed documents.
        """
        if not documents:
            return 0

        try:
            # Map all documents to search schema
            search_docs = [self._map_to_search_document(doc) for doc in documents]
            results = await self.search_client.upload_documents(documents=search_docs)
            success_count = sum(1 for r in results if r.succeeded)

            # Log failures
            for r in results:
                if not r.succeeded:
                    logger.error(f"Failed to index document {r.key}: {r.error_message}")

            logger.info(f"Successfully indexed {success_count}/{len(documents)} documents")
            return success_count
        except Exception as e:
            logger.error(f"Failed to index documents: {e}")
            return 0

    async def update_document(self, document: dict[str, Any]) -> bool:
        """
        Update a document in the search index.

        Args:
            document: Document to update (must include 'id' field).

        Returns:
            True if successful, False otherwise.
        """
        try:
            search_doc = self._map_to_search_document(document)
            result = await self.search_client.merge_or_upload_documents(documents=[search_doc])
            if result and len(result) > 0 and result[0].succeeded:
                logger.debug(f"Successfully updated document: {document.get('id')}")
                return True
            else:
                error_msg = result[0].error_message if result and len(result) > 0 else "Unknown error"
                logger.error(f"Failed to update document {document.get('id')}: {error_msg}")
                return False
        except Exception as e:
            logger.error(f"Failed to update document: {e}")
            return False

    async def delete_document(self, document_id: str) -> bool:
        """
        Delete a document from the search index.

        Args:
            document_id: ID of the document to delete.

        Returns:
            True if successful, False otherwise.
        """
        try:
            result = await self.search_client.delete_documents(documents=[{"id": document_id}])
            if result and len(result) > 0 and result[0].succeeded:
                logger.debug(f"Successfully deleted document: {document_id}")
                return True
            else:
                error_msg = result[0].error_message if result and len(result) > 0 else "Unknown error"
                logger.error(f"Failed to delete document {document_id}: {error_msg}")
                return False
        except Exception as e:
            logger.error(f"Failed to delete document: {e}")
            return False

