import { Bell, CheckCheck, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useNotifications } from '@/hooks/useNotifications';

function formatRelative(timestamp: string) {
  const diffMs = Date.now() - new Date(timestamp).getTime();
  const diffMin = Math.max(1, Math.floor(diffMs / 60000));
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

export default function NotificationsPage() {
  const navigate = useNavigate();
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead } = useNotifications();

  const handleOpen = async (notification: typeof notifications[number]) => {
    try {
      if (!notification.read_at) {
        await markAsRead(notification.id);
      }

      if (notification.type === 'kitchen_invite') {
        navigate('/kitchens');
        return;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not open notification';
      toast.error(message);
    }
  };

  const handleMarkAll = async () => {
    try {
      await markAllAsRead();
      toast.success('Marked all notifications as read');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not update notifications';
      toast.error(message);
    }
  };

  return (
    <div className="min-h-full px-6 py-6" style={{ background: '#FFFAF5' }}>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold text-orange-400 uppercase tracking-widest mb-1">Inbox</p>
            <h1 className="text-2xl font-bold text-stone-900" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
              Notifications
            </h1>
            <p className="text-sm text-stone-500 mt-1">
              Kitchen invites and shared activity show up here.
            </p>
          </div>
          <Button variant="outline" onClick={() => void handleMarkAll()} disabled={unreadCount === 0}>
            <CheckCheck className="h-4 w-4 mr-2" />
            Mark all read
          </Button>
        </div>

        <div className="rounded-3xl border border-stone-200 bg-white p-5 space-y-3">
          {loading ? (
            <div className="rounded-2xl border border-dashed border-stone-200 px-4 py-8 text-sm text-stone-400 text-center">
              Loading notifications...
            </div>
          ) : notifications.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-stone-200 px-4 py-10 text-center">
              <Bell className="h-8 w-8 text-stone-300 mx-auto mb-3" />
              <p className="text-sm font-semibold text-stone-600">No notifications yet</p>
              <p className="text-xs text-stone-400 mt-1">When someone adds you to a kitchen, it will show up here.</p>
            </div>
          ) : (
            notifications.map((notification) => (
              <button
                key={notification.id}
                onClick={() => void handleOpen(notification)}
                className={`w-full rounded-2xl border px-4 py-4 text-left transition-colors ${
                  notification.read_at
                    ? 'border-stone-200 bg-white'
                    : 'border-orange-200 bg-orange-50/70'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 flex h-10 w-10 items-center justify-center rounded-full ${
                      notification.type === 'kitchen_invite' ? 'bg-orange-100 text-orange-600' : 'bg-stone-100 text-stone-600'
                    }`}>
                      <Users className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-stone-900">{notification.title}</p>
                      <p className="mt-1 text-sm text-stone-600">{notification.body}</p>
                      <p className="mt-2 text-xs text-stone-400">{formatRelative(notification.created_at)}</p>
                    </div>
                  </div>
                  {!notification.read_at && (
                    <span className="mt-1 inline-flex h-2.5 w-2.5 rounded-full bg-orange-500" />
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
