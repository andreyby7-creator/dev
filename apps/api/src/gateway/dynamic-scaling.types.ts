export enum ScalingMetric {
  CPU_USAGE = 'CPU_USAGE',
  MEMORY_USAGE = 'MEMORY_USAGE',
  REQUEST_RATE = 'REQUEST_RATE',
  RESPONSE_TIME = 'RESPONSE_TIME',
  ERROR_RATE = 'ERROR_RATE',
  QUEUE_SIZE = 'QUEUE_SIZE',
}

export enum ScalingActionType {
  SCALE_UP = 'scale_up',
  SCALE_DOWN = 'scale_down',
  SCALE_OUT = 'scale_out',
  SCALE_IN = 'scale_in',
}

export enum ScalingPolicyType {
  REACTIVE = 'reactive',
  PREDICTIVE = 'predictive',
  SCHEDULED = 'scheduled',
}

export interface IScalingMetric {
  name: ScalingMetric;
  value: number;
  threshold: number;
  unit: string;
  timestamp: Date;
}

export interface IScalingAction {
  id: string;
  type: ScalingActionType;
  _resource: string;
  amount: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  estimatedCost: number;
  implementationDate: Date;
  status: 'planned' | 'in-progress' | 'completed' | 'cancelled';
  metadata?: Record<string, unknown>;
}

export interface IScalingPolicy {
  id: string;
  name: string;
  type: ScalingPolicyType;
  _service: string;
  metrics: ScalingMetric[];
  thresholds: Record<ScalingMetric, number>;
  actions: IScalingAction[];
  cooldownPeriod: number;
  evaluationInterval: number;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IScalingDecision {
  policyId: string;
  action: ScalingActionType;
  reason: string;
  confidence: number;
  estimatedImpact: {
    cost: number;
    performance: number;
    availability: number;
  };
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface IScalingHistory {
  id: string;
  policyId: string;
  decision: IScalingDecision;
  result: 'success' | 'failure' | 'partial';
  executionTime: number;
  actualImpact?: {
    cost: number;
    performance: number;
    availability: number;
  };
  timestamp: Date;
  error?: string;
}

export interface IScalingConfig {
  enabled: boolean;
  globalCooldown: number;
  maxConcurrentScaling: number;
  costThreshold: number;
  performanceThreshold: number;
  availabilityThreshold: number;
}
