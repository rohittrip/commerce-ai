package com.acme.mcp.adapters.providers;

import com.acme.mcp.adapters.ProviderAdapter;
import com.acme.shared.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Component
public class MockProviderAdapter implements ProviderAdapter {
    private static final Logger logger = LoggerFactory.getLogger(MockProviderAdapter.class);
    private static final String PROVIDER_NAME = "mock";
    
    private final Map<String, ProductSummary> productCatalog = new ConcurrentHashMap<>();
    private final Map<String, Cart> userCarts = new ConcurrentHashMap<>();
    private final Map<String, Order> orders = new ConcurrentHashMap<>();

    public MockProviderAdapter() {
        initializeProductCatalog();
    }

    private void initializeProductCatalog() {
        // === MOBILE PHONES ===
        addProduct("MOB001", "Vivo T2x 5G 128 GB, 8 GB RAM, Glimmer Black",
            "Display: 16.7 cm (6.58 inch), Funtouch OS 13 (Android 13), MediaTek Dimensity 6020 Processor",
            "VIVO", "electronics.mobile.smartphones", 12749, 20999, 4.3, 324,
            Map.of(
                "storage", "128 GB",
                "ram", "8 GB",
                "screenSize", "6.58 inch",
                "batteryCapacity", "5000 mAh",
                "os", "Funtouch OS 13 (Android 13)",
                "processor", "MediaTek Dimensity 6020",
                "camera", "50 MP + 2 MP",
                "color", "Glimmer Black",
                "warranty", "1 Year",
                "tags", "5G,BESTSELLER"
            ));

        addProduct("MOB002", "Samsung Galaxy S25 Ultra 5G 256 GB, 12 GB RAM, Titanium Grey",
            "Premium flagship with AI features, 200MP camera, S Pen, and Snapdragon 8 Elite",
            "Samsung", "electronics.mobile.smartphones", 129999, 134999, 4.8, 1876,
            Map.of(
                "storage", "256 GB",
                "ram", "12 GB",
                "screenSize", "6.8 inch",
                "batteryCapacity", "5000 mAh",
                "os", "One UI 7 (Android 15)",
                "processor", "Snapdragon 8 Elite",
                "camera", "200 MP + 50 MP + 12 MP + 10 MP",
                "color", "Titanium Grey",
                "warranty", "1 Year",
                "tags", "NEW_ARRIVAL,FLAGSHIP,5G"
            ));

        addProduct("MOB003", "OnePlus 13 256 GB, 12 GB RAM, Midnight Ocean",
            "Hasselblad camera system, 120Hz LTPO AMOLED, 100W SUPERVOOC charging",
            "OnePlus", "electronics.mobile.smartphones", 64999, 69999, 4.6, 892,
            Map.of(
                "storage", "256 GB",
                "ram", "12 GB",
                "screenSize", "6.82 inch",
                "batteryCapacity", "5400 mAh",
                "os", "OxygenOS 15 (Android 15)",
                "processor", "Snapdragon 8 Elite",
                "camera", "50 MP + 50 MP + 32 MP",
                "color", "Midnight Ocean",
                "warranty", "1 Year",
                "tags", "NEW_ARRIVAL,5G"
            ));

        addProduct("MOB004", "Apple iPhone 16 Pro Max 256 GB, Natural Titanium",
            "A19 Pro chip, ProMotion display, 48MP Fusion camera, Action button",
            "Apple", "electronics.mobile.smartphones", 144900, 159900, 4.9, 2345,
            Map.of(
                "storage", "256 GB",
                "screenSize", "6.9 inch",
                "os", "iOS 18",
                "processor", "A19 Pro Bionic",
                "camera", "48 MP + 48 MP + 12 MP",
                "color", "Natural Titanium",
                "warranty", "1 Year",
                "tags", "FLAGSHIP,PREMIUM"
            ));

        addProduct("MOB005", "Redmi Note 14 Pro 5G 128 GB, 8 GB RAM, Black",
            "50MP AI camera, 120Hz AMOLED, 67W fast charging, MIUI 14",
            "Redmi", "electronics.mobile.smartphones", 24999, 28999, 4.4, 1567,
            Map.of(
                "storage", "128 GB",
                "ram", "8 GB",
                "screenSize", "6.67 inch",
                "batteryCapacity", "5100 mAh",
                "os", "MIUI 14 (Android 14)",
                "processor", "Dimensity 7200",
                "camera", "50 MP + 8 MP + 2 MP",
                "color", "Black",
                "warranty", "1 Year",
                "tags", "5G,BESTSELLER"
            ));

        // === MORE BUDGET PHONES (Under 20K) ===
        addProduct("MOB006", "Realme Narzo 70x 5G 128 GB, 6 GB RAM, Ice Blue",
            "120Hz Ultra Smooth Display, 50MP AI Camera, 5000mAh Battery with 33W Charging",
            "Realme", "electronics.mobile.smartphones", 11999, 14999, 4.2, 2341,
            Map.of(
                "storage", "128 GB",
                "ram", "6 GB",
                "screenSize", "6.72 inch",
                "batteryCapacity", "5000 mAh",
                "os", "Realme UI 5.0 (Android 14)",
                "processor", "MediaTek Dimensity 6100+",
                "camera", "50 MP + 2 MP",
                "color", "Ice Blue",
                "warranty", "1 Year",
                "tags", "5G,BUDGET,BESTSELLER"
            ));

        addProduct("MOB007", "Samsung Galaxy M15 5G 128 GB, 6 GB RAM, Blue Topaz",
            "Super AMOLED Display, 6000mAh Battery, 50MP Triple Camera",
            "Samsung", "electronics.mobile.smartphones", 13499, 16999, 4.3, 1876,
            Map.of(
                "storage", "128 GB",
                "ram", "6 GB",
                "screenSize", "6.5 inch",
                "batteryCapacity", "6000 mAh",
                "os", "One UI 6.0 (Android 14)",
                "processor", "MediaTek Dimensity 6100+",
                "camera", "50 MP + 5 MP + 2 MP",
                "color", "Blue Topaz",
                "warranty", "1 Year",
                "tags", "5G,BUDGET"
            ));

        addProduct("MOB008", "Poco M6 Pro 5G 128 GB, 6 GB RAM, Power Black",
            "120Hz AMOLED Display, Snapdragon 4 Gen 2, 67W Turbo Charging",
            "Poco", "electronics.mobile.smartphones", 12999, 15999, 4.4, 3245,
            Map.of(
                "storage", "128 GB",
                "ram", "6 GB",
                "screenSize", "6.67 inch",
                "batteryCapacity", "5000 mAh",
                "os", "MIUI 14 (Android 13)",
                "processor", "Snapdragon 4 Gen 2",
                "camera", "64 MP + 8 MP + 2 MP",
                "color", "Power Black",
                "warranty", "1 Year",
                "tags", "5G,VALUE,BESTSELLER"
            ));

        addProduct("MOB009", "iQOO Z9 Lite 5G 128 GB, 6 GB RAM, Mocha Brown",
            "50MP Sony Camera, 5000mAh Battery, 44W FlashCharge",
            "iQOO", "electronics.mobile.smartphones", 10999, 13999, 4.3, 987,
            Map.of(
                "storage", "128 GB",
                "ram", "6 GB",
                "screenSize", "6.56 inch",
                "batteryCapacity", "5000 mAh",
                "os", "Funtouch OS 14 (Android 14)",
                "processor", "MediaTek Dimensity 6300",
                "camera", "50 MP + 2 MP",
                "color", "Mocha Brown",
                "warranty", "1 Year",
                "tags", "5G,BUDGET"
            ));

        addProduct("MOB010", "Motorola G64 5G 128 GB, 8 GB RAM, Ice Lilac",
            "6.5 inch FHD+ 120Hz Display, 50MP OIS Camera, 6000mAh Battery",
            "Motorola", "electronics.mobile.smartphones", 14999, 17999, 4.5, 1234,
            Map.of(
                "storage", "128 GB",
                "ram", "8 GB",
                "screenSize", "6.5 inch",
                "batteryCapacity", "6000 mAh",
                "os", "Stock Android 14",
                "processor", "MediaTek Dimensity 7025",
                "camera", "50 MP + 8 MP",
                "color", "Ice Lilac",
                "warranty", "1 Year",
                "tags", "5G,VALUE,STOCKANDROID"
            ));

        addProduct("MOB011", "Redmi 13 5G 128 GB, 6 GB RAM, Orchid Pink",
            "108MP Camera, 6.79 inch FHD+ Display, 5030mAh Battery",
            "Redmi", "electronics.mobile.smartphones", 13999, 16999, 4.2, 2156,
            Map.of(
                "storage", "128 GB",
                "ram", "6 GB",
                "screenSize", "6.79 inch",
                "batteryCapacity", "5030 mAh",
                "os", "MIUI 14 (Android 14)",
                "processor", "Snapdragon 4 Gen 2",
                "camera", "108 MP + 2 MP",
                "color", "Orchid Pink",
                "warranty", "1 Year",
                "tags", "5G,CAMERA,BESTSELLER"
            ));

        addProduct("MOB012", "Oppo A3 Pro 5G 128 GB, 8 GB RAM, Moonlight Purple",
            "IP68 Water Resistant, 5100mAh Battery, 45W SUPERVOOC Charging",
            "Oppo", "electronics.mobile.smartphones", 17999, 21999, 4.4, 876,
            Map.of(
                "storage", "128 GB",
                "ram", "8 GB",
                "screenSize", "6.67 inch",
                "batteryCapacity", "5100 mAh",
                "os", "ColorOS 14 (Android 14)",
                "processor", "MediaTek Dimensity 7050",
                "camera", "50 MP + 2 MP",
                "color", "Moonlight Purple",
                "warranty", "1 Year",
                "tags", "5G,WATERPROOF,PREMIUM"
            ));

        addProduct("MOB013", "Lava Blaze Curve 5G 128 GB, 8 GB RAM, Glass Blue",
            "Curved AMOLED Display, 64MP Camera, 5000mAh with 33W Charging",
            "Lava", "electronics.mobile.smartphones", 17999, 20999, 4.1, 654,
            Map.of(
                "storage", "128 GB",
                "ram", "8 GB",
                "screenSize", "6.67 inch",
                "batteryCapacity", "5000 mAh",
                "os", "Stock Android 14",
                "processor", "MediaTek Dimensity 7050",
                "camera", "64 MP + 2 MP",
                "color", "Glass Blue",
                "warranty", "1 Year",
                "tags", "5G,MADEININDIA"
            ));

        addProduct("MOB014", "Nokia G42 5G 128 GB, 6 GB RAM, So Purple",
            "3 Years of OS Updates, 50MP AI Camera, 5000mAh Battery",
            "Nokia", "electronics.mobile.smartphones", 14999, 17999, 4.3, 543,
            Map.of(
                "storage", "128 GB",
                "ram", "6 GB",
                "screenSize", "6.56 inch",
                "batteryCapacity", "5000 mAh",
                "os", "Stock Android 13",
                "processor", "Snapdragon 480+ 5G",
                "camera", "50 MP + 8 MP + 2 MP",
                "color", "So Purple",
                "warranty", "1 Year",
                "tags", "5G,LONGSUPPORT,STOCKANDROID"
            ));

        addProduct("MOB015", "Infinix Note 40 Pro 5G 256 GB, 8 GB RAM, Vintage Green",
            "108MP OIS Camera, 68W All-Round FastCharge, Wireless MagCharge",
            "Infinix", "electronics.mobile.smartphones", 19999, 24999, 4.4, 1234,
            Map.of(
                "storage", "256 GB",
                "ram", "8 GB",
                "screenSize", "6.78 inch",
                "batteryCapacity", "5000 mAh",
                "os", "XOS 14 (Android 14)",
                "processor", "MediaTek Dimensity 7020",
                "camera", "108 MP + 2 MP + 2 MP",
                "color", "Vintage Green",
                "warranty", "1 Year",
                "tags", "5G,FASTCHARGE,VALUE"
            ));

        // === HEADPHONES & AUDIO ===
        addProduct("HP001", "Sony WH-1000XM5",
            "Premium noise-cancelling wireless headphones with industry-leading ANC and 30-hour battery",
            "Sony", "electronics.audio.headphones", 29990, 34990, 4.8, 1523,
            Map.of(
                "type", "Over-ear",
                "wireless", true,
                "noiseCancelling", true,
                "batteryLife", "30 hours",
                "connectivity", "Bluetooth 5.2",
                "color", "Black",
                "warranty", "1 Year",
                "tags", "PREMIUM,BESTSELLER"
            ));

        addProduct("HP002", "Bose QuietComfort 45",
            "Industry-leading noise cancellation with Acoustic Noise Cancelling technology",
            "Bose", "electronics.audio.headphones", 28900, 32900, 4.7, 987,
            Map.of(
                "type", "Over-ear",
                "wireless", true,
                "noiseCancelling", true,
                "batteryLife", "24 hours",
                "connectivity", "Bluetooth 5.1",
                "color", "Black",
                "warranty", "1 Year",
                "tags", "PREMIUM"
            ));

        addProduct("HP003", "boAt Rockerz 550",
            "Budget-friendly wireless headphones with powerful bass and 20-hour playback",
            "boAt", "electronics.audio.headphones", 1499, 3990, 4.2, 8765,
            Map.of(
                "type", "Over-ear",
                "wireless", true,
                "noiseCancelling", false,
                "batteryLife", "20 hours",
                "connectivity", "Bluetooth 5.0",
                "color", "Black",
                "warranty", "1 Year",
                "tags", "BUDGET,BESTSELLER"
            ));

        addProduct("HP004", "JBL Tune 760NC",
            "Active noise cancelling headphones with Pure Bass sound",
            "JBL", "electronics.audio.headphones", 4999, 7999, 4.4, 2134,
            Map.of(
                "type", "Over-ear",
                "wireless", true,
                "noiseCancelling", true,
                "batteryLife", "35 hours",
                "connectivity", "Bluetooth 5.0",
                "color", "Blue",
                "warranty", "1 Year",
                "tags", "VALUE"
            ));

        addProduct("HP005", "Sony WF-1000XM4",
            "Premium wireless earbuds with LDAC and exceptional noise cancelling",
            "Sony", "electronics.audio.earbuds", 19990, 24990, 4.6, 3421,
            Map.of(
                "type", "Earbuds",
                "wireless", true,
                "noiseCancelling", true,
                "batteryLife", "8 hours (24 with case)",
                "connectivity", "Bluetooth 5.2",
                "color", "Black",
                "warranty", "1 Year",
                "tags", "PREMIUM"
            ));

        // === SPEAKERS ===
        addProduct("SP001", "JBL Flip 6",
            "Portable waterproof speaker with powerful sound and 12-hour playtime",
            "JBL", "electronics.audio.speakers", 10999, 12999, 4.6, 2156,
            Map.of(
                "type", "Portable",
                "wireless", true,
                "waterproof", "IP67",
                "batteryLife", "12 hours",
                "connectivity", "Bluetooth 5.1",
                "color", "Black",
                "warranty", "1 Year",
                "tags", "WATERPROOF"
            ));

        addProduct("SP002", "Bose SoundLink Revolve+",
            "360-degree portable speaker with deep, loud sound",
            "Bose", "electronics.audio.speakers", 24900, 29900, 4.7, 876,
            Map.of(
                "type", "Portable",
                "wireless", true,
                "waterproof", "IPX4",
                "batteryLife", "16 hours",
                "connectivity", "Bluetooth 4.2",
                "color", "Black",
                "warranty", "1 Year",
                "tags", "PREMIUM"
            ));

        // === FASHION - T-SHIRTS ===
        addProduct("TS001", "Nike Dri-FIT Running Tee",
            "Breathable athletic t-shirt with moisture-wicking technology",
            "Nike", "fashion.apparel.tops.tshirts", 1495, 1995, 4.5, 567,
            Map.of(
                "material", "Polyester",
                "fit", "Athletic",
                "color", "Black",
                "size", "M",
                "care", "Machine Wash",
                "tags", "SPORTS"
            ));

        addProduct("TS002", "Adidas Essentials Tee",
            "Comfortable everyday cotton t-shirt with classic fit",
            "Adidas", "fashion.apparel.tops.tshirts", 1299, 1799, 4.3, 892,
            Map.of(
                "material", "Cotton",
                "fit", "Regular",
                "color", "Navy Blue",
                "size", "L",
                "care", "Machine Wash",
                "tags", "CASUAL"
            ));

        addProduct("TS003", "Nike Sportswear Tee",
            "Classic fit cotton t-shirt with Swoosh logo",
            "Nike", "fashion.apparel.tops.tshirts", 1795, 2495, 4.4, 1234,
            Map.of(
                "material", "Cotton",
                "fit", "Regular",
                "color", "White",
                "size", "L",
                "care", "Machine Wash",
                "tags", "CASUAL,BESTSELLER"
            ));

        addProduct("TS004", "Adidas Performance Polo",
            "Moisture-wicking polo shirt for active lifestyle",
            "Adidas", "fashion.apparel.tops.shirts", 2199, 2999, 4.6, 445,
            Map.of(
                "material", "Polyester",
                "fit", "Slim",
                "color", "Grey",
                "size", "M",
                "care", "Machine Wash",
                "tags", "SPORTS"
            ));

        // === FASHION - SNEAKERS ===
        addProduct("SH001", "Nike Air Max 90",
            "Iconic running shoes with visible Air cushioning and leather upper",
            "Nike", "fashion.footwear.sneakers", 8695, 11995, 4.7, 3456,
            Map.of(
                "size", "9 UK",
                "color", "White/Black",
                "type", "Running",
                "material", "Leather/Synthetic",
                "warranty", "3 Months",
                "tags", "BESTSELLER,ICONIC"
            ));

        addProduct("SH002", "Adidas Ultraboost 22",
            "Premium running shoes with responsive Boost midsole technology",
            "Adidas", "fashion.footwear.sneakers", 14999, 17999, 4.8, 1876,
            Map.of(
                "size", "10 UK",
                "color", "Core Black",
                "type", "Running",
                "material", "Primeknit",
                "warranty", "3 Months",
                "tags", "PREMIUM,SPORTS"
            ));

        addProduct("SH003", "Nike Revolution 6",
            "Budget-friendly running shoes with soft foam cushioning",
            "Nike", "fashion.footwear.sneakers", 3695, 4995, 4.2, 5432,
            Map.of(
                "size", "9 UK",
                "color", "Black/Red",
                "type", "Running",
                "material", "Mesh",
                "warranty", "3 Months",
                "tags", "BUDGET,BESTSELLER"
            ));

        addProduct("SH004", "Adidas Superstar",
            "Classic lifestyle sneakers with iconic shell toe design",
            "Adidas", "fashion.footwear.sneakers", 7999, 9999, 4.5, 2345,
            Map.of(
                "size", "9 UK",
                "color", "White/Black",
                "type", "Casual",
                "material", "Leather",
                "warranty", "3 Months",
                "tags", "CLASSIC,ICONIC"
            ));

        // === LAPTOPS ===
        addProduct("LAP001", "Apple MacBook Air M3 13-inch, 8GB RAM, 256GB SSD",
            "Incredibly thin and light with M3 chip, up to 18 hours battery life",
            "Apple", "electronics.computers.laptops", 114900, 119900, 4.8, 1234,
            Map.of(
                "processor", "Apple M3 8-core",
                "ram", "8 GB",
                "storage", "256 GB SSD",
                "screenSize", "13.6 inch",
                "os", "macOS",
                "warranty", "1 Year",
                "tags", "PREMIUM,LIGHTWEIGHT"
            ));

        addProduct("LAP002", "Dell XPS 15 Intel Core i7, 16GB RAM, 512GB SSD",
            "Powerful laptop with InfinityEdge display and premium build",
            "Dell", "electronics.computers.laptops", 134990, 149990, 4.6, 876,
            Map.of(
                "processor", "Intel Core i7 13th Gen",
                "ram", "16 GB",
                "storage", "512 GB SSD",
                "screenSize", "15.6 inch",
                "os", "Windows 11",
                "warranty", "1 Year",
                "tags", "PREMIUM,PERFORMANCE"
            ));

        // === TABLETS ===
        addProduct("TAB001", "Apple iPad Air 11-inch Wi-Fi 128GB, Starlight",
            "M2 chip, Liquid Retina display, Apple Pencil Pro support",
            "Apple", "electronics.tablets", 59900, 64900, 4.7, 987,
            Map.of(
                "storage", "128 GB",
                "screenSize", "11 inch",
                "processor", "Apple M2",
                "os", "iPadOS",
                "connectivity", "Wi-Fi",
                "warranty", "1 Year",
                "tags", "PREMIUM"
            ));

        addProduct("TAB002", "Samsung Galaxy Tab S9 FE 128GB, Mint",
            "Large vivid display, S Pen included, long-lasting battery",
            "Samsung", "electronics.tablets", 36999, 42999, 4.5, 654,
            Map.of(
                "storage", "128 GB",
                "screenSize", "10.9 inch",
                "processor", "Exynos 1380",
                "os", "Android",
                "connectivity", "Wi-Fi",
                "warranty", "1 Year",
                "tags", "VALUE"
            ));

        // === SMARTWATCHES ===
        addProduct("WAT001", "Apple Watch Series 10 GPS 46mm, Midnight Aluminum",
            "Advanced health features, always-on Retina display, ECG app",
            "Apple", "electronics.wearables.smartwatches", 46900, 49900, 4.8, 1432,
            Map.of(
                "size", "46mm",
                "connectivity", "GPS",
                "batteryLife", "18 hours",
                "waterproof", "50m",
                "color", "Midnight",
                "warranty", "1 Year",
                "tags", "PREMIUM,HEALTH"
            ));

        addProduct("WAT002", "Samsung Galaxy Watch6 Classic 47mm, Black",
            "Classic rotating bezel, advanced sleep tracking, comprehensive health monitoring",
            "Samsung", "electronics.wearables.smartwatches", 36999, 39999, 4.6, 876,
            Map.of(
                "size", "47mm",
                "connectivity", "Bluetooth",
                "batteryLife", "40 hours",
                "waterproof", "5ATM",
                "color", "Black",
                "warranty", "1 Year",
                "tags", "CLASSIC"
            ));

        logger.info("Initialized mock catalog with {} products", productCatalog.size());
    }

