import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  HttpTransportType,
  LogLevel,
} from '@microsoft/signalr';

/** Human-readable transport name inferred from the active connection */
export type SignalRTransport = 'WebSocket' | 'ServerSentEvents' | 'LongPolling' | 'Unknown';
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
  private initialRetryTimer: ReturnType<typeof setTimeout> | null = null;

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

  /**
   * Returns the actual SignalR transport currently in use.
   * @microsoft/signalr stores the active transport on the internal
   * `_transport` field, which is typed as `any`. We read it defensively.
   */
  public getTransport(): SignalRTransport {
    if (!this.connection || this.connection.state !== HubConnectionState.Connected) {
      return 'Unknown';
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const internal = this.connection as any;
    const transport: HttpTransportType | undefined =
      internal._transport?.transferFormat !== undefined
        ? internal._transport?.transport
        : internal._connectionState?.selectedTransport;

    switch (transport) {
      case HttpTransportType.WebSockets:
        return 'WebSocket';
      case HttpTransportType.ServerSentEvents:
        return 'ServerSentEvents';
      case HttpTransportType.LongPolling:
        return 'LongPolling';
      default:
        // Fallback: check constructor name of internal transport
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        {
          const name: string = internal._transport?.constructor?.name || '';
          if (name.includes('WebSocket')) return 'WebSocket';
          if (name.includes('ServerSent')) return 'ServerSentEvents';
          if (name.includes('LongPolling')) return 'LongPolling';
        }
        return 'Unknown';
    }
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
            this.scheduleInitialRetry();
          });
        }

        if (this.connection.state === HubConnectionState.Disconnected && !this.isExplicitlyStopped) {
          this.notifyStateChange('connecting');
          await this.connection.start();
          this.notifyStateChange('connected');
        }
      } catch (error) {
        this.notifyStateChange('reconnecting');
        if (import.meta.env.DEV) {
          console.warn('SignalR connection failed (may retry or server offline):', error);
        }
        this.scheduleInitialRetry();
      } finally {
        this.connectingPromise = null;
      }
    })();

    return this.connectingPromise;
  }

  public async disconnect(): Promise<void> {
    this.isExplicitlyStopped = true;
    if (this.initialRetryTimer !== null) {
      clearTimeout(this.initialRetryTimer);
      this.initialRetryTimer = null;
    }
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

  private scheduleInitialRetry(): void {
    if (this.isExplicitlyStopped || this.initialRetryTimer !== null) return;
    this.initialRetryTimer = setTimeout(() => {
      this.initialRetryTimer = null;
      if (!this.isExplicitlyStopped) void this.connect();
    }, 5000);
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
