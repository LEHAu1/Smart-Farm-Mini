export enum SensorType {
  SoilMoisture = 1,
  AirTemperature = 2,
  AirHumidity = 3,
  WaterTemperature = 4,
  WaterLevel = 5,
}

export interface SensorTelemetryDto {
  deviceId: string;
  soilMoisture?: number | null;
  airTemperature?: number | null;
  airHumidity?: number | null;
  waterTemperature?: number | null;
  waterLevel?: number | null;
  lastUpdatedAtUtc?: string | null;
}

export interface SensorDataPointDto {
  value: number;
  timestampUtc: string;
}

export interface SensorHistoryDto {
  deviceId: string;
  sensorType: SensorType;
  sensorTypeName: string;
  unit: string;
  dataPoints: SensorDataPointDto[];
}

export interface SensorAggregateDto {
  id: string;
  deviceId: string;
  sensorType: SensorType;
  sensorTypeName: string;
  hourBucket: string;
  avgValue: number;
  minValue: number;
  maxValue: number;
  sampleCount: number;
  unit: string;
  aggregatedAtUtc: string;
}

