#!/bin/bash

# Post-provision hook to set Beta Authentication environment variables
# This script is automatically executed after 'azd provision' or 'azd up'

set -e

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

