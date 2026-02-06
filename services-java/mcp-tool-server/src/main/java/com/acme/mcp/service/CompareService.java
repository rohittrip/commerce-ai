package com.acme.mcp.service;

import com.acme.mcp.adapters.ProviderAdapter;
import com.acme.mcp.config.ProviderConfigService;
import com.acme.shared.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class CompareService {
    private static final Logger logger = LoggerFactory.getLogger(CompareService.class);
    private final List<ProviderAdapter> providers;
    private final ProviderConfigService providerConfigService;

    public CompareService(List<ProviderAdapter> providers, ProviderConfigService providerConfigService) {
        this.providers = providers;
        this.providerConfigService = providerConfigService;
    }

    public ToolResponse<Map<String, Object>> compareProducts(Map<String, Object> request) {
        try {
            List<String> productIds = (List<String>) request.get("productIds");
            
            if (productIds == null || productIds.size() < 2) {
                return ToolResponse.failure(null,
                    new ToolError(ToolError.Code.VALIDATION_ERROR, "At least 2 products required"));
            }

            logger.info("Comparing {} products", productIds.size());

            List<ProductSummary> products = new ArrayList<>();
            for (String productId : productIds) {
                ProductSummary product = findProduct(productId);
                if (product != null) {
                    products.add(product);
                }
            }

            if (products.size() < 2) {
                return ToolResponse.failure(null,
                    new ToolError(ToolError.Code.NOT_FOUND, "Not enough products found"));
            }

            Map<String, List<String>> comparisonMatrix = buildComparisonMatrix(products);
            String recommendation = generateRecommendation(products);

            Map<String, Object> data = new HashMap<>();
            data.put("products", products);
            data.put("comparisonMatrix", comparisonMatrix);
            data.put("recommendation", recommendation);

            return ToolResponse.success(null, data);
        } catch (Exception e) {
            logger.error("Comparison failed", e);
            return ToolResponse.failure(null,
                new ToolError(ToolError.Code.INTERNAL_ERROR, e.getMessage()));
        }
    }

    private ProductSummary findProduct(String productId) {
        var enabledProviders = providerConfigService.getProvidersWithCapability("DETAILS");
        
        for (ProviderAdapter provider : providers) {
            // Check if provider is enabled and has DETAILS capability
            boolean isEnabled = enabledProviders.stream()
                    .anyMatch(config -> config.getId().equals(provider.getProviderName()));
            
            if (!isEnabled) {
                continue;
            }
            
            try {
                if (provider.supports(ProviderAdapter.Capability.DETAILS)) {
                    return provider.getProductDetails(productId);
                }
            } catch (Exception e) {
                logger.warn("Provider {} failed to get product {}", provider.getProviderName(), productId);
            }
        }
        return null;
    }

    private Map<String, List<String>> buildComparisonMatrix(List<ProductSummary> products) {
        Map<String, List<String>> matrix = new LinkedHashMap<>();
        
        List<String> names = products.stream().map(ProductSummary::getName).toList();
        matrix.put("name", names);
        
        List<String> prices = products.stream()
            .map(p -> p.getPrice().getCurrency() + " " + p.getPrice().getAmount())
            .toList();
        matrix.put("price", prices);
        
        List<String> brands = products.stream()
            .map(p -> p.getBrand() != null ? p.getBrand() : "N/A")
            .toList();
        matrix.put("brand", brands);
        
        List<String> ratings = products.stream()
            .map(p -> p.getRating() != null ? p.getRating().toString() + "/5" : "N/A")
            .toList();
        matrix.put("rating", ratings);
        
        List<String> availability = products.stream()
            .map(p -> p.getAvailability().isInStock() ? "In Stock" : "Out of Stock")
            .toList();
        matrix.put("availability", availability);
        
        return matrix;
    }

    private String generateRecommendation(List<ProductSummary> products) {
        ProductSummary bestValue = products.stream()
            .filter(p -> p.getAvailability().isInStock())
            .min(Comparator.comparing(p -> p.getPrice().getAmount()))
            .orElse(products.get(0));

        ProductSummary bestRated = products.stream()
            .filter(p -> p.getRating() != null)
            .max(Comparator.comparing(ProductSummary::getRating))
            .orElse(products.get(0));

        return String.format("Best value: %s at %s %s. Highest rated: %s with %.1f stars.",
            bestValue.getName(), 
            bestValue.getPrice().getCurrency(),
            bestValue.getPrice().getAmount(),
            bestRated.getName(),
            bestRated.getRating() != null ? bestRated.getRating() : 0.0);
    }
}