    private void addProduct(String id, String name, String description, String brand,
                           String category, double salePrice, double listPrice, double rating, int reviewCount,
                           Map<String, Object> attributes) {
        ProductSummary product = new ProductSummary();
        product.setId(id);
        product.setProvider(PROVIDER_NAME);
        product.setName(name);
        product.setDescription(description);
        product.setBrand(brand);
        product.setCategory(category);
        product.setPrice(new Money(salePrice, "INR"));
        // Use placeholder image service with product name
        String encodedName = name.length() > 20 ? name.substring(0, 20).replace(" ", "+") : name.replace(" ", "+");
        product.setImageUrl("https://placehold.co/300x300/e2e8f0/475569?text=" + encodedName);

        // Set stock based on product type
        int stock = category.contains("mobile") || category.contains("laptop") ? 50 : 100;
        product.setAvailability(new Availability(true, stock, Availability.Status.IN_STOCK));

        product.setRating(rating);
        product.setReviewCount(reviewCount);

        // Add discount information if applicable
        Map<String, Object> enrichedAttributes = new HashMap<>(attributes);
        if (listPrice > salePrice) {
            double discountPercent = ((listPrice - salePrice) / listPrice) * 100;
            enrichedAttributes.put("listPrice", listPrice);
            enrichedAttributes.put("discount", String.format("%.0f%% OFF", discountPercent));
            enrichedAttributes.put("savings", listPrice - salePrice);
        }

        product.setAttributes(enrichedAttributes);
        productCatalog.put(id, product);
    }

