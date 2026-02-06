# Deployment & Operations Guide

Complete guide for deploying, testing, and operating the Commerce AI Admin Panel.

---

## Deployment Options

### 1. Docker Compose (Recommended)

**Complete Stack:**

```bash
# From project root
docker-compose up --build

# Services available:
# - Admin UI:    http://localhost:3001
# - BFF API:     http://localhost:3000
# - Tool Server: http://localhost:8081
```

**Admin UI Only:**

```bash
docker-compose up --build admin-ui
```

**Production Mode:**

```bash
docker-compose up -d --build
docker-compose ps
docker-compose logs -f admin-ui
```

### 2. Standalone Docker

**Build:**

```bash
cd apps/admin-ui
docker build -t commerce-ai-admin:latest .
```

**Run:**

```bash
docker run -d \
  --name admin-ui \
  -p 3001:80 \
  commerce-ai-admin:latest
```

**With Custom API URL:**

```bash
docker build \
  --build-arg VITE_API_BASE_URL=https://api.example.com \
  -t commerce-ai-admin:latest .
```

### 3. Kubernetes

**deployment.yaml:**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: admin-ui
spec:
  replicas: 3
  selector:
    matchLabels:
      app: admin-ui
  template:
    metadata:
      labels:
        app: admin-ui
    spec:
      containers:
      - name: admin-ui
        image: commerce-ai-admin:latest
        ports:
        - containerPort: 80
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "200m"
        livenessProbe:
          httpGet:
            path: /
            port: 80
          initialDelaySeconds: 10
        readinessProbe:
          httpGet:
            path: /
            port: 80
          initialDelaySeconds: 5
```

**service.yaml:**

```yaml
apiVersion: v1
kind: Service
metadata:
  name: admin-ui
spec:
  selector:
    app: admin-ui
  ports:
  - port: 80
    targetPort: 80
  type: LoadBalancer
```

**ingress.yaml:**

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: admin-ui
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
  - hosts:
    - admin.example.com
    secretName: admin-ui-tls
  rules:
  - host: admin.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: admin-ui
            port:
              number: 80
```

**Deploy:**

```bash
kubectl apply -f deployment.yaml
kubectl apply -f service.yaml
kubectl apply -f ingress.yaml
```

### 4. Cloud Platforms

**AWS (ECS + ALB):**

```bash
# Push to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account>.dkr.ecr.us-east-1.amazonaws.com
docker tag commerce-ai-admin:latest <account>.dkr.ecr.us-east-1.amazonaws.com/admin-ui:latest
docker push <account>.dkr.ecr.us-east-1.amazonaws.com/admin-ui:latest

# Create ECS service via console or CLI
```

**Google Cloud Run:**

```bash
gcloud builds submit --tag gcr.io/PROJECT_ID/admin-ui
gcloud run deploy admin-ui \
  --image gcr.io/PROJECT_ID/admin-ui \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

**Azure Container Apps:**

```bash
az containerapp create \
  --name admin-ui \
  --resource-group commerce-ai \
  --image commerce-ai-admin:latest \
  --target-port 80 \
  --ingress external
