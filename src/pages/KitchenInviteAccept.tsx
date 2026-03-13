import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { MunchLogo } from '@/components/MunchLogo';
import { toast } from 'sonner';
import { useStore } from '@/lib/store';

interface InvitePreview {
  invite_id: string;
  kitchen_id: string;
  kitchen_name: string;
  role: 'owner' | 'editor' | 'viewer';
  email: string | null;
  status: 'pending' | 'accepted' | 'revoked' | 'expired';
  expires_at: string | null;
}

export default function KitchenInviteAccept() {
  const navigate = useNavigate();
  const { token } = useParams<{ token: string }>();
  const { setActiveKitchen } = useStore();
  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [profileReady, setProfileReady] = useState(false);

  useEffect(() => {
    let active = true;

    const load = async () => {
      if (!token) return;
      setLoading(true);
      try {
        const [{ data: inviteRows, error: inviteError }, { data: sessionData }] = await Promise.all([
          supabase.rpc('get_kitchen_invite_preview', { invite_uuid: token }),
          supabase.auth.getSession(),
        ]);

        if (inviteError) throw inviteError;

        if (!active) return;

        const invite = inviteRows?.[0] || null;
        setPreview(invite);

        const session = sessionData.session;
        setHasSession(Boolean(session));

        if (session?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('display_name, username')
            .eq('user_id', session.user.id)
            .maybeSingle();

          if (!active) return;
          setProfileReady(Boolean(profile?.display_name && (profile as any)?.username));
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Could not load invite';
        toast.error(message);
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [token]);

  const handleAccept = async () => {
    if (!token || !preview) return;

    if (!hasSession) {
      navigate(`/auth?next=${encodeURIComponent(`/invite/kitchen/${token}`)}`);
      return;
    }

    if (!profileReady) {
      navigate(`/onboarding?next=${encodeURIComponent(`/invite/kitchen/${token}`)}`);
      return;
    }

    setAccepting(true);
    try {
      const { data, error } = await supabase.rpc('accept_kitchen_invite', { invite_uuid: token });
      if (error) throw error;

      const acceptedKitchen = data?.[0];
      setActiveKitchen({
        id: acceptedKitchen?.kitchen_id || preview.kitchen_id,
        name: acceptedKitchen?.kitchen_name || preview.kitchen_name,
        role: preview.role,
      });

      toast.success(`Joined ${preview.kitchen_name}`);
      navigate('/kitchens', { replace: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not accept invite';
      toast.error(message);
    } finally {
      setAccepting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background px-6 py-10 flex items-center justify-center">
      <div className="w-full max-w-md rounded-3xl border border-orange-100 bg-white p-6 shadow-sm">
        <MunchLogo className="justify-center mb-6" size={56} wordmarkClassName="font-display text-3xl font-bold text-foreground" />

        {loading ? (
          <div className="py-16 text-center text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-3" />
            Loading invite...
          </div>
        ) : !preview ? (
          <div className="space-y-4 text-center">
            <h1 className="font-display text-3xl font-bold text-foreground">Invite not found</h1>
            <p className="text-muted-foreground">This kitchen invite may have expired or been removed.</p>
            <Button className="w-full" onClick={() => navigate('/dashboard')}>
              Go to Munch
            </Button>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex justify-center">
              <div className="h-14 w-14 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center">
                <Users className="h-7 w-7" />
              </div>
            </div>

            <div className="text-center">
              <h1 className="font-display text-3xl font-bold text-foreground">Join {preview.kitchen_name}</h1>
              <p className="mt-2 text-muted-foreground">
                You’ve been invited to join this kitchen as a {preview.role}.
              </p>
            {preview.email && (
              <p className="mt-2 text-sm text-muted-foreground">
                This invite is reserved for <span className="font-semibold text-foreground">{preview.email}</span>.
              </p>
            )}
            {preview.status !== 'pending' && (
              <p className="mt-2 text-sm text-red-500">
                This invite is currently {preview.status}.
              </p>
            )}
            </div>

            {!hasSession && (
              <p className="text-sm text-muted-foreground text-center">
                Sign in or create an account first, and we’ll bring you right back here.
              </p>
            )}

            {hasSession && !profileReady && (
              <p className="text-sm text-muted-foreground text-center">
                Finish onboarding first so your display name and username are set before joining.
              </p>
            )}

            <Button className="w-full h-12 text-base font-semibold" onClick={() => void handleAccept()} disabled={accepting || preview.status !== 'pending'}>
              {accepting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Joining...
                </>
              ) : !hasSession ? (
                'Sign In to Accept'
              ) : !profileReady ? (
                'Finish Setup'
              ) : (
                'Accept Invite'
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
