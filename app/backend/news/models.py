"""
Data models for the News Dashboard feature.
Defines structures for user preferences, news items, and search results.
"""

from dataclasses import dataclass, field
from typing import Any, Optional
import hashlib
import time


@dataclass
class NewsPreferences:
    """
    User news preferences stored in Cosmos DB.
    Each user can have up to 8 search terms for personalized news.
    """

    user_oid: str
    search_terms: list[str] = field(default_factory=list)
    updated_at: int = field(default_factory=lambda: int(time.time() * 1000))

    # Maximum number of search terms allowed per user
    MAX_SEARCH_TERMS = 8

    def to_cosmos_item(self) -> dict[str, Any]:
        """Convert to Cosmos DB document format."""
        return {
            "id": self.user_oid,
            "user_oid": self.user_oid,
            "type": "news_preferences",
            "search_terms": self.search_terms,
            "updated_at": self.updated_at,
        }

    @classmethod
    def from_cosmos_item(cls, item: dict[str, Any]) -> "NewsPreferences":
        """Create instance from Cosmos DB document."""
        return cls(
            user_oid=item.get("user_oid", ""),
            search_terms=item.get("search_terms", []),
            updated_at=item.get("updated_at", 0),
        )

    def add_term(self, term: str) -> bool:
        """
        Add a search term if not already present and under limit.
        Returns True if term was added, False otherwise.
        """
        normalized_term = term.strip().lower()
        if not normalized_term:
            return False
        if normalized_term in [t.lower() for t in self.search_terms]:
            return False
        if len(self.search_terms) >= self.MAX_SEARCH_TERMS:
            return False
        self.search_terms.append(term.strip())
        self.updated_at = int(time.time() * 1000)
        return True

    def remove_term(self, term: str) -> bool:
        """
        Remove a search term.
        Returns True if term was removed, False if not found.
        """
        normalized_term = term.strip().lower()
        for i, existing_term in enumerate(self.search_terms):
            if existing_term.lower() == normalized_term:
                self.search_terms.pop(i)
                self.updated_at = int(time.time() * 1000)
                return True
        return False


@dataclass
class Citation:
    """A citation/reference to a source article."""

    title: str
    url: str
    source: Optional[str] = None
    snippet: Optional[str] = None


@dataclass
class NewsItem:
    """
    A single news item with LLM-generated summary.
    Represents one piece of news content for display in the dashboard.
    """

    id: str
    search_term: str
    title: str
    summary: str
    image_url: Optional[str] = None
    original_url: Optional[str] = None
    source: Optional[str] = None
    published_at: Optional[int] = None
    citations: list[Citation] = field(default_factory=list)
    related_topics: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "id": self.id,
            "searchTerm": self.search_term,
            "title": self.title,
            "summary": self.summary,
            "imageUrl": self.image_url,
            "originalUrl": self.original_url,
            "source": self.source,
            "publishedAt": self.published_at,
            "citations": [
                {
                    "title": c.title,
                    "url": c.url,
                    "source": c.source,
                    "snippet": c.snippet,
                }
                for c in self.citations
            ],
            "relatedTopics": self.related_topics,
        }


@dataclass
class NewsSearchResult:
    """
    Result of a news search operation.
    Contains all news items for a user's search terms.
    """

    user_oid: str
    items: list[NewsItem] = field(default_factory=list)
    searched_at: int = field(default_factory=lambda: int(time.time() * 1000))
    error: Optional[str] = None

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "userOid": self.user_oid,
            "items": [item.to_dict() for item in self.items],
            "searchedAt": self.searched_at,
            "error": self.error,
        }


