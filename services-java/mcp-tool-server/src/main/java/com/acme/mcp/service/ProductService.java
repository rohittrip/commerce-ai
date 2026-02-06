package com.acme.mcp.service;

import com.acme.shared.ToolError;
import com.acme.shared.ToolResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;

@Service
public class ProductService {
    private static final Logger logger = LoggerFactory.getLogger(ProductService.class);
    private final JdbcTemplate jdbc;

    public ProductService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public ToolResponse<Map<String, Object>> estimateShipping(Map<String, Object> request) {
        String traceId = UUID.randomUUID().toString();
        try {
            String productId = (String) request.get("productId");
            Map<String, Object> address = (Map<String, Object>) request.get("address");
            Integer quantity = (Integer) request.getOrDefault("quantity", 1);

            logger.info("[{}] Estimating shipping for product={}, qty={}", traceId, productId, quantity);

            // Mock shipping calculation
            String pincode = (String) address.get("pincode");
            BigDecimal shippingCost = calculateShippingCost(pincode, quantity);
            int estimatedDays = calculateDeliveryDays(pincode);

            Map<String, Object> response = new HashMap<>();
            response.put("productId", productId);
            response.put("shippingCost", formatMoney(shippingCost, "INR"));
            response.put("estimatedDeliveryDays", estimatedDays);
            response.put("estimatedDeliveryDate", Instant.now().plusSeconds(estimatedDays * 86400L).toString());

            return ToolResponse.success(traceId, response);
        } catch (Exception e) {
            logger.error("[{}] Error estimating shipping", traceId, e);
            return ToolResponse.failure(traceId, new ToolError(ToolError.Code.INTERNAL_ERROR, e.getMessage()));
        }
    }

    public ToolResponse<Map<String, Object>> listVariants(Map<String, Object> request) {
        String traceId = UUID.randomUUID().toString();
        try {
            String productId = (String) request.get("productId");

            logger.info("[{}] Listing variants for product={}", traceId, productId);

            // Mock variant data
            List<Map<String, Object>> variants = new ArrayList<>();

            Map<String, Object> variant1 = new HashMap<>();
            variant1.put("variantId", productId + "-v1");
            variant1.put("name", "Standard");
            variant1.put("attributes", Map.of("color", "Black", "size", "Medium"));
            variant1.put("price", formatMoney(new BigDecimal("999.00"), "INR"));
            variant1.put("inStock", true);
            variants.add(variant1);

            Map<String, Object> variant2 = new HashMap<>();
            variant2.put("variantId", productId + "-v2");
            variant2.put("name", "Premium");
            variant2.put("attributes", Map.of("color", "Blue", "size", "Large"));
            variant2.put("price", formatMoney(new BigDecimal("1299.00"), "INR"));
            variant2.put("inStock", true);
            variants.add(variant2);

            Map<String, Object> response = new HashMap<>();
            response.put("productId", productId);
            response.put("variants", variants);
            response.put("totalVariants", variants.size());

            return ToolResponse.success(traceId, response);
        } catch (Exception e) {
            logger.error("[{}] Error listing variants", traceId, e);
            return ToolResponse.failure(traceId, new ToolError(ToolError.Code.INTERNAL_ERROR, e.getMessage()));
        }
    }

    public ToolResponse<Map<String, Object>> getPromotions(Map<String, Object> request) {
        String traceId = UUID.randomUUID().toString();
        try {
            String productId = (String) request.get("productId");

            logger.info("[{}] Getting promotions for product={}", traceId, productId);

            // Mock promotions
            List<Map<String, Object>> promotions = new ArrayList<>();

            Map<String, Object> promo1 = new HashMap<>();
            promo1.put("promoId", "WINTER2026");
            promo1.put("type", "PERCENTAGE");
            promo1.put("value", 10);
            promo1.put("description", "Winter Sale - 10% off");
            promo1.put("expiresAt", Instant.now().plusSeconds(30 * 86400L).toString());
            promotions.add(promo1);

            Map<String, Object> response = new HashMap<>();
            response.put("productId", productId);
            response.put("promotions", promotions);
            response.put("activePromotions", promotions.size());

            return ToolResponse.success(traceId, response);
        } catch (Exception e) {
            logger.error("[{}] Error getting promotions", traceId, e);
            return ToolResponse.failure(traceId, new ToolError(ToolError.Code.INTERNAL_ERROR, e.getMessage()));
        }
    }

    public ToolResponse<Map<String, Object>> validateCoupon(Map<String, Object> request) {
        String traceId = UUID.randomUUID().toString();
        try {
            String couponCode = (String) request.get("couponCode");
            BigDecimal orderAmount = new BigDecimal(request.get("orderAmount").toString());

            logger.info("[{}] Validating coupon={}, amount={}", traceId, couponCode, orderAmount);

            List<Map<String, Object>> results = jdbc.queryForList(
                "SELECT * FROM coupons WHERE code = ? AND enabled = true AND expires_at > NOW()",
                couponCode
            );

            if (results.isEmpty()) {
                return ToolResponse.failure(traceId,
                    new ToolError(ToolError.Code.NOT_FOUND, "Invalid or expired coupon"));
            }

            Map<String, Object> coupon = results.get(0);
            BigDecimal minOrder = (BigDecimal) coupon.get("min_order");

            if (minOrder != null && orderAmount.compareTo(minOrder) < 0) {
                Map<String, Object> response = new HashMap<>();
                response.put("valid", false);
                response.put("reason", "Minimum order amount not met");
                response.put("minOrder", formatMoney(minOrder, "INR"));
                return ToolResponse.success(traceId, response);
            }

            String type = (String) coupon.get("type");
            BigDecimal value = (BigDecimal) coupon.get("value");
            BigDecimal maxDiscount = (BigDecimal) coupon.get("max_discount");

            BigDecimal discount;
            if ("PERCENTAGE".equals(type)) {
                discount = orderAmount.multiply(value).divide(new BigDecimal("100"));
                if (maxDiscount != null && discount.compareTo(maxDiscount) > 0) {
                    discount = maxDiscount;
                }
            } else {
                discount = value;
            }

            Map<String, Object> response = new HashMap<>();
            response.put("valid", true);
            response.put("couponCode", couponCode);
            response.put("type", type);
            response.put("discount", formatMoney(discount, "INR"));
            response.put("expiresAt", coupon.get("expires_at").toString());

            return ToolResponse.success(traceId, response);
        } catch (Exception e) {
            logger.error("[{}] Error validating coupon", traceId, e);
            return ToolResponse.failure(traceId, new ToolError(ToolError.Code.INTERNAL_ERROR, e.getMessage()));
        }
    }

    private BigDecimal calculateShippingCost(String pincode, int quantity) {
        // Mock calculation based on pincode and quantity
        BigDecimal baseShipping = new BigDecimal("50.00");
        if (quantity > 1) {
            baseShipping = baseShipping.add(new BigDecimal("20.00").multiply(BigDecimal.valueOf(quantity - 1)));
        }
        return baseShipping;
    }

    private int calculateDeliveryDays(String pincode) {
        // Mock calculation - metro cities get faster delivery
        if (pincode.startsWith("11") || pincode.startsWith("40") ||
            pincode.startsWith("56") || pincode.startsWith("60")) {
            return 2; // Metro cities
        }
        return 5; // Other areas
    }

    private Map<String, Object> formatMoney(BigDecimal amount, String currency) {
        Map<String, Object> money = new HashMap<>();
        money.put("amount", amount);
        money.put("currency", currency);
        money.put("formatted", String.format("₹%,.2f", amount));
        return money;
    }
}
