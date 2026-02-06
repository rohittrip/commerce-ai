package com.acme.mcp.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;
import java.util.Map;

public class UcpDiscoveryResponse {
    private PlatformInfo platform;
    private List<ToolInfo> tools;
    private List<ProviderInfo> providers;
    private AuthInfo auth;
    @JsonProperty("_meta")
    private Meta meta;

    public static class PlatformInfo {
        private String name;
        private String version;
        private String vendor;
        private List<String> capabilities;
        private Map<String, Object> profile;

        // Constructors
        public PlatformInfo() {}

        public PlatformInfo(String name, String version, String vendor, List<String> capabilities, Map<String, Object> profile) {
            this.name = name;
            this.version = version;
            this.vendor = vendor;
            this.capabilities = capabilities;
            this.profile = profile;
        }

        // Getters and Setters
        public String getName() { return name; }
        public void setName(String name) { this.name = name; }

        public String getVersion() { return version; }
        public void setVersion(String version) { this.version = version; }

        public String getVendor() { return vendor; }
        public void setVendor(String vendor) { this.vendor = vendor; }

        public List<String> getCapabilities() { return capabilities; }
        public void setCapabilities(List<String> capabilities) { this.capabilities = capabilities; }

        public Map<String, Object> getProfile() { return profile; }
        public void setProfile(Map<String, Object> profile) { this.profile = profile; }
    }

    public static class ToolInfo {
        private String name;
        private Boolean enabled;
        private String version;
        @JsonProperty("schema_url")
        private String schemaUrl;
        private String description;

        // Constructors
        public ToolInfo() {}

        public ToolInfo(String name, Boolean enabled, String version, String schemaUrl, String description) {
            this.name = name;
            this.enabled = enabled;
            this.version = version;
            this.schemaUrl = schemaUrl;
            this.description = description;
        }

        // Getters and Setters
        public String getName() { return name; }
        public void setName(String name) { this.name = name; }

        public Boolean getEnabled() { return enabled; }
        public void setEnabled(Boolean enabled) { this.enabled = enabled; }

        public String getVersion() { return version; }
        public void setVersion(String version) { this.version = version; }

        public String getSchemaUrl() { return schemaUrl; }
        public void setSchemaUrl(String schemaUrl) { this.schemaUrl = schemaUrl; }

        public String getDescription() { return description; }
        public void setDescription(String description) { this.description = description; }
    }

    public static class ProviderInfo {
        private String id;
        private String name;
        private Boolean enabled;
        private List<String> capabilities;
        private List<String> categories;
        @JsonProperty("auth_required")
        private Boolean authRequired;

        // Constructors
        public ProviderInfo() {}

        public ProviderInfo(String id, String name, Boolean enabled, List<String> capabilities, List<String> categories, Boolean authRequired) {
            this.id = id;
            this.name = name;
            this.enabled = enabled;
            this.capabilities = capabilities;
            this.categories = categories;
            this.authRequired = authRequired;
        }

        // Getters and Setters
        public String getId() { return id; }
        public void setId(String id) { this.id = id; }

        public String getName() { return name; }
        public void setName(String name) { this.name = name; }

        public Boolean getEnabled() { return enabled; }
        public void setEnabled(Boolean enabled) { this.enabled = enabled; }

        public List<String> getCapabilities() { return capabilities; }
        public void setCapabilities(List<String> capabilities) { this.capabilities = capabilities; }

        public List<String> getCategories() { return categories; }
        public void setCategories(List<String> categories) { this.categories = categories; }

        public Boolean getAuthRequired() { return authRequired; }
        public void setAuthRequired(Boolean authRequired) { this.authRequired = authRequired; }
    }

    public static class AuthInfo {
        private Boolean required;
        private String type;
        @JsonProperty("token_endpoint")
        private String tokenEndpoint;

        // Constructors
        public AuthInfo() {}

        public AuthInfo(Boolean required, String type, String tokenEndpoint) {
            this.required = required;
            this.type = type;
            this.tokenEndpoint = tokenEndpoint;
        }

        // Getters and Setters
        public Boolean getRequired() { return required; }
        public void setRequired(Boolean required) { this.required = required; }

        public String getType() { return type; }
        public void setType(String type) { this.type = type; }

        public String getTokenEndpoint() { return tokenEndpoint; }
        public void setTokenEndpoint(String tokenEndpoint) { this.tokenEndpoint = tokenEndpoint; }
    }

    public static class Meta {
        private UcpMeta ucp;

        public static class UcpMeta {
            private String version;
            private String profile;
            @JsonProperty("compliance_level")
            private String complianceLevel;

            // Constructors
            public UcpMeta() {}

            public UcpMeta(String version, String profile, String complianceLevel) {
                this.version = version;
                this.profile = profile;
                this.complianceLevel = complianceLevel;
            }

            // Getters and Setters
            public String getVersion() { return version; }
            public void setVersion(String version) { this.version = version; }

            public String getProfile() { return profile; }
            public void setProfile(String profile) { this.profile = profile; }

            public String getComplianceLevel() { return complianceLevel; }
            public void setComplianceLevel(String complianceLevel) { this.complianceLevel = complianceLevel; }
        }

        // Constructors
        public Meta() {}

        public Meta(UcpMeta ucp) {
            this.ucp = ucp;
        }

        // Getters and Setters
        public UcpMeta getUcp() { return ucp; }
        public void setUcp(UcpMeta ucp) { this.ucp = ucp; }
    }

    // Constructors
    public UcpDiscoveryResponse() {}

    public UcpDiscoveryResponse(PlatformInfo platform, List<ToolInfo> tools, List<ProviderInfo> providers, AuthInfo auth, Meta meta) {
        this.platform = platform;
        this.tools = tools;
        this.providers = providers;
        this.auth = auth;
        this.meta = meta;
    }

    // Getters and Setters
    public PlatformInfo getPlatform() { return platform; }
    public void setPlatform(PlatformInfo platform) { this.platform = platform; }

    public List<ToolInfo> getTools() { return tools; }
    public void setTools(List<ToolInfo> tools) { this.tools = tools; }

    public List<ProviderInfo> getProviders() { return providers; }
    public void setProviders(List<ProviderInfo> providers) { this.providers = providers; }

    public AuthInfo getAuth() { return auth; }
    public void setAuth(AuthInfo auth) { this.auth = auth; }

    public Meta getMeta() { return meta; }
    public void setMeta(Meta meta) { this.meta = meta; }
}
