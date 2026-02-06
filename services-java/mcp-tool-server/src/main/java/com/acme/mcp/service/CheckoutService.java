package com.acme.mcp.service;

import com.acme.shared.ToolError;
import com.acme.shared.ToolResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service
public class CheckoutService {
    private static final Logger logger = LoggerFactory.getLogger(CheckoutService.class);
    private final JdbcTemplate jdbc;
    private final ObjectMapper objectMapper;

    @Value("${checkout.expiration-minutes:30}")
    private int expirationMinutes;

    @Value("${checkout.high-value-threshold:50000}")
    private BigDecimal highValueThreshold;

    public CheckoutService(JdbcTemplate jdbc, ObjectMapper objectMapper) {
        this.jdbc = jdbc;
        this.objectMapper = objectMapper;
    }

    public ToolResponse<Map<String, Object>> createCheckout(Map<String, Object> request) {
        String traceId = UUID.randomUUID().toString();
        try {
            String userId = (String) request.get("userId");
            String cartId = (String) request.get("cartId");
            String provider = (String) request.getOrDefault("provider", "mock");

            logger.info("[{}] Creating checkout session for user={}, cart={}", traceId, userId, cartId);

            Map<String, Object> cart = getCart(cartId, userId);
            if (cart == null) {
                return ToolResponse.failure(traceId, new ToolError(ToolError.Code.NOT_FOUND, "Cart not found"));
            }

            List<Map<String, Object>> cartItems = getCartItems(cartId);
            if (cartItems.isEmpty()) {
                return ToolResponse.failure(traceId, new ToolError(ToolError.Code.VALIDATION_ERROR, "Cart is empty"));
            }

            String checkoutId = UUID.randomUUID().toString();
            Instant expiresAt = Instant.now().plus(expirationMinutes, ChronoUnit.MINUTES);

            BigDecimal subtotal = calculateSubtotal(cartItems);
            BigDecimal tax = subtotal.multiply(new BigDecimal("0.18"));
            BigDecimal shippingCost = BigDecimal.ZERO;
            BigDecimal discount = BigDecimal.ZERO;
            BigDecimal total = subtotal.add(tax).add(shippingCost).subtract(discount);

            String itemsJson = objectMapper.writeValueAsString(cartItems);

            jdbc.update(
                "INSERT INTO checkout_sessions (id, user_id, cart_id, provider, status, items, " +
                "subtotal, tax, shipping_cost, discount, total, currency, expires_at) " +
                "VALUES (?, ?, ?, ?, ?, ?::jsonb, ?, ?, ?, ?, ?, ?, ?)",
                checkoutId, userId, cartId, provider, "CREATED", itemsJson,
                subtotal, tax, shippingCost, discount, total, "INR", expiresAt
            );

            Map<String, Object> response = new HashMap<>();
            response.put("checkoutId", checkoutId);
            response.put("status", "CREATED");
            response.put("subtotal", formatMoney(subtotal, "INR"));
            response.put("tax", formatMoney(tax, "INR"));
            response.put("total", formatMoney(total, "INR"));
            response.put("expiresAt", expiresAt.toString());
            response.put("itemCount", cartItems.size());

            return ToolResponse.success(traceId, response);
        } catch (Exception e) {
            logger.error("[{}] Error creating checkout", traceId, e);
            return ToolResponse.failure(traceId, new ToolError(ToolError.Code.INTERNAL_ERROR, e.getMessage()));
        }
    }