```

### 5. Static Hosting (CDN)

**Build Static Files:**

```bash
npm run build
# Output in dist/
```

**Deploy to Vercel:**

```bash
npm install -g vercel
vercel deploy --prod
```

**Deploy to Netlify:**

```bash
npm install -g netlify-cli
netlify deploy --prod --dir=dist
```

**Deploy to S3 + CloudFront:**

```bash
aws s3 sync dist/ s3://admin-ui-bucket/ --delete
aws cloudfront create-invalidation --distribution-id XXXXX --paths "/*"
```

---

## Production Configuration

### Nginx (Production)

```nginx
server {
    listen 443 ssl http2;
    server_name admin.example.com;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    root /usr/share/nginx/html;
    index index.html;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000" always;

    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API proxy
    location /v1/ {
        proxy_pass https://api.example.com;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;
}

# HTTP to HTTPS redirect
server {
    listen 80;
    server_name admin.example.com;
    return 301 https://$server_name$request_uri;
}
```

### Environment Variables

**Development:**

```bash
VITE_API_BASE_URL=http://localhost:3000
```

**Staging:**

```bash
VITE_API_BASE_URL=https://api-staging.example.com
```

**Production:**

```bash
VITE_API_BASE_URL=https://api.example.com
```

---

## Testing

### Manual Testing Checklist

**Authentication:**
- [ ] Login page loads
- [ ] Valid login redirects to dashboard
- [ ] Invalid login shows error
- [ ] Token persists on refresh
- [ ] Logout clears token and redirects
- [ ] Protected routes redirect to login

**Navigation:**
- [ ] All menu items clickable
- [ ] Active page highlighted
- [ ] Mobile hamburger menu works
- [ ] Drawer closes after navigation (mobile)

**Dashboard:**
- [ ] Stats cards display correctly
- [ ] Charts render without errors
- [ ] Recent activity shows
- [ ] Responsive on mobile

**LLM Config:**
- [ ] Both provider forms load
- [ ] Provider/model dropdowns work
- [ ] Temperature validation works
- [ ] Save button updates config
- [ ] Success notification shows

**Taxonomy:**
- [ ] Category list displays
- [ ] Category selection works
- [ ] Keywords display as chips
- [ ] Add keyword works
- [ ] Delete keyword works
- [ ] Save changes persists data

**Providers:**
- [ ] Provider list displays
- [ ] Provider selection works
- [ ] All 5 tabs accessible
- [ ] Enable/disable toggle works
- [ ] Capability toggles work
- [ ] Category mapping add/delete works
- [ ] Field mapping add/delete works
- [ ] Save mappings persists data
- [ ] Test connection works
- [ ] Statistics load correctly

**Tool Tester:**
- [ ] Tool dropdown works
- [ ] Request JSON editable
- [ ] Test button executes
- [ ] Response displays correctly
- [ ] Error handling works

**Monitoring:**
- [ ] All 3 tabs load
- [ ] Data grids display data
- [ ] Sorting works
- [ ] Pagination works

**Users:**
- [ ] User table displays
- [ ] All columns visible
- [ ] Role badges show
- [ ] Sorting works

**Theme:**
- [ ] Light theme displays correctly
- [ ] Dark theme displays correctly
- [ ] Toggle switches themes
- [ ] Preference persists

**Responsive:**
- [ ] Mobile layout (< 600px)
- [ ] Tablet layout (600-900px)
- [ ] Desktop layout (> 900px)
- [ ] Touch controls work on mobile

### Browser Testing

Test on:
- [ ] Chrome 120+
- [ ] Firefox 120+
- [ ] Safari 17+
- [ ] Edge 120+
- [ ] Mobile Safari (iOS)
- [ ] Chrome Android

### Performance Testing

**Lighthouse Audit:**

```bash
# Install Lighthouse CLI
npm install -g lighthouse

# Run audit
lighthouse http://localhost:3001 --view
```

**Target Scores:**
- Performance: 90+
- Accessibility: 90+
- Best Practices: 90+
- SEO: 90+

**Load Testing (k6):**

```javascript
// load-test.js
import http from 'k6/http';
import { check } from 'k6';

export let options = {
  stages: [
    { duration: '2m', target: 100 },
    { duration: '5m', target: 100 },
    { duration: '2m', target: 0 },
  ],
};

export default function () {
  let res = http.get('http://localhost:3001');
  check(res, { 'status 200': (r) => r.status == 200 });
}
```

```bash
k6 run load-test.js
```

---

## Monitoring

### Health Checks

**Docker:**

```yaml
healthcheck:
  test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:80"]
  interval: 30s
  timeout: 10s
  retries: 3
```

**Kubernetes:**

```yaml
livenessProbe:
  httpGet:
    path: /
    port: 80
  initialDelaySeconds: 10
  periodSeconds: 30

readinessProbe:
  httpGet:
    path: /
    port: 80
  initialDelaySeconds: 5
  periodSeconds: 10
```

### Logging

**View Logs:**

```bash
# Docker Compose
docker-compose logs -f admin-ui

# Docker standalone
docker logs -f admin-ui

# Kubernetes
kubectl logs -f deployment/admin-ui
```

**Log Aggregation:**

Configure log forwarding to:
- Elasticsearch + Kibana
- Splunk
- Datadog
- New Relic

### Metrics

**Prometheus Metrics:**

Add nginx-prometheus-exporter for metrics:
- Request count
- Response time
- Error rate
- Active connections

**Application Monitoring:**

Integrate with:
- Google Analytics
- Datadog RUM
- New Relic Browser
- Sentry for errors

---

## Scaling

### Horizontal Scaling

**Docker Compose:**

```bash
docker-compose up --scale admin-ui=3
```

**Kubernetes:**

```bash
kubectl scale deployment admin-ui --replicas=5

# Or auto-scaling
kubectl autoscale deployment admin-ui --min=2 --max=10 --cpu-percent=70
```

### CDN Integration

Use CDN for static assets:
- CloudFront (AWS)
- Cloud CDN (GCP)
- Azure CDN
- Cloudflare

**CloudFront Setup:**

1. Create S3 bucket for static files
2. Upload build files
3. Create CloudFront distribution
4. Point origin to S3
5. Configure custom domain
6. Enable HTTPS with ACM certificate

---

## Security

### Checklist

- [ ] HTTPS enabled
- [ ] Security headers configured
- [ ] CSP policy set
- [ ] CORS restricted to known origins
- [ ] Secrets in environment variables
- [ ] Regular dependency updates
- [ ] Rate limiting enabled
- [ ] WAF configured
- [ ] Regular security scans

### Best Practices

1. **Use HTTPS** - Always use TLS/SSL
2. **Set Security Headers** - X-Frame-Options, CSP, etc.
3. **Update Dependencies** - Run `npm audit` regularly
4. **Rotate Secrets** - Change JWT secrets periodically
5. **Monitor Access** - Log all admin actions
6. **Implement 2FA** - For admin accounts (future)
7. **Rate Limiting** - Prevent brute force attacks
8. **Backup Configs** - Regular configuration backups

---

## Troubleshooting

### Deployment Issues

**Container Won't Start:**

```bash
# Check logs
docker logs admin-ui

# Common issues:
# - Port already in use
# - Missing environment variables
# - Build failed

# Solution:
docker-compose down
docker-compose up --build
```

**502 Bad Gateway:**

```bash
# Check upstream service
curl http://localhost:3000/api

# Check nginx config
docker exec admin-ui nginx -t

# Restart container
docker-compose restart admin-ui
```

**Static Files Not Found:**

```bash
# Verify files in container
docker exec admin-ui ls -la /usr/share/nginx/html

# Rebuild if missing
docker-compose up --build admin-ui
```

### Performance Issues

**Slow Load Times:**

Solutions:
- Enable gzip compression
- Add cache headers
- Use CDN
- Optimize bundle size
- Enable HTTP/2

**High Memory Usage:**

Solutions:
- Reduce container memory limit
- Check for memory leaks
- Optimize React re-renders
- Use production build

---

## Backup & Recovery

### Configuration Backup

```bash
# Backup important files
tar -czf admin-ui-backup-$(date +%Y%m%d).tar.gz \
  .env \
  nginx.conf \
  docker-compose.yml
```

### Disaster Recovery

**Steps:**

1. Restore configuration files
2. Pull latest Docker image
3. Start services
4. Verify health checks
5. Test critical paths

**Recovery Time Objective:** < 15 minutes

---

## Rollback Strategy

### Docker

```bash
# Tag current version
docker tag commerce-ai-admin:latest commerce-ai-admin:backup

# Deploy new version
docker-compose up -d admin-ui

# Rollback if needed
docker tag commerce-ai-admin:backup commerce-ai-admin:latest
docker-compose up -d admin-ui
```

### Kubernetes

```bash
# View rollout history
kubectl rollout history deployment/admin-ui

# Rollback to previous
kubectl rollout undo deployment/admin-ui

# Rollback to specific revision
kubectl rollout undo deployment/admin-ui --to-revision=2
```

---

## Post-Deployment Checklist

- [ ] Application loads successfully
- [ ] Login works
- [ ] All pages accessible
- [ ] API connectivity verified
- [ ] Theme toggle works
- [ ] Responsive design on mobile
- [ ] SSL certificate valid (production)
- [ ] Monitoring enabled
- [ ] Logs collecting
- [ ] Health checks passing
- [ ] Performance acceptable
- [ ] Security headers set
- [ ] CDN configured (if applicable)

---

## Support

**Emergency Contacts:**
- DevOps: devops@example.com
- Backend: backend@example.com
- Frontend: frontend@example.com

**Resources:**
- README.md - User guide
- API Docs: http://localhost:3000/api
- Status Page: status.example.com

**Quick Commands:**

```bash
# Check status
docker-compose ps

# View logs
docker-compose logs -f admin-ui

# Restart
docker-compose restart admin-ui

# Full reset
docker-compose down -v
docker-compose up --build
```

---

**Version:** 1.0.0  
**Last Updated:** January 26, 2026  
**Status:** Production Ready
