package com.acme.mcp.adapters.providers;

import com.acme.mcp.adapters.ProviderAdapter;
import com.acme.shared.*;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Provider adapter for Reliance Digital (RD.in) e-commerce platform.
 * Integrates with RD's product catalog API for searching and displaying products.
 */
@Component
public class RelianceDigitalProviderAdapter implements ProviderAdapter {
    private static final Logger logger = LoggerFactory.getLogger(RelianceDigitalProviderAdapter.class);
    private static final String PROVIDER_NAME = "providerA";
    private static final String BASE_URL = "https://www.reliancedigital.in";
    private static final String CATALOG_API_PATH = "/ext/raven-api/catalog/v1.0/collections";

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    @Value("${provider.rd.auth.token:#{null}}")
    private String authToken;

    @Value("${provider.rd.enabled:false}")
    private boolean enabled;

    public RelianceDigitalProviderAdapter() {
        this.restTemplate = new RestTemplate();
        this.objectMapper = new ObjectMapper();
    }

    @Override
    public String getProviderName() {
        return PROVIDER_NAME;
    }

    @Override
    public boolean supports(Capability capability) {
        // Reliance Digital currently supports search and details
        // Cart and Order capabilities would require additional integration
        return capability == Capability.SEARCH || capability == Capability.DETAILS;
    }

    @Override
    public List<ProductSummary> search(String query, Map<String, Object> filters, int page, int limit) {
        logger.info("RD search: query={}, page={}, limit={}", query, page, limit);

        if (!enabled) {
            logger.warn("Reliance Digital provider is disabled");
            return Collections.emptyList();
        }

        try {
            // Determine collection based on query/filters
            String collection = determineCollection(query, filters);
            String url = buildSearchUrl(collection, query, page, limit, filters);

            HttpHeaders headers = buildHeaders();
            HttpEntity<String> entity = new HttpEntity<>(headers);

            logger.debug("RD API Request URL: {}", url);

            ResponseEntity<String> response = restTemplate.exchange(
                url,
                HttpMethod.GET,
                entity,
                String.class
            );

            if (response.getStatusCode() == HttpStatus.OK) {
                return parseSearchResponse(response.getBody());
            } else {
                logger.error("RD API returned status: {}", response.getStatusCode());
                return Collections.emptyList();
            }

        } catch (Exception e) {
            logger.error("Error searching Reliance Digital: {}", e.getMessage(), e);
            return Collections.emptyList();
        }
    }

    @Override
    public ProductSummary getProductDetails(String productId) {
        logger.info("RD getProductDetails: {}", productId);

        if (!enabled) {
            logger.warn("Reliance Digital provider is disabled");
            return null;
        }

        try {
            // For product details, we could use a different endpoint if available
            // For now, we'll search for the specific product ID
            List<ProductSummary> results = search(productId, null, 1, 1);
            return results.isEmpty() ? null : results.get(0);

        } catch (Exception e) {
            logger.error("Error getting RD product details: {}", e.getMessage(), e);
            return null;
        }
    }

    @Override
    public Cart addToCart(String userId, String productId, int quantity) {
        throw new UnsupportedOperationException("Cart operations not yet implemented for Reliance Digital");
    }

    @Override
    public Cart updateCartItem(String userId, String productId, int quantity) {
        throw new UnsupportedOperationException("Cart operations not yet implemented for Reliance Digital");
    }

    @Override
    public Cart removeFromCart(String userId, String productId) {
        throw new UnsupportedOperationException("Cart operations not yet implemented for Reliance Digital");
    }

    @Override
    public Cart getCart(String userId) {
        throw new UnsupportedOperationException("Cart operations not yet implemented for Reliance Digital");
    }

    @Override
    public Order createOrder(String userId, String cartId, String addressId, Order.PaymentMethod paymentMethod) {
        throw new UnsupportedOperationException("Order operations not yet implemented for Reliance Digital");
    }

    @Override
    public Order getOrderStatus(String orderId) {
        throw new UnsupportedOperationException("Order operations not yet implemented for Reliance Digital");
    }

