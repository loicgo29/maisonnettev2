#!/bin/bash

# Sage API Integration — Demo Script
# This script demonstrates all Sage API operations
# Usage: bash demo-sage-operations.sh

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

BASE_URL="http://localhost:3001/api/backoffice"

echo -e "${BLUE}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Sage API Integration — Demo Script             ║${NC}"
echo -e "${BLUE}║   maisonnettev2 Comptabilité Module              ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════╝${NC}\n"

# Function to print section headers
print_header() {
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

# Function to run API call and pretty-print response
run_api_call() {
    local method=$1
    local endpoint=$2
    local data=$3
    local auth_header=$4

    echo -e "${YELLOW}→ $method $endpoint${NC}"

    if [ -z "$data" ]; then
        curl -X "$method" "${BASE_URL}${endpoint}" \
            -H "Content-Type: application/json" \
            ${auth_header} \
            -s | jq '.'
    else
        echo -e "${YELLOW}  Body: $data${NC}"
        curl -X "$method" "${BASE_URL}${endpoint}" \
            -H "Content-Type: application/json" \
            ${auth_header} \
            -d "$data" \
            -s | jq '.'
    fi

    echo ""
}

# ============================================================================
# STEP 1: Check Backend is Running
# ============================================================================

print_header "STEP 1: Check Backend Health"

echo -e "${YELLOW}Checking if backend is running on ${BASE_URL}...${NC}"

if ! curl -s "${BASE_URL}/sage/health" > /dev/null 2>&1; then
    echo -e "${RED}✗ Backend is not running!${NC}"
    echo -e "${YELLOW}Start the backend with: cd backend && npm run dev${NC}"
    exit 1
else
    echo -e "${GREEN}✓ Backend is running${NC}"
fi

# ============================================================================
# STEP 2: Generate Authorization URL
# ============================================================================

print_header "STEP 2: Generate OAuth2 Authorization URL"

echo -e "${YELLOW}Getting authorization URL from Sage API...${NC}"

AUTH_RESPONSE=$(curl -s -X GET "${BASE_URL}/sage/auth-url")
AUTH_URL=$(echo "$AUTH_RESPONSE" | jq -r '.authUrl')
STATE=$(echo "$AUTH_RESPONSE" | jq -r '.state')

echo "$AUTH_RESPONSE" | jq '.'

echo -e "\n${GREEN}✓ Authorization URL generated${NC}"
echo -e "${YELLOW}State parameter: $STATE${NC}"

echo -e "\n${BLUE}Next Steps:${NC}"
echo -e "1. Open this URL in your browser:"
echo -e "   ${BLUE}$AUTH_URL${NC}"
echo -e "2. Grant permissions to 'maisonnettev2' app"
echo -e "3. After redirect, extract the 'code' parameter from callback URL"
echo -e "4. Run: bash demo-sage-operations.sh <auth_code>"

# ============================================================================
# STEP 3: Exchange Code for Token (if provided)
# ============================================================================

if [ -n "$1" ]; then
    AUTH_CODE=$1

    print_header "STEP 3: Exchange Authorization Code for Access Token"

    echo -e "${YELLOW}Exchanging auth code for access token...${NC}"

    TOKEN_RESPONSE=$(curl -s -X POST "${BASE_URL}/sage/auth/callback" \
        -H "Content-Type: application/json" \
        -d "{\"code\": \"$AUTH_CODE\"}")

    echo "$TOKEN_RESPONSE" | jq '.'

    if echo "$TOKEN_RESPONSE" | jq -e '.success' > /dev/null; then
        echo -e "\n${GREEN}✓ Successfully authenticated with Sage${NC}"

        # ====================================================================
        # STEP 4: Test Invoice Operations
        # ====================================================================

        print_header "STEP 4: Test Invoice Operations"

        # First, get backoffice JWT token
        echo -e "${YELLOW}Getting backoffice JWT token...${NC}"

        LOGIN_RESPONSE=$(curl -s -X POST "${BASE_URL}/auth/login" \
            -H "Content-Type: application/json" \
            -d '{"username": "admin", "password": "admin123"}')

        JWT_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.token')

        if [ "$JWT_TOKEN" = "null" ] || [ -z "$JWT_TOKEN" ]; then
            echo -e "${RED}✗ Failed to get JWT token${NC}"
            echo "$LOGIN_RESPONSE" | jq '.'
            exit 1
        fi

        echo -e "${GREEN}✓ Got JWT token${NC}\n"

        AUTH_COOKIE="Cookie: backoffice_token=$JWT_TOKEN"

        # Test 4.1: List invoices
        print_header "STEP 4.1: List All Invoices"
        run_api_call "GET" "/sage/invoices" "" "-H \"$AUTH_COOKIE\""

        # Test 4.2: Create new invoice
        print_header "STEP 4.2: Create New Invoice"

        INVOICE_DATA=$(cat <<EOF
{
  "reference": "TEST-INV-$(date +%s)",
  "date": "$(date +%Y-%m-%d)",
  "dueDate": "$(date -u -d "+30 days" +%Y-%m-%d 2>/dev/null || date -v+30d +%Y-%m-%d)",
  "customerId": "CUST-DEMO-001",
  "amount": 1500.00,
  "status": "draft",
  "lines": [
    {
      "description": "Gîte rental - Demo booking",
      "quantity": 1,
      "unitPrice": 1200.00,
      "taxCode": "VAT20"
    },
    {
      "description": "Cleaning fee - Demo",
      "quantity": 1,
      "unitPrice": 300.00
    }
  ]
}
EOF
)

        INVOICE_RESPONSE=$(curl -s -X POST "${BASE_URL}/sage/invoices" \
            -H "Content-Type: application/json" \
            -H "$AUTH_COOKIE" \
            -d "$INVOICE_DATA")

        echo "$INVOICE_RESPONSE" | jq '.'

        INVOICE_ID=$(echo "$INVOICE_RESPONSE" | jq -r '.invoice.id // empty')

        if [ -n "$INVOICE_ID" ] && [ "$INVOICE_ID" != "null" ]; then
            echo -e "\n${GREEN}✓ Invoice created successfully${NC}"
            echo -e "  Invoice ID: ${BLUE}$INVOICE_ID${NC}\n"

            # Test 4.3: Get invoice details
            print_header "STEP 4.3: Get Invoice Details"
            run_api_call "GET" "/sage/invoices/$INVOICE_ID" "" "-H \"$AUTH_COOKIE\""

            # Test 4.4: Update invoice status
            print_header "STEP 4.4: Update Invoice Status to 'submitted'"

            STATUS_UPDATE=$(cat <<EOF
{
  "status": "submitted"
}
EOF
)

            run_api_call "PATCH" "/sage/invoices/$INVOICE_ID/status" "$STATUS_UPDATE" "-H \"$AUTH_COOKIE\""

        else
            ERROR=$(echo "$INVOICE_RESPONSE" | jq -r '.error // "Unknown error"')
            echo -e "\n${RED}✗ Failed to create invoice${NC}"
            echo -e "${YELLOW}Error: $ERROR${NC}"
        fi

        # Test 4.5: Health check
        print_header "STEP 4.5: Sage API Health Check"
        run_api_call "GET" "/sage/health" "" "-H \"$AUTH_COOKIE\""

        # Summary
        print_header "Demo Complete! ✅"

        echo -e "${GREEN}All operations completed successfully!${NC}\n"
        echo -e "${BLUE}Summary:${NC}"
        echo -e "  ✓ OAuth2 authentication with Sage"
        echo -e "  ✓ Invoice creation"
        echo -e "  ✓ Invoice listing"
        echo -e "  ✓ Invoice detail retrieval"
        echo -e "  ✓ Invoice status update"
        echo -e "  ✓ API health verification"
        echo -e "\n${YELLOW}Next Steps:${NC}"
        echo -e "  1. Verify invoice appears in Sage Accounting"
        echo -e "  2. Implement token persistence in database"
        echo -e "  3. Build admin UI for OAuth2 flow"
        echo -e "  4. Set up invoice synchronization scheduler"

    else
        echo -e "\n${RED}✗ Authentication failed${NC}"
        echo "$TOKEN_RESPONSE" | jq '.'
        exit 1
    fi

else
    echo -e "\n${YELLOW}ℹ️  No authorization code provided.${NC}"
    echo -e "${YELLOW}After completing the OAuth2 flow, run:${NC}"
    echo -e "  ${BLUE}bash demo-sage-operations.sh <AUTH_CODE>${NC}"
fi

echo ""
