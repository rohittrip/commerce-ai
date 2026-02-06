package com.acme.shared;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.Map;

public class ProductSummary {
    @JsonProperty("id")
    private String id;

    @JsonProperty("provider")
    private String provider;

    @JsonProperty("name")
    private String name;

    @JsonProperty("description")
    private String description;

    @JsonProperty("brand")
    private String brand;

    @JsonProperty("category")
    private String category;

    @JsonProperty("price")
    private Money price;

    @JsonProperty("imageUrl")
    private String imageUrl;

    @JsonProperty("availability")
    private Availability availability;

    @JsonProperty("rating")
    private Double rating;

    @JsonProperty("reviewCount")
    private Integer reviewCount;

    @JsonProperty("attributes")
    private Map<String, Object> attributes;

    public ProductSummary() {}

    // Getters and setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getProvider() { return provider; }
    public void setProvider(String provider) { this.provider = provider; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getBrand() { return brand; }
    public void setBrand(String brand) { this.brand = brand; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public Money getPrice() { return price; }
    public void setPrice(Money price) { this.price = price; }

    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }

    public Availability getAvailability() { return availability; }
    public void setAvailability(Availability availability) { this.availability = availability; }

    public Double getRating() { return rating; }
    public void setRating(Double rating) { this.rating = rating; }

    public Integer getReviewCount() { return reviewCount; }
    public void setReviewCount(Integer reviewCount) { this.reviewCount = reviewCount; }

    public Map<String, Object> getAttributes() { return attributes; }
    public void setAttributes(Map<String, Object> attributes) { this.attributes = attributes; }
}
