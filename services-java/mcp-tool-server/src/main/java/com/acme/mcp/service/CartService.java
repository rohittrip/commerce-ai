package com.acme.mcp.service;

import com.acme.mcp.adapters.ProviderAdapter;
import com.acme.mcp.config.ProviderConfigService;
import com.acme.shared.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
public class CartService {
    private static final Logger logger = LoggerFactory.getLogger(CartService.class);
    private final List<ProviderAdapter> providers;
    private final ProviderConfigService providerConfigService;

    public CartService(List<ProviderAdapter> providers, ProviderConfigService providerConfigService) {
        this.providers = providers;
        this.providerConfigService = providerConfigService;
    }

    public ToolResponse<Cart> addItem(Map<String, Object> request) {
        try {
            String userId = (String) request.get("userId");
            String productId = (String) request.get("productId");
            String provider = (String) request.get("provider");
            int quantity = (int) request.get("quantity");

            logger.info("Adding item to cart: user={}, product={}, qty={}", userId, productId, quantity);

            ProviderAdapter adapter = findProvider(provider);
            if (adapter == null || !adapter.supports(ProviderAdapter.Capability.CART)) {
                return ToolResponse.failure(null,
                    new ToolError(ToolError.Code.PROVIDER_ERROR, "Provider not available: " + provider));
            }

            // Check if provider is enabled and has CART capability
            if (!isProviderEnabledWithCapability(provider, "CART")) {
                return ToolResponse.failure(null,
                    new ToolError(ToolError.Code.PROVIDER_ERROR, "Provider disabled or missing CART capability: " + provider));
            }

            Cart cart = adapter.addToCart(userId, productId, quantity);
            return ToolResponse.success(null, cart);
        } catch (Exception e) {
            logger.error("Add to cart failed", e);
            return ToolResponse.failure(null,
                new ToolError(ToolError.Code.INTERNAL_ERROR, e.getMessage()));
        }
    }

    public ToolResponse<Cart> updateItemQty(Map<String, Object> request) {
        try {
            String userId = (String) request.get("userId");
            String productId = (String) request.get("productId");
            int quantity = (int) request.get("quantity");

            logger.info("Updating cart item: user={}, product={}, qty={}", userId, productId, quantity);

            // Use first available provider (in real system, track which provider owns the cart)
            ProviderAdapter adapter = findAvailableCartProvider();
            if (adapter == null) {
                return ToolResponse.failure(null,
                    new ToolError(ToolError.Code.PROVIDER_ERROR, "No cart provider available"));
            }

            Cart cart = adapter.updateCartItem(userId, productId, quantity);
            return ToolResponse.success(null, cart);
        } catch (Exception e) {
            logger.error("Update cart failed", e);
            return ToolResponse.failure(null,
                new ToolError(ToolError.Code.INTERNAL_ERROR, e.getMessage()));
        }
    }

    public ToolResponse<Cart> removeItem(Map<String, Object> request) {
        try {
            String userId = (String) request.get("userId");
            String productId = (String) request.get("productId");

            logger.info("Removing item from cart: user={}, product={}", userId, productId);

            ProviderAdapter adapter = findAvailableCartProvider();
            if (adapter == null) {
                return ToolResponse.failure(null,
                    new ToolError(ToolError.Code.PROVIDER_ERROR, "No cart provider available"));
            }

            Cart cart = adapter.removeFromCart(userId, productId);
            return ToolResponse.success(null, cart);
        } catch (Exception e) {
            logger.error("Remove from cart failed", e);
            return ToolResponse.failure(null,
                new ToolError(ToolError.Code.INTERNAL_ERROR, e.getMessage()));
        }
    }

    public ToolResponse<Cart> getCart(Map<String, Object> request) {
        try {
            String userId = (String) request.get("userId");

            logger.info("Getting cart for user: {}", userId);

            ProviderAdapter adapter = findAvailableCartProvider();
            if (adapter == null) {
                return ToolResponse.failure(null,
                    new ToolError(ToolError.Code.PROVIDER_ERROR, "No cart provider available"));
            }

            Cart cart = adapter.getCart(userId);
            return ToolResponse.success(null, cart);
        } catch (Exception e) {
            logger.error("Get cart failed", e);
            return ToolResponse.failure(null,
                new ToolError(ToolError.Code.INTERNAL_ERROR, e.getMessage()));
        }
    }

    private ProviderAdapter findProvider(String providerName) {
        return providers.stream()
            .filter(p -> p.getProviderName().equalsIgnoreCase(providerName))
            .findFirst()
            .orElse(null);
    }

    private ProviderAdapter findAvailableCartProvider() {
        var enabledProviders = providerConfigService.getProvidersWithCapability("CART");
        return providers.stream()
            .filter(p -> p.supports(ProviderAdapter.Capability.CART))
            .filter(p -> enabledProviders.stream().anyMatch(config -> config.getId().equals(p.getProviderName())))
            .findFirst()
            .orElse(null);
    }

    private boolean isProviderEnabledWithCapability(String providerName, String capability) {
        var providerConfig = providerConfigService.getProviderConfig(providerName);
        return providerConfig != null && providerConfig.isEnabled() && providerConfig.hasCapability(capability);
    }
}
