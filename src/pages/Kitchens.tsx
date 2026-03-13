import { useEffect, useMemo, useState } from 'react';
import { Crown, Home, MailPlus, Plus, Settings2, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { useKitchens } from '@/hooks/useKitchens';
import { useStore } from '@/lib/store';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function KitchensPage() {
  const {
    kitchens,
    invites,
    membersByKitchen,
    loading,
    createKitchen,
    inviteToKitchen,
    loadKitchenMembers,
    updateKitchenMemberRole,
    removeKitchenMember,
  } = useKitchens();
  const { activeKitchenId, setActiveKitchen } = useStore();
  const [newKitchenName, setNewKitchenName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('editor');
  const [submitting, setSubmitting] = useState(false);
  const [manageKitchenId, setManageKitchenId] = useState<string | null>(null);

  const activeKitchen = useMemo(
    () => kitchens.find((kitchen) => kitchen.id === activeKitchenId) || null,
    [kitchens, activeKitchenId],
  );

  const managedKitchen = useMemo(
    () => kitchens.find((kitchen) => kitchen.id === manageKitchenId) || null,
    [kitchens, manageKitchenId],
  );
  const managedMembers = managedKitchen ? membersByKitchen[managedKitchen.id] || [] : [];

  useEffect(() => {
    if (!manageKitchenId) return;
    void loadKitchenMembers(manageKitchenId);
  }, [manageKitchenId, loadKitchenMembers]);

  const handleCreateKitchen = async () => {
    const name = newKitchenName.trim();
    if (!name) return;
    setSubmitting(true);
    try {
      await createKitchen(name);
      setNewKitchenName('');
      toast.success(`Created kitchen "${name}"`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not create kitchen';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleInvite = async () => {
    if (!activeKitchen) {
      toast.info('Select or create a kitchen first.');
      return;
    }

    const email = inviteEmail.trim().toLowerCase();
    if (!email) return;

    setSubmitting(true);
    try {
      await inviteToKitchen(activeKitchen.id, email, inviteRole);
      setInviteEmail('');
      toast.success(`Invite created for ${email}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not create invite';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRoleChange = async (membershipId: string, kitchenId: string, role: 'editor' | 'viewer') => {
    setSubmitting(true);
    try {
      await updateKitchenMemberRole(membershipId, kitchenId, role);
      toast.success('Member role updated');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not update member';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveMember = async (membershipId: string, kitchenId: string) => {
    setSubmitting(true);
    try {
      await removeKitchenMember(membershipId, kitchenId);
      toast.success('Member removed');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not remove member';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-full px-6 py-6" style={{ background: '#FFFAF5' }}>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold text-orange-400 uppercase tracking-widest mb-1">Collaboration</p>
            <h1 className="text-2xl font-bold text-stone-900" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
              Kitchens
            </h1>
            <p className="text-sm text-stone-500 mt-1">
              Use kitchens to share recipes, cookbooks, grocery lists, and meal plans with the people you cook with.
            </p>
          </div>
          {activeKitchen && (
            <div className="rounded-2xl border border-orange-200 bg-white px-4 py-3 text-right">
              <p className="text-[10px] font-bold uppercase tracking-widest text-orange-500">Active kitchen</p>
              <p className="text-sm font-semibold text-stone-800 mt-1">{activeKitchen.name}</p>
            </div>
          )}
        </div>

        <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-5">
          <div className="rounded-3xl border border-stone-200 bg-white p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-stone-900">Your kitchens</p>
                <p className="text-xs text-stone-500 mt-1">Choose the shared space you want to work inside.</p>
              </div>
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-stone-400">
                <Users size={14} /> {kitchens.length}
              </div>
            </div>

            <div className="space-y-3">
              {loading ? (
                <div className="rounded-2xl border border-dashed border-stone-200 px-4 py-6 text-sm text-stone-400 text-center">
                  Loading kitchens...
                </div>
              ) : kitchens.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-stone-200 px-4 py-6 text-sm text-stone-400 text-center">
                  No kitchens yet. Create one to start collaborating.
                </div>
              ) : (
                kitchens.map((kitchen) => {
                  const active = kitchen.id === activeKitchenId;
                  return (
                    <div
                      key={kitchen.id}
                      className={`w-full rounded-2xl border px-4 py-4 transition-colors ${active
                        ? 'border-orange-300 bg-orange-50'
                        : 'border-stone-200 bg-white hover:border-orange-200 hover:bg-orange-50/60'
                        }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <button
                          onClick={() => setActiveKitchen(kitchen)}
                          className="flex-1 text-left"
                        >
                          <p className="text-sm font-semibold text-stone-900">{kitchen.name}</p>
                          <p className="text-xs text-stone-500 mt-1">Role: {kitchen.role}</p>
                        </button>
                        <div className="flex items-center gap-2">
                          {active && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-orange-500 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
                              <Home size={11} /> Active
                            </span>
                          )}
                          <button
                            onClick={() => setManageKitchenId(kitchen.id)}
                            className="inline-flex items-center gap-1 rounded-full border border-stone-200 bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-stone-600 hover:border-orange-300 hover:text-orange-500"
                          >
                            <Settings2 size={11} /> Manage
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="rounded-2xl border border-orange-200 bg-orange-50/60 p-4">
              <p className="text-sm font-semibold text-stone-900">Create a kitchen</p>
              <p className="text-xs text-stone-500 mt-1">Great for households, couples, roommates, or meal-prep partners.</p>
              <div className="mt-3 flex flex-col sm:flex-row gap-2">
                <input
                  value={newKitchenName}
                  onChange={(e) => setNewKitchenName(e.target.value)}
                  placeholder="e.g. Simand Family Kitchen"
                  className="flex-1 rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-700 outline-none focus:border-orange-300"
                />
                <button
                  onClick={() => void handleCreateKitchen()}
                  disabled={submitting || !newKitchenName.trim()}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                >
                  <Plus size={14} /> Create
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-stone-200 bg-white p-5 space-y-4">
            <div>
              <p className="text-sm font-semibold text-stone-900">Invite people</p>
              <p className="text-xs text-stone-500 mt-1">Invite collaborators to your active kitchen. Invites are stored now and can power an acceptance flow next.</p>
            </div>

            <div className={`rounded-2xl border px-4 py-3 ${activeKitchen ? 'border-orange-200 bg-orange-50/70' : 'border-dashed border-stone-200 bg-stone-50'}`}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-orange-500">Inviting to</p>
              <p className="mt-1 text-sm font-semibold text-stone-900">
                {activeKitchen ? activeKitchen.name : 'No kitchen selected'}
              </p>
              <p className="mt-1 text-xs text-stone-500">
                {activeKitchen
                  ? `New invites will belong to ${activeKitchen.name}.`
                  : 'Choose a kitchen on the left before sending an invite.'}
              </p>
            </div>

            <div className="space-y-3">
              <input
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="chef@example.com"
                className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-700 outline-none focus:border-orange-300"
              />
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as 'editor' | 'viewer')}
                className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-700 outline-none focus:border-orange-300"
              >
                <option value="editor">Editor</option>
                <option value="viewer">Viewer</option>
              </select>
              <button
                onClick={() => void handleInvite()}
                disabled={submitting || !inviteEmail.trim() || !activeKitchen}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-semibold text-stone-600 hover:border-orange-300 hover:text-orange-500 disabled:opacity-50"
              >
                <MailPlus size={14} /> Create Invite
              </button>
            </div>

            <div className="pt-2">
              <p className="text-xs font-bold uppercase tracking-widest text-stone-400 mb-3">Recent invites</p>
              <div className="space-y-2">
                {invites.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-stone-200 px-4 py-5 text-xs text-stone-400 text-center">
                    No invites yet for your kitchens.
                  </div>
                ) : (
                  invites.slice(0, 8).map((invite) => (
                    <div key={invite.id} className="rounded-2xl border border-stone-200 px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-stone-800">{invite.email}</p>
                          <p className="text-xs text-stone-500 mt-1">
                            {(kitchens.find((kitchen) => kitchen.id === invite.kitchen_id)?.name || 'Kitchen')} · {invite.role} · {invite.status}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={!!managedKitchen} onOpenChange={(open) => !open && setManageKitchenId(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Users size={18} />
              {managedKitchen ? managedKitchen.name : 'Kitchen'}
            </DialogTitle>
          </DialogHeader>

          {managedKitchen && (
            <div className="space-y-5">
              <div className="rounded-2xl border border-orange-200 bg-orange-50/70 px-4 py-4">
                <p className="text-sm font-semibold text-stone-900">Kitchen members</p>
                <p className="mt-1 text-xs text-stone-500">
                  {managedKitchen.role === 'owner'
                    ? 'As the owner, you can change roles and remove members.'
                    : 'You can view who is part of this kitchen here.'}
                </p>
              </div>

              <div className="space-y-3">
                {managedMembers.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-stone-200 px-4 py-6 text-sm text-stone-400 text-center">
                    Loading members...
                  </div>
                ) : (
                  managedMembers.map((member) => {
                    const isOwner = member.role === 'owner';
                    const canManage = managedKitchen.role === 'owner' && !isOwner;
                    return (
                      <div key={member.id} className="rounded-2xl border border-stone-200 px-4 py-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-sm font-semibold text-stone-900">
                              {member.display_name || 'Kitchen member'}
                            </p>
                            <p className="mt-1 text-xs text-stone-500 break-all">{member.user_id}</p>
                          </div>

                          <div className="flex items-center gap-2">
                            {isOwner ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-stone-900 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
                                <Crown size={11} /> Owner
                              </span>
                            ) : canManage ? (
                              <>
                                <select
                                  value={member.role}
                                  onChange={(e) => void handleRoleChange(member.id, managedKitchen.id, e.target.value as 'editor' | 'viewer')}
                                  disabled={submitting}
                                  className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-700 outline-none focus:border-orange-300"
                                >
                                  <option value="editor">Editor</option>
                                  <option value="viewer">Viewer</option>
                                </select>
                                <button
                                  onClick={() => void handleRemoveMember(member.id, managedKitchen.id)}
                                  disabled={submitting}
                                  className="inline-flex items-center gap-1 rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-semibold text-stone-600 hover:border-red-200 hover:text-red-500 disabled:opacity-50"
                                >
                                  <Trash2 size={12} /> Remove
                                </button>
                              </>
                            ) : (
                              <span className="inline-flex items-center rounded-full bg-stone-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-stone-600">
                                {member.role}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
