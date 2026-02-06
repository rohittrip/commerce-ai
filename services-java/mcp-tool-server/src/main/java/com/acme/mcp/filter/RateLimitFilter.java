package com.acme.mcp.filter;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.BucketConfiguration;
import io.github.bucket4j.Refill;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.annotation.Order;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
@Order(1)
public class RateLimitFilter extends OncePerRequestFilter {
    private static final Logger logger = LoggerFactory.getLogger(RateLimitFilter.class);

    @Value("${ratelimit.enabled:true}")
    private boolean rateLimitEnabled;

    @Value("${ratelimit.requests-per-minute-per-user:100}")
    private int requestsPerMinutePerUser;

    @Value("${ratelimit.requests-per-minute-per-ip:200}")
    private int requestsPerMinutePerIp;

    // In-memory bucket storage - use Redis for distributed systems
    private final Map<String, Bucket> userBuckets = new ConcurrentHashMap<>();
    private final Map<String, Bucket> ipBuckets = new ConcurrentHashMap<>();

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        if (!rateLimitEnabled) {
            filterChain.doFilter(request, response);
            return;
        }

        // Get user ID from authentication context
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String userId = authentication != null && authentication.isAuthenticated()
            ? (String) authentication.getPrincipal()
            : null;

        // Get client IP
        String clientIp = getClientIp(request);

        // Check user rate limit
        if (userId != null) {
            Bucket userBucket = userBuckets.computeIfAbsent(userId, k -> createUserBucket());
            if (!userBucket.tryConsume(1)) {
                logger.warn("Rate limit exceeded for user: {}", userId);
                sendRateLimitResponse(response, "User rate limit exceeded");
                return;
            }
        }

        // Check IP rate limit
        Bucket ipBucket = ipBuckets.computeIfAbsent(clientIp, k -> createIpBucket());
        if (!ipBucket.tryConsume(1)) {
            logger.warn("Rate limit exceeded for IP: {}", clientIp);
            sendRateLimitResponse(response, "IP rate limit exceeded");
            return;
        }

        filterChain.doFilter(request, response);
    }

    private Bucket createUserBucket() {
        Bandwidth limit = Bandwidth.classic(
            requestsPerMinutePerUser,
            Refill.intervally(requestsPerMinutePerUser, Duration.ofMinutes(1))
        );
        return Bucket.builder()
            .addLimit(limit)
            .build();
    }

    private Bucket createIpBucket() {
        Bandwidth limit = Bandwidth.classic(
            requestsPerMinutePerIp,
            Refill.intervally(requestsPerMinutePerIp, Duration.ofMinutes(1))
        );
        return Bucket.builder()
            .addLimit(limit)
            .build();
    }

    private String getClientIp(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            return xForwardedFor.split(",")[0].trim();
        }

        String xRealIp = request.getHeader("X-Real-IP");
        if (xRealIp != null && !xRealIp.isEmpty()) {
            return xRealIp;
        }

        return request.getRemoteAddr();
    }

    private void sendRateLimitResponse(HttpServletResponse response, String message) throws IOException {
        response.setStatus(429); // Too Many Requests
        response.setContentType("application/json");
        response.getWriter().write(String.format(
            "{\"ok\": false, \"error\": {\"code\": \"RATE_LIMIT\", \"message\": \"%s\"}}",
            message
        ));
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        return path.startsWith("/actuator/health") || path.startsWith("/.well-known/");
    }
}
