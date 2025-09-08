# Observability System Usage Guide

## Quick Start

### Start System

```bash
cd /home/boss/Projects/dev
./scripts/start-all.sh
```

### Check Status

```bash
./scripts/monitor.sh status
```

### Stop System

```bash
./scripts/stop-all.sh
```

## System Monitoring

### Basic Monitoring Commands

**1. System Status Overview:**

```bash
./scripts/monitor.sh status
```

**2. Detailed Metrics:**

```bash
./scripts/monitor.sh metrics
```

**3. Check Alerts:**

```bash
./scripts/monitor.sh alerts
```

**4. View Logs:**

```bash
./scripts/monitor.sh logs
```

**5. Performance Analysis:**

```bash
./scripts/monitor.sh performance
```

**6. Continuous Monitoring:**

```bash
./scripts/monitor.sh watch
```

## Service Management

### Basic Observability Commands

**1. Start All Services:**

```bash
./scripts/observability.sh start
```

**2. Stop All Services:**

```bash
./scripts/observability.sh stop
```

**3. Restart Services:**

```bash
./scripts/observability.sh restart
```

**4. Check Status:**

```bash
./scripts/observability.sh status
```

**5. Run Tests:**

```bash
./scripts/observability.sh test
```

**6. Clean Data:**

```bash
./scripts/observability.sh cleanup
```

**7. Generate Test Data:**

```bash
./scripts/observability.sh generate
```

## Web Interface

### Available Pages

**1. Main Page:**

- URL: `http://localhost:3000`
- Description: Main application interface

**2. System Dashboard:**

- URL: `http://localhost:3001/observability/dashboard/system`
- Description: System resource monitoring

**3. Business Dashboard:**

- URL: `http://localhost:3001/observability/dashboard/business`
- Description: Business metrics and KPIs

**4. Swagger Documentation:**

- URL: `http://localhost:3001/api`
- Description: API documentation

## API Endpoints

### Health & Status

**System Health Check:**

```bash
curl http://localhost:3001/observability/health
```

**Overall Component Status:**

```bash
curl http://localhost:3001/observability/test/status
```

### Metrics

**Get All Metrics:**

```bash
curl http://localhost:3001/observability/metrics
```

**Prometheus Format Metrics:**

```bash
curl http://localhost:3001/observability/metrics/prometheus
```

### Dashboards

**System Dashboard:**

```bash
curl http://localhost:3001/observability/dashboard/system
```

**Business Dashboard:**

```bash
curl http://localhost:3001/observability/dashboard/business
```

**All Dashboards List:**

```bash
curl http://localhost:3001/observability/dashboard
```

### Logs

**Get Logs:**

```bash
curl http://localhost:3001/observability/logs
```

**Get Logs with Filtering:**

```bash
curl "http://localhost:3001/observability/logs?level=ERROR&limit=10"
```

**Clear Logs:**

```bash
curl -X DELETE http://localhost:3001/observability/logs
```

### Traces

**Get Traces:**

```bash
curl http://localhost:3001/observability/traces
```

**Search Traces:**

```bash
curl "http://localhost:3001/observability/traces?serviceName=api&limit=5"
```

**Clear Traces:**

```bash
curl -X DELETE http://localhost:3001/observability/traces
```

### Jaeger

**Jaeger Health Check:**

```bash
curl http://localhost:3001/observability/jaeger/health
```

**Search Traces in Jaeger:**

```bash
curl "http://localhost:3001/observability/jaeger/traces?serviceName=api&operationName=GET"
```

**Test Tracing:**

```bash
curl -X POST http://localhost:3001/observability/jaeger/test
```

**Clean Old Traces:**

```bash
curl -X DELETE "http://localhost:3001/observability/jaeger/cleanup?maxAge=24h"
```

### Elasticsearch

**Elasticsearch Health Check:**

```bash
curl http://localhost:3001/observability/elasticsearch/health
```

**Search Logs:**

```bash
curl "http://localhost:3001/observability/elasticsearch/logs?query=error&from=2024-01-01&to=2024-01-02"
```

**Clean Old Logs:**

```bash
curl -X DELETE "http://localhost:3001/observability/elasticsearch/cleanup?daysToKeep=7"
```

### Testing

**Comprehensive Testing:**

```bash
curl -X POST http://localhost:3001/observability/test/comprehensive
```

**Load Simulation:**

```bash
curl -X POST "http://localhost:3001/observability/test/load-simulation?requests=100&delay=50"
```

**Generate Test Metrics:**

```bash
curl -X POST "http://localhost:3001/observability/test/metrics-generation?users=50&transactions=100"
```

## Metrics and Analytics

### System Metrics

**CPU Usage:**