    @Override
    public String getProviderName() {
        return PROVIDER_NAME;
    }

    @Override
    public boolean supports(Capability capability) {
        return true; // Mock provider supports all capabilities
    }

    @Override
    public List<ProductSummary> search(String query, Map<String, Object> filters, int page, int limit) {
        logger.info("Mock search: query={}, page={}, limit={}", query, page, limit);
        
        try {
            Thread.sleep(150); // Simulate network delay
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }

        List<ProductSummary> results = productCatalog.values().stream()
            .filter(product -> matchesQuery(product, query))
            .filter(product -> matchesFilters(product, filters))
            .collect(Collectors.toList());

        logger.info("Mock search found {} products", results.size());
        return results;
    }

    private boolean matchesQuery(ProductSummary product, String query) {
        if (query == null || query.isEmpty()) {
            return true;
        }
        
        String lowerQuery = query.toLowerCase().trim();
        String[] queryWords = lowerQuery.split("\\s+");
        
        // Build searchable text from product fields
        StringBuilder searchableText = new StringBuilder();
        searchableText.append(product.getName() != null ? product.getName().toLowerCase() : "").append(" ");
        searchableText.append(product.getBrand() != null ? product.getBrand().toLowerCase() : "").append(" ");
        searchableText.append(product.getCategory() != null ? product.getCategory().toLowerCase() : "").append(" ");
        searchableText.append(product.getDescription() != null ? product.getDescription().toLowerCase() : "");
        String searchable = searchableText.toString();
        
        // Match if ANY word from the query is found in the product
        for (String word : queryWords) {
            if (word.length() >= 2 && searchable.contains(word)) {
                return true;
            }
        }
        
        return false;
    }

