package com.acme.mcp.service;

import com.acme.mcp.config.ProviderConfig;
import com.acme.mcp.config.ProviderConfigService;
import com.acme.mcp.registry.ToolMetadata;
import com.acme.mcp.registry.ToolRegistry;
import com.acme.shared.ToolError;
import com.acme.shared.ToolResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class MetadataService {
    private static final Logger logger = LoggerFactory.getLogger(MetadataService.class);
    private final ProviderConfigService providerConfigService;
    private final ToolRegistry toolRegistry;

    public MetadataService(ProviderConfigService providerConfigService, ToolRegistry toolRegistry) {
        this.providerConfigService = providerConfigService;
        this.toolRegistry = toolRegistry;
    }

    /**
     * Get all active providers with their capabilities
     */
    public ToolResponse<Map<String, Object>> getProviders(Map<String, Object> request) {
        try {
            logger.info("Getting all active providers");

            List<ProviderConfig> allProviders = providerConfigService.getEnabledProviders();
            List<Map<String, Object>> providers = allProviders.stream()
                    .map(provider -> {
                        Map<String, Object> providerData = new HashMap<>();
                        providerData.put("id", provider.getId());
                        providerData.put("name", provider.getName());
                        providerData.put("type", provider.getType());
                        providerData.put("capabilities", provider.getCapabilities());
                        providerData.put("baseUrl", provider.getBaseUrl());
                        return providerData;
                    })
                    .collect(Collectors.toList());

            Map<String, Object> data = new HashMap<>();
            data.put("providers", providers);
            data.put("total", providers.size());

            return ToolResponse.success(null, data);
        } catch (Exception e) {
            logger.error("Get providers failed", e);
            return ToolResponse.failure(null,
                    new ToolError(ToolError.Code.INTERNAL_ERROR, e.getMessage()));
        }
    }

    /**
     * Get all available tools with their metadata
     */
    public ToolResponse<Map<String, Object>> getTools(Map<String, Object> request) {
        try {
            logger.info("Getting all available tools");

            Map<String, ToolMetadata> allTools = toolRegistry.getAllTools();
            List<Map<String, Object>> tools = allTools.values().stream()
                    .map(tool -> {
                        Map<String, Object> toolData = new HashMap<>();
                        toolData.put("id", tool.getName());
                        toolData.put("description", tool.getDescription());
                        toolData.put("requestSchema", tool.getRequestSchemaPath());
                        toolData.put("responseSchema", tool.getResponseSchemaPath());
                        return toolData;
                    })
                    .collect(Collectors.toList());

            Map<String, Object> data = new HashMap<>();
            data.put("tools", tools);
            data.put("total", tools.size());

            return ToolResponse.success(null, data);
        } catch (Exception e) {
            logger.error("Get tools failed", e);
            return ToolResponse.failure(null,
                    new ToolError(ToolError.Code.INTERNAL_ERROR, e.getMessage()));
        }
    }

    /**
     * Get tools supported by a specific provider
     */
    public ToolResponse<Map<String, Object>> getProviderTools(Map<String, Object> request) {
        try {
            String providerId = (String) request.get("providerId");
            if (providerId == null || providerId.isEmpty()) {
                return ToolResponse.failure(null,
                        new ToolError(ToolError.Code.VALIDATION_ERROR, "providerId is required"));
            }

            logger.info("Getting tools for provider: {}", providerId);

            ProviderConfig provider = providerConfigService.getProviderConfig(providerId);
            if (provider == null) {
                return ToolResponse.failure(null,
                        new ToolError(ToolError.Code.NOT_FOUND, "Provider not found: " + providerId));
            }

            Map<String, Object> data = new HashMap<>();
            data.put("providerId", providerId);
            data.put("providerName", provider.getName());
            data.put("capabilities", provider.getCapabilities());
            data.put("enabled", provider.isEnabled());
            data.put("toolConfigs", provider.getToolConfigs());

            return ToolResponse.success(null, data);
        } catch (Exception e) {
            logger.error("Get provider tools failed", e);
            return ToolResponse.failure(null,
                    new ToolError(ToolError.Code.INTERNAL_ERROR, e.getMessage()));
        }
    }

    /**
     * Get predefined product categories
     */
    public ToolResponse<Map<String, Object>> getCategories(Map<String, Object> request) {
        try {
            logger.info("Getting product categories");

            // These would typically come from a database, but hardcoded for MVP
            List<Map<String, String>> categories = Arrays.asList(
                    createCategory("food", "Food & Grocery", "Food delivery, groceries, restaurants"),
                    createCategory("health", "Health & Wellness", "Pharmacy, healthcare, fitness"),
                    createCategory("electronics", "Electronics", "Consumer electronics, gadgets, computers"),
                    createCategory("fashion", "Fashion & Apparel", "Clothing, footwear, accessories"),
                    createCategory("home", "Home & Living", "Furniture, home decor, appliances"),
                    createCategory("beauty", "Beauty & Personal Care", "Cosmetics, skincare, grooming"),
                    createCategory("sports", "Sports & Outdoors", "Sports equipment, outdoor gear, fitness"),
                    createCategory("books", "Books & Media", "Books, movies, music, games"),
                    createCategory("toys", "Toys & Games", "Toys, games, hobbies, crafts"),
                    createCategory("automotive", "Automotive", "Car parts, accessories, services")
            );

            Map<String, Object> data = new HashMap<>();
            data.put("categories", categories);
            data.put("total", categories.size());

            return ToolResponse.success(null, data);
        } catch (Exception e) {
            logger.error("Get categories failed", e);
            return ToolResponse.failure(null,
                    new ToolError(ToolError.Code.INTERNAL_ERROR, e.getMessage()));
        }
    }

    private Map<String, String> createCategory(String id, String name, String description) {
        Map<String, String> category = new HashMap<>();
        category.put("id", id);
        category.put("name", name);
        category.put("description", description);
        return category;
    }
}
