package com.acme.shared;

import com.fasterxml.jackson.annotation.JsonProperty;

public class ToolResponse<T> {
    @JsonProperty("ok")
    private boolean ok;

    @JsonProperty("traceId")
    private String traceId;

    @JsonProperty("data")
    private T data;

    @JsonProperty("error")
    private ToolError error;

    public ToolResponse() {}

    public static <T> ToolResponse<T> success(String traceId, T data) {
        ToolResponse<T> response = new ToolResponse<>();
        response.setOk(true);
        response.setTraceId(traceId);
        response.setData(data);
        return response;
    }

    public static <T> ToolResponse<T> failure(String traceId, ToolError error) {
        ToolResponse<T> response = new ToolResponse<>();
        response.setOk(false);
        response.setTraceId(traceId);
        response.setError(error);
        return response;
    }

    // Getters and setters
    public boolean isOk() { return ok; }
    public void setOk(boolean ok) { this.ok = ok; }

    public String getTraceId() { return traceId; }
    public void setTraceId(String traceId) { this.traceId = traceId; }

    public T getData() { return data; }
    public void setData(T data) { this.data = data; }

    public ToolError getError() { return error; }
    public void setError(ToolError error) { this.error = error; }
}
