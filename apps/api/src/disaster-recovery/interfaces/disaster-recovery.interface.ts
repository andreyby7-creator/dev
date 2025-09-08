export interface IDataCenter {
  id: string;
  name: string;
  country: string;
  region: string;
  city: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  status: 'active' | 'maintenance' | 'offline';
  capacity: {
    cpu: number;
    memory: number;
    storage: number;
    network: number;
  };
}

export interface IFailoverConfig {
  id: string;
  primaryDc: string;
  secondaryDc: string;
  autoFailover: boolean;
  failoverThreshold: number;
  recoveryTimeObjective: number; // RTO в секундах
  recoveryPointObjective: number; // RPO в секундах
  healthChecks: {
    interval: number;
    timeout: number;
    retries: number;
  };
}

export interface INetworkLink {
  id: string;
  sourceDc: string;
  targetDc: string;
  type: 'primary' | 'backup' | 'peering';
  bandwidth: number; // Mbps
  latency: number; // ms
  status: 'active' | 'degraded' | 'down';
  provider: string;
  lastCheck: Date;
}

export interface IGeographicRoute {
  id: string;
  userLocation: {
    country: string;
    region: string;
    city: string;
    coordinates: {
      latitude: number;
      longitude: number;
    };
  };
  targetDc: string;
  routingStrategy:
    | 'nearest'
    | 'lowest-latency'
    | 'least-loaded'
    | 'cost-optimized';
  metrics: {
    latency: number;
    bandwidth: number;
    cost: number;
  };
  lastUpdated: Date;
}

export interface IIncidentResponse {
  id: string;
  type:
    | 'power-outage'
    | 'network-failure'
    | 'hardware-failure'
    | 'natural-disaster';
  severity: 'low' | 'medium' | 'high' | 'critical';
  affectedDcs: string[];
  description: string;
  detectedAt: Date;
  responseStartedAt?: Date;
  resolvedAt?: Date;
  status: 'detected' | 'responding' | 'mitigated' | 'resolved';
  actions: IIncidentAction[];
  playbook: string;
}

export interface IIncidentAction {
  id: string;
  description: string;
  type: 'automatic' | 'manual';
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  startedAt?: Date;
  completedAt?: Date;
  result?: string;
  error?: string;
}

export interface ICapacityPlan {
  id: string;
  dcId: string;
  period: {
    start: Date;
    end: Date;
  };
  currentCapacity: {
    cpu: number;
    memory: number;
    storage: number;
    network: number;
  };
  projectedDemand: {
    cpu: number;
    memory: number;
    storage: number;
    network: number;
  };
  scalingActions: IScalingAction[];
  status: 'draft' | 'approved' | 'implemented' | 'reviewed';
}

export interface IScalingAction {
  id: string;
  type: 'scale-up' | 'scale-down' | 'scale-out' | 'scale-in';
  resource: 'cpu' | 'memory' | 'storage' | 'network';
  amount: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  estimatedCost: number;
  implementationDate: Date;
  status: 'planned' | 'in-progress' | 'completed' | 'cancelled';
}

export interface IA1IctService {
  id: string;
  name: string;
  type: 'DRaaS' | 'BaaS' | 'TierIII-DC';
  dcId: string;
  status: string;
  configuration: {
    sla: number; // 99.9, 99.99, 99.999
    backupRetention: number; // дни
    recoveryTime: number; // минуты
    replicationFrequency: number; // минуты
  };
  cost: number;
  contractEndDate: Date;
  backupSize?: number;
  retentionDays?: number;
}

export interface IA1ServiceRequest {
  id: string;
  serviceType: 'DRaaS' | 'BaaS' | 'TierIII-DC';
  dcId: string;
  configuration: {
    sla: number;
    backupRetention: number;
    recoveryTime: number;
    replicationFrequency: number;
  };
  cost: number;
  contractEndDate: Date;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: Date;
  processedAt?: Date;
  notes?: string;
}

export interface ICapacityMetrics {
  cpu: number;
  memory: number;
  storage: number;
  network: number;
  timestamp: Date;
}

export interface INetworkHealthCheck {
  id: string;
  timestamp: Date;
  linkId: string;
  action: string;
  details: string;
  bandwidth: number;
  error?: string;
  description?: string;
}

