package com.acme.mcp.validation;

/**
 * Custom exception for validation errors
 */
public class ValidationException extends Exception {
    private final String field;
    
    public ValidationException(String message) {
        super(message);
        this.field = null;
    }
    
    public ValidationException(String field, String message) {
        super(String.format("Field '%s': %s", field, message));
        this.field = field;
    }
    
    public String getField() {
        return field;
    }
}
