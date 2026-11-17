export enum IrrigationMode {
  Manual = 1,
  Automatic = 2,
}

export enum IrrigationStatus {
  InProgress = 1,
  Completed = 2,
  Stopped = 3,
  Failed = 4,
}

export interface IrrigationRuleDto {
  id: string;
  deviceId: string;
  name: string;
  moistureThreshold: number;
  targetMoisture: number;
  minIntervalMinutes: number;
  maxDurationSeconds: number;
  isEnabled: boolean;
  createdAtUtc: string;
  updatedAtUtc: string;
  lastTriggeredAtUtc?: string | null;
}

export interface CreateIrrigationRuleRequest {
  deviceId: string;
  name: string;
  moistureThreshold: number;
  targetMoisture: number;
  minIntervalMinutes: number;
  maxDurationSeconds: number;
}

export interface UpdateIrrigationRuleRequest {
  name: string;
  moistureThreshold: number;
  targetMoisture: number;
  minIntervalMinutes: number;
  maxDurationSeconds: number;
}

export interface ToggleIrrigationRuleRequest {
  isEnabled?: boolean;
}

export interface IrrigationStatusDto {
  deviceId: string;
  isPumpRunning: boolean;
  currentMode: IrrigationMode;
  lastIrrigationStartedAtUtc?: string | null;
  lastIrrigationDurationSeconds?: number | null;
  lastSoilMoisture?: number | null;
}

export interface IrrigationLogDto {
  id: string;
  deviceId: string;
  mode: IrrigationMode;
  modeName: string;
  status: IrrigationStatus;
  statusName: string;
  soilMoistureBefore?: number | null;
  soilMoistureAfter?: number | null;
  waterAmountMl?: number | null;
  startedAtUtc: string;
  completedAtUtc?: string | null;
  durationSeconds?: number | null;
  note?: string | null;
}

