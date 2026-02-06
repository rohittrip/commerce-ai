# Mock Provider Implementation Guide

## Overview

The **Mock Provider** is a fully-functional in-memory e-commerce provider implementation designed for testing and development. It simulates a real commerce platform with comprehensive product catalog, shopping cart, orders, reviews, and recommendations.

## Features

### ✅ Core Commerce Operations (ProviderAdapter Interface)

- **Product Search** - Full-text search with filters (price, category, brand)
- **Product Details** - Rich product information with specifications
- **Shopping Cart** - Add, update, remove items with automatic total calculation
- **Order Management** - Create orders and track status

### 🎁 Extended Mock Features

- **Product Reviews** - Mock reviews with ratings, helpful votes, verified badges
- **Recommendations** - AI-powered suggestions (similar, complementary, trending, deals)
- **Product Variants** - Color, size, storage options
- **Availability Checks** - Real-time stock and delivery estimates
- **Promotions & Coupons** - Discount validation and calculation

## Product Catalog

The mock provider includes **40+ products** across multiple categories:

### Electronics
- **Mobile Phones** (5 products)
  - Vivo T2x 5G (₹12,749)
  - Samsung Galaxy S25 Ultra (₹129,999)
  - OnePlus 13 (₹64,999)
  - iPhone 16 Pro Max (₹144,900)
  - Redmi Note 14 Pro (₹24,999)

- **Headphones & Audio** (5 products)
  - Sony WH-1000XM5 (₹29,990) - Premium ANC
  - Bose QuietComfort 45 (₹28,900)
  - boAt Rockerz 550 (₹1,499) - Budget
  - JBL Tune 760NC (₹4,999)
  - Sony WF-1000XM4 (₹19,990) - Earbuds

- **Speakers** (2 products)
  - JBL Flip 6 (₹10,999)
  - Bose SoundLink Revolve+ (₹24,900)

- **Laptops** (2 products)
  - MacBook Air M3 (₹114,900)
  - Dell XPS 15 (₹134,990)

- **Tablets** (2 products)
  - iPad Air 11" (₹59,900)
  - Samsung Galaxy Tab S9 FE (₹36,999)

- **Smartwatches** (2 products)
  - Apple Watch Series 10 (₹46,900)
  - Samsung Galaxy Watch6 Classic (₹36,999)

### Fashion
- **T-Shirts & Tops** (4 products)
  - Nike Dri-FIT Running Tee (₹1,495)
  - Adidas Essentials Tee (₹1,299)
  - Nike Sportswear Tee (₹1,795)
  - Adidas Performance Polo (₹2,199)

- **Sneakers** (4 products)
  - Nike Air Max 90 (₹8,695)
  - Adidas Ultraboost 22 (₹14,999)
  - Nike Revolution 6 (₹3,695) - Budget
  - Adidas Superstar (₹7,999) - Classic

## API Reference

### Core Provider Methods (ProviderAdapter Interface)

```java
// Search products
List<ProductSummary> search(String query, Map<String, Object> filters, int page, int limit)

// Get product details
ProductSummary getProductDetails(String productId)

// Cart operations
Cart addToCart(String userId, String productId, int quantity)
Cart updateCartItem(String userId, String productId, int quantity)
Cart removeFromCart(String userId, String productId)
Cart getCart(String userId)

// Order operations
Order createOrder(String userId, String cartId, String addressId, Order.PaymentMethod paymentMethod)
Order getOrderStatus(String orderId)
```

### Extended Mock Methods

```java
// Reviews
Map<String, Object> getProductReviews(String productId, int page, int limit, String sortBy)
Map<String, Object> addReview(String productId, String userId, String userName, int rating, String title, String content)

// Recommendations
List<ProductSummary> getRecommendations(String type, String contextProductId, String category, int limit)
// Supported types: "similar", "complementary", "trending", "deals"

// Product variants
List<Map<String, Object>> getProductVariants(String productId)

// Availability
Map<String, Object> checkAvailability(String productId, String pincode, int quantity)

// Promotions
List<Map<String, Object>> getPromotions()
Map<String, Object> validateCoupon(String couponCode, BigDecimal orderAmount)
```

