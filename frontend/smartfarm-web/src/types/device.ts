export interface DeviceDto {
  id: string;
  ownerId: string;
  deviceCode: string;
  name: string;
  description?: string | null;
  isOnline: boolean;
  isActive: boolean;
  createdAtUtc: string;
  updatedAtUtc: string;
  lastSeenAtUtc?: string | null;
}

export interface CreateDeviceRequest {
  ownerId?: string;
  deviceCode: string;
  name: string;
  description?: string;
}

export interface UpdateDeviceRequest {
  name: string;
  description?: string;
}

