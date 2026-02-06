package com.acme.mcp.config;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.sql.Array;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class ProviderConfigService {
    private static final Logger logger = LoggerFactory.getLogger(ProviderConfigService.class);
    private static final ObjectMapper mapper = new ObjectMapper();
    
    private final JdbcTemplate jdbcTemplate;
    private final Map<String, ProviderConfig> configCache = new ConcurrentHashMap<>();
    private long lastLoadTime = 0;
    private static final long CACHE_TTL = 60000; // 1 minute

    public ProviderConfigService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<ProviderConfig> getAllProviderConfigs() {
        long now = System.currentTimeMillis();
        if (!configCache.isEmpty() && (now - lastLoadTime) < CACHE_TTL) {
            return new ArrayList<>(configCache.values());
        }

        try {
            String sql = "SELECT id, name, type, base_url, enabled, config, field_mappings, category_mappings, capabilities, tool_configs " +
                        "FROM providers ORDER BY priority, name";
            
            List<ProviderConfig> configs = jdbcTemplate.query(sql, this::mapRowToProviderConfig);
            
            configCache.clear();
            for (ProviderConfig config : configs) {
                configCache.put(config.getId(), config);
            }
            lastLoadTime = now;
            
            logger.info("Loaded {} provider configurations from database", configs.size());
            return configs;
        } catch (Exception e) {
            logger.error("Failed to load provider configurations", e);
            return new ArrayList<>(configCache.values()); // Return cached on error
        }
    }

    public ProviderConfig getProviderConfig(String providerId) {
        if (configCache.isEmpty() || (System.currentTimeMillis() - lastLoadTime) >= CACHE_TTL) {
            getAllProviderConfigs();
        }
        return configCache.get(providerId);
    }

    public List<ProviderConfig> getEnabledProviders() {
        return getAllProviderConfigs().stream()
                .filter(ProviderConfig::isEnabled)
                .toList();
    }

    public List<ProviderConfig> getProvidersWithCapability(String capability) {
        return getEnabledProviders().stream()
                .filter(p -> p.hasCapability(capability))
                .toList();
    }

    private ProviderConfig mapRowToProviderConfig(ResultSet rs, int rowNum) throws SQLException {
        ProviderConfig config = new ProviderConfig();
        config.setId(rs.getString("id"));
        config.setName(rs.getString("name"));
        config.setType(rs.getString("type"));
        config.setBaseUrl(rs.getString("base_url"));
        config.setEnabled(rs.getBoolean("enabled"));

        // Parse config JSON
        String configJson = rs.getString("config");
        if (configJson != null && !configJson.isEmpty()) {
            try {
                JsonNode configNode = mapper.readTree(configJson);
                config.setConfig(mapper.convertValue(configNode, Map.class));
            } catch (Exception e) {
                logger.warn("Failed to parse config JSON for provider {}", config.getId(), e);
            }
        }

        // Parse field_mappings JSON
        String fieldMappingsJson = rs.getString("field_mappings");
        if (fieldMappingsJson != null && !fieldMappingsJson.isEmpty()) {
            try {
                JsonNode fieldMappingsNode = mapper.readTree(fieldMappingsJson);
                Map<String, Map<String, String>> fieldMappings = new HashMap<>();
                fieldMappingsNode.fields().forEachRemaining(entry -> {
                    String category = entry.getKey();
                    JsonNode fields = entry.getValue();
                    Map<String, String> fieldMap = mapper.convertValue(fields, Map.class);
                    fieldMappings.put(category, fieldMap);
                });
                config.setFieldMappings(fieldMappings);
            } catch (Exception e) {
                logger.warn("Failed to parse field_mappings JSON for provider {}", config.getId(), e);
            }
        }

        // Parse category_mappings JSON
        String categoryMappingsJson = rs.getString("category_mappings");
        if (categoryMappingsJson != null && !categoryMappingsJson.isEmpty()) {
            try {
                JsonNode categoryMappingsNode = mapper.readTree(categoryMappingsJson);
                Map<String, String> categoryMappings = mapper.convertValue(categoryMappingsNode, Map.class);
                config.setCategoryMappings(categoryMappings);
            } catch (Exception e) {
                logger.warn("Failed to parse category_mappings JSON for provider {}", config.getId(), e);
            }
        }

        // Parse capabilities array
        Array capabilitiesArray = rs.getArray("capabilities");
        if (capabilitiesArray != null) {
            try {
                String[] capabilities = (String[]) capabilitiesArray.getArray();
                config.setCapabilities(new HashSet<>(Arrays.asList(capabilities)));
            } catch (Exception e) {
                logger.warn("Failed to parse capabilities array for provider {}", config.getId(), e);
            }
        }

        // Parse tool_configs JSON
        String toolConfigsJson = rs.getString("tool_configs");
        if (toolConfigsJson != null && !toolConfigsJson.isEmpty()) {
            try {
                JsonNode toolConfigsNode = mapper.readTree(toolConfigsJson);
                Map<String, ProviderConfig.ToolConfig> toolConfigs = new HashMap<>();
                
                toolConfigsNode.fields().forEachRemaining(entry -> {
                    String toolName = entry.getKey();
                    JsonNode toolConfigNode = entry.getValue();
                    
                    try {
                        ProviderConfig.ToolConfig toolConfig = new ProviderConfig.ToolConfig();
                        toolConfig.setEnabled(toolConfigNode.path("enabled").asBoolean(true));
                        toolConfig.setPath(toolConfigNode.path("path").asText(null));
                        toolConfig.setMethod(toolConfigNode.path("method").asText(null));
                        toolConfig.setDescription(toolConfigNode.path("description").asText(null));
                        
                        // Parse mappings within tool config
                        if (toolConfigNode.has("mappings")) {
                            JsonNode mappingsNode = toolConfigNode.get("mappings");
                            
                            if (mappingsNode.has("fieldMappings")) {
                                Map<String, String> fieldMappings = mapper.convertValue(
                                    mappingsNode.get("fieldMappings"), Map.class);
                                toolConfig.setFieldMappings(fieldMappings);
                            }
                            
                            if (mappingsNode.has("categoryMappings")) {
                                Map<String, String> categoryMappings = mapper.convertValue(
                                    mappingsNode.get("categoryMappings"), Map.class);
                                toolConfig.setCategoryMappings(categoryMappings);
                            }
                        }
                        
                        toolConfigs.put(toolName, toolConfig);
                    } catch (Exception e) {
                        logger.warn("Failed to parse tool config {} for provider {}", 
                            toolName, config.getId(), e);
                    }
                });
                
                config.setToolConfigs(toolConfigs);
                logger.debug("Loaded {} tool configs for provider {}", toolConfigs.size(), config.getId());
            } catch (Exception e) {
                logger.warn("Failed to parse tool_configs JSON for provider {}", config.getId(), e);
            }
        }

        return config;
    }

    public void clearCache() {
        configCache.clear();
        lastLoadTime = 0;
    }
}
