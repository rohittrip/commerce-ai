package com.acme.mcp.mapping;

import com.acme.mcp.config.ProviderConfig;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Concrete implementation of FieldMapper for provider-specific mapping.
 * Follows Open/Closed Principle - open for extension via configuration, closed for modification.
 */
public class ProviderFieldMapper implements FieldMapper {
    private static final Logger logger = LoggerFactory.getLogger(ProviderFieldMapper.class);
    private final ProviderConfig providerConfig;

    public ProviderFieldMapper(ProviderConfig providerConfig) {
        this.providerConfig = providerConfig;
    }

    @Override
    public String mapField(String toolName, String canonicalField) {
        if (canonicalField == null) {
            return null;
        }
        
        String mapped = providerConfig.mapField(toolName, canonicalField);
        if (!mapped.equals(canonicalField)) {
            logger.trace("Mapped field for {}/{}: {} -> {}", 
                providerConfig.getId(), toolName, canonicalField, mapped);
        }
        return mapped;
    }

    @Override
    public String mapCategory(String toolName, String canonicalCategory) {
        if (canonicalCategory == null) {
            return null;
        }
        
        String mapped = providerConfig.mapCategory(toolName, canonicalCategory);
        if (!mapped.equals(canonicalCategory)) {
            logger.debug("Mapped category for {}/{}: {} -> {}", 
                providerConfig.getId(), toolName, canonicalCategory, mapped);
        }
        return mapped;
    }

    @Override
    public Map<String, Object> applyFieldMappings(String toolName, Map<String, Object> data) {
        if (data == null || data.isEmpty()) {
            return data;
        }

        Map<String, Object> mappedData = new HashMap<>();
        for (Map.Entry<String, Object> entry : data.entrySet()) {
            String mappedKey = mapField(toolName, entry.getKey());
            Object value = entry.getValue();
            
            // Handle nested maps recursively
            if (value instanceof Map) {
                value = applyFieldMappings(toolName, (Map<String, Object>) value);
            }
            // Handle lists of categories
            else if ("categories".equals(entry.getKey()) && value instanceof List) {
                value = ((List<String>) value).stream()
                    .map(cat -> mapCategory(toolName, cat))
                    .collect(Collectors.toList());
            }
            
            mappedData.put(mappedKey, value);
        }
        
        return mappedData;
    }
}
