package com.acme.mcp.service;

import com.acme.shared.ToolError;
import com.acme.shared.ToolResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.*;

@Service
public class ThinkingService {
    private static final Logger logger = LoggerFactory.getLogger(ThinkingService.class);
    private final JdbcTemplate jdbcTemplate;

    public ThinkingService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public ToolResponse<Map<String, Object>> createChainRun(Map<String, Object> request) {
        try {
            String sessionId = (String) request.get("sessionId");
            String userId = (String) request.get("userId");
            String traceId = (String) request.get("traceId");
            String problem = (String) request.get("problem");

            if (sessionId == null || userId == null || problem == null) {
                return ToolResponse.failure(null,
                    new ToolError(ToolError.Code.VALIDATION_ERROR, "Missing required fields"));
            }

            String runId = UUID.randomUUID().toString();
            Map<String, Object> meta = new HashMap<>();
            meta.put("problem", problem);
            meta.put("stages", Arrays.asList("analyze", "breakdown", "solve", "verify"));

            // Insert chain run
            jdbcTemplate.update(
                "INSERT INTO chain_runs (id, session_id, user_id, trace_id, status, meta_json, created_at, updated_at) " +
                "VALUES (?, ?, ?, ?, ?, ?::jsonb, ?, ?)",
                runId, sessionId, userId, traceId, "running",
                convertToJson(meta), Instant.now(), Instant.now()
            );

            logger.info("Created chain run: {}", runId);

            Map<String, Object> result = new HashMap<>();
            result.put("runId", runId);
            result.put("status", "running");
            result.put("stages", meta.get("stages"));

            return ToolResponse.success(traceId, result);
        } catch (Exception e) {
            logger.error("Failed to create chain run", e);
            return ToolResponse.failure(null,
                new ToolError(ToolError.Code.INTERNAL_ERROR, e.getMessage()));
        }
    }

    public ToolResponse<Map<String, Object>> addChainStep(Map<String, Object> request) {
        try {
            String runId = (String) request.get("runId");
            Integer stepIndex = (Integer) request.get("stepIndex");
            String stage = (String) request.get("stage");
            String traceId = (String) request.get("traceId");
            Map<String, Object> content = (Map<String, Object>) request.get("content");

            if (runId == null || stepIndex == null || stage == null || content == null) {
                return ToolResponse.failure(null,
                    new ToolError(ToolError.Code.VALIDATION_ERROR, "Missing required fields"));
            }

            String stepId = UUID.randomUUID().toString();

            // Insert chain step
            jdbcTemplate.update(
                "INSERT INTO chain_steps (id, run_id, step_index, stage, content_json, created_at) " +
                "VALUES (?, ?, ?, ?, ?::jsonb, ?)",
                stepId, runId, stepIndex, stage, convertToJson(content), Instant.now()
            );

            logger.info("Added chain step: {} for run: {}", stepId, runId);

            Map<String, Object> result = new HashMap<>();
            result.put("stepId", stepId);
            result.put("runId", runId);
            result.put("stepIndex", stepIndex);
            result.put("stage", stage);

            return ToolResponse.success(traceId, result);
        } catch (Exception e) {
            logger.error("Failed to add chain step", e);
            return ToolResponse.failure(null,
                new ToolError(ToolError.Code.INTERNAL_ERROR, e.getMessage()));
        }
    }

    public ToolResponse<Map<String, Object>> completeChainRun(Map<String, Object> request) {
        try {
            String runId = (String) request.get("runId");
            String status = (String) request.getOrDefault("status", "completed");
            String traceId = (String) request.get("traceId");

            if (runId == null) {
                return ToolResponse.failure(null,
                    new ToolError(ToolError.Code.VALIDATION_ERROR, "Missing runId"));
            }

            // Update chain run status
            jdbcTemplate.update(
                "UPDATE chain_runs SET status = ?, updated_at = ? WHERE id = ?",
                status, Instant.now(), runId
            );

            logger.info("Completed chain run: {} with status: {}", runId, status);

            // Get all steps
            List<Map<String, Object>> steps = jdbcTemplate.queryForList(
                "SELECT step_index, stage, content_json FROM chain_steps WHERE run_id = ? ORDER BY step_index",
                runId
            );

            Map<String, Object> result = new HashMap<>();
            result.put("runId", runId);
            result.put("status", status);
            result.put("stepCount", steps.size());

            return ToolResponse.success(traceId, result);
        } catch (Exception e) {
            logger.error("Failed to complete chain run", e);
            return ToolResponse.failure(null,
                new ToolError(ToolError.Code.INTERNAL_ERROR, e.getMessage()));
        }
    }

    private String convertToJson(Object obj) {
        try {
            // Simple JSON conversion - in production use Jackson ObjectMapper
            if (obj instanceof Map) {
                StringBuilder sb = new StringBuilder("{");
                Map<String, Object> map = (Map<String, Object>) obj;
                int i = 0;
                for (Map.Entry<String, Object> entry : map.entrySet()) {
                    if (i > 0) sb.append(",");
                    sb.append("\"").append(entry.getKey()).append("\":");
                    if (entry.getValue() instanceof String) {
                        sb.append("\"").append(entry.getValue()).append("\"");
                    } else if (entry.getValue() instanceof List) {
                        sb.append("[");
                        List<?> list = (List<?>) entry.getValue();
                        for (int j = 0; j < list.size(); j++) {
                            if (j > 0) sb.append(",");
                            if (list.get(j) instanceof String) {
                                sb.append("\"").append(list.get(j)).append("\"");
                            } else {
                                sb.append(list.get(j));
                            }
                        }
                        sb.append("]");
                    } else {
                        sb.append(entry.getValue());
                    }
                    i++;
                }
                sb.append("}");
                return sb.toString();
            }
            return "{}";
        } catch (Exception e) {
            logger.error("Failed to convert to JSON", e);
            return "{}";
        }
    }
}
