# News Dashboard module for Keiko Personal Assistant
# Provides user news preferences management and personalized news retrieval

from .models import NewsPreferences, NewsItem, NewsSearchResult
from .routes import news_bp

__all__ = [
    "NewsPreferences",
    "NewsItem",
    "NewsSearchResult",
    "news_bp",
]

