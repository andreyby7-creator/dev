# Observability System Troubleshooting Guide

## Problem Diagnosis

### 1. Check System Status

```bash
cd /home/boss/Projects/dev
./scripts/monitor.sh status
```

### 2. Check Logs

```bash
# View observability logs
tail -f /tmp/observability.log

# View monitoring logs
tail -f /tmp/monitor.log

# View system logs
journalctl -f -u observability
```

### 3. Check Processes

```bash
# Check Node.js processes
ps aux | grep node

# Check ports
lsof -i :3000
lsof -i :3001

# Check PID files
ls -la /tmp/*.pid
```

## Common Issues and Solutions

### Issue: Services Not Starting

**Symptoms:**

- Error "Port already in use"
- Services not responding to health checks
- Processes not starting

**Diagnosis:**

```bash
# Check occupied ports
lsof -i :3000
lsof -i :3001

# Check processes
ps aux | grep node

# Check PID files
ls -la /tmp/*.pid
```

**Solution:**

```bash
# Stop all processes
./scripts/stop-all.sh

# Force stop processes on ports
sudo kill -9 $(lsof -ti:3000)
sudo kill -9 $(lsof -ti:3001)

# Clear PID files
rm -f /tmp/*.pid

# Restart services
./scripts/start-all.sh
```

### Issue: Health Endpoint Returns 404

**Symptoms:**

- `curl http://localhost:3001/observability/health` returns 404
- API server running but endpoints unavailable

**Diagnosis:**

```bash
# Check routing
curl http://localhost:3001/api

# Check all endpoints
curl http://localhost:3001/observability/metrics
curl http://localhost:3001/observability/dashboard/system
```

**Solution:**

```bash
# Check routing configuration
cat apps/api/src/observability/observability.controller.ts

# Restart API server
./scripts/observability.sh restart

# Check API logs
tail -f /tmp/observability.log | grep -i error
```

### Issue: Metrics Not Updating

**Symptoms:**

- Metrics showing old data
- No new log entries
- Dashboards not updating

**Diagnosis:**

```bash
# Check metrics
curl http://localhost:3001/observability/metrics

# Check logs
tail -n 50 /tmp/observability.log

# Check configuration
echo $METRICS_ENABLED
echo $LOG_LEVEL
```

**Solution:**

```bash
# Restart services
./scripts/observability.sh restart

# Generate test data
./scripts/observability.sh generate

# Check metrics update
curl http://localhost:3001/observability/metrics
```

### Issue: High System Load

**Symptoms:**

- High CPU usage (>80%)
- High memory usage (>80%)
- Slow API responses
- Timeout errors

**Diagnosis:**

```bash
# Check system resources
./scripts/monitor.sh metrics

# Check alerts
./scripts/monitor.sh alerts

# Performance analysis
./scripts/monitor.sh performance
```

**Solution:**

```bash
# Stop unnecessary processes
./scripts/stop-all.sh

# Clean data
./scripts/observability.sh cleanup

# Restart with limitations
NODE_OPTIONS="--max-old-space-size=512" ./scripts/start-all.sh
```

### Issue: Logs Not Writing

**Symptoms:**

- Empty log files
- "Permission denied" errors
- Logs not appearing in Elasticsearch

**Diagnosis:**

```bash
# Check access permissions
ls -la /tmp/observability.log
ls -la /tmp/monitor.log

# Check free space
df -h

# Test log writing
echo "test" >> /tmp/observability.log
```

**Solution:**

```bash
# Set access permissions
sudo chown $USER:$USER /tmp/observability.log
sudo chown $USER:$USER /tmp/monitor.log
chmod 644 /tmp/observability.log
chmod 644 /tmp/monitor.log

# Restart services
./scripts/observability.sh restart
```

### Issue: Dashboards Not Loading

**Symptoms:**

- Dashboards returning errors
- Widgets not displaying
- Empty data in dashboards

**Diagnosis:**

```bash
# Check API endpoints
curl http://localhost:3001/observability/dashboard/system
curl http://localhost:3001/observability/dashboard/business

# Check metrics
curl http://localhost:3001/observability/metrics

# Check logs
tail -n 20 /tmp/observability.log
```

**Solution:**

```bash
# Generate test data
./scripts/observability.sh generate

# Restart services
./scripts/observability.sh restart

# Check dashboards
curl http://localhost:3001/observability/dashboard/system
```

### Issue: Tracing Not Working

**Symptoms:**

- Traces not being created
- Jaeger not responding
- Tracing errors

**Diagnosis:**

```bash
# Check Jaeger health
curl http://localhost:3001/observability/jaeger/health

# Check traces
curl http://localhost:3001/observability/traces

# Test tracing
curl -X POST http://localhost:3001/observability/jaeger/test
```

**Solution:**

```bash
# Restart services
./scripts/observability.sh restart

# Clean old traces
curl -X DELETE http://localhost:3001/observability/jaeger/cleanup

# Test tracing
curl -X POST http://localhost:3001/observability/jaeger/test
```

