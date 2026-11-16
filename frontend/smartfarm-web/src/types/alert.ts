export enum AlertSeverity {
  Info = 1,
  Warning = 2,
  Critical = 3,
}

export interface AlertDto {
  id: string;
  deviceId: string;
  alertCode: string;
  title: string;
  message: string;
  severity: AlertSeverity;
  severityName: string;
  isResolved: boolean;
  createdAtUtc: string;
  resolvedAtUtc?: string | null;
}

