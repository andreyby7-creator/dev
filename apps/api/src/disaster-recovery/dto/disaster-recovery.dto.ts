import { z } from 'zod';

// Data Center DTOs
export const CreateDataCenterDtoSchema = z.object({
  name: z.string().min(1).max(100),
  region: z.string().min(1).max(50),
  country: z.enum(['BY', 'RU']),
  city: z.string().min(1).max(100),
  status: z.enum(['active', 'maintenance', 'offline']).optional(),
  coordinates: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  }),
  capacity: z.object({
    cpu: z.number().positive(),
    memory: z.number().positive(),
    storage: z.number().positive(),
    network: z.number().positive(),
  }),
});

export const UpdateDataCenterDtoSchema = CreateDataCenterDtoSchema.partial();

export type CreateDataCenterDto = z.infer<typeof CreateDataCenterDtoSchema>;
export type UpdateDataCenterDto = z.infer<typeof UpdateDataCenterDtoSchema>;

// Failover Config DTOs
export const CreateFailoverConfigDtoSchema = z.object({
  primaryDc: z.string().uuid(),
  secondaryDc: z.string().uuid(),
  autoFailover: z.boolean(),
  failoverThreshold: z.number().min(1).max(300),
  recoveryTimeObjective: z.number().min(1).max(3600),
  recoveryPointObjective: z.number().min(1).max(86400),
  healthChecks: z.object({
    interval: z.number().min(5).max(300),
    timeout: z.number().min(1).max(60),
    retries: z.number().min(1).max(10),
  }),
});

export const UpdateFailoverConfigDtoSchema =
  CreateFailoverConfigDtoSchema.partial();

export type CreateFailoverConfigDto = z.infer<
  typeof CreateFailoverConfigDtoSchema
>;
export type UpdateFailoverConfigDto = z.infer<
  typeof UpdateFailoverConfigDtoSchema
>;

// Network Link DTOs
export const CreateNetworkLinkDtoSchema = z.object({
  sourceDc: z.string().uuid(),
  targetDc: z.string().uuid(),
  type: z.enum(['primary', 'backup', 'peering']),
  bandwidth: z.number().positive(),
  latency: z.number().min(0).max(1000),
  provider: z.string().min(1).max(100),
});

export const UpdateNetworkLinkDtoSchema = CreateNetworkLinkDtoSchema.partial();

export type CreateNetworkLinkDto = z.infer<typeof CreateNetworkLinkDtoSchema>;
export type UpdateNetworkLinkDto = z.infer<typeof UpdateNetworkLinkDtoSchema>;

// Geographic Routing DTOs
export const CreateGeographicRouteDtoSchema = z.object({
  userLocation: z.object({
    country: z.string().min(2).max(2),
    region: z.string().min(1).max(50),
    city: z.string().min(1).max(100),
    coordinates: z.object({
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
    }),
  }),
  targetDc: z.string().uuid(),
  routingStrategy: z.enum([
    'nearest',
    'lowest-latency',
    'least-loaded',
    'cost-optimized',
  ]),
  metrics: z
    .object({
      latency: z.number().min(0).max(1000),
      bandwidth: z.number().positive(),
      cost: z.number().min(0),
      availability: z.number().min(0).max(100),
    })
    .optional(),
});

export const UpdateGeographicRouteDtoSchema =
  CreateGeographicRouteDtoSchema.partial();

export type CreateGeographicRouteDto = z.infer<
  typeof CreateGeographicRouteDtoSchema
>;
export type UpdateGeographicRouteDto = z.infer<
  typeof UpdateGeographicRouteDtoSchema
>;

// Incident Response DTOs
export const CreateIncidentResponseDtoSchema = z.object({
  type: z.enum([
    'power-outage',
    'network-failure',
    'hardware-failure',
    'natural-disaster',
  ]),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  affectedDcs: z.array(z.string().uuid()),
  description: z.string().min(10).max(1000),
  playbook: z.string().min(1).max(200),
  status: z
    .enum(['resolved', 'detected', 'responding', 'mitigated'])
    .optional(),
});

export const UpdateIncidentResponseDtoSchema =
  CreateIncidentResponseDtoSchema.partial();

export type CreateIncidentResponseDto = z.infer<
  typeof CreateIncidentResponseDtoSchema
>;
export type UpdateIncidentResponseDto = z.infer<
  typeof UpdateIncidentResponseDtoSchema
>;

// Capacity Planning DTOs
export const CreateCapacityPlanDtoSchema = z.object({
  dcId: z.string().uuid(),
  period: z.object({
    start: z.date(),
    end: z.date(),
  }),
  projectedDemand: z.object({
    cpu: z.number().positive(),
    memory: z.number().positive(),
    storage: z.number().positive(),
    network: z.number().positive(),
  }),
});

export const UpdateCapacityPlanDtoSchema =
  CreateCapacityPlanDtoSchema.partial();

export type CreateCapacityPlanDto = z.infer<typeof CreateCapacityPlanDtoSchema>;
export type UpdateCapacityPlanDto = z.infer<typeof UpdateCapacityPlanDtoSchema>;

// A1 ICT Services DTOs
export const CreateA1IctServiceDtoSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  type: z.enum(['DRaaS', 'BaaS', 'TierIII-DC']),
  dcId: z.string().uuid(),
  status: z.string().min(1).max(50).optional(),
  configuration: z.object({
    sla: z.number().min(99.9).max(99.999),
    backupRetention: z.number().min(1).max(3650),
    recoveryTime: z.number().min(1).max(1440),
    replicationFrequency: z.number().min(1).max(1440),
  }),
  cost: z.number().positive(),
  contractEndDate: z.date(),
});

export const UpdateA1IctServiceDtoSchema =
  CreateA1IctServiceDtoSchema.partial();

export type CreateA1IctServiceDto = z.infer<typeof CreateA1IctServiceDtoSchema>;
export type UpdateA1IctServiceDto = z.infer<typeof UpdateA1IctServiceDtoSchema>;