    private boolean matchesFilters(ProductSummary product, Map<String, Object> filters) {
        if (filters == null || filters.isEmpty()) {
            return true;
        }

        // Price filter
        if (filters.containsKey("priceMax")) {
            double priceMax = ((Number) filters.get("priceMax")).doubleValue();
            if (product.getPrice().getAmount().doubleValue() > priceMax) {
                return false;
            }
        }

        if (filters.containsKey("priceMin")) {
            double priceMin = ((Number) filters.get("priceMin")).doubleValue();
            if (product.getPrice().getAmount().doubleValue() < priceMin) {
                return false;
            }
        }

        // Category filter
        if (filters.containsKey("categories")) {
            List<String> categories = (List<String>) filters.get("categories");
            if (!categories.isEmpty() && product.getCategory() != null) {
                boolean matchesCategory = categories.stream()
                    .anyMatch(cat -> product.getCategory().startsWith(cat));
                if (!matchesCategory) {
                    return false;
                }
            }
        }

        // Brand filter
        if (filters.containsKey("brands")) {
            List<String> brands = (List<String>) filters.get("brands");
            if (!brands.isEmpty() && product.getBrand() != null) {
                boolean matchesBrand = brands.stream()
                    .anyMatch(brand -> product.getBrand().equalsIgnoreCase(brand));
                if (!matchesBrand) {
                    return false;
                }
            }
        }

        return true;
    }

