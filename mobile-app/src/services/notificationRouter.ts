/**
 * Centralized notification → navigation.
 *
 * A single place that turns a notification's data payload into a navigation
 * action, used by every entry point (foreground, background tap, killed/
 * cold-start). Do NOT duplicate this logic in listeners.
 *
 * Payload contract (matches the backend SNS payload — see notifications/sns):
 *   { type, screen?, entityId?, ...data }
 */
import { createNavigationContainerRef } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef();

/** Logical `screen` value → actual navigator route name. */
const SCREEN_ROUTES: Record<string, string> = {
  certificate: 'CertificationDetail',
  certification: 'CertificationDetail',
  application: 'ApplicationDetail',
  renewal: 'RenewalCenter',
  payment: 'PaymentsDashboard',
  ticket: 'TicketDetails',
  support: 'TicketDetails',
  inspection: 'InspectionDetails',
  shipment: 'ShipmentDetails',
  testing: 'TestDetail',
  notification: 'Notifications',
};

// Route names known to the navigators — a `screen` that is already a real
// route name is used verbatim; otherwise we fall back to the inbox.
const FALLBACK_ROUTE = 'Notifications';

function resolveRoute(data: Record<string, any>): { route: string; params?: Record<string, any> } {
  const screen = (data.screen ?? '').toString();
  const type = (data.type ?? '').toString();

  const route =
    SCREEN_ROUTES[screen] ??
    SCREEN_ROUTES[type] ??
    (screen && /^[A-Z]/.test(screen) ? screen : undefined) ?? // already a route name
    FALLBACK_ROUTE;

  const params: Record<string, any> = { ...data };
  if (data.entityId !== undefined && params.id === undefined) params.id = data.entityId;

  return { route, params };
}

/**
 * Navigate in response to a notification. Safe to call before the container is
 * ready (queues a short retry) and never throws — an unknown target opens the inbox.
 */
export function handleNotificationData(data: Record<string, any> | undefined | null, attempt = 0): void {
  if (!data) return;
  if (!navigationRef.isReady()) {
    if (attempt < 20) setTimeout(() => handleNotificationData(data, attempt + 1), 250);
    return;
  }
  try {
    const { route, params } = resolveRoute(data);
    // @ts-expect-error — dynamic route/params by design (payload-driven)
    navigationRef.navigate(route, params);
  } catch {
    try {
      // @ts-expect-error — inbox fallback
      navigationRef.navigate(FALLBACK_ROUTE);
    } catch {
      /* navigation not available — ignore */
    }
  }
}

/** Convenience for a notification response object from expo-notifications. */
export function handleNotificationResponse(response: any): void {
  const data = response?.notification?.request?.content?.data as Record<string, any> | undefined;
  handleNotificationData(data);
}
