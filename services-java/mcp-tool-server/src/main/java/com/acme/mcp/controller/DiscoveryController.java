package com.acme.mcp.controller;

import com.acme.mcp.model.UcpDiscoveryResponse;
import com.acme.mcp.model.UcpDiscoveryResponse.*;
import com.acme.mcp.registry.ToolRegistry;
import com.acme.mcp.config.ProviderConfigService;
import com.acme.mcp.config.ProviderConfig;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.*;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

@RestController
public class DiscoveryController {
    private static final Logger logger = LoggerFactory.getLogger(DiscoveryController.class);

    private final ToolRegistry toolRegistry;
    private final ProviderConfigService providerConfigService;

    @Value("${spring.application.name:MCP Tool Server}")
    private String applicationName;

    @Value("${app.version:1.0.0}")
    private String appVersion;

    @Value("${security.enabled:true}")
    private boolean securityEnabled;

    public DiscoveryController(ToolRegistry toolRegistry, ProviderConfigService providerConfigService) {
        this.toolRegistry = toolRegistry;
        this.providerConfigService = providerConfigService;
    }

    @GetMapping("/.well-known/ucp")
    public ResponseEntity<UcpDiscoveryResponse> discoverUcp() {
        logger.info("UCP discovery endpoint called");

        try {
            UcpDiscoveryResponse response = buildDiscoveryResponse();

            return ResponseEntity.ok()
                .cacheControl(CacheControl.maxAge(5, TimeUnit.MINUTES))
                .body(response);

        } catch (Exception e) {
            logger.error("Error building UCP discovery response", e);
            throw new RuntimeException("Failed to build discovery response", e);
        }
    }

    private UcpDiscoveryResponse buildDiscoveryResponse() {
        // Platform Info
        PlatformInfo platform = buildPlatformInfo();

        // Tools Info
        List<ToolInfo> tools = buildToolsInfo();

        // Providers Info
        List<ProviderInfo> providers = buildProvidersInfo();

        // Auth Info
        AuthInfo auth = buildAuthInfo();

        // Meta
        Meta meta = buildMeta();

        return new UcpDiscoveryResponse(platform, tools, providers, auth, meta);
    }

    private PlatformInfo buildPlatformInfo() {
        Map<String, Object> profile = new HashMap<>();
        profile.put("category_coverage", Arrays.asList(
            "electronics", "fashion", "home", "health", "food",
            "beauty", "sports", "books", "toys", "automotive"
        ));
        profile.put("supported_currencies", Arrays.asList("INR", "USD"));
        profile.put("supported_payment_methods", Arrays.asList("COD", "UPI", "CARD", "NET_BANKING", "WALLET", "EMI"));
        profile.put("shipping_regions", Arrays.asList("IN"));

        List<String> capabilities = Arrays.asList(
            "SEARCH", "PRODUCT_DETAILS", "COMPARE", "CART", "ORDER"
        );

        return new PlatformInfo(
            "Commerce AI MCP Server",
            appVersion,
            "ACME Commerce",
            capabilities,
            profile
        );
    }

    private List<ToolInfo> buildToolsInfo() {
        // Get all registered tools from ToolRegistry
        var toolMetadataMap = toolRegistry.getAllTools();

        return toolMetadataMap.entrySet().stream()
            .map(entry -> {
                String toolName = entry.getKey();
                var metadata = entry.getValue();

                return new ToolInfo(
                    toolName,
                    true, // All registered tools are enabled
                    "1.0",
                    "/schemas/" + toolName + ".request.json",
                    metadata.getDescription()
                );
            })
            .collect(Collectors.toList());
    }

    private List<ProviderInfo> buildProvidersInfo() {
        List<ProviderConfig> providerConfigs = providerConfigService.getAllProviderConfigs();

        return providerConfigs.stream()
            .map(config -> {
                // Extract capabilities from provider config
                List<String> capabilities = config.getCapabilities() != null && !config.getCapabilities().isEmpty()
                    ? new ArrayList<>(config.getCapabilities())
                    : Arrays.asList("SEARCH");

                // Extract categories - could be from provider_categories junction table
                // For now, use general categories
                List<String> categories = Arrays.asList("electronics", "fashion");

                // Determine if auth is required - for now, assume none
                // TODO: Add authType field to ProviderConfig class when implementing Phase 3
                boolean authRequired = false;

                return new ProviderInfo(
                    config.getId(),
                    config.getName(),
                    config.isEnabled(),
                    capabilities,
                    categories,
                    authRequired
                );
            })
            .collect(Collectors.toList());
    }

    private AuthInfo buildAuthInfo() {
        return new AuthInfo(
            securityEnabled,
            "bearer",
            "/auth/token"
        );
    }

    private Meta buildMeta() {
        Meta.UcpMeta ucpMeta = new Meta.UcpMeta(
            "1.0",
            "commerce.ecommerce",
            "partial" // Will be "full" after all phases are complete
        );
        return new Meta(ucpMeta);
    }
}