### Issue: Elasticsearch Unavailable

**Symptoms:**

- Elasticsearch connection errors
- Logs not being indexed
- Log search not working

**Diagnosis:**

```bash
# Check Elasticsearch health
curl http://localhost:3001/observability/elasticsearch/health

# Check logs
curl http://localhost:3001/observability/elasticsearch/logs

# Check configuration
echo $ELASTICSEARCH_URL
```

**Solution:**

```bash
# Check mock implementation
curl http://localhost:3001/observability/elasticsearch/health

# Restart services
./scripts/observability.sh restart

# Clean and reindex
curl -X DELETE http://localhost:3001/observability/elasticsearch/cleanup
```

## Advanced Diagnostics

### Check Network Connections

```bash
# Check local ports
netstat -tlnp | grep -E ":(3000|3001)"

# Check external connections
netstat -tlnp | grep -E ":(9200|16686)"

# Check DNS
nslookup localhost
```

### Check File System

```bash
# Check free space
df -h

# Check inodes
df -i

# Check access permissions
ls -la /tmp/
ls -la /home/boss/Projects/dev/
```

### Check System Resources

```bash
# Check CPU
top -bn1 | grep "Cpu(s)"

# Check memory
free -h

# Check load
uptime

# Check processes
ps aux --sort=-%cpu | head -10
ps aux --sort=-%mem | head -10
```

### Check Configuration

```bash
# Check environment variables
env | grep -E "(NODE|API|LOG|METRIC|TRACING|DASHBOARD)"

# Check configuration files
ls -la apps/api/.env*
ls -la apps/web/.env*

# Check package.json
cat apps/api/package.json | grep -A 5 -B 5 "scripts"
```

## Critical Issues

### Issue: Complete System Unavailability

**Actions:**

1. **Stop All Services:**

```bash
./scripts/stop-all.sh
sudo pkill -f node
```

2. **Check System Resources:**

```bash
free -h
df -h
top -bn1
```

3. **Clean Temporary Files:**

```bash
rm -rf /tmp/*.pid
rm -rf /tmp/observability.log
rm -rf /tmp/monitor.log
```

4. **Restart with Minimal Configuration:**

```bash
NODE_ENV=development LOG_LEVEL=error ./scripts/start-all.sh
```

### Issue: Data Loss

**Actions:**

1. **Stop Writing New Data:**

```bash
./scripts/stop-all.sh
```

2. **Backup:**

```bash
cp -r /tmp/observability.log /backup/observability_$(date +%Y%m%d_%H%M%S).log
cp -r /tmp/monitor.log /backup/monitor_$(date +%Y%m%d_%H%M%S).log
```

3. **Restore from Backup:**

```bash
cp /backup/observability_*.log /tmp/observability.log
cp /backup/monitor_*.log /tmp/monitor.log
```

4. **Restart Services:**

```bash
./scripts/start-all.sh
```

## Recovery Procedures

### Full System Recovery

```bash
# 1. Stop all services
./scripts/stop-all.sh

# 2. Clean all data
./scripts/observability.sh cleanup

# 3. Clean temporary files
rm -rf /tmp/*.pid
rm -rf /tmp/observability.log
rm -rf /tmp/monitor.log

# 4. Restart services
./scripts/start-all.sh

# 5. Generate test data
./scripts/observability.sh generate

# 6. Check functionality
./scripts/monitor.sh status
./scripts/observability.sh test
```

### Recovery After Failure

```bash
# 1. Check status
./scripts/monitor.sh status

# 2. Analyze logs
tail -n 100 /tmp/observability.log

# 3. Restart problematic services
./scripts/observability.sh restart

# 4. Check recovery
curl http://localhost:3001/observability/health
```

## Support

### Support Information

When contacting support, provide:

1. **System Information:**

```bash
uname -a
node --version
npm --version
df -h
free -h
```

2. **Service Status:**

```bash
./scripts/monitor.sh status
```

3. **Error Logs:**

```bash
tail -n 100 /tmp/observability.log
tail -n 100 /tmp/monitor.log
```

4. **Configuration:**

```bash
env | grep -E "(NODE|API|LOG|METRIC|TRACING|DASHBOARD)"
```

5. **Test Results:**

```bash
./scripts/observability.sh test
```

### Support Contacts

- **Documentation:** `docs/observability/`
- **Logs:** `/tmp/observability.log`
- **Scripts:** `scripts/`
- **Configuration:** `apps/api/.env`, `apps/web/.env`

### Problem Escalation

1. **Level 1:** Check documentation and basic solutions
2. **Level 2:** Analyze logs and advanced diagnostics
3. **Level 3:** System recovery and backup
4. **Level 4:** Reinstallation and full setup

## Troubleshooting Checklist

- [ ] System status checked
- [ ] Error logs checked
- [ ] System resources checked
- [ ] Ports and processes checked
- [ ] Configuration checked
- [ ] Basic solutions executed
- [ ] Functionality checked after fixes
- [ ] Changes documented
- [ ] Backups updated