    @Override
    public ProductSummary getProductDetails(String productId) {
        logger.info("Mock getProductDetails: {}", productId);
        return productCatalog.get(productId);
    }

    @Override
    public Cart addToCart(String userId, String productId, int quantity) {
        logger.info("Mock addToCart: user={}, product={}, qty={}", userId, productId, quantity);
        
        Cart cart = userCarts.computeIfAbsent(userId, id -> createNewCart(id));
        ProductSummary product = productCatalog.get(productId);
        
        if (product == null) {
            throw new RuntimeException("Product not found: " + productId);
        }

        // Check if item already in cart
        Optional<CartItem> existing = cart.getItems().stream()
            .filter(item -> item.getProductId().equals(productId))
            .findFirst();

        if (existing.isPresent()) {
            existing.get().setQuantity(existing.get().getQuantity() + quantity);
        } else {
            CartItem item = new CartItem(productId, PROVIDER_NAME, quantity, product.getPrice());
            item.setProduct(product);
            cart.getItems().add(item);
        }

        updateCartTotals(cart);
        return cart;
    }

    @Override
    public Cart updateCartItem(String userId, String productId, int quantity) {
        logger.info("Mock updateCartItem: user={}, product={}, qty={}", userId, productId, quantity);
        
        Cart cart = userCarts.get(userId);
        if (cart == null) {
            throw new RuntimeException("Cart not found for user: " + userId);
        }

        cart.getItems().stream()
            .filter(item -> item.getProductId().equals(productId))
            .findFirst()
            .ifPresent(item -> item.setQuantity(quantity));

        updateCartTotals(cart);
        return cart;
    }

    @Override
    public Cart removeFromCart(String userId, String productId) {
        logger.info("Mock removeFromCart: user={}, product={}", userId, productId);
        
        Cart cart = userCarts.get(userId);
        if (cart == null) {
            throw new RuntimeException("Cart not found for user: " + userId);
        }

        cart.getItems().removeIf(item -> item.getProductId().equals(productId));
        updateCartTotals(cart);
        return cart;
    }

    @Override
    public Cart getCart(String userId) {
        logger.info("Mock getCart: user={}", userId);
        return userCarts.computeIfAbsent(userId, id -> createNewCart(id));
    }

    @Override
    public Order createOrder(String userId, String cartId, String addressId, Order.PaymentMethod paymentMethod) {
        logger.info("Mock createOrder: user={}, cart={}, payment={}", userId, cartId, paymentMethod);
        
        Cart cart = userCarts.get(userId);
        if (cart == null || cart.getItems().isEmpty()) {
            throw new RuntimeException("Cart is empty");
        }

        String orderId = "ORD-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        Order order = new Order();
        order.setId(orderId);
        order.setUserId(userId);
        order.setProvider(PROVIDER_NAME);
        order.setProviderOrderId("MOCK-" + orderId);
        order.setStatus(Order.Status.PENDING);
        order.setItems(new ArrayList<>(cart.getItems()));
        order.setTotal(cart.getTotal());
        order.setPaymentMethod(paymentMethod);
        order.setCreatedAt(Instant.now());
        order.setUpdatedAt(Instant.now());

        // Create address object (in real system, fetch from DB)
        Address address = new Address();
        address.setLine1("Test Address");
        address.setCity("Mumbai");
        address.setPincode("400001");
        address.setCountry("IN");
        order.setShippingAddress(address);

        orders.put(orderId, order);
        
        // Clear cart after order
        cart.getItems().clear();
        updateCartTotals(cart);

        return order;
    }

