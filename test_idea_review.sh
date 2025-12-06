#!/bin/bash

# Test script for Ideas Hub LLM Review functionality
# Tests the complete workflow: Create -> Analyze -> Review

BASE_URL="http://127.0.0.1:50505"
API_URL="${BASE_URL}/api"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Ideas Hub LLM Review Test ===${NC}\n"

# Check if we should use authentication
USE_AUTH=${USE_AUTH:-false}

# Step 1: Get Beta Auth Token
echo -e "${BLUE}Step 1: Getting Beta Auth Token...${NC}"
TOKEN_RESPONSE=$(curl -s -X POST "${BASE_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin@x1f.one",
    "password": "test123"
  }')

TOKEN=$(echo $TOKEN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo -e "${RED}Failed to get token. Response: $TOKEN_RESPONSE${NC}"
  echo -e "${YELLOW}Make sure BETA_AUTH_USERS is set in .env with admin@x1f.one:test123${NC}"
  exit 1
fi

echo -e "${GREEN}Token obtained successfully${NC}\n"
AUTH_HEADER="Authorization: Bearer $TOKEN"

# Step 2: Create a new idea
echo -e "${BLUE}Step 2: Creating a new idea...${NC}"
IDEA_RESPONSE=$(curl -s -X POST "${API_URL}/ideas" \
  -H "Content-Type: application/json" \
  -H "$AUTH_HEADER" \
  -d '{
    "title": "Automated Testing Process",
    "description": "Implement automated testing to reduce manual testing time and improve code quality. This will save approximately 20 hours per month and reduce bugs by 30%.",
    "problemDescription": "Manual testing is time-consuming and error-prone",
    "expectedBenefit": "Faster releases, fewer bugs, happier developers",
    "affectedProcesses": ["Development", "QA"],
    "targetUsers": ["Developers", "QA Team"],
    "department": "Engineering"
  }')

IDEA_ID=$(echo $IDEA_RESPONSE | grep -o '"ideaId":"[^"]*' | cut -d'"' -f4)

if [ -z "$IDEA_ID" ]; then
  echo -e "${RED}Failed to create idea. Response: $IDEA_RESPONSE${NC}"
  exit 1
fi

echo -e "${GREEN}Idea created with ID: $IDEA_ID${NC}\n"

# Step 3: Wait for analysis (or trigger it manually)
echo -e "${BLUE}Step 3: Waiting for idea analysis (5 seconds)...${NC}"
sleep 5

# Step 4: Get the idea to check initial scores
echo -e "${BLUE}Step 4: Fetching idea to check initial scores...${NC}"
IDEA_DETAILS=$(curl -s -X GET "${API_URL}/ideas/${IDEA_ID}" \
  -H "$AUTH_HEADER")

IMPACT_SCORE=$(echo $IDEA_DETAILS | grep -o '"impactScore":[0-9.]*' | cut -d':' -f2)
FEASIBILITY_SCORE=$(echo $IDEA_DETAILS | grep -o '"feasibilityScore":[0-9.]*' | cut -d':' -f2)
ANALYZED_AT=$(echo $IDEA_DETAILS | grep -o '"analyzedAt":[0-9]*' | cut -d':' -f2)

echo -e "Initial Impact Score: ${GREEN}${IMPACT_SCORE}${NC}"
echo -e "Initial Feasibility Score: ${GREEN}${FEASIBILITY_SCORE}${NC}"
echo -e "Analyzed At: ${GREEN}${ANALYZED_AT}${NC}\n"

if [ "$ANALYZED_AT" = "0" ] || [ -z "$ANALYZED_AT" ]; then
  echo -e "${RED}Idea not yet analyzed. Waiting longer...${NC}"
  sleep 10
  IDEA_DETAILS=$(curl -s -X GET "${API_URL}/ideas/${IDEA_ID}" \
    -H "$AUTH_HEADER")
  ANALYZED_AT=$(echo $IDEA_DETAILS | grep -o '"analyzedAt":[0-9]*' | cut -d':' -f2)
fi

# Step 5: Trigger LLM Review
echo -e "${BLUE}Step 5: Triggering LLM Review...${NC}"
REVIEW_RESPONSE=$(curl -s -X POST "${API_URL}/ideas/${IDEA_ID}/review" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json")

REVIEW_IMPACT=$(echo $REVIEW_RESPONSE | grep -o '"reviewImpactScore":[0-9.]*' | cut -d':' -f2)
REVIEW_FEASIBILITY=$(echo $REVIEW_RESPONSE | grep -o '"reviewFeasibilityScore":[0-9.]*' | cut -d':' -f2)
REVIEWED_AT=$(echo $REVIEW_RESPONSE | grep -o '"reviewedAt":[0-9]*' | cut -d':' -f2)

if [ -z "$REVIEWED_AT" ] || [ "$REVIEWED_AT" = "0" ]; then
  echo -e "${RED}Review failed. Response: $REVIEW_RESPONSE${NC}"
  exit 1
fi

echo -e "${GREEN}Review completed successfully!${NC}"
echo -e "Review Impact Score: ${GREEN}${REVIEW_IMPACT}${NC}"
echo -e "Review Feasibility Score: ${GREEN}${REVIEW_FEASIBILITY}${NC}"
echo -e "Reviewed At: ${GREEN}${REVIEWED_AT}${NC}\n"

# Step 6: Get full idea details with review
echo -e "${BLUE}Step 6: Fetching complete idea with review data...${NC}"
FINAL_IDEA=$(curl -s -X GET "${API_URL}/ideas/${IDEA_ID}" \
  -H "$AUTH_HEADER")

echo -e "${GREEN}Final Idea Details:${NC}"
echo $FINAL_IDEA | python3 -m json.tool

echo -e "\n${GREEN}=== Test Completed Successfully ===${NC}"

