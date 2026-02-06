package com.acme.mcp.registry;

public class ToolMetadata {
    private final String name;
    private final String description;
    private final String requestSchemaPath;
    private final String responseSchemaPath;

    public ToolMetadata(String name, String description, String requestSchemaPath, String responseSchemaPath) {
        this.name = name;
        this.description = description;
        this.requestSchemaPath = requestSchemaPath;
        this.responseSchemaPath = responseSchemaPath;
    }

    public String getName() {
        return name;
    }

    public String getDescription() {
        return description;
    }

    public String getRequestSchemaPath() {
        return requestSchemaPath;
    }

    public String getResponseSchemaPath() {
        return responseSchemaPath;
    }
}
