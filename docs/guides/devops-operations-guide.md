# DevOps Operations Guide

## Overview

This guide covers DevOps operations for the SaleSpot BY platform, including deployment, monitoring, and maintenance procedures.

## Infrastructure Components

### Core Services

- **API Gateway**: Kong/NGINX
- **Application Server**: Node.js/NestJS
- **Database**: PostgreSQL with Redis cache
- **Message Queue**: RabbitMQ
- **Monitoring**: Prometheus + Grafana
- **Logging**: ELK Stack (Elasticsearch, Logstash, Kibana)
- **CI/CD**: GitLab CI/CD

### Cloud Infrastructure

- **Primary**: AWS (Moscow region)
- **Secondary**: Yandex Cloud (Moscow region)
- **Backup**: VK Cloud (Moscow region)
- **CDN**: CloudFront + Lambda@Edge

## Deployment Procedures

### 1. Environment Setup

```bash
# Development
cd /home/boss/Projects/dev && kubectl config use-context dev-cluster

# Staging
cd /home/boss/Projects/dev && kubectl config use-context staging-cluster

# Production
cd /home/boss/Projects/dev && kubectl config use-context prod-cluster
```

### 2. Application Deployment

```bash
# Build and push image
cd /home/boss/Projects/dev && docker build -t salespot/api:latest .
cd /home/boss/Projects/dev && docker push salespot/api:latest

# Deploy to Kubernetes
cd /home/boss/Projects/dev && kubectl apply -f k8s/
cd /home/boss/Projects/dev && kubectl rollout status deployment/api
```

### 3. Database Migrations

```bash
# Run migrations
cd /home/boss/Projects/dev && kubectl exec -it deployment/api -- npm run migration:run

# Rollback if needed
cd /home/boss/Projects/dev && kubectl exec -it deployment/api -- npm run migration:revert
```

## Monitoring and Alerting

### Key Metrics

- **Application**: Response time, error rate, throughput
- **Infrastructure**: CPU, memory, disk, network
- **Database**: Connection pool, query performance
- **Business**: Active users, transactions, revenue

### Alert Rules

```yaml
# High error rate
- alert: HighErrorRate
  expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
  for: 2m
  labels:
    severity: critical
  annotations:
    summary: 'High error rate detected'

# High response time
- alert: HighResponseTime
  expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: 'High response time detected'
```

### Dashboard Queries

```promql
# Request rate
rate(http_requests_total[5m])

# Error rate
rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m])

# Response time P95
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))
```

## Log Management

### Log Levels

- **ERROR**: System errors, exceptions
- **WARN**: Warning conditions
- **INFO**: General information
- **DEBUG**: Detailed debugging information

### Log Queries

```bash
# Search for errors
cd /home/boss/Projects/dev && kubectl logs -l app=api --since=1h | grep ERROR

# Search for specific user
cd /home/boss/Projects/dev && kubectl logs -l app=api | grep "user_id:12345"

# Search for performance issues
cd /home/boss/Projects/dev && kubectl logs -l app=api | grep "slow query"
```

## Security Operations

### SSL/TLS Management

```bash
# Check certificate expiration
cd /home/boss/Projects/dev && kubectl get secrets -o jsonpath='{.items[*].data.tls\.crt}' | base64 -d | openssl x509 -noout -dates

# Renew certificate
cd /home/boss/Projects/dev && kubectl apply -f k8s/cert-manager/
```

### Security Scanning

```bash
# Scan for vulnerabilities
cd /home/boss/Projects/dev && docker scan salespot/api:latest

# Check for secrets
cd /home/boss/Projects/dev && kubectl get secrets --all-namespaces
```

## Backup and Recovery

### Database Backups

```bash
# Create backup
cd /home/boss/Projects/dev && kubectl exec -it deployment/postgres -- pg_dump -U postgres salespot > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore backup
cd /home/boss/Projects/dev && kubectl exec -i deployment/postgres -- psql -U postgres salespot < backup_20240101_120000.sql
```

