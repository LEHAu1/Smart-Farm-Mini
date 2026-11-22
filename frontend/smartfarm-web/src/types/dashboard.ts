import type { AlertDto } from './alert';
import type { IrrigationLogDto } from './irrigation';

export interface DeviceOverviewDto {
  totalDevices: number;
  onlineDevices: number;
  offlineDevices: number;
  activeIrrigatingDevices: number;
}

export interface SensorOverviewDto {
  averageSoilMoisture?: number | null;
  averageAirTemperature?: number | null;
  averageAirHumidity?: number | null;
  averageWaterTemperature?: number | null;
  averageWaterLevel?: number | null;
}

export interface DashboardSummaryDto {
  devices: DeviceOverviewDto;
  sensors: SensorOverviewDto;
  isAnyPumpRunning: boolean;
  recentAlerts: AlertDto[];
  recentIrrigationLogs: IrrigationLogDto[];
}

