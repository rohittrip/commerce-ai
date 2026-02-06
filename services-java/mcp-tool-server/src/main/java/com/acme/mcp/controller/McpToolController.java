package com.acme.mcp.controller;

import com.acme.mcp.registry.ToolMetadata;
import com.acme.mcp.registry.ToolRegistry;
import com.acme.shared.ToolResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/tools")
public class McpToolController {
    private static final Logger logger = LoggerFactory.getLogger(McpToolController.class);
    private final ToolRegistry toolRegistry;

    public McpToolController(ToolRegistry toolRegistry) {
        this.toolRegistry = toolRegistry;
    }

    @GetMapping
    public ResponseEntity<Map<String, ToolMetadata>> listTools() {
        logger.info("Listing all tools");
        return ResponseEntity.ok(toolRegistry.getAllTools());
    }

    @PostMapping("/execute/{toolName}")
    public ResponseEntity<ToolResponse<?>> executeTool(
            @PathVariable String toolName,
            @RequestBody Map<String, Object> request,
            @RequestHeader(value = "X-Trace-Id", required = false) String traceId) {
        
        logger.info("Executing tool: {} with traceId: {}", toolName, traceId);
        ToolResponse<?> response = toolRegistry.executeTool(toolName, request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> health() {
        return ResponseEntity.ok(Map.of("status", "UP", "service", "mcp-tool-server"));
    }
}
