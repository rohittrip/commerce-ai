#!/bin/bash

# Comprehensive test script for Phase 1 (UCP Discovery) and Phase 2 (Checkout Session Pattern)

BASE_URL="http://localhost:8081"
API_URL="$BASE_URL/api/v1/tools/execute"

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_test() {
    echo -e "\n${BLUE}[TEST $((++TOTAL_TESTS))]${NC} $1"
}

log_pass() {
    echo -e "${GREEN}✓ PASS:${NC} $1"
    ((PASSED_TESTS++))
}

log_fail() {
    echo -e "${RED}✗ FAIL:${NC} $1"
    ((FAILED_TESTS++))
}

log_info() {
    echo -e "${YELLOW}ℹ INFO:${NC} $1"
}

# Global variables for test data
USER_ID="test-user-$(date +%s)"
CART_ID=""
CHECKOUT_ID=""
ORDER_ID=""

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}  Phase 1 & 2 Feature Testing${NC}"
echo -e "${BLUE}================================================${NC}"

# ============================================
# PHASE 1: UCP DISCOVERY ENDPOINT TESTS
# ============================================

echo -e "\n${YELLOW}=== PHASE 1: UCP DISCOVERY ENDPOINT ===${NC}"

log_test "UCP Discovery Endpoint Availability"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/.well-known/ucp")
if [ "$RESPONSE" = "200" ]; then
    log_pass "UCP Discovery endpoint is accessible"
else
    log_fail "UCP Discovery endpoint returned status $RESPONSE"
fi

log_test "UCP Discovery Response Structure"
UCP_RESPONSE=$(curl -s "$BASE_URL/.well-known/ucp")
if echo "$UCP_RESPONSE" | jq -e '.platform' > /dev/null 2>&1; then
    log_pass "Platform metadata present"
else
    log_fail "Platform metadata missing"
fi

log_test "UCP Tools Registration"
CHECKOUT_TOOLS=$(echo "$UCP_RESPONSE" | jq -r '.tools[] | select(.name | startswith("commerce.checkout")) | .name' | wc -l)
if [ "$CHECKOUT_TOOLS" -ge 5 ]; then
    log_pass "All 5 checkout tools registered: $CHECKOUT_TOOLS"
else
    log_fail "Expected 5 checkout tools, found $CHECKOUT_TOOLS"
fi

log_test "Product Discovery Tools Registration"
PRODUCT_TOOLS=$(echo "$UCP_RESPONSE" | jq -r '.tools[] | select(.name | startswith("commerce.product") or startswith("commerce.promotions")) | .name' | wc -l)
if [ "$PRODUCT_TOOLS" -ge 4 ]; then
    log_pass "All 4 product discovery tools registered: $PRODUCT_TOOLS"
else
    log_fail "Expected 4 product discovery tools, found $PRODUCT_TOOLS"
fi

log_test "UCP Caching Headers"
CACHE_HEADER=$(curl -s -I "$BASE_URL/.well-known/ucp" | grep -i "cache-control" | grep "max-age=300")
if [ -n "$CACHE_HEADER" ]; then
    log_pass "Cache-Control header set to 5 minutes (300 seconds)"
else
    log_fail "Cache-Control header not properly configured"
fi

# ============================================
# PHASE 2: CHECKOUT SESSION PATTERN TESTS
# ============================================

echo -e "\n${YELLOW}=== PHASE 2: CHECKOUT SESSION PATTERN ===${NC}"

# Setup: Create cart first
log_test "Setup: Create test user and cart"
CART_CREATE_PAYLOAD=$(cat <<EOF
{
  "tool": "commerce.cart.addItem",
  "request": {
    "userId": "$USER_ID",
    "productId": "PROD-001",
    "provider": "mock",
    "quantity": 2,
    "unitPrice": 999.00
  }
}
EOF
)

CART_RESPONSE=$(curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "$CART_CREATE_PAYLOAD")

CART_ID=$(echo "$CART_RESPONSE" | jq -r '.response.cartId')
if [ -n "$CART_ID" ] && [ "$CART_ID" != "null" ]; then
    log_pass "Test cart created: $CART_ID"
else
    log_fail "Failed to create test cart"
    log_info "Response: $CART_RESPONSE"
fi

# Add more items to cart
curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "{\"tool\":\"commerce.cart.addItem\",\"request\":{\"userId\":\"$USER_ID\",\"productId\":\"PROD-002\",\"provider\":\"mock\",\"quantity\":1,\"unitPrice\":1499.00}}" > /dev/null