    /**
     * Determine the collection/category based on query and filters
     */
    private String determineCollection(String query, Map<String, Object> filters) {
        // Default to mobiles for now; can be enhanced with category mapping
        if (filters != null && filters.containsKey("category")) {
            String category = filters.get("category").toString();
            return mapCategoryToCollection(category);
        }

        // Infer from query
        String lowerQuery = query != null ? query.toLowerCase() : "";
        if (lowerQuery.contains("mobile") || lowerQuery.contains("phone") || lowerQuery.contains("smartphone")) {
            return "mobiles";
        } else if (lowerQuery.contains("laptop") || lowerQuery.contains("computer")) {
            return "laptops";
        } else if (lowerQuery.contains("tv") || lowerQuery.contains("television")) {
            return "televisions";
        } else if (lowerQuery.contains("headphone") || lowerQuery.contains("earphone")) {
            return "headphones";
        }

        // Default fallback
        return "mobiles";
    }

    /**
     * Map internal category to RD collection name
     */
    private String mapCategoryToCollection(String category) {
        Map<String, String> categoryMap = Map.of(
            "electronics.mobile.smartphones", "mobiles",
            "electronics.computers.laptops", "laptops",
            "electronics.tv", "televisions",
            "electronics.audio.headphones", "headphones",
            "electronics.audio.speakers", "speakers"
        );

        return categoryMap.getOrDefault(category, "mobiles");
    }

    /**
     * Build the search URL with query parameters
     */
    private String buildSearchUrl(String collection, String query, int page, int limit, Map<String, Object> filters) {
        StringBuilder url = new StringBuilder(BASE_URL);
        url.append(CATALOG_API_PATH).append("/").append(collection).append("/items");

        // Build filter parameter
        StringBuilder filterParam = new StringBuilder();
        filterParam.append("internal_source:navigation");
        filterParam.append(":::page_type:number");

        if (query != null && !query.isEmpty()) {
            filterParam.append(":::q:").append(query);
        }

        url.append("?f=").append(filterParam.toString());
        url.append("&page_id=*");
        url.append("&page_no=").append(page);
        url.append("&page_size=").append(limit);
        url.append("&page_type=number");

        return url.toString();
    }

