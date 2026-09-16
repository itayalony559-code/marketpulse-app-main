import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

const STORAGE_KEY = 'marketpulse_alert_symbols';

type AlertContextType = {
  alertSymbols: string[];
  toggleAlert: (symbol: string) => void;
  hasAlert: (symbol: string) => boolean;
  requestPermission: () => Promise<NotificationPermission>;
  permission: NotificationPermission;
};

const AlertContext = createContext<AlertContextType | undefined>(undefined);

function readStored(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function AlertProvider({ children }: { children: ReactNode }) {
  const [alertSymbols, setAlertSymbols] = useState<string[]>(readStored);
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied',
  );

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(alertSymbols));
    } catch {
      /* ignore */
    }
  }, [alertSymbols]);

  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (typeof Notification === 'undefined') return 'denied';
    const result = await Notification.requestPermission();
    setPermission(result);
    return result;
  }, []);

  const toggleAlert = useCallback(
    (symbol: string) => {
      setAlertSymbols((prev) =>
        prev.includes(symbol) ? prev.filter((s) => s !== symbol) : [...prev, symbol],
      );
    },
    [],
  );

  const hasAlert = useCallback(
    (symbol: string) => alertSymbols.includes(symbol),
    [alertSymbols],
  );

  const value = useMemo<AlertContextType>(
    () => ({ alertSymbols, toggleAlert, hasAlert, requestPermission, permission }),
    [alertSymbols, toggleAlert, hasAlert, requestPermission, permission],
  );

  return <AlertContext.Provider value={value}>{children}</AlertContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAlerts(): AlertContextType {
  const ctx = useContext(AlertContext);
  if (!ctx) throw new Error('useAlerts must be used within an AlertProvider');
  return ctx;
}

export function sendNewsAlert(symbol: string, headline: string) {
  if (typeof Notification === 'undefined') return;
  if (Notification.permission !== 'granted') return;
  new Notification(`${symbol} News Alert`, {
    body: headline,
    icon: '/favicon.ico',
    tag: `news-${symbol}`,
  });
}
