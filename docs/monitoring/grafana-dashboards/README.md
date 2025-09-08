# Grafana Dashboards

## Overview

Set of pre-configured Grafana dashboards for system monitoring. All dashboards are ready for import and configuration.

## Dashboards

### 1. System Overview (`system-overview.json`)

**Description**: General system state overview
**Panels**:

- System Health Status - system health status
- CPU Usage - CPU utilization
- Memory Usage - memory utilization
- HTTP Request Rate - HTTP request frequency
- Database Connections - active DB connections
- Redis Memory - Redis memory usage
- Error Rate - error frequency

**Metrics**: `system_health_status`, `cpu_usage_percent`, `memory_usage_bytes`, `http_requests_total`

### 2. API Performance (`api-performance.json`)

**Description**: API performance monitoring
**Panels**:

- Request Duration (95th percentile) - request execution time
- Request Rate by Endpoint - request frequency by endpoints
- Response Status Codes - response codes
- Slow Queries (>1s) - slow queries
- Database Query Duration - DB query execution time
- Cache Hit Rate - cache hit percentage

**Metrics**: `http_request_duration_seconds`, `http_requests_total`, `database_query_duration_seconds`, `cache_hits_total`

### 3. Security Events (`security-events.json`)

**Description**: Security events monitoring
**Panels**:

- Security Incidents by Severity - incidents by severity
- Failed Authentication Attempts - failed auth attempts
- Rate Limiting Violations - rate limiting violations
- Blocked IP Addresses - blocked IPs
- Suspicious Activities - suspicious activity
- Incident Response Status - incident response status
- KMS Operations - KMS operations

**Metrics**: `security_incidents_total`, `auth_failures_total`, `rate_limit_violations_total`, `blocked_ips_total`

### 4. Incident Response (`incident-response.json`)

**Description**: Incident response monitoring
**Panels**:

- Active Incidents - active incidents
- Incident Response Time - response time
- Playbook Executions by Status - playbook executions by status
- Playbook Success Rate - success rate percentage
- Recent Incidents - recent incidents
- Predictive Scaling Events - scaling events
- Scaling Rules Status - scaling rules status

**Metrics**: `incident_response_active_total`, `playbook_executions_total`, `scaling_events_total`

## Installation

### 1. Import Dashboards

1. Open Grafana
2. Go to **Dashboards** → **Import**
3. Upload JSON dashboard file
4. Configure data source (Prometheus)
5. Save dashboard

### 2. Data Source Configuration

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'api'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/metrics'
    scrape_interval: 15s
```

### 3. Environment Variables

```env
PROMETHEUS_ENABLED=true
PROMETHEUS_PORT=9090
PROMETHEUS_PATH=/metrics

GRAFANA_ENABLED=true
GRAFANA_URL=http://localhost:3000
GRAFANA_API_KEY=your-api-key
```

## Metrics

### Core Metrics

- `http_requests_total` - total HTTP requests
- `http_request_duration_seconds` - request execution time
- `cpu_usage_percent` - CPU utilization
- `memory_usage_bytes` - memory usage
- `database_connections_active` - active DB connections
- `redis_memory_used_bytes` - Redis memory usage

### Security Metrics

- `security_incidents_total` - total security incidents
- `auth_failures_total` - failed authentication attempts
- `rate_limit_violations_total` - rate limiting violations
- `blocked_ips_total` - blocked IP addresses

### Incident Metrics

- `incident_response_active_total` - active incidents
- `playbook_executions_total` - playbook executions
- `scaling_events_total` - scaling events

## Alert Configuration

### Critical Alerts

1. **High CPU load** (>90% for 5 minutes)
2. **High memory usage** (>95% for 3 minutes)
3. **Database errors** (>5% for 1 minute)
4. **Critical security errors**

### Warnings

1. **Medium CPU load** (>70% for 10 minutes)
2. **Slow requests** (>1 second for 10 minutes)
3. **High error count** (>1% for 5 minutes)

## Customization

### Adding New Panels

1. Open dashboard in edit mode
2. Click **Add Panel**
3. Select panel type
4. Configure Prometheus query
5. Save panel

### Creating New Dashboards

1. Create new dashboard
2. Add required panels
3. Export to JSON
4. Add to repository

## Troubleshooting

### Metrics Issues

1. **Metrics not displaying**
   - Check Prometheus availability
   - Check endpoint configuration
   - Check access permissions

2. **Dashboard not loading**
   - Check JSON syntax
   - Check data source availability
   - Check user permissions

3. **Alerts not triggering**
   - Check rule configuration
   - Check notification channel availability
   - Check cooldown periods

## Support

For dashboard configuration help, contact the DevOps team or create an issue in the repository.
