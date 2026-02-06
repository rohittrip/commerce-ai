package com.acme.shared;

import com.fasterxml.jackson.annotation.JsonProperty;

public class Availability {
    public enum Status {
        IN_STOCK, OUT_OF_STOCK, LOW_STOCK, PREORDER
    }

    @JsonProperty("inStock")
    private boolean inStock;

    @JsonProperty("quantity")
    private Integer quantity;

    @JsonProperty("status")
    private Status status;

    public Availability() {}

    public Availability(boolean inStock, Status status) {
        this.inStock = inStock;
        this.status = status;
    }

    public Availability(boolean inStock, Integer quantity, Status status) {
        this.inStock = inStock;
        this.quantity = quantity;
        this.status = status;
    }

    public boolean isInStock() {
        return inStock;
    }

    public void setInStock(boolean inStock) {
        this.inStock = inStock;
    }

    public Integer getQuantity() {
        return quantity;
    }

    public void setQuantity(Integer quantity) {
        this.quantity = quantity;
    }

    public Status getStatus() {
        return status;
    }

    public void setStatus(Status status) {
        this.status = status;
    }
}