### Application Backups

```bash
# Backup configuration
cd /home/boss/Projects/dev && kubectl get configmaps -o yaml > configmaps_backup.yaml

# Backup secrets
cd /home/boss/Projects/dev && kubectl get secrets -o yaml > secrets_backup.yaml
```

## Performance Optimization

### Database Optimization

```sql
-- Check slow queries
SELECT query, mean_time, calls
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

-- Check index usage
SELECT schemaname, tablename, attname, n_distinct, correlation
FROM pg_stats
WHERE schemaname = 'public';
```

### Application Optimization

```bash
# Check memory usage
cd /home/boss/Projects/dev && kubectl top pods -l app=api

# Check CPU usage
cd /home/boss/Projects/dev && kubectl top nodes

# Scale deployment
cd /home/boss/Projects/dev && kubectl scale deployment api --replicas=5
```

## Troubleshooting

### Common Issues

1. **High Memory Usage**

   ```bash
   cd /home/boss/Projects/dev && kubectl describe pod <pod-name>
   cd /home/boss/Projects/dev && kubectl logs <pod-name> --previous
   ```

2. **Database Connection Issues**

   ```bash
   cd /home/boss/Projects/dev && kubectl exec -it deployment/postgres -- psql -U postgres -c "SELECT * FROM pg_stat_activity;"
   ```

3. **Network Issues**
   ```bash
   cd /home/boss/Projects/dev && kubectl get services
   cd /home/boss/Projects/dev && kubectl get ingress
   ```

### Debug Commands

```bash
# Check pod status
cd /home/boss/Projects/dev && kubectl get pods -o wide

# Check service endpoints
cd /home/boss/Projects/dev && kubectl get endpoints

# Check ingress
cd /home/boss/Projects/dev && kubectl describe ingress api-ingress

# Check events
cd /home/boss/Projects/dev && kubectl get events --sort-by=.metadata.creationTimestamp
```

## Maintenance Procedures

### Regular Maintenance

- **Daily**: Check system health, review alerts
- **Weekly**: Review performance metrics, update dependencies
- **Monthly**: Security patches, backup verification
- **Quarterly**: Capacity planning, disaster recovery testing

### Update Procedures

```bash
# Update application
cd /home/boss/Projects/dev && kubectl set image deployment/api api=salespot/api:v2.0.0
cd /home/boss/Projects/dev && kubectl rollout status deployment/api

# Update infrastructure
cd /home/boss/Projects/dev && kubectl apply -f k8s/updated/
```

## Emergency Procedures

### Incident Response

1. **Assess**: Determine severity and impact
2. **Communicate**: Notify stakeholders
3. **Contain**: Isolate affected systems
4. **Resolve**: Fix the issue
5. **Recover**: Restore normal operations
6. **Review**: Post-incident analysis

### Rollback Procedures

```bash
# Rollback deployment
cd /home/boss/Projects/dev && kubectl rollout undo deployment/api

# Rollback to specific version
cd /home/boss/Projects/dev && kubectl rollout undo deployment/api --to-revision=2
```

## Best Practices

### Code Quality

- Use automated testing
- Implement code reviews
- Follow coding standards
- Use static analysis tools

### Security

- Regular security scans
- Keep dependencies updated
- Use least privilege principle
- Implement proper logging

### Monitoring

- Set up comprehensive monitoring
- Use meaningful alert thresholds
- Regular review of metrics
- Document incident procedures

## Tools and Resources

### Monitoring Tools

- **Prometheus**: Metrics collection
- **Grafana**: Visualization
- **ELK Stack**: Log analysis
- **Jaeger**: Distributed tracing

### Development Tools

- **GitLab CI/CD**: Continuous integration
- **Docker**: Containerization
- **Kubernetes**: Orchestration
- **Terraform**: Infrastructure as code

### Documentation

- **API Documentation**: OpenAPI/Swagger
- **Architecture**: System design documents
- **Runbooks**: Operational procedures
- **Incident Reports**: Post-mortem analysis
