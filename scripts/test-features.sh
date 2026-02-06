#!/bin/bash

# Quick feature test script
BASE_URL="http://localhost:8081"
API_URL="$BASE_URL/api/v1/tools/execute"

# Test counters
TOTAL=0
PASSED=0

echo "====== Phase 1 & 2 Feature Tests ======"
echo

# Helper function
test_tool() {
    local tool=$1
    local payload=$2
    local desc=$3

    TOTAL=$((TOTAL + 1))
    echo -n "[$TOTAL] Testing $desc... "

    RESPONSE=$(curl -s -X POST "$API_URL/$tool" -H 'Content-Type: application/json' -d "$payload")

    if echo "$RESPONSE" | jq -e '.ok == true' > /dev/null 2>&1; then
        echo "✓ PASS"
        PASSED=$((PASSED + 1))
        return 0
    else
        echo "✗ FAIL"
        echo "  Response: $(echo "$RESPONSE" | jq -c '.')"
        return 1
    fi
}

# Phase 1: UCP Discovery
echo "=== PHASE 1: UCP DISCOVERY ==="
TOTAL=$((TOTAL + 1))
echo -n "[$TOTAL] UCP Discovery endpoint... "
if curl -s "$BASE_URL/.well-known/ucp" | jq -e '.platform' > /dev/null 2>&1; then
    echo "✓ PASS"
    PASSED=$((PASSED + 1))
else
    echo "✗ FAIL"
fi

TOTAL=$((TOTAL + 1))
echo -n "[$TOTAL] Checkout tools registered... "
CHECKOUT_TOOLS=$(curl -s "$BASE_URL/.well-known/ucp" | jq '[.tools[] | select(.name | startswith("commerce.checkout"))] | length')
if [ "$CHECKOUT_TOOLS" -ge 5 ]; then
    echo "✓ PASS ($CHECKOUT_TOOLS tools)"
    PASSED=$((PASSED + 1))
else
    echo "✗ FAIL (found $CHECKOUT_TOOLS)"
fi

echo

# Phase 2: Checkout Session
echo "=== PHASE 2: CHECKOUT SESSION ==="

# Create user and cart
USER_ID="test-$(date +%s)"

test_tool "commerce.cart.addItem" \
    "{\"userId\":\"$USER_ID\",\"productId\":\"PROD-001\",\"provider\":\"mock\",\"quantity\":2,\"unitPrice\":999.00}" \
    "Add item to cart"

test_tool "commerce.cart.getCart" \
    "{\"userId\":\"$USER_ID\"}" \
    "Get cart"

# Get cart ID from response
CART_RESPONSE=$(curl -s -X POST "$API_URL/commerce.cart.getCart" -H 'Content-Type: application/json' -d "{\"userId\":\"$USER_ID\"}")
CART_ID=$(echo "$CART_RESPONSE" | jq -r '.data.id')

if [ -n "$CART_ID" ] && [ "$CART_ID" != "null" ]; then
    # Create checkout
    CHECKOUT_RESPONSE=$(curl -s -X POST "$API_URL/commerce.checkout.create" -H 'Content-Type: application/json' \
        -d "{\"userId\":\"$USER_ID\",\"cartId\":\"$CART_ID\",\"provider\":\"mock\"}")

    CHECKOUT_ID=$(echo "$CHECKOUT_RESPONSE" | jq -r '.data.checkoutId')

    TOTAL=$((TOTAL + 1))
    echo -n "[$TOTAL] Create checkout session... "
    if [ -n "$CHECKOUT_ID" ] && [ "$CHECKOUT_ID" != "null" ]; then
        echo "✓ PASS (ID: ${CHECKOUT_ID:0:8}...)"
        PASSED=$((PASSED + 1))

        # Update with shipping
        test_tool "commerce.checkout.update" \
            "{\"userId\":\"$USER_ID\",\"checkoutId\":\"$CHECKOUT_ID\",\"shippingAddress\":{\"line1\":\"123 Test\",\"city\":\"Mumbai\",\"state\":\"MH\",\"pincode\":\"400001\",\"country\":\"IN\"}}" \
            "Add shipping address"

        # Update with payment
        test_tool "commerce.checkout.update" \
            "{\"userId\":\"$USER_ID\",\"checkoutId\":\"$CHECKOUT_ID\",\"paymentMethod\":\"COD\"}" \
            "Add payment method"

        # Complete checkout
        test_tool "commerce.checkout.complete" \
            "{\"userId\":\"$USER_ID\",\"checkoutId\":\"$CHECKOUT_ID\"}" \
            "Complete checkout"
    else
        echo "✗ FAIL"
    fi
fi

echo

# Phase 2.5: Product Discovery
echo "=== PHASE 2.5: PRODUCT DISCOVERY ==="

test_tool "commerce.product.estimateShipping" \
    "{\"productId\":\"PROD-001\",\"quantity\":1,\"address\":{\"pincode\":\"400001\"}}" \
    "Estimate shipping"

test_tool "commerce.product.listVariants" \
    "{\"productId\":\"PROD-001\"}" \
    "List product variants"

test_tool "commerce.promotions.get" \
    "{\"productId\":\"PROD-001\"}" \
    "Get promotions"

echo
echo "====== TEST SUMMARY ======"
echo "Total:  $TOTAL"
echo "Passed: $PASSED"
echo "Failed: $((TOTAL - PASSED))"
echo "Rate:   $((PASSED * 100 / TOTAL))%"
echo

if [ $PASSED -eq $TOTAL ]; then
    echo "✓ ALL TESTS PASSED!"
    exit 0
else
    echo "✗ SOME TESTS FAILED"
    exit 1
fi