    /**
     * Build HTTP headers for RD API request
     */
    private HttpHeaders buildHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.set("Accept", "application/json, text/plain, */*");
        headers.set("Authorization", "Bearer " + authToken);
        headers.set("x-currency-code", "INR");
        headers.set("User-Agent", "Commerce-AI-Platform/1.0");
        return headers;
    }

    /**
     * Parse RD API response and convert to ProductSummary list
     */
    private List<ProductSummary> parseSearchResponse(String responseBody) {
        try {
            JsonNode root = objectMapper.readTree(responseBody);
            JsonNode items = root.get("items");

            if (items == null || !items.isArray()) {
                logger.warn("No items found in RD response");
                return Collections.emptyList();
            }

            List<ProductSummary> products = new ArrayList<>();

            for (JsonNode item : items) {
                try {
                    ProductSummary product = convertToProductSummary(item);
                    if (product != null) {
                        products.add(product);
                    }
                } catch (Exception e) {
                    logger.warn("Error parsing product item: {}", e.getMessage());
                }
            }

            logger.info("Parsed {} products from RD response", products.size());
            return products;

        } catch (Exception e) {
            logger.error("Error parsing RD response: {}", e.getMessage(), e);
            return Collections.emptyList();
        }
    }

    /**
     * Convert RD product item to ProductSummary
     */
    private ProductSummary convertToProductSummary(JsonNode item) {
        ProductSummary product = new ProductSummary();

        // ID - use uid or item_code
        String productId = item.has("uid") ? item.get("uid").asText() :
                          item.has("item_code") ? item.get("item_code").asText() : null;
        if (productId == null) {
            logger.warn("Product missing ID, skipping");
            return null;
        }
        product.setId(productId);
        product.setProvider(PROVIDER_NAME);

        // Name
        if (item.has("name")) {
            product.setName(item.get("name").asText());
        }

        // Description
        if (item.has("short_description")) {
            product.setDescription(item.get("short_description").asText());
        } else if (item.has("description")) {
            // Description might be base64 encoded in RD API
            product.setDescription(item.get("description").asText());
        }

        // Brand
        if (item.has("brand") && item.get("brand").has("name")) {
            product.setBrand(item.get("brand").get("name").asText());
        }

        // Category - extract from categories or _custom_json
        if (item.has("categories") && item.get("categories").isArray() && item.get("categories").size() > 0) {
            JsonNode category = item.get("categories").get(0);
            if (category.has("name")) {
                product.setCategory(mapRDCategoryToInternal(category.get("name").asText()));
            }
        }

        // Price - use effective price
        if (item.has("price") && item.get("price").has("effective")) {
            JsonNode priceNode = item.get("price").get("effective");
            double price = priceNode.has("min") ? priceNode.get("min").asDouble() : 0.0;
            String currency = priceNode.has("currency_code") ? priceNode.get("currency_code").asText() : "INR";
            product.setPrice(new Money(BigDecimal.valueOf(price), currency));
        }

        // Image URL - use first media
        if (item.has("medias") && item.get("medias").isArray() && item.get("medias").size() > 0) {
            JsonNode media = item.get("medias").get(0);
            if (media.has("url")) {
                product.setImageUrl(media.get("url").asText());
            }
        }

        // Availability - assume in stock if sellable is true
        boolean inStock = item.has("sellable") && item.get("sellable").asBoolean();
        Availability.Status status = inStock ? Availability.Status.IN_STOCK : Availability.Status.OUT_OF_STOCK;
        product.setAvailability(new Availability(inStock, null, status));

        // Rating and reviews from _custom_meta
        if (item.has("_custom_meta") && item.get("_custom_meta").isArray()) {
            for (JsonNode meta : item.get("_custom_meta")) {
                String key = meta.has("key") ? meta.get("key").asText() : "";
                String value = meta.has("value") ? meta.get("value").asText() : "";

                if ("averageRating".equals(key)) {
                    try {
                        product.setRating(Double.parseDouble(value));
                    } catch (NumberFormatException e) {
                        logger.debug("Invalid rating value: {}", value);
                    }
                } else if ("reviewsCount".equals(key) || "ratingsCount".equals(key)) {
                    try {
                        product.setReviewCount(Integer.parseInt(value));
                    } catch (NumberFormatException e) {
                        logger.debug("Invalid review count value: {}", value);
                    }
                }
            }
        }

        // Attributes from attributes field
        Map<String, Object> attributes = new HashMap<>();
        if (item.has("attributes") && item.get("attributes").isObject()) {
            JsonNode attrsNode = item.get("attributes");
            attrsNode.fields().forEachRemaining(entry -> {
                String key = entry.getKey();
                JsonNode value = entry.getValue();
                if (value.isTextual()) {
                    attributes.put(key, value.asText());
                } else if (value.isNumber()) {
                    attributes.put(key, value.asDouble());
                } else if (value.isBoolean()) {
                    attributes.put(key, value.asBoolean());
                }
            });
        }
        product.setAttributes(attributes);

        return product;
    }

    /**
     * Map RD category names to internal category paths
     */
    private String mapRDCategoryToInternal(String rdCategory) {
        // Simple mapping - can be enhanced with more sophisticated logic
        String lower = rdCategory.toLowerCase();

        if (lower.contains("mobile") || lower.contains("phone")) {
            return "electronics.mobile.smartphones";
        } else if (lower.contains("laptop") || lower.contains("computer")) {
            return "electronics.computers.laptops";
        } else if (lower.contains("headphone") || lower.contains("earphone")) {
            return "electronics.audio.headphones";
        } else if (lower.contains("speaker")) {
            return "electronics.audio.speakers";
        } else if (lower.contains("tv") || lower.contains("television")) {
            return "electronics.tv";
        }

        return "electronics";
    }
}