# Test 2.1: Create Checkout Session
log_test "Create Checkout Session"
CHECKOUT_CREATE_PAYLOAD=$(cat <<EOF
{
  "tool": "commerce.checkout.create",
  "request": {
    "userId": "$USER_ID",
    "cartId": "$CART_ID",
    "provider": "mock"
  }
}
EOF
)

CHECKOUT_RESPONSE=$(curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "$CHECKOUT_CREATE_PAYLOAD")

CHECKOUT_ID=$(echo "$CHECKOUT_RESPONSE" | jq -r '.response.checkoutId')
CHECKOUT_STATUS=$(echo "$CHECKOUT_RESPONSE" | jq -r '.response.status')

if [ -n "$CHECKOUT_ID" ] && [ "$CHECKOUT_ID" != "null" ]; then
    log_pass "Checkout session created: $CHECKOUT_ID"
    log_info "Status: $CHECKOUT_STATUS"
    log_info "Total: $(echo "$CHECKOUT_RESPONSE" | jq -r '.response.total.formatted')"
else
    log_fail "Failed to create checkout session"
    log_info "Response: $CHECKOUT_RESPONSE"
fi

# Test 2.2: Get Checkout Session
log_test "Get Checkout Session"
CHECKOUT_GET_PAYLOAD=$(cat <<EOF
{
  "tool": "commerce.checkout.get",
  "request": {
    "userId": "$USER_ID",
    "checkoutId": "$CHECKOUT_ID"
  }
}
EOF
)

GET_RESPONSE=$(curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "$CHECKOUT_GET_PAYLOAD")

GET_STATUS=$(echo "$GET_RESPONSE" | jq -r '.response.status')
if [ "$GET_STATUS" = "CREATED" ]; then
    log_pass "Checkout session retrieved successfully"
else
    log_fail "Expected status CREATED, got $GET_STATUS"
fi

# Test 2.3: Update Checkout Session (Add Shipping Address)
log_test "Update Checkout Session - Add Shipping Address"
CHECKOUT_UPDATE_PAYLOAD=$(cat <<EOF
{
  "tool": "commerce.checkout.update",
  "request": {
    "userId": "$USER_ID",
    "checkoutId": "$CHECKOUT_ID",
    "shippingAddress": {
      "line1": "123 Test Street",
      "city": "Mumbai",
      "state": "Maharashtra",
      "pincode": "400001",
      "country": "IN"
    }
  }
}
EOF
)

UPDATE_RESPONSE=$(curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "$CHECKOUT_UPDATE_PAYLOAD")

UPDATE_STATUS=$(echo "$UPDATE_RESPONSE" | jq -r '.response.status')
if [ "$UPDATE_STATUS" = "SHIPPING_SET" ]; then
    log_pass "Shipping address added, status: $UPDATE_STATUS"
    log_info "Shipping cost: $(echo "$UPDATE_RESPONSE" | jq -r '.response.shippingCost.formatted')"
else
    log_fail "Expected status SHIPPING_SET, got $UPDATE_STATUS"
fi

# Test 2.4: Update Checkout Session (Add Payment Method)
log_test "Update Checkout Session - Add Payment Method"
PAYMENT_UPDATE_PAYLOAD=$(cat <<EOF
{
  "tool": "commerce.checkout.update",
  "request": {
    "userId": "$USER_ID",
    "checkoutId": "$CHECKOUT_ID",
    "paymentMethod": "COD"
  }
}
EOF
)

PAYMENT_RESPONSE=$(curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "$PAYMENT_UPDATE_PAYLOAD")

PAYMENT_STATUS=$(echo "$PAYMENT_RESPONSE" | jq -r '.response.status')
if [ "$PAYMENT_STATUS" = "PAYMENT_SET" ]; then
    log_pass "Payment method added, status: $PAYMENT_STATUS"
else
    log_fail "Expected status PAYMENT_SET, got $PAYMENT_STATUS"
fi

# Test 2.5: Complete Checkout Session (Low Value Order)
log_test "Complete Checkout Session - Low Value Order (No Confirmation)"
COMPLETE_PAYLOAD=$(cat <<EOF
{
  "tool": "commerce.checkout.complete",
  "request": {
    "userId": "$USER_ID",
    "checkoutId": "$CHECKOUT_ID"
  }
}
EOF
)

COMPLETE_RESPONSE=$(curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "$COMPLETE_PAYLOAD")

COMPLETE_STATUS=$(echo "$COMPLETE_RESPONSE" | jq -r '.response.status')
ORDER_ID=$(echo "$COMPLETE_RESPONSE" | jq -r '.response.orderId')

if [ "$COMPLETE_STATUS" = "COMPLETED" ] && [ -n "$ORDER_ID" ]; then
    log_pass "Checkout completed, Order ID: $ORDER_ID"
