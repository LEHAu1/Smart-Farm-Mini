export enum CommandStatus {
  Pending = 1,
  Acknowledged = 2,
  Completed = 3,
  Failed = 4,
}

export interface DeviceCommandDto {
  id: string;
  deviceId: string;
  commandCode: string;
  action: string;
  payload?: string | null;
  status: CommandStatus;
  statusName: string;
  createdAtUtc: string;
  acknowledgedAtUtc?: string | null;
  completedAtUtc?: string | null;
  errorMessage?: string | null;
}

export interface CreateDeviceCommandRequest {
  deviceId: string;
  action: string;
  payload?: string;
}