    public ToolResponse<Map<String, Object>> updateCheckout(Map<String, Object> request) {
        String traceId = UUID.randomUUID().toString();
        try {
            String checkoutId = (String) request.get("checkoutId");
            String userId = (String) request.get("userId");

            logger.info("[{}] Updating checkout session {}", traceId, checkoutId);

            Map<String, Object> checkout = getCheckout(checkoutId, userId);
            if (checkout == null) {
                return ToolResponse.failure(traceId, new ToolError(ToolError.Code.NOT_FOUND, "Checkout session not found"));
            }

            if (isExpired((Instant) checkout.get("expires_at"))) {
                return ToolResponse.failure(traceId, new ToolError(ToolError.Code.VALIDATION_ERROR, "Checkout session expired"));
            }

            String status = (String) checkout.get("status");
            if ("COMPLETED".equals(status) || "CANCELLED".equals(status)) {
                return ToolResponse.failure(traceId, new ToolError(ToolError.Code.VALIDATION_ERROR,
                    "Cannot update " + status.toLowerCase() + " checkout"));
            }

            Map<String, Object> updates = new HashMap<>();
            String newStatus = status;

            if (request.containsKey("shippingAddress")) {
                updates.put("shipping_address", objectMapper.writeValueAsString(request.get("shippingAddress")));
                newStatus = "SHIPPING_SET";

                BigDecimal shippingCost = calculateShipping(request.get("shippingAddress"));
                updates.put("shipping_cost", shippingCost);

                BigDecimal subtotal = (BigDecimal) checkout.get("subtotal");
                BigDecimal tax = (BigDecimal) checkout.get("tax");
                BigDecimal discount = (BigDecimal) checkout.get("discount");
                BigDecimal newTotal = subtotal.add(tax).add(shippingCost).subtract(discount);
                updates.put("total", newTotal);
            }

            if (request.containsKey("billingAddress")) {
                updates.put("billing_address", objectMapper.writeValueAsString(request.get("billingAddress")));
            }

            if (request.containsKey("paymentMethod")) {
                updates.put("payment_method", request.get("paymentMethod"));
                if (newStatus.equals("SHIPPING_SET")) {
                    newStatus = "PAYMENT_SET";
                }
            }

            updates.put("status", newStatus);
            Instant newExpiresAt = Instant.now().plus(15, ChronoUnit.MINUTES);
            updates.put("expires_at", newExpiresAt);

            StringBuilder sql = new StringBuilder("UPDATE checkout_sessions SET updated_at = NOW()");
            List<Object> params = new ArrayList<>();

            for (Map.Entry<String, Object> entry : updates.entrySet()) {
                sql.append(", ").append(entry.getKey()).append(" = ?");
                params.add(entry.getValue());
            }

            sql.append(" WHERE id = ? AND user_id = ?");
            params.add(checkoutId);
            params.add(userId);

            jdbc.update(sql.toString(), params.toArray());

            checkout = getCheckout(checkoutId, userId);
            Map<String, Object> response = buildCheckoutResponse(checkout);
            return ToolResponse.success(traceId, response);
        } catch (Exception e) {
            logger.error("[{}] Error updating checkout", traceId, e);
            return ToolResponse.failure(traceId, new ToolError(ToolError.Code.INTERNAL_ERROR, e.getMessage()));
        }
    }

    public ToolResponse<Map<String, Object>> getCheckoutById(Map<String, Object> request) {
        String traceId = UUID.randomUUID().toString();
        try {
            String checkoutId = (String) request.get("checkoutId");
            String userId = (String) request.get("userId");

            Map<String, Object> checkout = getCheckout(checkoutId, userId);
            if (checkout == null) {
                return ToolResponse.failure(traceId, new ToolError(ToolError.Code.NOT_FOUND, "Checkout session not found"));
            }

            if (isExpired((Instant) checkout.get("expires_at"))) {
                jdbc.update("UPDATE checkout_sessions SET status = 'EXPIRED' WHERE id = ?", checkoutId);
                checkout.put("status", "EXPIRED");
            }

            Map<String, Object> response = buildCheckoutResponse(checkout);
            return ToolResponse.success(traceId, response);
        } catch (Exception e) {
            logger.error("[{}] Error getting checkout", traceId, e);
            return ToolResponse.failure(traceId, new ToolError(ToolError.Code.INTERNAL_ERROR, e.getMessage()));
        }
    }

