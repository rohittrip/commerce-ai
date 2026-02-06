package com.acme.mcp.adapters;

import com.acme.shared.*;
import java.util.List;
import java.util.Map;

public interface ProviderAdapter {
    enum Capability {
        SEARCH, DETAILS, CART, ORDER
    }

    String getProviderName();

    boolean supports(Capability capability);

    List<ProductSummary> search(String query, Map<String, Object> filters, int page, int limit);

    ProductSummary getProductDetails(String productId);

    Cart addToCart(String userId, String productId, int quantity);

    Cart updateCartItem(String userId, String productId, int quantity);

    Cart removeFromCart(String userId, String productId);

    Cart getCart(String userId);

    Order createOrder(String userId, String cartId, String addressId, Order.PaymentMethod paymentMethod);

    Order getOrderStatus(String orderId);
}
