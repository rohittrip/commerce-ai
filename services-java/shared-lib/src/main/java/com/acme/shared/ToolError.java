package com.acme.shared;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.Map;

public class ToolError {
    public enum Code {
        VALIDATION_ERROR,
        PROVIDER_ERROR,
        NOT_FOUND,
        TIMEOUT,
        RATE_LIMIT,
        INTERNAL_ERROR
    }

    @JsonProperty("code")
    private Code code;

    @JsonProperty("message")
    private String message;

    @JsonProperty("details")
    private Map<String, Object> details;

    @JsonProperty("provider")
    private String provider;

    public ToolError() {}

    public ToolError(Code code, String message) {
        this.code = code;
        this.message = message;
    }

    public ToolError(Code code, String message, String provider) {
        this.code = code;
        this.message = message;
        this.provider = provider;
    }

    // Getters and setters
    public Code getCode() { return code; }
    public void setCode(Code code) { this.code = code; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public Map<String, Object> getDetails() { return details; }
    public void setDetails(Map<String, Object> details) { this.details = details; }

    public String getProvider() { return provider; }
    public void setProvider(String provider) { this.provider = provider; }
}