    @Override
    public Order getOrderStatus(String orderId) {
        logger.info("Mock getOrderStatus: {}", orderId);
        Order order = orders.get(orderId);
        if (order == null) {
            throw new RuntimeException("Order not found: " + orderId);
        }
        return order;
    }

    private Cart createNewCart(String userId) {
        Cart cart = new Cart("CART-" + userId, userId);
        cart.setCurrency("INR");
        cart.setSubtotal(new Money(BigDecimal.ZERO, "INR"));
        cart.setTotal(new Money(BigDecimal.ZERO, "INR"));
        cart.setItemCount(0);
        return cart;
    }

    private void updateCartTotals(Cart cart) {
        BigDecimal subtotal = cart.getItems().stream()
            .map(item -> item.getUnitPrice().getAmount().multiply(BigDecimal.valueOf(item.getQuantity())))
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        cart.setSubtotal(new Money(subtotal, "INR"));
        cart.setTotal(new Money(subtotal, "INR")); // No tax for simplicity
        cart.setItemCount(cart.getItems().stream().mapToInt(CartItem::getQuantity).sum());
    }

    // ============================================================================
    // ADDITIONAL MOCK FEATURES (NOT IN PROVIDERADAPTER INTERFACE)
    // ============================================================================

    /**
     * Get product reviews (mock data)
     */
    public Map<String, Object> getProductReviews(String productId, int page, int limit, String sortBy) {
        logger.info("Mock getProductReviews: product={}, page={}, limit={}", productId, page, limit);

        ProductSummary product = productCatalog.get(productId);
        if (product == null) {
            throw new RuntimeException("Product not found: " + productId);
        }

        List<Map<String, Object>> reviews = generateMockReviews(productId, product.getRating());

        // Apply sorting
        if ("helpful".equals(sortBy)) {
            reviews.sort((r1, r2) -> ((Integer) r2.get("helpful")).compareTo((Integer) r1.get("helpful")));
        } else if ("rating_high".equals(sortBy)) {
            reviews.sort((r1, r2) -> ((Integer) r2.get("rating")).compareTo((Integer) r1.get("rating")));
        } else if ("rating_low".equals(sortBy)) {
            reviews.sort((r1, r2) -> ((Integer) r1.get("rating")).compareTo((Integer) r2.get("rating")));
        }

        // Pagination
        int start = (page - 1) * limit;
        int end = Math.min(start + limit, reviews.size());
        List<Map<String, Object>> paginatedReviews = reviews.subList(start, end);

        Map<String, Object> response = new HashMap<>();
        response.put("reviews", paginatedReviews);
        response.put("summary", generateReviewSummary(product.getRating(), product.getReviewCount()));
        response.put("pagination", Map.of(
            "page", page,
            "limit", limit,
            "total", reviews.size(),
            "hasMore", end < reviews.size()
        ));

        return response;
    }

    /**
     * Add a product review (mock - stores in memory)
     */
    public Map<String, Object> addReview(String productId, String userId, String userName,
                                        int rating, String title, String content) {
        logger.info("Mock addReview: product={}, user={}, rating={}", productId, userId, rating);

        ProductSummary product = productCatalog.get(productId);
        if (product == null) {
            throw new RuntimeException("Product not found: " + productId);
        }

        String reviewId = "REV-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();

        Map<String, Object> review = new HashMap<>();
        review.put("reviewId", reviewId);
        review.put("productId", productId);
        review.put("userId", userId);
        review.put("userName", userName);
        review.put("rating", rating);
        review.put("title", title);
        review.put("content", content);
        review.put("helpful", 0);
        review.put("verified", true);
        review.put("createdAt", Instant.now().toString());

        return review;
    }

    /**
     * Get product recommendations
     */
    public List<ProductSummary> getRecommendations(String type, String contextProductId,
                                                   String category, int limit) {
        logger.info("Mock getRecommendations: type={}, productId={}, category={}",
                   type, contextProductId, category);

        switch (type.toLowerCase()) {
            case "similar":
                return getSimilarProducts(contextProductId, limit);
            case "complementary":
                return getComplementaryProducts(contextProductId, limit);
            case "trending":
                return getTrendingProducts(category, limit);
            case "deals":
                return getBestDeals(category, limit);
            default:
                return new ArrayList<>();
        }
    }

    private List<ProductSummary> getSimilarProducts(String productId, int limit) {
        ProductSummary product = productCatalog.get(productId);
        if (product == null) {
            return new ArrayList<>();
        }

        return productCatalog.values().stream()
            .filter(p -> !p.getId().equals(productId))
            .filter(p -> p.getCategory() != null && p.getCategory().equals(product.getCategory()))
            .filter(p -> {
                double priceDiff = Math.abs(p.getPrice().getAmount().doubleValue() -
                                           product.getPrice().getAmount().doubleValue());
                return priceDiff < product.getPrice().getAmount().doubleValue() * 0.5; // Within 50% price range
            })
            .sorted((p1, p2) -> Double.compare(p2.getRating(), p1.getRating()))
            .limit(limit)
            .collect(Collectors.toList());
    }