## Usage Examples

### 1. Search Products

```java
MockProviderAdapter mockProvider = new MockProviderAdapter();

// Basic search
List<ProductSummary> results = mockProvider.search("headphones", null, 1, 20);

// Search with filters
Map<String, Object> filters = new HashMap<>();
filters.put("priceMax", 30000);
filters.put("brands", List.of("Sony", "Bose"));
filters.put("categories", List.of("electronics.audio.headphones"));

List<ProductSummary> filteredResults = mockProvider.search("wireless", filters, 1, 10);
```

### 2. Shopping Cart Flow

```java
// Add to cart
Cart cart = mockProvider.addToCart("user123", "HP001", 1); // Sony WH-1000XM5

// Add another item
cart = mockProvider.addToCart("user123", "MOB002", 1); // Samsung Galaxy S25 Ultra

// Update quantity
cart = mockProvider.updateCartItem("user123", "HP001", 2);

// View cart
cart = mockProvider.getCart("user123");
System.out.println("Total: " + cart.getTotal().getAmount());

// Create order
Order order = mockProvider.createOrder("user123", cart.getId(), "addr123", Order.PaymentMethod.UPI);
System.out.println("Order ID: " + order.getId());
```

### 3. Product Reviews

```java
// Get reviews
Map<String, Object> reviewsData = mockProvider.getProductReviews("HP001", 1, 10, "helpful");
List<Map<String, Object>> reviews = (List) reviewsData.get("reviews");
Map<String, Object> summary = (Map) reviewsData.get("summary");

System.out.println("Average Rating: " + summary.get("averageRating"));
System.out.println("Total Reviews: " + summary.get("totalReviews"));

// Add review
Map<String, Object> newReview = mockProvider.addReview(
    "HP001", "user456", "TechLover", 5,
    "Amazing headphones!", "The noise cancellation is outstanding..."
);
```

### 4. Recommendations

```java
// Similar products
List<ProductSummary> similar = mockProvider.getRecommendations(
    "similar", "HP001", null, 5
);

// Complementary products (frequently bought together)
List<ProductSummary> complementary = mockProvider.getRecommendations(
    "complementary", "MOB002", null, 3
);

// Trending in category
List<ProductSummary> trending = mockProvider.getRecommendations(
    "trending", null, "electronics.mobile", 10
);

// Best deals
List<ProductSummary> deals = mockProvider.getRecommendations(
    "deals", null, "fashion", 5
);
```

### 5. Product Variants

```java
List<Map<String, Object>> variants = mockProvider.getProductVariants("MOB002");

for (Map<String, Object> variant : variants) {
    System.out.println(variant.get("name") + " - " + variant.get("type"));
    System.out.println("In Stock: " + variant.get("inStock"));
}
```

### 6. Availability & Shipping

```java
Map<String, Object> availability = mockProvider.checkAvailability("HP001", "560001", 2);

System.out.println("In Stock: " + ((Map) availability.get("availability")).get("inStock"));
System.out.println("Delivery Days: " + availability.get("estimatedDeliveryDays")); // 2 days for Bangalore
System.out.println("Shipping Cost: " + ((Map) availability.get("shippingCost")).get("amount"));
```

### 7. Coupons & Promotions

```java
// Get active promotions
List<Map<String, Object>> promotions = mockProvider.getPromotions();

// Validate coupon
Map<String, Object> couponResult = mockProvider.validateCoupon(
    "SAVE10",
    new BigDecimal("2000")
);

if ((Boolean) couponResult.get("valid")) {
    Map<String, Object> discount = (Map) couponResult.get("discount");
    System.out.println("Discount: ₹" + discount.get("amount"));
}
```

## Mock Coupons

The mock provider includes these pre-configured coupons:

| Code | Type | Value | Min Order | Max Discount |
|------|------|-------|-----------|--------------|
| `SAVE10` | PERCENTAGE | 10% | ₹500 | ₹1,000 |
| `FLAT200` | FIXED | ₹200 | ₹1,000 | - |

