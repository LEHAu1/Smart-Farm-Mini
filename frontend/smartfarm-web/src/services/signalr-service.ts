import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
} from '@microsoft/signalr';
import { ACCESS_TOKEN_KEY } from './api-client';
import type { SensorTelemetryDto } from '../types/sensor';
import type { DeviceConnectionStatusDto } from '../types/device';
import type { DeviceCommandDto } from '../types/command';

export type SignalRConnectionStatus =
  | 'connected'
  | 'connecting'
  | 'reconnecting'
  | 'disconnected';

export type TelemetryHandler = (telemetry: SensorTelemetryDto) => void;
export type DeviceStatusHandler = (status: DeviceConnectionStatusDto) => void;
export type CommandStatusHandler = (command: DeviceCommandDto) => void;
export type StateChangeHandler = (status: SignalRConnectionStatus) => void;

function mapConnectionState(state: HubConnectionState): SignalRConnectionStatus {
  switch (state) {
    case HubConnectionState.Connected:
      return 'connected';
    case HubConnectionState.Connecting:
      return 'connecting';
    case HubConnectionState.Reconnecting:
      return 'reconnecting';
    case HubConnectionState.Disconnected:
    case HubConnectionState.Disconnecting:
    default:
      return 'disconnected';
  }
}

class SignalRService {
  private connection: HubConnection | null = null;
  private connectingPromise: Promise<void> | null = null;
  private isExplicitlyStopped = false;

  private telemetryHandlers = new Set<TelemetryHandler>();
  private deviceStatusHandlers = new Set<DeviceStatusHandler>();
  private commandStatusHandlers = new Set<CommandStatusHandler>();
  private stateChangeHandlers = new Set<StateChangeHandler>();

  private getHubUrl(): string {
    const rawBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5205';
    return `${rawBase.replace(/\/+$/, '')}/hubs/sensors`;
  }

  public getConnectionStatus(): SignalRConnectionStatus {
    if (!this.connection) return 'disconnected';
    return mapConnectionState(this.connection.state);
  }

  public isConnected(): boolean {
    return this.connection?.state === HubConnectionState.Connected;
  }

  public async connect(): Promise<void> {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (!token) {
      this.notifyStateChange('disconnected');
      return;
    }

    this.isExplicitlyStopped = false;

    if (this.connection) {
      if (this.connection.state === HubConnectionState.Connected) {
        this.notifyStateChange('connected');
        return;
      }
      if (this.connectingPromise) {
        return this.connectingPromise;
      }
    }

    this.connectingPromise = (async () => {
      try {
        if (!this.connection) {
          const hubUrl = this.getHubUrl();
          this.connection = new HubConnectionBuilder()
            .withUrl(hubUrl, {
              accessTokenFactory: () => localStorage.getItem(ACCESS_TOKEN_KEY) || '',
            })
            .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
            .configureLogging(import.meta.env.DEV ? LogLevel.Information : LogLevel.Warning)
            .build();

          // Register Hub event handlers
          this.connection.on('TelemetryUpdated', (data: SensorTelemetryDto) => {
            this.telemetryHandlers.forEach((handler) => {
              try {
                handler(data);
              } catch (err) {
                console.error('Error in TelemetryUpdated handler:', err);
              }
            });
          });

          this.connection.on('DeviceConnectionStatusChanged', (data: DeviceConnectionStatusDto) => {
            this.deviceStatusHandlers.forEach((handler) => {
              try {
                handler(data);
              } catch (err) {
                console.error('Error in DeviceConnectionStatusChanged handler:', err);
              }
            });
          });

          this.connection.on('CommandStatusUpdated', (data: DeviceCommandDto) => {
            this.commandStatusHandlers.forEach((handler) => {
              try {
                handler(data);
              } catch (err) {
                console.error('Error in CommandStatusUpdated handler:', err);
              }
            });
          });

          this.connection.onreconnecting(() => {
            this.notifyStateChange('reconnecting');
          });

          this.connection.onreconnected(() => {
            this.notifyStateChange('connected');
          });

          this.connection.onclose(() => {
            this.notifyStateChange('disconnected');
          });
        }

        if (this.connection.state === HubConnectionState.Disconnected && !this.isExplicitlyStopped) {
          this.notifyStateChange('connecting');
          await this.connection.start();
          this.notifyStateChange('connected');
        }
      } catch (error) {
        this.notifyStateChange('disconnected');
        if (import.meta.env.DEV) {
          console.warn('SignalR connection failed (may retry or server offline):', error);
        }
      } finally {
        this.connectingPromise = null;
      }
    })();

    return this.connectingPromise;
  }

  public async disconnect(): Promise<void> {
    this.isExplicitlyStopped = true;
    if (this.connection) {
      try {
        await this.connection.stop();
      } catch (err) {
        console.warn('Error closing SignalR connection:', err);
      } finally {
        this.connection = null;
        this.notifyStateChange('disconnected');
      }
    }
  }

  private notifyStateChange(status: SignalRConnectionStatus) {
    this.stateChangeHandlers.forEach((handler) => {
      try {
        handler(status);
      } catch (err) {
        console.error('Error in stateChange handler:', err);
      }
    });
  }

  public onTelemetryUpdated(handler: TelemetryHandler): () => void {
    this.telemetryHandlers.add(handler);
    return () => this.telemetryHandlers.delete(handler);
  }

  public onDeviceConnectionStatusChanged(handler: DeviceStatusHandler): () => void {
    this.deviceStatusHandlers.add(handler);
    return () => this.deviceStatusHandlers.delete(handler);
  }

  public onCommandStatusUpdated(handler: CommandStatusHandler): () => void {
    this.commandStatusHandlers.add(handler);
    return () => this.commandStatusHandlers.delete(handler);
  }

  public onStateChange(handler: StateChangeHandler): () => void {
    this.stateChangeHandlers.add(handler);
    handler(this.getConnectionStatus());
    return () => this.stateChangeHandlers.delete(handler);
  }
}

export const signalRService = new SignalRService();
