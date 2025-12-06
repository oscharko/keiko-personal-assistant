#!/usr/bin/env python3
"""
Script to analyze all ideas in the database.

This script loads all ideas from Cosmos DB and runs the LLM analysis
to generate scores (impactScore, feasibilityScore, recommendationClass).
"""

import asyncio
import os
import sys

# Add the app/backend directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "app", "backend"))

from dotenv import load_dotenv

# Load environment variables from .azure directory
azure_env_path = os.path.join(
    os.path.dirname(__file__), "..", ".azure", "rg-azure-search-openai-demo", ".env"
)
if os.path.exists(azure_env_path):
    load_dotenv(azure_env_path)

from azure.cosmos.aio import CosmosClient
from azure.identity.aio import DefaultAzureCredential, get_bearer_token_provider
from openai import AsyncAzureOpenAI

from ideas.models import Idea
from ideas.service import IdeasService


async def main():
    """Analyze all ideas in the database."""
    print("Analyzing all ideas")
    print("=" * 60)

    # Get configuration from environment
    cosmos_endpoint = os.environ.get("AZURE_COSMOSDB_ACCOUNT")
    database_name = os.environ.get("AZURE_COSMOSDB_IDEAS_DATABASE", "ideas")
    container_name = os.environ.get("AZURE_COSMOSDB_IDEAS_CONTAINER", "ideas")
    openai_endpoint = os.environ.get("AZURE_OPENAI_ENDPOINT")
    chat_deployment = os.environ.get("AZURE_OPENAI_CHATGPT_DEPLOYMENT")
    embedding_deployment = os.environ.get(
        "AZURE_OPENAI_EMB_MODEL_NAME", "text-embedding-3-large"
    )

    if not all([cosmos_endpoint, openai_endpoint, chat_deployment]):
        print("ERROR: Missing required environment variables")
        print(f"  AZURE_COSMOSDB_ACCOUNT: {cosmos_endpoint}")
        print(f"  AZURE_OPENAI_ENDPOINT: {openai_endpoint}")
        print(f"  AZURE_OPENAI_CHATGPT_DEPLOYMENT: {chat_deployment}")
        return

    # Initialize clients
    credential = DefaultAzureCredential()

    # OpenAI client
    token_provider = get_bearer_token_provider(
        credential, "https://cognitiveservices.azure.com/.default"
    )
    openai_client = AsyncAzureOpenAI(
        azure_endpoint=openai_endpoint,
        azure_ad_token_provider=token_provider,
        api_version="2024-06-01",
    )

    # Cosmos DB client
    cosmos_client = CosmosClient(
        url=f"https://{cosmos_endpoint}.documents.azure.com:443/",
        credential=credential,
    )
    database = cosmos_client.get_database_client(database_name)
    container = database.get_container_client(container_name)

    # Initialize IdeasService
    ideas_service = IdeasService(
        ideas_container=container,
        openai_client=openai_client,
        chatgpt_deployment=chat_deployment,
        embedding_model=embedding_deployment,
        search_index_manager=None,  # Not needed for analysis
    )

    # Load all ideas
    print("\n[1/2] Loading ideas from Cosmos DB...")
    ideas = []
    query_items = container.query_items(query="SELECT * FROM c WHERE c.type = 'idea'")
    async for item in query_items:
        ideas.append(Idea.from_cosmos_item(item))
    print(f"  Found {len(ideas)} ideas")

    # Filter ideas that need analysis
    ideas_to_analyze = [
        idea for idea in ideas
        if idea.impact_score is None or idea.impact_score == 0
    ]
    print(f"  {len(ideas_to_analyze)} ideas need analysis")

    if not ideas_to_analyze:
        print("\nAll ideas are already analyzed!")
        return

    # Analyze each idea
    print("\n[2/2] Analyzing ideas...")
    success_count = 0
    error_count = 0

    for i, idea in enumerate(ideas_to_analyze, 1):
        title = idea.title[:50]
        print(f"  [{i}/{len(ideas_to_analyze)}] {title}...", end=" ")

        try:
            # Run analysis
            analyzed_idea = await ideas_service.analyze_idea(idea)

            # Update in Cosmos DB
            cosmos_item = analyzed_idea.to_cosmos_item()
            await container.upsert_item(body=cosmos_item)

            print(
                f"OK (impact={analyzed_idea.impact_score:.0f}, "
                f"feasibility={analyzed_idea.feasibility_score:.0f}, "
                f"class={analyzed_idea.recommendation_class})"
            )
            success_count += 1
        except Exception as e:
            print(f"ERROR: {e}")
            error_count += 1

    print("\n" + "=" * 60)
    print(f"Analysis complete: {success_count} success, {error_count} errors")

    # Cleanup
    await cosmos_client.close()
    await credential.close()


if __name__ == "__main__":
    asyncio.run(main())

