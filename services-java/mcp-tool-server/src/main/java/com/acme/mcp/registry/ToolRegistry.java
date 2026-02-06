package com.acme.mcp.registry;

import com.acme.mcp.schema.JsonSchemaValidator;
import com.acme.mcp.service.*;
import com.acme.shared.ToolError;
import com.acme.shared.ToolResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Function;

@Component
public class ToolRegistry {
    private static final Logger logger = LoggerFactory.getLogger(ToolRegistry.class);
    private final Map<String, ToolMetadata> tools = new ConcurrentHashMap<>();
    private final Map<String, Function<Map<String, Object>, ToolResponse<?>>> handlers = new ConcurrentHashMap<>();
    private final JsonSchemaValidator validator;

    public ToolRegistry(JsonSchemaValidator validator,
                        SearchService searchService,
                        CompareService compareService,
                        CartService cartService,
                        CheckoutService checkoutService,
                        ProductService productService,
                        ThinkingService thinkingService,
                        @Lazy MetadataService metadataService) {
        this.validator = validator;
        registerTools(searchService, compareService, cartService, checkoutService, productService, thinkingService, metadataService);
    }

    private void registerTools(SearchService searchService,
                                CompareService compareService,
                                CartService cartService,
                                CheckoutService checkoutService,
                                ProductService productService,
                                ThinkingService thinkingService,
                                MetadataService metadataService) {
        registerTool("commerce.searchProducts",
                "Search for products across providers",
                "commerce.searchProducts.request.json",
                "commerce.searchProducts.response.json",
                searchService::searchProducts);

        registerTool("commerce.compareProducts",
                "Compare multiple products",
                "commerce.compareProducts.request.json",
                "commerce.compareProducts.response.json",
                compareService::compareProducts);

        registerTool("commerce.cart.addItem",
                "Add item to cart",
                "commerce.cart.addItem.request.json",
                "commerce.cart.response.json",
                cartService::addItem);

        registerTool("commerce.cart.updateItemQty",
                "Update cart item quantity",
                "commerce.cart.updateItemQty.request.json",
                "commerce.cart.response.json",
                cartService::updateItemQty);

        registerTool("commerce.cart.removeItem",
                "Remove item from cart",
                "commerce.cart.removeItem.request.json",
                "commerce.cart.response.json",
                cartService::removeItem);

        registerTool("commerce.cart.getCart",
                "Get user cart",
                "commerce.cart.getCart.request.json",
                "commerce.cart.response.json",
                cartService::getCart);

        registerTool("commerce.checkout.create",
                "Create a checkout session from cart",
                "commerce.checkout.create.request.json",
                "commerce.checkout.create.response.json",
                checkoutService::createCheckout);

        registerTool("commerce.checkout.update",
                "Update checkout session with shipping/payment info",
                "commerce.checkout.update.request.json",
                "commerce.checkout.update.response.json",
                checkoutService::updateCheckout);

        registerTool("commerce.checkout.get",
                "Get checkout session details",
                "commerce.checkout.get.request.json",
                "commerce.checkout.get.response.json",
                checkoutService::getCheckoutById);

        registerTool("commerce.checkout.complete",
                "Complete checkout and create order",
                "commerce.checkout.complete.request.json",
                "commerce.checkout.complete.response.json",
                checkoutService::completeCheckout);

        registerTool("commerce.checkout.cancel",
                "Cancel checkout session",
                "commerce.checkout.cancel.request.json",
                "commerce.checkout.cancel.response.json",
                checkoutService::cancelCheckout);

        registerTool("commerce.product.estimateShipping",
                "Estimate shipping cost and delivery time",
                "commerce.product.estimateShipping.request.json",
                "commerce.product.estimateShipping.response.json",
                productService::estimateShipping);

        registerTool("commerce.product.listVariants",
                "List product variants",
                "commerce.product.listVariants.request.json",
                "commerce.product.listVariants.response.json",
                productService::listVariants);

        registerTool("commerce.promotions.get",
                "Get active promotions for a product",
                "commerce.promotions.get.request.json",
                "commerce.promotions.get.response.json",
                productService::getPromotions);

        registerTool("commerce.promotions.validateCoupon",
                "Validate a coupon code",
                "commerce.promotions.validateCoupon.request.json",
                "commerce.promotions.validateCoupon.response.json",
                productService::validateCoupon);

        registerTool("thinking.createChainRun",
                "Create a sequential thinking chain run",
                "thinking.createChainRun.request.json",
                "thinking.createChainRun.response.json",
                thinkingService::createChainRun);

        registerTool("thinking.addChainStep",
                "Add a step to a chain run",
                "thinking.addChainStep.request.json",
                "thinking.addChainStep.response.json",
                thinkingService::addChainStep);

        registerTool("thinking.completeChainRun",
                "Complete a chain run",
                "thinking.completeChainRun.request.json",
                "thinking.completeChainRun.response.json",
                thinkingService::completeChainRun);

        registerTool("utility.getProviders",
                "Get all active providers with capabilities",
                "utility.getProviders.request.json",
                "utility.getProviders.response.json",
                metadataService::getProviders);

        registerTool("utility.getTools",
                "Get all available MCP tools",
                "utility.getTools.request.json",
                "utility.getTools.response.json",
                metadataService::getTools);

        registerTool("utility.getProviderTools",
                "Get tools supported by a specific provider",
                "utility.getProviderTools.request.json",
                "utility.getProviderTools.response.json",
                metadataService::getProviderTools);

        registerTool("utility.getCategories",
                "Get predefined product categories",
                "utility.getCategories.request.json",
                "utility.getCategories.response.json",
                metadataService::getCategories);
    }

    private void registerTool(String name, String description, 
                              String requestSchema, String responseSchema,
                              Function<Map<String, Object>, ToolResponse<?>> handler) {
        tools.put(name, new ToolMetadata(name, description, requestSchema, responseSchema));
        handlers.put(name, handler);
        logger.info("Registered tool: {}", name);
    }

    public ToolResponse<?> executeTool(String toolName, Map<String, Object> request) {
        String traceId = UUID.randomUUID().toString();
        MDC.put("traceId", traceId);

        try {
            if (!tools.containsKey(toolName)) {
                logger.error("Tool not found: {}", toolName);
                return ToolResponse.failure(traceId, 
                    new ToolError(ToolError.Code.NOT_FOUND, "Tool not found: " + toolName));
            }

            ToolMetadata metadata = tools.get(toolName);

            // Validate request
            if (!validator.validate(metadata.getRequestSchemaPath(), request)) {
                return ToolResponse.failure(traceId, 
                    new ToolError(ToolError.Code.VALIDATION_ERROR, "Invalid request schema"));
            }

            // Execute tool
            logger.info("Executing tool: {}", toolName);
            long startTime = System.currentTimeMillis();
            
            ToolResponse<?> response = handlers.get(toolName).apply(request);
            
            long duration = System.currentTimeMillis() - startTime;
            logger.info("Tool {} executed in {}ms", toolName, duration);

            // Set trace ID on response
            response.setTraceId(traceId);

            return response;
        } catch (Exception e) {
            logger.error("Tool execution failed: {}", toolName, e);
            return ToolResponse.failure(traceId,
                new ToolError(ToolError.Code.INTERNAL_ERROR, e.getMessage()));
        } finally {
            MDC.clear();
        }
    }

    public Map<String, ToolMetadata> getAllTools() {
        return Map.copyOf(tools);
    }
}