@dataclass
class NewsCacheItem:
    """
    Cached news results for a specific search term.
    Used to reduce API calls and costs.
    """

    search_term: str
    items: list[NewsItem] = field(default_factory=list)
    cached_at: int = field(default_factory=lambda: int(time.time() * 1000))
    expires_at: int = field(default_factory=lambda: int(time.time() * 1000) + 86400000)  # 24 hours default

    # Cache TTL in milliseconds (24 hours)
    CACHE_TTL_MS = 86400000  # 24 * 60 * 60 * 1000

    def is_expired(self) -> bool:
        """Check if the cache entry has expired (older than 24 hours)."""
        return int(time.time() * 1000) > self.expires_at

    def get_age_hours(self) -> float:
        """Get the age of the cache entry in hours."""
        age_ms = int(time.time() * 1000) - self.cached_at
        return age_ms / (1000 * 60 * 60)

    def to_cosmos_item(self) -> dict[str, Any]:
        """Convert to Cosmos DB document format."""
        return {
            "id": self.search_term.lower().replace(" ", "_"),
            "search_term": self.search_term,
            "type": "news_cache",
            "items": [item.to_dict() for item in self.items],
            "cached_at": self.cached_at,
            "expires_at": self.expires_at,
        }

    @classmethod
    def from_cosmos_item(cls, item: dict[str, Any]) -> "NewsCacheItem":
        """Create instance from Cosmos DB document."""
        news_items = []
        for item_data in item.get("items", []):
            citations = [
                Citation(
                    title=c.get("title", ""),
                    url=c.get("url", ""),
                    source=c.get("source"),
                    snippet=c.get("snippet"),
                )
                for c in item_data.get("citations", [])
            ]
            news_items.append(
                NewsItem(
                    id=item_data.get("id", ""),
                    search_term=item_data.get("searchTerm", ""),
                    title=item_data.get("title", ""),
                    summary=item_data.get("summary", ""),
                    image_url=item_data.get("imageUrl"),
                    original_url=item_data.get("originalUrl"),
                    source=item_data.get("source"),
                    published_at=item_data.get("publishedAt"),
                    citations=citations,
                    related_topics=item_data.get("relatedTopics", []),
                )
            )
        return cls(
            search_term=item.get("search_term", ""),
            items=news_items,
            cached_at=item.get("cached_at", 0),
            expires_at=item.get("expires_at", 0),
        )


@dataclass
class FetchedArticlesTracker:
    """
    Tracks articles that have been fetched from the API to prevent duplicates.
    Stored in Cosmos DB with search_term as partition key.

    Purpose:
    - When the scheduler runs at night, it fetches new articles from GNews API
    - Articles that were already fetched in the last 24 hours are excluded
    - This ensures users see fresh articles every day

    Deduplication window: 24 hours
    - Articles fetched today will not be fetched again today
    - After 24 hours (next scheduler run), the tracker resets and new articles are fetched
    """

    search_term: str
    # Set of URL hashes that have been fetched for this search term
    fetched_hashes: set[str] = field(default_factory=set)
    # Timestamp when the tracker was last reset
    reset_at: int = field(default_factory=lambda: int(time.time() * 1000))
    # Maximum age before resetting (24 hours in milliseconds)
    MAX_TRACKING_AGE_MS = 24 * 60 * 60 * 1000

    @staticmethod
    def hash_url(url: str) -> str:
        """Generate a short hash for a URL."""
        return hashlib.md5(url.encode()).hexdigest()[:16]

    @staticmethod
    def hash_title(title: str) -> str:
        """Generate a short hash for a title (normalized)."""
        normalized = title.lower().strip()
        return hashlib.md5(normalized.encode()).hexdigest()[:16]

    def is_fetched(self, url: str) -> bool:
        """Check if an article URL has already been fetched."""
        url_hash = self.hash_url(url)
        return url_hash in self.fetched_hashes

    def mark_fetched(self, url: str) -> None:
        """Mark an article URL as fetched."""
        self.fetched_hashes.add(self.hash_url(url))

    def should_reset(self) -> bool:
        """Check if the tracker should be reset (older than 24 hours)."""
        current_time = int(time.time() * 1000)
        return current_time - self.reset_at > self.MAX_TRACKING_AGE_MS

    def reset(self) -> None:
        """Reset the tracker for a new 24-hour cycle."""
        self.fetched_hashes.clear()
        self.reset_at = int(time.time() * 1000)

    def to_cosmos_item(self) -> dict[str, Any]:
        """Convert to Cosmos DB document format."""
        return {
            "id": f"fetched_{self.search_term.lower().replace(' ', '_')}",
            "search_term": self.search_term,
            "type": "fetched_articles",
            "fetched_hashes": list(self.fetched_hashes),
            "reset_at": self.reset_at,
        }

    @classmethod
    def from_cosmos_item(cls, item: dict[str, Any]) -> "FetchedArticlesTracker":
        """Create instance from Cosmos DB document."""
        return cls(
            search_term=item.get("search_term", ""),
            fetched_hashes=set(item.get("fetched_hashes", [])),
            reset_at=item.get("reset_at", 0),
        )
