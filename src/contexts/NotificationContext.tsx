import {
  createContext,
  useCallback,
  useContext,
  useReducer,
  type ReactNode,
} from 'react'
import { toast } from 'sonner'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type NotificationKind = 'import_complete' | 'badge_unlocked' | 'level_up'

export interface AppNotification {
  id: string
  kind: NotificationKind
  title: string
  body: string
  /** Arbitrary metadata — importId, badgeId, newLevel, etc. */
  meta?: Record<string, unknown>
  read: boolean
  createdAt: Date
}

// Discriminated union for dispatch actions
export type NotificationAction =
  | {
      type: 'ADD'
      notification: Omit<AppNotification, 'id' | 'read' | 'createdAt'>
    }
  | { type: 'MARK_READ'; id: string }
  | { type: 'MARK_ALL_READ' }
  | { type: 'DISMISS'; id: string }

interface NotificationContextValue {
  notifications: AppNotification[]
  unreadCount: number
  dispatch: (action: NotificationAction) => void
  markRead: (id: string) => void
  markAllRead: () => void
  dismiss: (id: string) => void
}

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

function notificationReducer(
  state: AppNotification[],
  action: NotificationAction,
): AppNotification[] {
  switch (action.type) {
    case 'ADD': {
      const notification: AppNotification = {
        ...action.notification,
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        read: false,
        createdAt: new Date(),
      }
      return [notification, ...state]
    }
    case 'MARK_READ':
      return state.map((n) => (n.id === action.id ? { ...n, read: true } : n))
    case 'MARK_ALL_READ':
      return state.map((n) => ({ ...n, read: true }))
    case 'DISMISS':
      return state.filter((n) => n.id !== action.id)
    default:
      return state
  }
}

// ---------------------------------------------------------------------------
// Toast side-effects per notification kind
// ---------------------------------------------------------------------------

function showToastForNotification(
  notification: Omit<AppNotification, 'id' | 'read' | 'createdAt'>,
) {
  switch (notification.kind) {
    case 'import_complete':
      toast.success(notification.title, { description: notification.body })
      break
    case 'badge_unlocked':
      toast.success(notification.title, { description: notification.body })
      break
    case 'level_up':
      toast.success(notification.title, { description: notification.body })
      break
  }
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const NotificationContext = createContext<NotificationContextValue | null>(null)

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, rawDispatch] = useReducer(notificationReducer, [])

  const dispatch = useCallback((action: NotificationAction) => {
    if (action.type === 'ADD') {
      showToastForNotification(action.notification)
    }
    rawDispatch(action)
  }, [])

  const markRead = useCallback((id: string) => {
    rawDispatch({ type: 'MARK_READ', id })
  }, [])

  const markAllRead = useCallback(() => {
    rawDispatch({ type: 'MARK_ALL_READ' })
  }, [])

  const dismiss = useCallback((id: string) => {
    rawDispatch({ type: 'DISMISS', id })
  }, [])

  const unreadCount = notifications.filter((n) => !n.read).length

  return (
    <NotificationContext.Provider
      value={{ notifications, unreadCount, dispatch, markRead, markAllRead, dismiss }}
    >
      {children}
    </NotificationContext.Provider>
  )
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Access the in-app notification list and dispatch new notifications.
 *
 * Notifications live in memory for the current session — they are not
 * persisted to the database. Realtime hooks (useChannelImportRealtime,
 * useBadgeUnlockRealtime) are the primary producers.
 *
 * Must be used inside <NotificationProvider>.
 */
export function useNotifications(): NotificationContextValue {
  const ctx = useContext(NotificationContext)
  if (!ctx) {
    throw new Error('useNotifications must be used inside <NotificationProvider>')
  }
  return ctx
}

/*
Usage — reading notifications (e.g. in a NotificationTray component):
  const { notifications, unreadCount, markRead, dismiss } = useNotifications()

  <Bell badgeCount={unreadCount} />
  {notifications.map(n => (
    <NotificationItem
      key={n.id}
      notification={n}
      onRead={() => markRead(n.id)}
      onDismiss={() => dismiss(n.id)}
    />
  ))}

Usage — dispatching from a hook:
  const { dispatch } = useNotifications()

  dispatch({
    type: 'ADD',
    notification: {
      kind: 'level_up',
      title: 'Level up!',
      body: 'You reached level 5.',
      meta: { newLevel: 5 },
    },
  })
*/
