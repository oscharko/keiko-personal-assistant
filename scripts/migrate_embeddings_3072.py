#!/usr/bin/env python3
"""
Migration script to update Azure Search index to 3072 dimensions
and regenerate all idea embeddings using text-embedding-3-large.

This script:
1. Deletes the existing ideas-index
2. Creates a new index with 3072 dimensions
3. Regenerates embeddings for all ideas using text-embedding-3-large
4. Updates the ideas in Cosmos DB and indexes them in Azure Search

Usage:
    python scripts/migrate_embeddings_3072.py
"""

import asyncio
import importlib.util
import os
import sys

# Add the app directory to the path
app_dir = os.path.join(os.path.dirname(__file__), "..", "app")
sys.path.insert(0, app_dir)
os.chdir(app_dir)

from azure.cosmos.aio import CosmosClient
from azure.identity.aio import DefaultAzureCredential, get_bearer_token_provider
from openai import AsyncAzureOpenAI


def load_module_directly(module_path: str, module_name: str):
    """Load a Python module directly without triggering __init__.py imports."""
    spec = importlib.util.spec_from_file_location(module_name, module_path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[module_name] = module
    spec.loader.exec_module(module)
    return module


# Load search_index module directly to avoid circular imports
search_index_path = os.path.join(app_dir, "backend", "ideas", "search_index.py")
search_index = load_module_directly(search_index_path, "search_index")
IdeasSearchIndexManager = search_index.IdeasSearchIndexManager
EMBEDDING_DIMENSIONS = search_index.EMBEDDING_DIMENSIONS

# Load azd environment loader directly
load_azd_path = os.path.join(app_dir, "backend", "load_azd_env.py")
load_azd_module = load_module_directly(load_azd_path, "load_azd_env")
load_azd_env = load_azd_module.load_azd_env


async def main():
    """Main migration function."""
    # Load environment variables from azd
    load_azd_env()

    # Configuration - use same pattern as seed_ideas.py
    cosmos_account = os.environ.get("AZURE_COSMOSDB_ACCOUNT")
    # Use AZURE_IDEAS_DATABASE if set, otherwise fall back to AZURE_CHAT_HISTORY_DATABASE
    database_name = os.environ.get("AZURE_IDEAS_DATABASE") or os.environ.get("AZURE_CHAT_HISTORY_DATABASE")
    container_name = os.environ.get("AZURE_IDEAS_CONTAINER", "ideas")
    search_endpoint = os.environ.get("AZURE_SEARCH_SERVICE")
    openai_endpoint = os.environ.get("AZURE_OPENAI_ENDPOINT")
    embedding_deployment = os.environ.get("AZURE_OPENAI_EMB_DEPLOYMENT")

    if not all([cosmos_account, database_name, search_endpoint, openai_endpoint]):
        print("ERROR: Missing required environment variables")
        print(f"  AZURE_COSMOSDB_ACCOUNT: {cosmos_account}")
        print(f"  AZURE_IDEAS_DATABASE/AZURE_CHAT_HISTORY_DATABASE: {database_name}")
        print(f"  AZURE_SEARCH_SERVICE: {search_endpoint}")
        print(f"  AZURE_OPENAI_ENDPOINT: {openai_endpoint}")
        return

    cosmos_endpoint = f"https://{cosmos_account}.documents.azure.com:443/"

    print(f"Migration to text-embedding-3-large ({EMBEDDING_DIMENSIONS} dimensions)")
    print("=" * 60)

    # Initialize clients
    credential = DefaultAzureCredential()

    # OpenAI client with proper token provider
    token_provider = get_bearer_token_provider(
        credential, "https://cognitiveservices.azure.com/.default"
    )
    openai_client = AsyncAzureOpenAI(
        azure_endpoint=openai_endpoint,
        azure_ad_token_provider=token_provider,
        api_version="2024-06-01",
    )

    # Search index manager
    search_index_manager = IdeasSearchIndexManager(
        endpoint=f"https://{search_endpoint}.search.windows.net",
        credential=credential,
        embedding_dimensions=EMBEDDING_DIMENSIONS,
    )

    # Step 1: Delete existing index
    print("\n[1/4] Deleting existing search index...")
    if await search_index_manager.index_exists():
        await search_index_manager.delete_index()
        print("  Index deleted successfully")
    else:
        print("  Index does not exist, skipping deletion")

    # Step 2: Create new index with 3072 dimensions
    print("\n[2/4] Creating new search index with 3072 dimensions...")
    success = await search_index_manager.create_or_update_index()
    if success:
        print("  Index created successfully")
    else:
        print("  ERROR: Failed to create index")
        return

    # Step 3: Get all ideas from Cosmos DB
    print("\n[3/4] Loading ideas from Cosmos DB...")
    cosmos_client = CosmosClient(
        url=cosmos_endpoint,
        credential=credential,
    )
    database = cosmos_client.get_database_client(database_name)
    container = database.get_container_client(container_name)

    ideas = []
    query_items = container.query_items(query="SELECT * FROM c WHERE c.type = 'idea'")
    async for item in query_items:
        ideas.append(item)
    print(f"  Found {len(ideas)} ideas")

    # Step 4: Regenerate embeddings and update
    print("\n[4/4] Regenerating embeddings and indexing...")
    model = embedding_deployment or "text-embedding-3-large"
    success_count = 0
    error_count = 0

    for i, idea in enumerate(ideas, 1):
        idea_id = idea.get("id", "unknown")
        title = idea.get("title", "Untitled")[:50]
        print(f"  [{i}/{len(ideas)}] {title}...", end=" ")

        try:
            # Generate text for embedding
            text = f"{idea.get('title', '')} {idea.get('description', '')}"
            if idea.get("expectedBenefits"):
                text += f" {idea.get('expectedBenefits')}"

            # Generate new embedding
            response = await openai_client.embeddings.create(model=model, input=text)
            embedding = response.data[0].embedding

            # Update Cosmos DB
            idea["embedding"] = embedding
            await container.upsert_item(idea)

            # Update search index
            await search_index_manager.update_document(idea)

            print(f"OK ({len(embedding)} dims)")
            success_count += 1
        except Exception as e:
            print(f"ERROR: {e}")
            error_count += 1

    # Cleanup
    await search_index_manager.close()
    await cosmos_client.close()
    await credential.close()
    await openai_client.close()

    print("\n" + "=" * 60)
    print(f"Migration complete: {success_count} success, {error_count} errors")


if __name__ == "__main__":
    asyncio.run(main())

