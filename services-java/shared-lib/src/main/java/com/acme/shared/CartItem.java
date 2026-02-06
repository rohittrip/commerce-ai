package com.acme.shared;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.Map;

public class CartItem {
    @JsonProperty("productId")
    private String productId;

    @JsonProperty("provider")
    private String provider;

    @JsonProperty("quantity")
    private int quantity;

    @JsonProperty("unitPrice")
    private Money unitPrice;

    @JsonProperty("product")
    private ProductSummary product;

    @JsonProperty("metadata")
    private Map<String, Object> metadata;

    public CartItem() {}

    public CartItem(String productId, String provider, int quantity, Money unitPrice) {
        this.productId = productId;
        this.provider = provider;
        this.quantity = quantity;
        this.unitPrice = unitPrice;
    }

    // Getters and setters
    public String getProductId() { return productId; }
    public void setProductId(String productId) { this.productId = productId; }

    public String getProvider() { return provider; }
    public void setProvider(String provider) { this.provider = provider; }

    public int getQuantity() { return quantity; }
    public void setQuantity(int quantity) { this.quantity = quantity; }

    public Money getUnitPrice() { return unitPrice; }
    public void setUnitPrice(Money unitPrice) { this.unitPrice = unitPrice; }

    public ProductSummary getProduct() { return product; }
    public void setProduct(ProductSummary product) { this.product = product; }

    public Map<String, Object> getMetadata() { return metadata; }
    public void setMetadata(Map<String, Object> metadata) { this.metadata = metadata; }
}
