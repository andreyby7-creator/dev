# Kubernetes Deployment Guide

## Overview

This guide provides comprehensive instructions for deploying and managing the SaleSpot BY platform on Kubernetes.

## Prerequisites

### Required Tools

- kubectl (v1.28+)
- Helm (v3.12+)
- Docker (v24+)
- Git

### Cluster Requirements

- **Nodes**: 3+ worker nodes
- **CPU**: 4+ cores per node
- **Memory**: 8+ GB per node
- **Storage**: 100+ GB per node

## Cluster Setup

### 1. Create Cluster

```bash
# Using kops (AWS)
cd /home/boss/Projects/dev && kops create cluster --name=salespot.k8s.local --zones=us-west-2a --node-count=3 --node-size=t3.medium --master-size=t3.small

# Using kubeadm
cd /home/boss/Projects/dev && kubeadm init --pod-network-cidr=10.244.0.0/16
```

### 2. Configure kubectl

```bash
# Copy kubeconfig
cd /home/boss/Projects/dev && mkdir -p $HOME/.kube
cd /home/boss/Projects/dev && cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
cd /home/boss/Projects/dev && chown $(id -u):$(id -g) $HOME/.kube/config
```

### 3. Install CNI

```bash
# Install Flannel
cd /home/boss/Projects/dev && kubectl apply -f https://raw.githubusercontent.com/flannel-io/flannel/master/Documentation/kube-flannel.yml

# Install Calico
cd /home/boss/Projects/dev && kubectl apply -f https://raw.githubusercontent.com/projectcalico/calico/v3.26.1/manifests/calico.yaml
```

## Application Deployment

### 1. Create Namespace

```bash
# Create namespace
cd /home/boss/Projects/dev && kubectl create namespace salespot

# Set default namespace
cd /home/boss/Projects/dev && kubectl config set-context --current --namespace=salespot
```

### 2. Deploy Database

```yaml
# postgres-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: postgres
  namespace: salespot
spec:
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
        - name: postgres
          image: postgres:15-alpine
          ports:
            - containerPort: 5432
          env:
            - name: POSTGRES_DB
              value: salespot
            - name: POSTGRES_USER
              value: postgres
            - name: POSTGRES_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: postgres-secret
                  key: password
          volumeMounts:
            - name: postgres-storage
              mountPath: /var/lib/postgresql/data
      volumes:
        - name: postgres-storage
          persistentVolumeClaim:
            claimName: postgres-pvc
```

```bash
# Deploy PostgreSQL
cd /home/boss/Projects/dev && kubectl apply -f k8s/postgres-deployment.yaml
```

### 3. Deploy Application

```yaml
# api-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
  namespace: salespot
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api
  template:
    metadata:
      labels:
        app: api
    spec:
      containers:
        - name: api
          image: salespot/api:latest
          ports:
            - containerPort: 3000
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: postgres-secret
                  key: url
            - name: NODE_ENV
              value: production
          resources:
            requests:
              memory: '256Mi'
              cpu: '250m'
            limits:
              memory: '512Mi'
              cpu: '500m'
          livenessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /ready
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 5
```

```bash
# Deploy API
cd /home/boss/Projects/dev && kubectl apply -f k8s/api-deployment.yaml
```

### 4. Create Services

```yaml
# api-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: api-service
  namespace: salespot
spec:
  selector:
    app: api
  ports:
    - protocol: TCP
      port: 80
      targetPort: 3000
  type: ClusterIP
```

```bash
# Deploy services
cd /home/boss/Projects/dev && kubectl apply -f k8s/api-service.yaml
```

## Ingress Configuration

### 1. Install Ingress Controller

```bash
# Install NGINX Ingress
cd /home/boss/Projects/dev && kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.1/deploy/static/provider/cloud/deploy.yaml

# Install Traefik
cd /home/boss/Projects/dev && helm repo add traefik https://traefik.github.io/charts
cd /home/boss/Projects/dev && helm install traefik traefik/traefik
```

### 2. Configure Ingress

```yaml
# api-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api-ingress
  namespace: salespot
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
    nginx.ingress.kubernetes.io/ssl-redirect: 'true'
    cert-manager.io/cluster-issuer: 'letsencrypt-prod'
spec:
  tls:
    - hosts:
        - api.salespot.by
      secretName: api-tls
  rules:
    - host: api.salespot.by
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: api-service
                port:
                  number: 80
```

```bash
# Deploy ingress
cd /home/boss/Projects/dev && kubectl apply -f k8s/api-ingress.yaml
```

## Monitoring and Logging

### 1. Install Prometheus

```bash
# Install Prometheus
cd /home/boss/Projects/dev && helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
cd /home/boss/Projects/dev && helm install prometheus prometheus-community/kube-prometheus-stack
```

### 2. Install Grafana

```bash
# Install Grafana
cd /home/boss/Projects/dev && helm repo add grafana https://grafana.github.io/helm-charts
cd /home/boss/Projects/dev && helm install grafana grafana/grafana
```

