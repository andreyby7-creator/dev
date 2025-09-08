export enum NotificationType {
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push',
  WEBHOOK = 'webhook',
}

export enum NotificationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export interface INotification {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  recipient: string;
  subject?: string;
  content: string;
  metadata?: Record<string, unknown>;
  scheduledAt?: Date;
  sentAt?: Date;
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
  maxRetries?: number;
  retryCount?: number;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICreateNotificationDto {
  type: NotificationType;
  priority: NotificationPriority;
  recipient: string;
  subject?: string;
  content: string;
  metadata?: Record<string, unknown>;
  scheduledAt?: Date;
  maxRetries?: number;
}

export interface IUpdateNotificationDto {
  type?: NotificationType;
  priority?: NotificationPriority;
  recipient?: string;
  subject?: string;
  content?: string;
  metadata?: Record<string, unknown>;
  scheduledAt?: Date;
  maxRetries?: number;
}

export interface INotificationTemplate {
  id: string;
  name: string;
  type: NotificationType;
  subject: string;
  content: string;
  variables: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface INotificationChannel {
  id: string;
  type: NotificationType;
  name: string;
  config: Record<string, unknown>;
  isActive: boolean;
  priority: number;
  rateLimit?: {
    maxPerMinute: number;
    maxPerHour: number;
    maxPerDay: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface INotificationPreference {
  id: string;
  userId: string;
  type: NotificationType;
  isEnabled: boolean;
  channels: NotificationType[];
  schedule?: {
    startTime: string;
    endTime: string;
    timezone: string;
    daysOfWeek: number[];
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface INotificationQueue {
  id: string;
  notificationId: string;
  channelId: string;
  priority: NotificationPriority;
  scheduledAt: Date;
  attempts: number;
  maxAttempts: number;
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}

export interface INotificationStats {
  total: number;
  pending: number;
  sent: number;
  failed: number;
  cancelled: number;
  totalDelivered: number;
  deliveryRate: number;
  averageDeliveryTime: number;
  byType: Record<NotificationType, number>;
  byPriority: Record<NotificationPriority, number>;
  channelStats: Record<
    NotificationType,
    {
      sent: number;
      delivered: number;
      failed: number;
      rate: number;
    }
  >;
  period: {
    start: Date;
    end: Date;
  };
}
