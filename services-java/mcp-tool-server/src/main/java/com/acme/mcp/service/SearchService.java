package com.acme.mcp.service;

import com.acme.mcp.adapters.ProviderAdapter;
import com.acme.mcp.config.ProviderConfig;
import com.acme.mcp.config.ProviderConfigService;
import com.acme.mcp.mapping.FieldMapper;
import com.acme.mcp.mapping.ProviderFieldMapper;
import com.acme.mcp.validation.ToolValidator;
import com.acme.mcp.validation.ValidationException;
import com.acme.shared.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Production-ready search service following SOLID principles.
 * - Single Responsibility: Handles product search orchestration
 * - Open/Closed: Extensible via ProviderAdapter interface
 * - Liskov Substitution: All ProviderAdapters are interchangeable
 * - Interface Segregation: Uses specific interfaces (FieldMapper, ToolValidator)
 * - Dependency Inversion: Depends on abstractions, not concrete implementations
 */
@Service
public class SearchService {
    private static final Logger logger = LoggerFactory.getLogger(SearchService.class);
    private static final String TOOL_NAME = "commerce.searchProducts";
    
    private final List<ProviderAdapter> providers;
    private final ProviderConfigService providerConfigService;
    private final ToolValidator toolValidator;

    public SearchService(
            List<ProviderAdapter> providers, 
            ProviderConfigService providerConfigService,
            ToolValidator toolValidator) {
        this.providers = providers;
        this.providerConfigService = providerConfigService;
        this.toolValidator = toolValidator;
    }

    public ToolResponse<Map<String, Object>> searchProducts(Map<String, Object> request) {
        try {
            // Validate request
            toolValidator.validateRequest(TOOL_NAME, request);
            
            String query = (String) request.get("query");
            Map<String, Object> filters = (Map<String, Object>) request.getOrDefault("filters", new HashMap<>());
            Map<String, Object> pagination = (Map<String, Object>) request.getOrDefault("pagination", new HashMap<>());
            
            int page = (int) pagination.getOrDefault("page", 1);
            int limit = Math.min((int) pagination.getOrDefault("limit", 20), 100); // Cap at 100

            logger.info("Searching products: query={}, page={}, limit={}", query, page, limit);

            // Get enabled providers with SEARCH capability
            var enabledProviders = providerConfigService.getProvidersWithCapability("SEARCH");
            logger.info("Found {} enabled providers with SEARCH capability", enabledProviders.size());

            // Search across enabled providers with tool-level filtering
            List<ProductSummary> allProducts = new ArrayList<>();
            for (ProviderAdapter provider : providers) {
                String providerName = provider.getProviderName();
                
                // Check if provider is enabled and has SEARCH capability
                var providerConfig = enabledProviders.stream()
                        .filter(p -> p.getId().equals(providerName))
                        .findFirst();
                
                if (providerConfig.isEmpty()) {
                    logger.debug("Skipping provider {} (disabled or no SEARCH capability)", providerName);
                    continue;
                }
                
                // Check tool-level enablement
                if (!toolValidator.isToolEnabled(providerName, TOOL_NAME)) {
                    logger.debug("Skipping provider {} (tool {} disabled)", providerName, TOOL_NAME);
                    continue;
                }
                
                if (!provider.supports(ProviderAdapter.Capability.SEARCH)) {
                    logger.debug("Skipping provider {} (adapter doesn't support SEARCH)", providerName);
                    continue;
                }

                try {
                    ProviderConfig config = providerConfig.get();
                    FieldMapper fieldMapper = new ProviderFieldMapper(config);
                    
                    // Apply field and category mappings
                    Map<String, Object> mappedFilters = fieldMapper.applyFieldMappings(TOOL_NAME, filters);
                    
                    List<ProductSummary> products = provider.search(query, mappedFilters, page, limit);
                    allProducts.addAll(products);
                    logger.info("Provider {} returned {} products", providerName, products.size());
                } catch (Exception e) {
                    logger.error("Provider {} search failed", providerName, e);
                    // Continue with other providers instead of failing completely
                }
            }

            // Deduplicate by product attributes
            List<ProductSummary> deduplicated = deduplicateProducts(allProducts);

            // Sort by relevance (simple implementation)
            String sortBy = (String) request.getOrDefault("sortBy", "relevance");
            deduplicated = sortProducts(deduplicated, sortBy);

            // Paginate results
            int start = (page - 1) * limit;
            int end = Math.min(start + limit, deduplicated.size());
            List<ProductSummary> paginatedProducts = deduplicated.subList(start, end);

            Map<String, Object> data = new HashMap<>();
            data.put("products", paginatedProducts);
            data.put("total", deduplicated.size());
            
            Map<String, Object> paginationData = new HashMap<>();
            paginationData.put("page", page);
            paginationData.put("limit", limit);
            paginationData.put("total", deduplicated.size());
            paginationData.put("hasMore", end < deduplicated.size());
            data.put("pagination", paginationData);

            return ToolResponse.success(null, data);
        } catch (ValidationException e) {
            logger.warn("Validation failed for search request: {}", e.getMessage());
            return ToolResponse.failure(null, 
                new ToolError(ToolError.Code.VALIDATION_ERROR, e.getMessage()));
        } catch (Exception e) {
            logger.error("Search failed", e);
            return ToolResponse.failure(null, 
                new ToolError(ToolError.Code.INTERNAL_ERROR, "Search failed: " + e.getMessage()));
        }
    }

    private List<ProductSummary> deduplicateProducts(List<ProductSummary> products) {
        Map<String, ProductSummary> uniqueProducts = new LinkedHashMap<>();
        for (ProductSummary product : products) {
            String key = generateProductKey(product);
            uniqueProducts.putIfAbsent(key, product);
        }
        return new ArrayList<>(uniqueProducts.values());
    }

    private String generateProductKey(ProductSummary product) {
        // Simple deduplication by name + brand + category
        return String.format("%s|%s|%s", 
            product.getName() != null ? product.getName().toLowerCase() : "",
            product.getBrand() != null ? product.getBrand().toLowerCase() : "",
            product.getCategory() != null ? product.getCategory() : "");
    }

    private List<ProductSummary> sortProducts(List<ProductSummary> products, String sortBy) {
        switch (sortBy) {
            case "price_asc":
                products.sort(Comparator.comparing(p -> p.getPrice().getAmount()));
                break;
            case "price_desc":
                products.sort(Comparator.comparing(p -> p.getPrice().getAmount(), Comparator.reverseOrder()));
                break;
            case "rating":
                products.sort(Comparator.comparing(ProductSummary::getRating, 
                    Comparator.nullsLast(Comparator.reverseOrder())));
                break;
            default:
                // Keep original order (relevance)
                break;
        }
        return products;
    }

}
