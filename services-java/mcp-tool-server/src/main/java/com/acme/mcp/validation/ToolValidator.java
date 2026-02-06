package com.acme.mcp.validation;

import java.util.Map;

/**
 * Interface for tool-level validation.
 * Follows Interface Segregation Principle - clients depend only on methods they use.
 */
public interface ToolValidator {
    /**
     * Validates if a tool is enabled for a given provider
     * @param providerId The provider ID
     * @param toolName The tool name
     * @return true if enabled, false otherwise
     */
    boolean isToolEnabled(String providerId, String toolName);
    
    /**
     * Validates tool request parameters
     * @param toolName The tool name
     * @param request The request parameters
     * @throws ValidationException if validation fails
     */
    void validateRequest(String toolName, Map<String, Object> request) throws ValidationException;
}
