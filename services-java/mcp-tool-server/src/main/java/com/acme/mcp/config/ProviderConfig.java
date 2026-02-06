package com.acme.mcp.config;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.*;

public class ProviderConfig {
    private static final Logger logger = LoggerFactory.getLogger(ProviderConfig.class);
    private static final ObjectMapper mapper = new ObjectMapper();

    private String id;
    private String name;
    private String type;
    private String baseUrl;
    private boolean enabled;
    private Map<String, Object> config;
    private Map<String, Map<String, String>> fieldMappings;
    private Map<String, String> categoryMappings;
    private Set<String> capabilities;
    private Map<String, ToolConfig> toolConfigs;

    public ProviderConfig() {
        this.config = new HashMap<>();
        this.fieldMappings = new HashMap<>();
        this.categoryMappings = new HashMap<>();
        this.capabilities = new HashSet<>();
        this.toolConfigs = new HashMap<>();
    }

    public static class ToolConfig {
        private boolean enabled = true;
        private String path;
        private String method;
        private String description;
        private Map<String, String> fieldMappings = new HashMap<>();
        private Map<String, String> categoryMappings = new HashMap<>();

        public boolean isEnabled() { return enabled; }
        public void setEnabled(boolean enabled) { this.enabled = enabled; }
        public String getPath() { return path; }
        public void setPath(String path) { this.path = path; }
        public String getMethod() { return method; }
        public void setMethod(String method) { this.method = method; }
        public String getDescription() { return description; }
        public void setDescription(String description) { this.description = description; }
        public Map<String, String> getFieldMappings() { return fieldMappings; }
        public void setFieldMappings(Map<String, String> fieldMappings) { this.fieldMappings = fieldMappings; }
        public Map<String, String> getCategoryMappings() { return categoryMappings; }
        public void setCategoryMappings(Map<String, String> categoryMappings) { this.categoryMappings = categoryMappings; }
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getBaseUrl() {
        return baseUrl;
    }

    public void setBaseUrl(String baseUrl) {
        this.baseUrl = baseUrl;
    }

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public Map<String, Object> getConfig() {
        return config;
    }

    public void setConfig(Map<String, Object> config) {
        this.config = config;
    }

    public Map<String, Map<String, String>> getFieldMappings() {
        return fieldMappings;
    }

    public void setFieldMappings(Map<String, Map<String, String>> fieldMappings) {
        this.fieldMappings = fieldMappings;
    }

    public Map<String, String> getCategoryMappings() {
        return categoryMappings;
    }

    public void setCategoryMappings(Map<String, String> categoryMappings) {
        this.categoryMappings = categoryMappings;
    }

    public Set<String> getCapabilities() {
        return capabilities;
    }

    public void setCapabilities(Set<String> capabilities) {
        this.capabilities = capabilities;
    }

    public boolean hasCapability(String capability) {
        return capabilities.contains(capability.toLowerCase()) || capabilities.contains(capability.toUpperCase());
    }

    public Map<String, ToolConfig> getToolConfigs() {
        return toolConfigs;
    }

    public void setToolConfigs(Map<String, ToolConfig> toolConfigs) {
        this.toolConfigs = toolConfigs;
    }

    public boolean isToolEnabled(String toolName) {
        ToolConfig toolConfig = toolConfigs.get(toolName);
        return toolConfig == null || toolConfig.isEnabled();
    }

    public ToolConfig getToolConfig(String toolName) {
        return toolConfigs.getOrDefault(toolName, new ToolConfig());
    }

    public String mapCategory(String canonicalCategory) {
        return categoryMappings.getOrDefault(canonicalCategory, canonicalCategory);
    }

    public String mapCategory(String toolName, String canonicalCategory) {
        ToolConfig toolConfig = toolConfigs.get(toolName);
        if (toolConfig != null && toolConfig.getCategoryMappings().containsKey(canonicalCategory)) {
            return toolConfig.getCategoryMappings().get(canonicalCategory);
        }
        return categoryMappings.getOrDefault(canonicalCategory, canonicalCategory);
    }

    public String mapField(String toolName, String canonicalField) {
        ToolConfig toolConfig = toolConfigs.get(toolName);
        if (toolConfig != null && toolConfig.getFieldMappings().containsKey(canonicalField)) {
            return toolConfig.getFieldMappings().get(canonicalField);
        }
        return canonicalField;
    }

    @Override
    public String toString() {
        return "ProviderConfig{" +
                "id='" + id + '\'' +
                ", name='" + name + '\'' +
                ", enabled=" + enabled +
                ", capabilities=" + capabilities +
                '}';
    }
}
