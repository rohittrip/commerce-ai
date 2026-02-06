package com.acme.mcp.validation;

import com.acme.mcp.config.ProviderConfig;
import com.acme.mcp.config.ProviderConfigService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * Default implementation of ToolValidator.
 * Follows Dependency Inversion Principle - depends on ProviderConfigService abstraction.
 */
@Component
public class DefaultToolValidator implements ToolValidator {
    private static final Logger logger = LoggerFactory.getLogger(DefaultToolValidator.class);
    private final ProviderConfigService providerConfigService;

    public DefaultToolValidator(ProviderConfigService providerConfigService) {
        this.providerConfigService = providerConfigService;
    }

    @Override
    public boolean isToolEnabled(String providerId, String toolName) {
        ProviderConfig config = providerConfigService.getProviderConfig(providerId);
        if (config == null) {
            logger.warn("Provider {} not found", providerId);
            return false;
        }
        
        if (!config.isEnabled()) {
            logger.debug("Provider {} is disabled", providerId);
            return false;
        }
        
        boolean enabled = config.isToolEnabled(toolName);
        if (!enabled) {
            logger.debug("Tool {} is disabled for provider {}", toolName, providerId);
        }
        return enabled;
    }

    @Override
    public void validateRequest(String toolName, Map<String, Object> request) throws ValidationException {
        if (request == null) {
            throw new ValidationException("Request cannot be null");
        }
        
        switch (toolName) {
            case "commerce.searchProducts":
                validateSearchRequest(request);
                break;
            case "commerce.getProductDetails":
                validateProductDetailsRequest(request);
                break;
            case "commerce.cart.addItem":
                validateCartAddRequest(request);
                break;
            // Add more tool validations as needed
        }
    }
    
    private void validateSearchRequest(Map<String, Object> request) throws ValidationException {
        String query = (String) request.get("query");
        if (query == null || query.trim().isEmpty()) {
            throw new ValidationException("query", "Search query is required");
        }
        
        if (query.length() > 500) {
            throw new ValidationException("query", "Search query too long (max 500 characters)");
        }
    }
    
    private void validateProductDetailsRequest(Map<String, Object> request) throws ValidationException {
        String productId = (String) request.get("productId");
        if (productId == null || productId.trim().isEmpty()) {
            throw new ValidationException("productId", "Product ID is required");
        }
    }
    
    private void validateCartAddRequest(Map<String, Object> request) throws ValidationException {
        String productId = (String) request.get("productId");
        if (productId == null || productId.trim().isEmpty()) {
            throw new ValidationException("productId", "Product ID is required");
        }
        
        Object quantityObj = request.get("quantity");
        if (quantityObj == null) {
            throw new ValidationException("quantity", "Quantity is required");
        }
        
        int quantity = quantityObj instanceof Integer ? (Integer) quantityObj : 
                       Integer.parseInt(quantityObj.toString());
        if (quantity < 1 || quantity > 99) {
            throw new ValidationException("quantity", "Quantity must be between 1 and 99");
        }
    }
}
