package com.acme.shared;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.ArrayList;
import java.util.List;

public class Cart {
    @JsonProperty("id")
    private String id;

    @JsonProperty("userId")
    private String userId;

    @JsonProperty("items")
    private List<CartItem> items = new ArrayList<>();

    @JsonProperty("subtotal")
    private Money subtotal;

    @JsonProperty("tax")
    private Money tax;

    @JsonProperty("total")
    private Money total;

    @JsonProperty("currency")
    private String currency = "INR";

    @JsonProperty("itemCount")
    private int itemCount;

    public Cart() {}

    public Cart(String id, String userId) {
        this.id = id;
        this.userId = userId;
    }

    // Getters and setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public List<CartItem> getItems() { return items; }
    public void setItems(List<CartItem> items) { this.items = items; }

    public Money getSubtotal() { return subtotal; }
    public void setSubtotal(Money subtotal) { this.subtotal = subtotal; }

    public Money getTax() { return tax; }
    public void setTax(Money tax) { this.tax = tax; }

    public Money getTotal() { return total; }
    public void setTotal(Money total) { this.total = total; }

    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }

    public int getItemCount() { return itemCount; }
    public void setItemCount(int itemCount) { this.itemCount = itemCount; }
}
