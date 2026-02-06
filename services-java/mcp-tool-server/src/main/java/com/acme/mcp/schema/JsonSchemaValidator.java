package com.acme.mcp.schema;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.github.fge.jsonschema.core.exceptions.ProcessingException;
import com.github.fge.jsonschema.core.report.ProcessingReport;
import com.github.fge.jsonschema.main.JsonSchema;
import com.github.fge.jsonschema.main.JsonSchemaFactory;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class JsonSchemaValidator {
    private static final Logger logger = LoggerFactory.getLogger(JsonSchemaValidator.class);
    private final Map<String, JsonSchema> schemaCache = new ConcurrentHashMap<>();
    private final JsonSchemaFactory factory = JsonSchemaFactory.byDefault();
    private final ObjectMapper objectMapper;

    public JsonSchemaValidator(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public boolean validate(String schemaName, Object data) {
        try {
            JsonSchema schema = getSchema(schemaName);
            JsonNode dataNode = objectMapper.valueToTree(data);
            ProcessingReport report = schema.validate(dataNode);

            if (!report.isSuccess()) {
                logger.warn("Validation failed for schema {}: {}", schemaName, report);
                return false;
            }
            return true;
        } catch (Exception e) {
            logger.error("Schema validation error for {}", schemaName, e);
            return false;
        }
    }

    private JsonSchema getSchema(String schemaName) throws IOException, ProcessingException {
        return schemaCache.computeIfAbsent(schemaName, name -> {
            try {
                ClassPathResource resource = new ClassPathResource("schemas/" + name);
                String schemaContent;
                try (InputStream is = resource.getInputStream()) {
                    schemaContent = new String(is.readAllBytes(), StandardCharsets.UTF_8);
                }
                JsonNode schemaNode = objectMapper.readTree(schemaContent);
                return factory.getJsonSchema(schemaNode);
            } catch (Exception e) {
                logger.error("Failed to load schema: {}", name, e);
                throw new RuntimeException("Schema load failed: " + name, e);
            }
        });
    }
}