else
    log_fail "Failed to complete checkout"
    log_info "Response: $COMPLETE_RESPONSE"
fi

# Test 2.6: High-Value Order Confirmation (Create new checkout)
log_test "High-Value Order - HITL Confirmation Required"

# Create new cart with high value items
HIGH_VALUE_USER="hv-user-$(date +%s)"
curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "{\"tool\":\"commerce.cart.addItem\",\"request\":{\"userId\":\"$HIGH_VALUE_USER\",\"productId\":\"PROD-HV\",\"provider\":\"mock\",\"quantity\":10,\"unitPrice\":10000.00}}" > /dev/null

CART_GET=$(curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "{\"tool\":\"commerce.cart.getCart\",\"request\":{\"userId\":\"$HIGH_VALUE_USER\"}}")

HV_CART_ID=$(echo "$CART_GET" | jq -r '.response.id')

# Create high-value checkout
HV_CHECKOUT_RESPONSE=$(curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "{\"tool\":\"commerce.checkout.create\",\"request\":{\"userId\":\"$HIGH_VALUE_USER\",\"cartId\":\"$HV_CART_ID\",\"provider\":\"mock\"}}")

HV_CHECKOUT_ID=$(echo "$HV_CHECKOUT_RESPONSE" | jq -r '.response.checkoutId')

# Add shipping and payment
curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "{\"tool\":\"commerce.checkout.update\",\"request\":{\"userId\":\"$HIGH_VALUE_USER\",\"checkoutId\":\"$HV_CHECKOUT_ID\",\"shippingAddress\":{\"line1\":\"123 Test\",\"city\":\"Mumbai\",\"state\":\"MH\",\"pincode\":\"400001\",\"country\":\"IN\"},\"paymentMethod\":\"UPI\"}}" > /dev/null

# Try to complete without confirmation
HV_COMPLETE=$(curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "{\"tool\":\"commerce.checkout.complete\",\"request\":{\"userId\":\"$HIGH_VALUE_USER\",\"checkoutId\":\"$HV_CHECKOUT_ID\"}}")

REQUIRES_CONFIRMATION=$(echo "$HV_COMPLETE" | jq -r '.response.requiresConfirmation')
if [ "$REQUIRES_CONFIRMATION" = "true" ]; then
    log_pass "High-value order requires confirmation (>₹50,000)"
    log_info "Total: $(echo "$HV_COMPLETE" | jq -r '.response.total.formatted')"
else
    log_fail "Expected confirmation requirement for high-value order"
fi

# Complete with confirmation
HV_COMPLETE_CONFIRMED=$(curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "{\"tool\":\"commerce.checkout.complete\",\"request\":{\"userId\":\"$HIGH_VALUE_USER\",\"checkoutId\":\"$HV_CHECKOUT_ID\",\"confirmed\":true}}")

HV_ORDER_ID=$(echo "$HV_COMPLETE_CONFIRMED" | jq -r '.response.orderId')
if [ -n "$HV_ORDER_ID" ] && [ "$HV_ORDER_ID" != "null" ]; then
    log_pass "High-value order completed with confirmation: $HV_ORDER_ID"
else
    log_fail "Failed to complete high-value order with confirmation"
fi

# Test 2.7: Cancel Checkout Session
log_test "Cancel Checkout Session"
# Create a new checkout to cancel
CANCEL_USER="cancel-user-$(date +%s)"
curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "{\"tool\":\"commerce.cart.addItem\",\"request\":{\"userId\":\"$CANCEL_USER\",\"productId\":\"PROD-001\",\"provider\":\"mock\",\"quantity\":1,\"unitPrice\":500.00}}" > /dev/null

CANCEL_CART=$(curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "{\"tool\":\"commerce.cart.getCart\",\"request\":{\"userId\":\"$CANCEL_USER\"}}")

CANCEL_CART_ID=$(echo "$CANCEL_CART" | jq -r '.response.id')

CANCEL_CHECKOUT=$(curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "{\"tool\":\"commerce.checkout.create\",\"request\":{\"userId\":\"$CANCEL_USER\",\"cartId\":\"$CANCEL_CART_ID\",\"provider\":\"mock\"}}")

CANCEL_CHECKOUT_ID=$(echo "$CANCEL_CHECKOUT" | jq -r '.response.checkoutId')

CANCEL_RESPONSE=$(curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "{\"tool\":\"commerce.checkout.cancel\",\"request\":{\"userId\":\"$CANCEL_USER\",\"checkoutId\":\"$CANCEL_CHECKOUT_ID\"}}")

CANCEL_STATUS=$(echo "$CANCEL_RESPONSE" | jq -r '.response.status')
if [ "$CANCEL_STATUS" = "CANCELLED" ]; then
    log_pass "Checkout session cancelled successfully"
