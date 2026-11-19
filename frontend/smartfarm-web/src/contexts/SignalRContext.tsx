import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import {
  signalRService,
  type SignalRConnectionStatus,
  type SignalRTransport,
  type TelemetryHandler,
  type DeviceStatusHandler,
  type CommandStatusHandler,
} from '../services/signalr-service';
import { useAuth } from './AuthContext';
import type { SensorTelemetryDto } from '../types/sensor';
import type { DeviceConnectionStatusDto } from '../types/device';
import type { DeviceCommandDto } from '../types/command';

interface SignalRContextType {
  connectionStatus: SignalRConnectionStatus;
  isConnected: boolean;
  /** Actual transport being used: WebSocket | ServerSentEvents | LongPolling | Unknown */
  transport: SignalRTransport;
  lastTelemetry: SensorTelemetryDto | null;
  lastDeviceStatus: DeviceConnectionStatusDto | null;
  lastCommandStatus: DeviceCommandDto | null;
  onTelemetry: (handler: TelemetryHandler) => () => void;
  onDeviceStatus: (handler: DeviceStatusHandler) => () => void;
  onCommandStatus: (handler: CommandStatusHandler) => () => void;
  reconnect: () => Promise<void>;
}

const SignalRContext = createContext<SignalRContextType | undefined>(undefined);

export function SignalRProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [connectionStatus, setConnectionStatus] = useState<SignalRConnectionStatus>(
    () => signalRService.getConnectionStatus()
  );
  const [transport, setTransport] = useState<SignalRTransport>('Unknown');
  const [lastTelemetry, setLastTelemetry] = useState<SensorTelemetryDto | null>(null);
  const [lastDeviceStatus, setLastDeviceStatus] = useState<DeviceConnectionStatusDto | null>(null);
  const [lastCommandStatus, setLastCommandStatus] = useState<DeviceCommandDto | null>(null);

  // Manage connection lifecycle according to auth state
  useEffect(() => {
    let isCancelled = false;

    // Track connection state changes — also read the transport when connected
    const unsubState = signalRService.onStateChange((status) => {
      if (!isCancelled) {
        setConnectionStatus(status);
        // Defer slightly so the internal _transport field is populated
        if (status === 'connected') {
          setTimeout(() => {
            if (!isCancelled) setTransport(signalRService.getTransport());
          }, 100);
        } else {
          setTransport('Unknown');
        }
      }
    });

    // Track latest events in state
    const unsubTelemetry = signalRService.onTelemetryUpdated((data) => {
      if (!isCancelled) {
        setLastTelemetry(data);
      }
    });

    const unsubDeviceStatus = signalRService.onDeviceConnectionStatusChanged((data) => {
      if (!isCancelled) {
        setLastDeviceStatus(data);
      }
    });

    const unsubCommand = signalRService.onCommandStatusUpdated((data) => {
      if (!isCancelled) {
        setLastCommandStatus(data);
      }
    });

    if (isAuthenticated) {
      signalRService.connect().catch(() => {
        // Handled internally in service
      });
    } else {
      signalRService.disconnect().catch(() => {
        // Handled internally in service
      });
      setLastTelemetry(null);
      setLastDeviceStatus(null);
      setLastCommandStatus(null);
      setTransport('Unknown');
    }

    return () => {
      isCancelled = true;
      unsubState();
      unsubTelemetry();
      unsubDeviceStatus();
      unsubCommand();
    };
  }, [isAuthenticated]);

  const onTelemetry = useCallback((handler: TelemetryHandler) => {
    return signalRService.onTelemetryUpdated(handler);
  }, []);

  const onDeviceStatus = useCallback((handler: DeviceStatusHandler) => {
    return signalRService.onDeviceConnectionStatusChanged(handler);
  }, []);

  const onCommandStatus = useCallback((handler: CommandStatusHandler) => {
    return signalRService.onCommandStatusUpdated(handler);
  }, []);

  const reconnect = useCallback(async () => {
    await signalRService.disconnect();
    await signalRService.connect();
  }, []);

  return (
    <SignalRContext.Provider
      value={{
        connectionStatus,
        isConnected: connectionStatus === 'connected',
        transport,
        lastTelemetry,
        lastDeviceStatus,
        lastCommandStatus,
        onTelemetry,
        onDeviceStatus,
        onCommandStatus,
        reconnect,
      }}
    >
      {children}
    </SignalRContext.Provider>
  );
}

export function useSensorHub(): SignalRContextType {
  const context = useContext(SignalRContext);
  if (!context) {
    throw new Error('useSensorHub must be used within a SignalRProvider');
  }
  return context;
}