- Description: CPU load
- Unit: Percentage
- Warning threshold: >80%
- Critical threshold: >95%

**Memory Usage:**

- Description: Memory usage
- Unit: Percentage
- Warning threshold: >80%
- Critical threshold: >90%

**Disk Usage:**

- Description: Disk usage
- Unit: Percentage
- Warning threshold: >80%
- Critical threshold: >90%

**Load Average:**

- Description: System average load
- Unit: Number of processes
- Warning threshold: >2.0
- Critical threshold: >5.0

### Business Metrics

**Daily Active Users (DAU):**

- Description: Daily active users count
- Unit: Number of users
- Type: Counter

**Monthly Active Users (MAU):**

- Description: Monthly active users count
- Unit: Number of users
- Type: Counter

**Conversion Rate:**

- Description: Conversion percentage
- Unit: Percentage
- Type: Percentage

**Revenue:**

- Description: Total revenue
- Unit: Currency
- Type: Sum

### User Activity

**Page Views:**

- Description: Page view count
- Unit: Number of views
- Type: Counter

**Clicks:**

- Description: Click count
- Unit: Number of clicks
- Type: Counter

**Sessions:**

- Description: Session count
- Unit: Number of sessions
- Type: Counter

**Transactions:**

- Description: Transaction count
- Unit: Number of transactions
- Type: Counter

## Dashboards

### System Dashboard

**Widgets:**

1. **CPU Usage Chart** - CPU load graph
2. **Memory Usage Chart** - Memory usage graph
3. **Request Rate** - Requests per second
4. **Error Rate** - Errors per second
5. **Health Status** - System health status
6. **System Performance** - Overall performance

**Data Update:** Every 30 seconds

### Business Dashboard

**Widgets:**

1. **DAU/MAU Chart** - Active users graph
2. **Revenue Trends** - Revenue trends
3. **Conversion Funnel** - Conversion funnel
4. **User Activity** - User activity
5. **Business KPIs** - Key performance indicators

**Data Update:** Every 5 minutes

## Logging

### Log Levels

**ERROR:**

- Description: Critical errors
- Usage: System failures, exceptions
- Example: `Database connection failed`

**WARN:**

- Description: Warnings
- Usage: Potential issues
- Example: `High memory usage detected`

**INFO:**

- Description: Informational messages
- Usage: Normal operations
- Example: `Request processed successfully`

**DEBUG:**

- Description: Debug information
- Usage: Detailed debugging
- Example: `SQL query executed`

### Log Structure

```json
{
  "timestamp": "2024-01-01T12:00:00.000Z",
  "level": "INFO",
  "message": "Request processed",
  "service": "api",
  "userId": "123",
  "requestId": "abc-123",
  "duration": 150,
  "statusCode": 200,
  "method": "GET",
  "url": "/users",
  "ip": "192.168.1.1",
  "userAgent": "Mozilla/5.0..."
}
```

### Log Filtering

**By Level:**

```bash
curl "http://localhost:3001/observability/logs?level=ERROR"
```

**By Time:**

```bash
curl "http://localhost:3001/observability/logs?from=2024-01-01T00:00:00Z&to=2024-01-01T23:59:59Z"
```

**By Service:**

```bash
curl "http://localhost:3001/observability/logs?service=api"
```

**By User:**

```bash
curl "http://localhost:3001/observability/logs?userId=123"
```

## Tracing

### Span Structure

```json
{
  "traceId": "abc-123-def-456",
  "spanId": "span-789",
  "parentSpanId": "span-456",
  "operationName": "GET /users",
  "serviceName": "api-service",
  "startTime": "2024-01-01T12:00:00.000Z",
  "endTime": "2024-01-01T12:00:00.150Z",
  "duration": 150,
  "tags": {
    "http.method": "GET",
    "http.status_code": 200,
    "http.url": "/users",
    "user.id": "123"
  },
  "logs": [
    {
      "timestamp": "2024-01-01T12:00:00.050Z",
      "message": "Database query started"
    }
  ]
}
```

### Trace Search

**By Service:**

```bash
curl "http://localhost:3001/observability/jaeger/traces?serviceName=api"
```

**By Operation:**

```bash
curl "http://localhost:3001/observability/jaeger/traces?operationName=GET"
```

**By Time:**

```bash
curl "http://localhost:3001/observability/jaeger/traces?startTime=2024-01-01T00:00:00Z&endTime=2024-01-01T23:59:59Z"
```

**By Tags:**

```bash
curl "http://localhost:3001/observability/jaeger/traces?tags=http.status_code=500"
```

## Testing

### Automatic Tests

**Run All Tests:**

```bash
./scripts/observability.sh test
```

**Test Results:**