else
    log_fail "Expected status CANCELLED, got $CANCEL_STATUS"
fi

# ============================================
# PHASE 2.5: PRODUCT DISCOVERY EXTENSIONS
# ============================================

echo -e "\n${YELLOW}=== PHASE 2.5: PRODUCT DISCOVERY EXTENSIONS ===${NC}"

# Test 3.1: Estimate Shipping
log_test "Estimate Shipping Cost"
SHIPPING_PAYLOAD=$(cat <<EOF
{
  "tool": "commerce.product.estimateShipping",
  "request": {
    "productId": "PROD-001",
    "quantity": 2,
    "address": {
      "pincode": "400001"
    }
  }
}
EOF
)

SHIPPING_RESPONSE=$(curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "$SHIPPING_PAYLOAD")

SHIPPING_COST=$(echo "$SHIPPING_RESPONSE" | jq -r '.response.shippingCost.formatted')
DELIVERY_DAYS=$(echo "$SHIPPING_RESPONSE" | jq -r '.response.estimatedDeliveryDays')

if [ -n "$SHIPPING_COST" ] && [ "$SHIPPING_COST" != "null" ]; then
    log_pass "Shipping estimated: $SHIPPING_COST, Delivery: $DELIVERY_DAYS days"
else
    log_fail "Failed to estimate shipping"
fi

# Test 3.2: List Product Variants
log_test "List Product Variants"
VARIANTS_PAYLOAD=$(cat <<EOF
{
  "tool": "commerce.product.listVariants",
  "request": {
    "productId": "PROD-001"
  }
}
EOF
)

VARIANTS_RESPONSE=$(curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "$VARIANTS_PAYLOAD")

VARIANT_COUNT=$(echo "$VARIANTS_RESPONSE" | jq -r '.response.totalVariants')
if [ "$VARIANT_COUNT" -gt 0 ]; then
    log_pass "Product variants listed: $VARIANT_COUNT variants"
else
    log_fail "Failed to list product variants"
fi

# Test 3.3: Get Promotions
log_test "Get Active Promotions"
PROMOTIONS_PAYLOAD=$(cat <<EOF
{
  "tool": "commerce.promotions.get",
  "request": {
    "productId": "PROD-001"
  }
}
EOF
)

PROMOTIONS_RESPONSE=$(curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "$PROMOTIONS_PAYLOAD")

PROMO_COUNT=$(echo "$PROMOTIONS_RESPONSE" | jq -r '.response.activePromotions')
if [ -n "$PROMO_COUNT" ]; then
    log_pass "Active promotions found: $PROMO_COUNT"
else
    log_fail "Failed to get promotions"
fi

# Test 3.4: Validate Coupon (requires database setup)
log_test "Validate Coupon Code"
COUPON_PAYLOAD=$(cat <<EOF
{
  "tool": "commerce.promotions.validateCoupon",
  "request": {
    "couponCode": "TEST100",
    "orderAmount": 1000
  }
}
EOF
)

COUPON_RESPONSE=$(curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "$COUPON_PAYLOAD")

# This might fail if coupons table is empty, which is acceptable
COUPON_VALID=$(echo "$COUPON_RESPONSE" | jq -r '.response.valid')
if [ "$COUPON_VALID" = "true" ] || [ "$COUPON_VALID" = "false" ]; then
    log_pass "Coupon validation executed (valid=$COUPON_VALID)"
elif echo "$COUPON_RESPONSE" | jq -e '.error.code == "NOT_FOUND"' > /dev/null 2>&1; then
    log_pass "Coupon validation works (coupon not found - expected if DB empty)"
else
    log_fail "Coupon validation failed unexpectedly"
    log_info "Response: $COUPON_RESPONSE"
fi

# ============================================
# TEST SUMMARY
# ============================================

echo -e "\n${BLUE}================================================${NC}"
echo -e "${BLUE}  TEST SUMMARY${NC}"
echo -e "${BLUE}================================================${NC}"
echo -e "Total Tests:  ${TOTAL_TESTS}"
echo -e "${GREEN}Passed:       ${PASSED_TESTS}${NC}"
if [ $FAILED_TESTS -gt 0 ]; then
    echo -e "${RED}Failed:       ${FAILED_TESTS}${NC}"
else
    echo -e "Failed:       ${FAILED_TESTS}"
fi
echo -e "Success Rate: $((PASSED_TESTS * 100 / TOTAL_TESTS))%"
echo -e "${BLUE}================================================${NC}"

if [ $FAILED_TESTS -gt 0 ]; then
    exit 1
else
    exit 0
fi
