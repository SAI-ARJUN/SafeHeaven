import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface Alert {
  id: number;
  profile_id: number;
  latitude: number;
  longitude: number;
  location_name: string;
  severity: string;
  description: string;
  dismissed: boolean;
  created_at: string;
}

interface UseRealtimeAlertsOptions {
  onNewAlert?: (alert: Alert) => void;
  onAlertDismissed?: (alert: Alert) => void;
  enabled?: boolean;
}

export function useRealtimeAlerts({
  onNewAlert,
  onAlertDismissed,
  enabled = true,
}: UseRealtimeAlertsOptions = {}) {
  const { toast } = useToast();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const lastAlertIdRef = useState<number>(0);

  useEffect(() => {
    if (!enabled) return;

    const fetchAlerts = async () => {
      try {
        const data = await api.alerts.getAll();
        const newAlerts = data || [];
        
        // Check for new alerts
        newAlerts.forEach((alert: Alert) => {
          if (alert.id > lastAlertIdRef[0]) {
            // Show toast notification
            if (alert.location_name) {
              toast({
                title: '🚨 Danger Zone Alert!',
                description: `${alert.location_name} (${alert.severity} risk)`,
                variant: 'destructive',
              });
            } else {
              toast({
                title: `⚠️ Status Alert: ${alert.severity?.toUpperCase()}`,
                description: alert.description,
                variant: alert.severity === 'danger' ? 'destructive' : 'default',
              });
            }

            onNewAlert?.(alert);
            lastAlertIdRef[0] = alert.id;
          }
        });
        
        setAlerts(newAlerts);
      } catch (error) {
        console.error('Alert fetch error:', error);
      }
    };

    fetchAlerts();

    // Poll for updates every 5 seconds (replaces realtime subscriptions)
    const intervalId = setInterval(fetchAlerts, 5000);

    return () => {
      clearInterval(intervalId);
    };
  }, [enabled, toast]);

  return { alerts };
}