    private List<ProductSummary> getComplementaryProducts(String productId, int limit) {
        ProductSummary product = productCatalog.get(productId);
        if (product == null) {
            return new ArrayList<>();
        }

        // Mock logic: Find products in related categories at lower price points
        String baseCategory = product.getCategory().split("\\.")[0]; // e.g., "electronics"

        return productCatalog.values().stream()
            .filter(p -> !p.getId().equals(productId))
            .filter(p -> p.getCategory() != null && p.getCategory().startsWith(baseCategory))
            .filter(p -> !p.getCategory().equals(product.getCategory())) // Different subcategory
            .filter(p -> p.getPrice().getAmount().doubleValue() <
                        product.getPrice().getAmount().doubleValue() * 0.3) // < 30% of main product price
            .sorted((p1, p2) -> Double.compare(p2.getReviewCount(), p1.getReviewCount()))
            .limit(limit)
            .collect(Collectors.toList());
    }

    private List<ProductSummary> getTrendingProducts(String category, int limit) {
        return productCatalog.values().stream()
            .filter(p -> category == null || p.getCategory().startsWith(category))
            .sorted((p1, p2) -> Integer.compare(p2.getReviewCount(), p1.getReviewCount()))
            .limit(limit)
            .collect(Collectors.toList());
    }

    private List<ProductSummary> getBestDeals(String category, int limit) {
        return productCatalog.values().stream()
            .filter(p -> category == null || p.getCategory().startsWith(category))
            .filter(p -> p.getAttributes() != null && p.getAttributes().containsKey("discount"))
            .sorted((p1, p2) -> {
                String d1 = (String) p1.getAttributes().get("discount");
                String d2 = (String) p2.getAttributes().get("discount");
                double disc1 = parseDiscountPercentage(d1);
                double disc2 = parseDiscountPercentage(d2);
                return Double.compare(disc2, disc1);
            })
            .limit(limit)
            .collect(Collectors.toList());
    }

    private double parseDiscountPercentage(String discount) {
        if (discount == null) return 0;
        try {
            return Double.parseDouble(discount.replaceAll("[^0-9.]", ""));
        } catch (Exception e) {
            return 0;
        }
    }

    /**
     * Get product variants
     */
    public List<Map<String, Object>> getProductVariants(String productId) {
        logger.info("Mock getProductVariants: product={}", productId);

        ProductSummary product = productCatalog.get(productId);
        if (product == null) {
            throw new RuntimeException("Product not found: " + productId);
        }

        List<Map<String, Object>> variants = new ArrayList<>();

        // Generate mock variants based on category
        if (product.getCategory().contains("mobile") || product.getCategory().contains("electronics")) {
            // Color variants
            String[] colors = {"Black", "White", "Blue", "Red"};
            for (int i = 0; i < Math.min(3, colors.length); i++) {
                Map<String, Object> variant = new HashMap<>();
                variant.put("variantId", productId + "-color-" + i);
                variant.put("name", colors[i]);
                variant.put("type", "color");
                variant.put("attributes", Map.of("color", colors[i]));
                variant.put("price", Map.of(
                    "amount", product.getPrice().getAmount(),
                    "currency", product.getPrice().getCurrency()
                ));
                variant.put("inStock", i < 2); // First 2 variants in stock
                variants.add(variant);
            }
        } else if (product.getCategory().contains("fashion")) {
            // Size variants
            String[] sizes = {"S", "M", "L", "XL"};
            for (String size : sizes) {
                Map<String, Object> variant = new HashMap<>();
                variant.put("variantId", productId + "-size-" + size);
                variant.put("name", size);
                variant.put("type", "size");
                variant.put("attributes", Map.of("size", size));
                variant.put("price", Map.of(
                    "amount", product.getPrice().getAmount(),
                    "currency", product.getPrice().getCurrency()
                ));
                variant.put("inStock", true);
                variants.add(variant);
            }
        }

        return variants;
    }

    /**
     * Check product availability with shipping estimate
     */
    public Map<String, Object> checkAvailability(String productId, String pincode, int quantity) {
        logger.info("Mock checkAvailability: product={}, pincode={}, qty={}",
                   productId, pincode, quantity);

        ProductSummary product = productCatalog.get(productId);
        if (product == null) {
            throw new RuntimeException("Product not found: " + productId);
        }

        Availability availability = product.getAvailability();
        boolean canFulfill = availability.isInStock() &&
                           (availability.getQuantity() == null || availability.getQuantity() >= quantity);

        int deliveryDays = calculateDeliveryDays(pincode);
        BigDecimal shippingCost = calculateShippingCost(pincode, quantity);

        Map<String, Object> response = new HashMap<>();
        response.put("productId", productId);
        response.put("availability", Map.of(
            "inStock", canFulfill,
            "quantity", availability.getQuantity() != null ? availability.getQuantity() : -1,
            "status", canFulfill ? "IN_STOCK" : "OUT_OF_STOCK"
        ));
        response.put("shippingCost", Map.of(
            "amount", shippingCost,
            "currency", "INR"
        ));
        response.put("estimatedDeliveryDays", deliveryDays);
        response.put("estimatedDeliveryDate",
                    Instant.now().plus(deliveryDays, java.time.temporal.ChronoUnit.DAYS).toString());

        return response;
    }

    private int calculateDeliveryDays(String pincode) {
        // Metro cities (Mumbai, Delhi, Bangalore, Chennai)
        if (pincode.startsWith("40") || pincode.startsWith("11") ||
            pincode.startsWith("56") || pincode.startsWith("60")) {
            return 2;
        }
        return 5; // Other areas
    }

    private BigDecimal calculateShippingCost(String pincode, int quantity) {
        BigDecimal baseShipping = new BigDecimal("50.00");
        if (quantity > 1) {
            baseShipping = baseShipping.add(new BigDecimal("20.00")
                .multiply(BigDecimal.valueOf(quantity - 1)));
        }
        return baseShipping;
    }

    /**
     * Get active promotions (mock data)
     */
    public List<Map<String, Object>> getPromotions() {
        logger.info("Mock getPromotions");

        List<Map<String, Object>> promotions = new ArrayList<>();

        Map<String, Object> promo1 = new HashMap<>();
        promo1.put("promoId", "WINTER2026");
        promo1.put("type", "PERCENTAGE");
        promo1.put("value", 10);
        promo1.put("description", "Winter Sale - 10% off on all products");
        promo1.put("expiresAt", Instant.now().plus(30, java.time.temporal.ChronoUnit.DAYS).toString());
        promotions.add(promo1);

        Map<String, Object> promo2 = new HashMap<>();
        promo2.put("promoId", "NEWYEAR2026");
        promo2.put("type", "FIXED");
        promo2.put("value", 500);
        promo2.put("description", "New Year Special - Flat ₹500 off");
        promo2.put("expiresAt", Instant.now().plus(15, java.time.temporal.ChronoUnit.DAYS).toString());
        promotions.add(promo2);

        return promotions;
    }