    public ToolResponse<Map<String, Object>> completeCheckout(Map<String, Object> request) {
        String traceId = UUID.randomUUID().toString();
        try {
            String checkoutId = (String) request.get("checkoutId");
            String userId = (String) request.get("userId");

            logger.info("[{}] Completing checkout session {}", traceId, checkoutId);

            Map<String, Object> checkout = getCheckout(checkoutId, userId);
            if (checkout == null) {
                return ToolResponse.failure(traceId, new ToolError(ToolError.Code.NOT_FOUND, "Checkout session not found"));
            }

            if (isExpired((Instant) checkout.get("expires_at"))) {
                return ToolResponse.failure(traceId, new ToolError(ToolError.Code.VALIDATION_ERROR, "Checkout session expired"));
            }

            String status = (String) checkout.get("status");
            if ("COMPLETED".equals(status)) {
                return ToolResponse.failure(traceId, new ToolError(ToolError.Code.VALIDATION_ERROR, "Checkout already completed"));
            }
            if ("CANCELLED".equals(status)) {
                return ToolResponse.failure(traceId, new ToolError(ToolError.Code.VALIDATION_ERROR, "Checkout was cancelled"));
            }

            if (checkout.get("shipping_address") == null) {
                return ToolResponse.failure(traceId, new ToolError(ToolError.Code.VALIDATION_ERROR, "Shipping address required"));
            }
            if (checkout.get("payment_method") == null) {
                return ToolResponse.failure(traceId, new ToolError(ToolError.Code.VALIDATION_ERROR, "Payment method required"));
            }

            BigDecimal total = (BigDecimal) checkout.get("total");

            boolean requiresConfirmation = total.compareTo(highValueThreshold) > 0;
            if (requiresConfirmation && !Boolean.TRUE.equals(request.get("confirmed"))) {
                Map<String, Object> response = new HashMap<>();
                response.put("requiresConfirmation", true);
                response.put("total", formatMoney(total, "INR"));
                response.put("message", "High-value order requires confirmation");
                return ToolResponse.success(traceId, response);
            }

            String orderId = UUID.randomUUID().toString();
            String cartId = (String) checkout.get("cart_id");
            String provider = (String) checkout.get("provider");
            String paymentMethod = (String) checkout.get("payment_method");

            String addressId = extractOrCreateAddress(checkout.get("shipping_address"), userId);

            jdbc.update(
                "INSERT INTO orders (id, user_id, cart_id, provider, address_id, status, payment_method, " +
                "currency, total, created_at, updated_at) " +
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())",
                orderId, userId, cartId, provider, addressId, "PENDING", paymentMethod,
                checkout.get("currency"), total
            );

            jdbc.update("UPDATE checkout_sessions SET status = 'COMPLETED', updated_at = NOW() WHERE id = ?", checkoutId);

            Map<String, Object> response = new HashMap<>();
            response.put("orderId", orderId);
            response.put("checkoutId", checkoutId);
            response.put("status", "COMPLETED");
            response.put("total", formatMoney(total, "INR"));
            response.put("paymentMethod", paymentMethod);

            return ToolResponse.success(traceId, response);
        } catch (Exception e) {
            logger.error("[{}] Error completing checkout", traceId, e);
            return ToolResponse.failure(traceId, new ToolError(ToolError.Code.INTERNAL_ERROR, e.getMessage()));
        }
    }

    public ToolResponse<Map<String, Object>> cancelCheckout(Map<String, Object> request) {
        String traceId = UUID.randomUUID().toString();
        try {
            String checkoutId = (String) request.get("checkoutId");
            String userId = (String) request.get("userId");

            logger.info("[{}] Cancelling checkout session {}", traceId, checkoutId);

            int updated = jdbc.update(
                "UPDATE checkout_sessions SET status = 'CANCELLED', updated_at = NOW() " +
                "WHERE id = ? AND user_id = ? AND status NOT IN ('COMPLETED', 'CANCELLED')",
                checkoutId, userId
            );

            if (updated == 0) {
                return ToolResponse.failure(traceId, new ToolError(ToolError.Code.NOT_FOUND,
                    "Checkout not found or already completed/cancelled"));
            }

            Map<String, Object> response = new HashMap<>();
            response.put("checkoutId", checkoutId);
            response.put("status", "CANCELLED");

            return ToolResponse.success(traceId, response);
        } catch (Exception e) {
            logger.error("[{}] Error cancelling checkout", traceId, e);
            return ToolResponse.failure(traceId, new ToolError(ToolError.Code.INTERNAL_ERROR, e.getMessage()));
        }
    }

    private Map<String, Object> getCart(String cartId, String userId) {
        List<Map<String, Object>> results = jdbc.queryForList(
            "SELECT * FROM carts WHERE id = ? AND user_id = ?", cartId, userId
        );
        return results.isEmpty() ? null : results.get(0);
    }

    private List<Map<String, Object>> getCartItems(String cartId) {
        return jdbc.queryForList("SELECT * FROM cart_items WHERE cart_id = ?", cartId);
    }

    private Map<String, Object> getCheckout(String checkoutId, String userId) {
        List<Map<String, Object>> results = jdbc.queryForList(
            "SELECT * FROM checkout_sessions WHERE id = ? AND user_id = ?", checkoutId, userId
        );
        return results.isEmpty() ? null : results.get(0);
    }

    private BigDecimal calculateSubtotal(List<Map<String, Object>> items) {
        return items.stream()
            .map(item -> {
                BigDecimal price = (BigDecimal) item.get("unit_price");
                int qty = (Integer) item.get("qty");
                return price.multiply(BigDecimal.valueOf(qty));
            })
            .reduce(BigDecimal.ZERO, BigDecimal::add)
            .setScale(2, RoundingMode.HALF_UP);
    }

    private BigDecimal calculateShipping(Object shippingAddress) {
        return new BigDecimal("50.00");
    }

    private boolean isExpired(Instant expiresAt) {
        return Instant.now().isAfter(expiresAt);
    }

    private Map<String, Object> formatMoney(BigDecimal amount, String currency) {
        Map<String, Object> money = new HashMap<>();
        money.put("amount", amount);
        money.put("currency", currency);
        money.put("formatted", String.format("₹%,.2f", amount));
        return money;
    }

    private String extractOrCreateAddress(Object shippingAddressObj, String userId) {
        return UUID.randomUUID().toString();
    }

    private Map<String, Object> buildCheckoutResponse(Map<String, Object> checkout) throws Exception {
        Map<String, Object> response = new HashMap<>();
        response.put("checkoutId", checkout.get("id"));
        response.put("status", checkout.get("status"));
        response.put("subtotal", formatMoney((BigDecimal) checkout.get("subtotal"), (String) checkout.get("currency")));
        response.put("tax", formatMoney((BigDecimal) checkout.get("tax"), (String) checkout.get("currency")));
        response.put("shippingCost", formatMoney((BigDecimal) checkout.get("shipping_cost"), (String) checkout.get("currency")));
        response.put("discount", formatMoney((BigDecimal) checkout.get("discount"), (String) checkout.get("currency")));
        response.put("total", formatMoney((BigDecimal) checkout.get("total"), (String) checkout.get("currency")));
        response.put("expiresAt", checkout.get("expires_at").toString());

        if (checkout.get("shipping_address") != null) {
            response.put("shippingAddress", objectMapper.readValue((String) checkout.get("shipping_address"), Map.class));
        }
        if (checkout.get("billing_address") != null) {
            response.put("billingAddress", objectMapper.readValue((String) checkout.get("billing_address"), Map.class));
        }
        if (checkout.get("payment_method") != null) {
            response.put("paymentMethod", checkout.get("payment_method"));
        }

        return response;
    }
}