## Mock Behaviors

### Network Delay Simulation
- All operations include a **150ms delay** to simulate network latency
- Use for realistic performance testing

### Stock Levels
- **Mobile/Laptop**: 50 units per product
- **Other products**: 100 units per product

### Shipping Calculation
- **Metro cities** (Mumbai, Delhi, Bangalore, Chennai): **2 days**
- **Other areas**: **5 days**
- **Base shipping**: ₹50 (+ ₹20 per additional item)

### Review Generation
- Reviews are auto-generated based on product rating
- Higher-rated products have more reviews
- Rating distribution clusters around product's average rating
- ~67% of reviews are marked as "verified purchase"

### Order Lifecycle
```
PENDING → CONFIRMED → PROCESSING → SHIPPED → DELIVERED
```

## Configuration

Enable/disable the mock provider in `application.yml`:

```yaml
mcp:
  provider:
    mock:
      enabled: true
      timeout: 5000
      retry:
        max-attempts: 3
        delay: 1000
```

## Testing with curl

```bash
# Search products via MCP Tool Server
curl -X POST http://localhost:8081/api/v1/tools/execute/commerce.searchProducts \
  -H "Content-Type: application/json" \
  -d '{
    "query": "headphones",
    "filters": {"priceMax": 30000},
    "pagination": {"page": 1, "limit": 5}
  }'

# Add to cart
curl -X POST http://localhost:8081/api/v1/tools/execute/commerce.cart.addItem \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user",
    "productId": "HP001",
    "provider": "mock",
    "quantity": 1
  }'
```

## OpenAPI Specification

The complete API specification is available at:
```
services-java/mcp-tool-server/src/main/resources/openapi/mock-provider-api.yaml
```

Import this into Swagger UI or Postman for interactive API documentation.

## Architecture Notes

### In-Memory Storage
- All data is stored in `ConcurrentHashMap` instances
- Data is **not persisted** - resets on application restart
- Thread-safe for concurrent access

### Provider Adapter Pattern
- Implements the `ProviderAdapter` interface for core operations
- Additional mock features are provided as public methods
- Can be easily swapped with real provider implementations

### Data Model
Uses shared data models from `com.acme.shared`:
- `ProductSummary` - Product information
- `Cart` / `CartItem` - Shopping cart
- `Order` - Order details
- `Money` - Currency-aware amounts
- `Availability` - Stock information

## Best Practices

1. **Use for Development**: Perfect for local testing without external dependencies
2. **E2E Testing**: Deterministic responses make tests reliable
3. **Performance Benchmarking**: Network delay simulation provides realistic timing
4. **Demo Purposes**: Rich catalog with realistic data for presentations
5. **Integration Testing**: Test multi-provider scenarios by mixing with real adapters

## Limitations

- **In-memory only** - No persistence across restarts
- **Single instance** - Not suitable for distributed testing
- **Fixed catalog** - 40 products (can be extended in `initializeProductCatalog()`)
- **Simplified logic** - Real providers have more complex business rules
- **No authentication** - Mock provider doesn't enforce security

## Extending the Mock Provider

### Adding More Products

Edit `initializeProductCatalog()` method:

```java
addProduct("NEWPROD001", "Product Name", "Description", "Brand",
    "category.path", salePrice, listPrice, rating, reviewCount,
    Map.of(
        "attribute1", "value1",
        "attribute2", "value2",
        "tags", "TAG1,TAG2"
    )
);
```

### Adding New Mock Features

Follow the pattern:

```java
public Map<String, Object> myNewFeature(String param1, int param2) {
    logger.info("Mock myNewFeature: param1={}, param2={}", param1, param2);

    // Mock implementation
    Map<String, Object> response = new HashMap<>();
    response.put("result", "mock data");

    return response;
}
```

## Support

For issues or questions about the Mock Provider:
- Check the OpenAPI spec: `openapi/mock-provider-api.yaml`
- Review the implementation: `MockProviderAdapter.java`
- See usage examples in integration tests

---

**Built with ❤️ for the Commerce AI platform**