- Health endpoints: Availability check
- Metrics endpoints: Metrics collection check
- Dashboard endpoints: Dashboard loading check
- Logging: Log writing check
- Tracing: Tracing check

### Generate Test Data

**Generate Metrics:**

```bash
./scripts/observability.sh generate
```

**Generation Parameters:**

- `users`: Number of users (default: 100)
- `transactions`: Number of transactions (default: 200)
- `duration`: Generation duration in seconds (default: 60)

### Load Simulation

**Basic Simulation:**

```bash
curl -X POST "http://localhost:3001/observability/test/load-simulation"
```

**Configure Parameters:**

```bash
curl -X POST "http://localhost:3001/observability/test/load-simulation?requests=1000&delay=10&concurrent=10"
```

**Parameters:**

- `requests`: Total number of requests
- `delay`: Delay between requests (ms)
- `concurrent`: Number of concurrent requests

## Configuration

### Environment Variables

**Basic Settings:**

```env
NODE_ENV=development
API_PORT=3001
LOG_LEVEL=info
```

**Observability Settings:**

```env
METRICS_ENABLED=true
TRACING_ENABLED=true
DASHBOARD_ENABLED=true
```

**Elasticsearch Settings:**

```env
ELASTICSEARCH_URL=http://localhost:9200
ELASTICSEARCH_INDEX=logs
ELASTICSEARCH_USERNAME=
ELASTICSEARCH_PASSWORD=
```

**Jaeger Settings:**

```env
JAEGER_URL=http://localhost:16686
JAEGER_SERVICE_NAME=api-service
```

### Alert Configuration

**CPU Alert:**

```env
CPU_ALERT_THRESHOLD=80
CPU_CRITICAL_THRESHOLD=95
```

**Memory Alert:**

```env
MEMORY_ALERT_THRESHOLD=80
MEMORY_CRITICAL_THRESHOLD=90
```

**Disk Alert:**

```env
DISK_ALERT_THRESHOLD=80
DISK_CRITICAL_THRESHOLD=90
```

## Data Export

### Export Metrics

**JSON Format:**

```bash
curl http://localhost:3001/observability/metrics > metrics.json
```

**Prometheus Format:**

```bash
curl http://localhost:3001/observability/metrics/prometheus > metrics.prom
```

### Export Logs

**All Logs:**

```bash
curl http://localhost:3001/observability/logs > logs.json
```

**Filtered Logs:**

```bash
curl "http://localhost:3001/observability/logs?level=ERROR&limit=1000" > error_logs.json
```

### Export Traces

**All Traces:**

```bash
curl http://localhost:3001/observability/traces > traces.json
```

**Filtered Traces:**

```bash
curl "http://localhost:3001/observability/jaeger/traces?serviceName=api&limit=100" > api_traces.json
```

## Automation

### Cron Jobs

**Daily Log Cleanup:**

```bash
0 2 * * * curl -X DELETE "http://localhost:3001/observability/logs?olderThan=7d"
```

**Daily Trace Cleanup:**

```bash
0 3 * * * curl -X DELETE "http://localhost:3001/observability/jaeger/cleanup?maxAge=24h"
```

**Daily Metrics Export:**

```bash
0 4 * * * curl http://localhost:3001/observability/metrics > /backup/metrics_$(date +%Y%m%d).json
```

### Monitoring Scripts

**Health Check Every 5 Minutes:**

```bash
*/5 * * * * ./scripts/monitor.sh status > /dev/null 2>&1
```

**Alert Check Every 10 Minutes:**

```bash
*/10 * * * * ./scripts/monitor.sh alerts > /dev/null 2>&1
```

## Additional Resources

### Useful Commands

**Performance Check:**

```bash
./scripts/monitor.sh performance
```

**Continuous Monitoring:**

```bash
./scripts/monitor.sh watch
```

**Check All Endpoints:**

```bash
curl -s http://localhost:3001/observability/health && echo "Health OK"
curl -s http://localhost:3001/observability/metrics && echo "Metrics OK"
curl -s http://localhost:3001/observability/dashboard/system && echo "Dashboard OK"
```

### External System Integration

**Prometheus:**

```yaml
scrape_configs:
  - job_name: 'observability'
    static_configs:
      - targets: ['localhost:3001']
    metrics_path: '/observability/metrics/prometheus'
```

**Grafana:**

- Data Source: `http://localhost:3001/observability/metrics`
- Dashboard: Import JSON from API response

**AlertManager:**

```yaml
route:
  group_by: ['alertname']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 1h
  receiver: 'web.hook'
receivers:
  - name: 'web.hook'
    webhook_configs:
      - url: 'http://localhost:3001/observability/alerts'
```