    /**
     * Validate coupon code (mock data)
     */
    public Map<String, Object> validateCoupon(String couponCode, BigDecimal orderAmount) {
        logger.info("Mock validateCoupon: code={}, amount={}", couponCode, orderAmount);

        Map<String, Object> response = new HashMap<>();

        // Mock coupons
        if ("SAVE10".equalsIgnoreCase(couponCode)) {
            BigDecimal minOrder = new BigDecimal("500");
            if (orderAmount.compareTo(minOrder) < 0) {
                response.put("valid", false);
                response.put("reason", "Minimum order amount not met");
                response.put("minOrder", Map.of("amount", minOrder, "currency", "INR"));
                return response;
            }

            BigDecimal discount = orderAmount.multiply(new BigDecimal("0.10"));
            BigDecimal maxDiscount = new BigDecimal("1000");
            if (discount.compareTo(maxDiscount) > 0) {
                discount = maxDiscount;
            }

            response.put("valid", true);
            response.put("couponCode", couponCode);
            response.put("type", "PERCENTAGE");
            response.put("discount", Map.of("amount", discount, "currency", "INR"));
            response.put("expiresAt", Instant.now().plus(30, java.time.temporal.ChronoUnit.DAYS).toString());
        } else if ("FLAT200".equalsIgnoreCase(couponCode)) {
            BigDecimal minOrder = new BigDecimal("1000");
            if (orderAmount.compareTo(minOrder) < 0) {
                response.put("valid", false);
                response.put("reason", "Minimum order amount not met");
                response.put("minOrder", Map.of("amount", minOrder, "currency", "INR"));
                return response;
            }

            response.put("valid", true);
            response.put("couponCode", couponCode);
            response.put("type", "FIXED");
            response.put("discount", Map.of("amount", new BigDecimal("200"), "currency", "INR"));
            response.put("expiresAt", Instant.now().plus(30, java.time.temporal.ChronoUnit.DAYS).toString());
        } else {
            response.put("valid", false);
            response.put("reason", "Invalid coupon code");
        }

        return response;
    }

    // ============================================================================
    // HELPER METHODS FOR MOCK DATA GENERATION
    // ============================================================================

    private List<Map<String, Object>> generateMockReviews(String productId, double avgRating) {
        List<Map<String, Object>> reviews = new ArrayList<>();
        String[] userNames = {"TechEnthusiast", "HappyShopper", "ValueSeeker", "QualityFirst",
                             "SmartBuyer", "ProductReviewer", "VerifiedCustomer", "FrequentBuyer"};
        String[] titles = {
            "Great product!", "Worth the money", "Exceeded expectations", "Highly recommended",
            "Good value for price", "Solid performance", "Happy with purchase", "Impressive quality"
        };
        String[] contents = {
            "This product exceeded my expectations. Great quality and fast delivery.",
            "Very satisfied with the purchase. Would definitely recommend to others.",
            "Good value for the price. Works as advertised.",
            "The product quality is excellent. No complaints so far.",
            "Fast shipping and well packaged. Product works perfectly.",
            "Exactly what I was looking for. Very happy with this purchase.",
            "Great features and build quality. Highly recommend!",
            "Solid product. Does everything it promises."
        };

        int reviewCount = Math.min(10, (int) (avgRating * 2)); // More reviews for higher-rated products

        for (int i = 0; i < reviewCount; i++) {
            Map<String, Object> review = new HashMap<>();
            review.put("reviewId", "REV-" + productId + "-" + i);
            review.put("productId", productId);
            review.put("userId", "user-" + i);
            review.put("userName", userNames[i % userNames.length]);
            review.put("rating", generateRatingNear(avgRating));
            review.put("title", titles[i % titles.length]);
            review.put("content", contents[i % contents.length]);
            review.put("helpful", (int) (Math.random() * 50));
            review.put("verified", i % 3 != 0); // 2/3 are verified
            review.put("createdAt", Instant.now().minus(i * 5L, java.time.temporal.ChronoUnit.DAYS).toString());
            reviews.add(review);
        }

        return reviews;
    }

    private int generateRatingNear(double avgRating) {
        // Generate ratings clustered around the average
        int baseRating = (int) Math.round(avgRating);
        int variance = Math.random() < 0.7 ? 0 : (Math.random() < 0.5 ? -1 : 1);
        int rating = baseRating + variance;
        return Math.max(1, Math.min(5, rating));
    }

    private Map<String, Object> generateReviewSummary(double avgRating, int totalReviews) {
        Map<String, Object> summary = new HashMap<>();
        summary.put("averageRating", avgRating);
        summary.put("totalReviews", totalReviews);

        // Generate distribution around avgRating
        Map<Integer, Integer> distribution = new HashMap<>();
        int fiveStar = (int) (totalReviews * (avgRating >= 4.5 ? 0.6 : avgRating >= 4.0 ? 0.4 : 0.2));
        int fourStar = (int) (totalReviews * (avgRating >= 4.0 ? 0.3 : 0.4));
        int threeStar = (int) (totalReviews * 0.15);
        int twoStar = (int) (totalReviews * 0.08);
        int oneStar = totalReviews - fiveStar - fourStar - threeStar - twoStar;

        distribution.put(5, fiveStar);
        distribution.put(4, fourStar);
        distribution.put(3, threeStar);
        distribution.put(2, twoStar);
        distribution.put(1, Math.max(0, oneStar));

        summary.put("ratingDistribution", distribution);
        summary.put("pros", List.of("Great quality", "Fast delivery", "Good value"));
        summary.put("cons", List.of("Premium price", "Limited color options"));

        return summary;
    }
}