### 3. Configure Logging

```yaml
# fluentd-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluentd-config
  namespace: kube-system
data:
  fluent.conf: |
    <source>
      @type tail
      path /var/log/containers/*.log
      pos_file /var/log/fluentd-containers.log.pos
      tag kubernetes.*
      format json
    </source>
    <match kubernetes.**>
      @type elasticsearch
      host elasticsearch.logging.svc.cluster.local
      port 9200
      index_name fluentd
      type_name fluentd
    </match>
```

## Security Configuration

### 1. Network Policies

```yaml
# network-policy.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: api-network-policy
  namespace: salespot
spec:
  podSelector:
    matchLabels:
      app: api
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              name: ingress-nginx
      ports:
        - protocol: TCP
          port: 3000
  egress:
    - to:
        - podSelector:
            matchLabels:
              app: postgres
      ports:
        - protocol: TCP
          port: 5432
```

### 2. Pod Security Standards

```yaml
# pod-security-policy.yaml
apiVersion: v1
kind: PodSecurityPolicy
metadata:
  name: restricted
spec:
  privileged: false
  allowPrivilegeEscalation: false
  requiredDropCapabilities:
    - ALL
  volumes:
    - 'configMap'
    - 'emptyDir'
    - 'projected'
    - 'secret'
    - 'downwardAPI'
    - 'persistentVolumeClaim'
  runAsUser:
    rule: 'MustRunAsNonRoot'
  seLinux:
    rule: 'RunAsAny'
  fsGroup:
    rule: 'RunAsAny'
```

## Scaling and Autoscaling

### 1. Horizontal Pod Autoscaler

```yaml
# hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-hpa
  namespace: salespot
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api
  minReplicas: 3
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
```

### 2. Vertical Pod Autoscaler

```bash
# Install VPA
cd /home/boss/Projects/dev && kubectl apply -f https://github.com/kubernetes/autoscaler/releases/download/vertical-pod-autoscaler-0.13.0/vpa-release.yaml
```

```yaml
# vpa.yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: api-vpa
  namespace: salespot
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api
  updatePolicy:
    updateMode: 'Auto'
```

## Backup and Recovery

### 1. Database Backup

```yaml
# backup-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: postgres-backup
  namespace: salespot
spec:
  schedule: '0 2 * * *'
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: postgres-backup
              image: postgres:15-alpine
              command:
                - /bin/sh
                - -c
                - |
                  pg_dump -h postgres-service -U postgres salespot | gzip > /backup/salespot_$(date +%Y%m%d_%H%M%S).sql.gz
              env:
                - name: PGPASSWORD
                  valueFrom:
                    secretKeyRef:
                      name: postgres-secret
                      key: password
              volumeMounts:
                - name: backup-storage
                  mountPath: /backup
          volumes:
            - name: backup-storage
              persistentVolumeClaim:
                claimName: backup-pvc
          restartPolicy: OnFailure
```

### 2. Application Backup

```bash
# Backup Kubernetes resources
cd /home/boss/Projects/dev && kubectl get all -o yaml > k8s-backup-$(date +%Y%m%d).yaml

# Backup secrets
cd /home/boss/Projects/dev && kubectl get secrets -o yaml > secrets-backup-$(date +%Y%m%d).yaml
```

## Troubleshooting

### Common Issues

1. **Pod not starting**

   ```bash
   cd /home/boss/Projects/dev && kubectl describe pod <pod-name>
   cd /home/boss/Projects/dev && kubectl logs <pod-name>
   ```

2. **Service not accessible**

   ```bash
   cd /home/boss/Projects/dev && kubectl get services
   cd /home/boss/Projects/dev && kubectl get endpoints
   ```

3. **Ingress not working**
   ```bash
   cd /home/boss/Projects/dev && kubectl describe ingress <ingress-name>
   cd /home/boss/Projects/dev && kubectl get ingress
   ```

### Debug Commands

```bash
# Check cluster status
cd /home/boss/Projects/dev && kubectl cluster-info

# Check node status
cd /home/boss/Projects/dev && kubectl get nodes

# Check pod status
cd /home/boss/Projects/dev && kubectl get pods -o wide

# Check events
cd /home/boss/Projects/dev && kubectl get events --sort-by=.metadata.creationTimestamp

# Check resource usage
cd /home/boss/Projects/dev && kubectl top nodes
cd /home/boss/Projects/dev && kubectl top pods
```

## Best Practices

### Security

- Use non-root containers
- Implement network policies
- Regular security updates
- Use secrets for sensitive data
- Enable RBAC

### Performance

- Set resource requests and limits
- Use horizontal pod autoscaling
- Optimize container images
- Implement health checks
- Monitor resource usage

### Reliability

- Use multiple replicas
- Implement proper health checks
- Use persistent volumes
- Regular backups
- Disaster recovery planning

### Maintenance

- Regular updates
- Monitor cluster health
- Clean up unused resources
- Document changes
- Test disaster recovery procedures
