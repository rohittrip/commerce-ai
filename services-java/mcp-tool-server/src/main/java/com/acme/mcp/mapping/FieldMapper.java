package com.acme.mcp.mapping;

import java.util.Map;

/**
 * Strategy interface for field mapping operations.
 * Follows Single Responsibility Principle - only handles field mapping logic.
 */
public interface FieldMapper {
    /**
     * Maps a single field name from canonical to provider-specific format
     * @param toolName The tool name context
     * @param canonicalField The canonical field name
     * @return The mapped field name
     */
    String mapField(String toolName, String canonicalField);
    
    /**
     * Maps a category from canonical to provider-specific format
     * @param toolName The tool name context
     * @param canonicalCategory The canonical category
     * @return The mapped category
     */
    String mapCategory(String toolName, String canonicalCategory);
    
    /**
     * Applies field mappings to an entire data object
     * @param toolName The tool name context
     * @param data The data to map
     * @return The mapped data
     */
    Map<String, Object> applyFieldMappings(String toolName, Map<String, Object> data);
}
