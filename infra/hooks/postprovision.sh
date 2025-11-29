#!/bin/bash

# Post-provision hook for Keiko Personal Assistant
# This script is automatically executed after 'azd provision' or 'azd up'
#
# Tasks:
# 1. Ensure Cosmos DB containers exist (they may be deleted but not recreated by Bicep)
# 2. Set Beta Authentication environment variables

set -e

echo "=== Post-Provision Hook ==="

# ============================================================================
# 1. Ensure Cosmos DB containers exist
# ============================================================================
echo ""
echo "Checking Cosmos DB containers..."

# Get environment variables from azd
USE_CHAT_HISTORY_COSMOS=$(azd env get-values | grep "^USE_CHAT_HISTORY_COSMOS=" | cut -d'=' -f2 | tr -d '"')
USE_NEWS_DASHBOARD=$(azd env get-values | grep "^USE_NEWS_DASHBOARD=" | cut -d'=' -f2 | tr -d '"')
AZURE_COSMOSDB_ACCOUNT=$(azd env get-values | grep "^AZURE_COSMOSDB_ACCOUNT=" | cut -d'=' -f2 | tr -d '"')
AZURE_CHAT_HISTORY_DATABASE=$(azd env get-values | grep "^AZURE_CHAT_HISTORY_DATABASE=" | cut -d'=' -f2 | tr -d '"')
AZURE_CHAT_HISTORY_CONTAINER=$(azd env get-values | grep "^AZURE_CHAT_HISTORY_CONTAINER=" | cut -d'=' -f2 | tr -d '"')
AZURE_NEWS_PREFERENCES_CONTAINER=$(azd env get-values | grep "^AZURE_NEWS_PREFERENCES_CONTAINER=" | cut -d'=' -f2 | tr -d '"')
AZURE_NEWS_CACHE_CONTAINER=$(azd env get-values | grep "^AZURE_NEWS_CACHE_CONTAINER=" | cut -d'=' -f2 | tr -d '"')
RESOURCE_GROUP=$(azd env get-values | grep "^AZURE_RESOURCE_GROUP=" | cut -d'=' -f2 | tr -d '"')

# Function to ensure a container exists
ensure_container() {
    local container_name=$1
    local partition_key=$2
    local ttl=${3:-""}

    # Check if container exists
    if az cosmosdb sql container show \
        --account-name "$AZURE_COSMOSDB_ACCOUNT" \
        --resource-group "$RESOURCE_GROUP" \
        --database-name "$AZURE_CHAT_HISTORY_DATABASE" \
        --name "$container_name" \
        --output none 2>/dev/null; then
        echo "  Container '$container_name' already exists."
    else
        echo "  Creating container '$container_name'..."
        local ttl_arg=""
        if [ -n "$ttl" ]; then
            ttl_arg="--ttl $ttl"
        fi
        az cosmosdb sql container create \
            --account-name "$AZURE_COSMOSDB_ACCOUNT" \
            --resource-group "$RESOURCE_GROUP" \
            --database-name "$AZURE_CHAT_HISTORY_DATABASE" \
            --name "$container_name" \
            --partition-key-path "$partition_key" \
            $ttl_arg \
            --output none
        echo "  Container '$container_name' created."
    fi
}

# Ensure chat history container exists
if [ "$USE_CHAT_HISTORY_COSMOS" = "true" ] && [ -n "$AZURE_COSMOSDB_ACCOUNT" ]; then
    echo "Ensuring chat history container exists..."
    ensure_container "${AZURE_CHAT_HISTORY_CONTAINER:-chat-history-v2}" "/entra_oid"
fi

# Ensure news containers exist
if [ "$USE_NEWS_DASHBOARD" = "true" ] && [ -n "$AZURE_COSMOSDB_ACCOUNT" ]; then
    echo "Ensuring news containers exist..."
    ensure_container "${AZURE_NEWS_PREFERENCES_CONTAINER:-news-preferences}" "/user_oid"
    ensure_container "${AZURE_NEWS_CACHE_CONTAINER:-news-cache}" "/search_term" "172800"
fi

echo "Cosmos DB containers check complete."

# ============================================================================
# 2. Set Beta Authentication environment variables
# ============================================================================
echo ""
echo "Setting Beta Authentication environment variables..."

# Get environment variables from azd
BETA_AUTH_ENABLED=$(azd env get-values | grep "^BETA_AUTH_ENABLED=" | cut -d'=' -f2 | tr -d '"')
BETA_AUTH_USERS=$(azd env get-values | grep "^BETA_AUTH_USERS=" | cut -d'=' -f2-)
BETA_AUTH_SECRET_KEY=$(azd env get-values | grep "^BETA_AUTH_SECRET_KEY=" | cut -d'=' -f2 | tr -d '"')

# Get Container App name and resource group from azd
CONTAINER_APP_NAME=$(azd env get-values | grep "^SERVICE_BACKEND_NAME=" | cut -d'=' -f2 | tr -d '"')
RESOURCE_GROUP=$(azd env get-values | grep "^AZURE_RESOURCE_GROUP=" | cut -d'=' -f2 | tr -d '"')

# Only set Beta Auth variables if they are configured
if [ -n "$BETA_AUTH_ENABLED" ] && [ "$BETA_AUTH_ENABLED" = "true" ]; then
    echo "Beta Authentication is enabled, updating Container App..."
    
    # Remove quotes from BETA_AUTH_USERS if present
    BETA_AUTH_USERS_CLEAN=$(echo "$BETA_AUTH_USERS" | sed 's/^"//;s/"$//')
    
    az containerapp update \
        --name "$CONTAINER_APP_NAME" \
        --resource-group "$RESOURCE_GROUP" \
        --set-env-vars \
            "BETA_AUTH_ENABLED=true" \
            "BETA_AUTH_SECRET_KEY=$BETA_AUTH_SECRET_KEY" \
            "BETA_AUTH_USERS=$BETA_AUTH_USERS_CLEAN" \
        --output none
    
    echo "Beta Authentication environment variables set successfully!"
else
    echo "Beta Authentication is not enabled, skipping..."
fi