export interface IFailoverEvent {
  id: string;
  timestamp: Date;
  configId: string;
  action: 'failover' | 'failback' | 'manual-switch';
  reason: string;
  duration: number;
  recoveryId?: string;
  estimatedTime?: number;
}

export interface IBackupResult {
  success: boolean;
  backupId: string;
  status?: string;
  estimatedTime?: number;
}

export interface IRecoveryResult {
  success: boolean;
  recoveryTime: number;
  recoveryId?: string;
  estimatedTime?: number;
  status?: string;
}

export interface ICreateRouteDto {
  userLocation: {
    country: string;
    region: string;
    city: string;
    coordinates: {
      latitude: number;
      longitude: number;
    };
  };
  targetDc: string;
  routingStrategy:
    | 'nearest'
    | 'lowest-latency'
    | 'least-loaded'
    | 'cost-optimized';
  metrics?: {
    latency: number;
    bandwidth: number;
    cost: number;
    availability: number;
  };
}

export interface IUpdateRouteDto {
  userLocation?: {
    country: string;
    region: string;
    city: string;
    coordinates: {
      latitude: number;
      longitude: number;
    };
  };
  targetDc?: string;
  routingStrategy?:
    | 'nearest'
    | 'lowest-latency'
    | 'least-loaded'
    | 'cost-optimized';
  metrics?: {
    latency: number;
    bandwidth: number;
    cost: number;
    availability: number;
  };
}

export interface ICreateA1IctServiceDto {
  name?: string;
  type: 'DRaaS' | 'BaaS' | 'TierIII-DC';
  dcId: string;
  status: string;
  configuration: {
    sla: number;
    backupRetention: number;
    recoveryTime: number;
    replicationFrequency: number;
  };
  cost: number;
  contractEndDate: Date;
}

export interface IUpdateA1IctServiceDto {
  name?: string;
  type?: 'DRaaS' | 'BaaS' | 'TierIII-DC';
  dcId?: string;
  status?: string;
  configuration?: {
    sla: number;
    backupRetention: number;
    recoveryTime: number;
    replicationFrequency: number;
  };
  cost?: number;
  contractEndDate?: Date;
}

export interface IUpdateIncidentDto {
  type?:
    | 'power-outage'
    | 'network-failure'
    | 'hardware-failure'
    | 'natural-disaster';
  severity?: 'critical' | 'low' | 'medium' | 'high';
  affectedDcs?: string[];
  description?: string;
  playbook?: string;
  status?: string;
}

export interface IScalingHistory {
  timestamp: Date;
  planId: string;
  action: string;
  details: string;
  result: string;
}

export interface ICreateA1ServiceRequestDto {
  type: 'DRaaS' | 'BaaS' | 'TierIII-DC';
  serviceType: 'DRaaS' | 'BaaS' | 'TierIII-DC';
  dcId: string;
  configuration: {
    sla: number;
    backupRetention: number;
    recoveryTime: number;
    replicationFrequency: number;
  };
  cost: number;
  contractEndDate: Date;
  notes?: string;
}

export interface IUpdateA1ServiceRequestDto {
  type?: 'DRaaS' | 'BaaS' | 'TierIII-DC';
  serviceType?: 'DRaaS' | 'BaaS' | 'TierIII-DC';
  dcId?: string;
  configuration?: {
    sla: number;
    backupRetention: number;
    recoveryTime: number;
    replicationFrequency: number;
  };
  cost?: number;
  contractEndDate?: Date;
  notes?: string;
}

export interface ICreateCapacityPlanDto {
  dcId: string;
  period: {
    start: Date;
    end: Date;
  };
  currentCapacity: {
    cpu: number;
    memory: number;
    storage: number;
    network: number;
  };
  projectedDemand: {
    cpu: number;
    memory: number;
    storage: number;
    network: number;
  };
}

export interface IUpdateCapacityPlanDto {
  dcId?: string;
  period?: {
    start: Date;
    end: Date;
  };
  currentCapacity?: {
    cpu: number;
    memory: number;
    storage: number;
    network: number;
  };
  projectedDemand?: {
    cpu: number;
    memory: number;
    storage: number;
    network: number;
  };
}

export interface ICreateBackupDto {
  id: string;
  timestamp: Date;
  type: string;
  size: number;
  description?: string;
}
