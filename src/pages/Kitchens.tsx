import { useEffect, useMemo, useState } from 'react';
import { Copy, Crown, DoorOpen, Home, Link2, MailPlus, Plus, RotateCcw, Settings2, Trash2, User, Users } from 'lucide-react';
import { toast } from 'sonner';
import { useKitchens } from '@/hooks/useKitchens';
import { useStore } from '@/lib/store';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { isValidUsername, normalizeUsername } from '@/lib/username';
import { usePremiumAccess } from '@/hooks/usePremiumAccess';
import { usePremiumGate } from '@/hooks/usePremiumGate';
import PremiumFeatureButton from '@/components/PremiumFeatureButton';

export default function KitchensPage() {
  const { isPremium } = usePremiumAccess();
  const { openPremiumPage } = usePremiumGate();
  const {
    kitchens,
    invites,
    membersByKitchen,
    loading,
    createKitchen,
    inviteToKitchen,
    addKitchenMemberByUsername,
    resendInvite,
    loadKitchenMembers,
    updateKitchenMemberRole,
    removeKitchenMember,
    leaveKitchen,
  } = useKitchens();
  const { activeKitchenId, kitchenViewMode, displayName, setActiveKitchen } = useStore();
  const [newKitchenName, setNewKitchenName] = useState('');
  const [importPantryOnCreate, setImportPantryOnCreate] = useState(true);
  const [importGroceryOnCreate, setImportGroceryOnCreate] = useState(true);
  const [importMealPlanOnCreate, setImportMealPlanOnCreate] = useState(false);
  const [inviteUsername, setInviteUsername] = useState('');
  const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('editor');
  const [submitting, setSubmitting] = useState(false);
  const [manageKitchenId, setManageKitchenId] = useState<string | null>(null);
  const [leaveKitchenId, setLeaveKitchenId] = useState<string | null>(null);
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const emailInvites = useMemo(() => invites.filter((invite) => Boolean(invite.email)), [invites]);
  const personalKitchenName = displayName?.trim() ? `${displayName.trim()}'s Kitchen` : 'My Kitchen';

  const activeKitchen = useMemo(
    () => kitchens.find((kitchen) => kitchen.id === activeKitchenId) || null,
    [kitchens, activeKitchenId],
  );

  const managedKitchen = useMemo(
    () => kitchens.find((kitchen) => kitchen.id === manageKitchenId) || null,
    [kitchens, manageKitchenId],
  );
  const kitchenToLeave = useMemo(
    () => kitchens.find((kitchen) => kitchen.id === leaveKitchenId) || null,
    [kitchens, leaveKitchenId],
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
      await createKitchen(name, {
        importPantry: importPantryOnCreate,
        importGrocery: importGroceryOnCreate,
        importMealPlan: importMealPlanOnCreate,
      });
      setNewKitchenName('');
      setImportPantryOnCreate(true);
      setImportGroceryOnCreate(true);
      setImportMealPlanOnCreate(false);
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

    const username = normalizeUsername(inviteUsername);
    if (!isValidUsername(username)) {
      toast.info('Enter a valid username.');
      return;
    }

    setSubmitting(true);
    try {
      const member = await addKitchenMemberByUsername(activeKitchen.id, username, inviteRole);
      setInviteUsername('');
      toast.success(`Added @${member.username || username} to ${activeKitchen.name}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not send invite';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const buildInviteLink = (inviteToken: string) => `${origin}/invite/kitchen/${inviteToken}`;

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

  const openInviteDraft = async (invite: { email: string | null; role: 'owner' | 'editor' | 'viewer'; kitchen_id: string; invite_token?: string }) => {
    if (!invite.email) {
      const shareUrl = buildInviteLink(invite.invite_token || '');
      if (navigator.share) {
        await navigator.share({
          title: 'Join my Munch kitchen',
          text: 'Open this link to join my kitchen on Munch.',
          url: shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
      }
      return;
    }

    const kitchenName = kitchens.find((kitchen) => kitchen.id === invite.kitchen_id)?.name || 'your kitchen';
    const subject = encodeURIComponent(`Join ${kitchenName} on Munch`);
    const body = encodeURIComponent(
      `Hi,\n\nI'd love for you to join "${kitchenName}" on Munch as a ${invite.role}.\n\nOpen this invite link in Munch:\n${buildInviteLink(invite.invite_token || '')}\n\nThanks!`,
    );
    const mailtoUrl = `mailto:${invite.email}?subject=${subject}&body=${body}`;

    try {
      window.location.href = mailtoUrl;
    } catch {
      await navigator.clipboard.writeText(
        `To: ${invite.email}\nSubject: Join ${kitchenName} on Munch\n\nI'd love for you to join "${kitchenName}" on Munch as a ${invite.role}.\n${buildInviteLink(invite.invite_token || '')}`,
      );
      toast.success('Invite message copied to clipboard');
    }
  };

  const handleResendInvite = async (invite: { id: string; email: string | null; role: 'owner' | 'editor' | 'viewer'; kitchen_id: string }) => {
    setSubmitting(true);
    try {
      const refreshedInvite = await resendInvite(invite.id);
      await openInviteDraft(refreshedInvite);
      toast.success(invite.email ? `Invite reissued for ${invite.email}` : 'Invite link refreshed');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not resend invite';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyInvite = async (invite: { email: string | null; role: 'owner' | 'editor' | 'viewer'; kitchen_id: string; invite_token: string }) => {
    const kitchenName = kitchens.find((kitchen) => kitchen.id === invite.kitchen_id)?.name || 'your kitchen';
    const inviteLink = buildInviteLink(invite.invite_token);
    await navigator.clipboard.writeText(
      invite.email
        ? `Join "${kitchenName}" on Munch as a ${invite.role}. Invite email: ${invite.email}\n${inviteLink}`
        : `Join "${kitchenName}" on Munch as a ${invite.role}.\n${inviteLink}`,
    );
    toast.success(invite.email ? 'Invite details copied' : 'Invite link copied');
  };

  const handleCreateShareLink = async () => {
    if (!activeKitchen) {
      toast.info('Select or create a kitchen first.');
      return;
    }

    setSubmitting(true);
    try {
      const invite = await inviteToKitchen(activeKitchen.id, null, inviteRole);
      await handleCopyInvite(invite);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not create share link';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleLeaveKitchen = async () => {
    if (!kitchenToLeave) return;
    setSubmitting(true);
    try {
      await leaveKitchen(kitchenToLeave.id);
      setLeaveKitchenId(null);
      toast.success(kitchenToLeave.role === 'owner' ? `Closed ${kitchenToLeave.name}` : `Left ${kitchenToLeave.name}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not leave kitchen';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isPremium) {
    return (
      <div className="min-h-full px-4 py-4 sm:px-6 sm:py-6" style={{ background: '#FFFAF5' }}>
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-[10px] font-bold text-orange-400 uppercase tracking-widest mb-1">Collaboration</p>
              <h1 className="text-xl font-bold text-stone-900 sm:text-2xl" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
                Kitchens
              </h1>
              <p className="text-sm text-stone-500 mt-1">
                Share recipes, cookbooks, grocery lists, and meal plans with the people you cook with.
              </p>
            </div>
          </div>

          <div
            className="rounded-[28px] border p-5 sm:p-8"
            style={{
              background: "linear-gradient(145deg, rgba(255,255,255,0.96), rgba(255,247,237,0.96))",
              borderColor: "rgba(249,115,22,0.16)",
              boxShadow: "0 24px 60px rgba(120, 53, 15, 0.08)",
            }}
          >
            <div className="flex flex-wrap items-center gap-3 mb-5">
              <div
                className="inline-flex h-12 w-12 items-center justify-center rounded-2xl"
                style={{ background: "linear-gradient(135deg,#7C3AED,#9333EA)", boxShadow: "0 10px 24px rgba(124,58,237,0.28)" }}
              >
                <Users size={22} className="text-white" />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-orange-500">Members Only</p>
                <h2 className="text-2xl font-bold text-stone-900" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
                  Unlock Kitchens collaboration
                </h2>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-6">
              {[
                { title: "Create kitchens", copy: "Set up shared spaces for family, roommates, or your cooking crew." },
                { title: "Invite members", copy: "Bring people in by username, invite link, or email invite flow." },
                { title: "Share everything", copy: "Collaborate on pantry items, grocery lists, recipes, and cookbooks." },
                { title: "Plan together", copy: "Keep meal prep and kitchen activity coordinated in one shared place." },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border p-4"
                  style={{ background: "rgba(255,255,255,0.82)", borderColor: "rgba(216,180,254,0.4)" }}
                >
                  <p className="text-sm font-semibold text-stone-800">{item.title}</p>
                  <p className="text-xs leading-5 text-stone-500 mt-1">{item.copy}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-stone-500 max-w-xl">
                Become a member to create Kitchens and collaborate on shared meal planning, grocery lists, pantry tracking, and recipes.
              </p>
              <PremiumFeatureButton
                label="Unlock Kitchens"
                onClick={() => openPremiumPage("Kitchens")}
                className="w-full justify-center sm:w-auto"
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full px-4 py-4 sm:px-6 sm:py-6" style={{ background: '#FFFAF5' }}>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-[10px] font-bold text-orange-400 uppercase tracking-widest mb-1">Collaboration</p>
            <h1 className="text-xl font-bold text-stone-900 sm:text-2xl" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
              Kitchens
            </h1>
            <p className="text-sm text-stone-500 mt-1">
              Use kitchens to share recipes, cookbooks, grocery lists, and meal plans with the people you cook with.
            </p>
          </div>
          {activeKitchen && (
            <div className="rounded-2xl border border-orange-200 bg-white px-4 py-3 text-left lg:text-right">
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
              <button
                onClick={() => setActiveKitchen(null)}
                className={`w-full rounded-2xl border px-4 py-4 text-left transition-colors ${
                  kitchenViewMode === 'solo'
                    ? 'border-orange-300 bg-orange-50'
                    : 'border-stone-200 bg-white hover:border-orange-200 hover:bg-orange-50/60'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-stone-900">{personalKitchenName}</p>
                      <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-stone-600">
                        <User size={10} /> Personal
                      </span>
                    </div>
                    <p className="text-xs text-stone-500 mt-1">Use your personal pantry, grocery list, and meal plan.</p>
                  </div>
                  {kitchenViewMode === 'solo' && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-orange-500 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
                      <Home size={11} /> Active
                    </span>
                  )}
                </div>
              </button>

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
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-stone-900">{kitchen.name}</p>
                            <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-orange-700">
                              <Users size={10} /> Shared
                            </span>
                          </div>
                          <p className="text-xs text-stone-500 mt-1">Role: {kitchen.role}</p>
                        </button>
                        <div className="flex items-center gap-2">
                          {active && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-orange-500 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
                              <Home size={11} /> Active
                            </span>
                          )}
                          <button
                            onClick={() => setLeaveKitchenId(kitchen.id)}
                            className="inline-flex items-center gap-1 rounded-full border border-stone-200 bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-stone-600 hover:border-red-200 hover:text-red-500"
                          >
                            <DoorOpen size={11} /> Leave
                          </button>
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
              <div className="mt-3 space-y-2 rounded-2xl border border-orange-200 bg-white/80 px-3 py-3">
                <p className="text-[11px] font-bold uppercase tracking-widest text-orange-500">Start with my current personal lists</p>
                <label className="flex items-center gap-2 text-sm text-stone-700">
                  <input
                    type="checkbox"
                    checked={importPantryOnCreate}
                    onChange={(e) => setImportPantryOnCreate(e.target.checked)}
                    className="rounded border-stone-300 text-orange-500 focus:ring-orange-300"
                  />
                  Import pantry
                </label>
                <label className="flex items-center gap-2 text-sm text-stone-700">
                  <input
                    type="checkbox"
                    checked={importGroceryOnCreate}
                    onChange={(e) => setImportGroceryOnCreate(e.target.checked)}
                    className="rounded border-stone-300 text-orange-500 focus:ring-orange-300"
                  />
                  Import grocery list
                </label>
                <label className="flex items-center gap-2 text-sm text-stone-700">
                  <input
                    type="checkbox"
                    checked={importMealPlanOnCreate}
                    onChange={(e) => setImportMealPlanOnCreate(e.target.checked)}
                    className="rounded border-stone-300 text-orange-500 focus:ring-orange-300"
                  />
                  Import meal plan
                </label>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-stone-200 bg-white p-5 space-y-4">
            <div>
              <p className="text-sm font-semibold text-stone-900">Invite people</p>
              <p className="text-xs text-stone-500 mt-1">
                Add existing Munch users by username, or create a share link for anyone else.
              </p>
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
              <div>
                <p className="text-xs font-semibold text-stone-700 mb-1.5">Munch User ID</p>
                <p className="text-[11px] text-stone-500 mb-2">Enter the person’s unique username to add them directly to this kitchen.</p>
              </div>
              <input
                value={inviteUsername}
                onChange={(e) => setInviteUsername(normalizeUsername(e.target.value))}
                placeholder="munch_userid"
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
                disabled={submitting || !activeKitchen || !inviteUsername.trim()}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-semibold text-stone-600 hover:border-orange-300 hover:text-orange-500 disabled:opacity-50"
              >
                <MailPlus size={14} /> Send Invite
              </button>
              <button
                onClick={() => void handleCreateShareLink()}
                disabled={submitting || !activeKitchen}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                <Link2 size={14} /> Create Share Link
              </button>
            </div>

            <div className="pt-2">
              <p className="text-xs font-bold uppercase tracking-widest text-stone-400 mb-3">Recent invites</p>
              <div className="space-y-2">
                {emailInvites.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-stone-200 px-4 py-5 text-xs text-stone-400 text-center">
                    No invites yet for your kitchens.
                  </div>
                ) : (
                  emailInvites.slice(0, 8).map((invite) => (
                    <div key={invite.id} className="rounded-2xl border border-stone-200 px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-stone-800">{invite.email || 'Share link invite'}</p>
                          <p className="text-xs text-stone-500 mt-1">
                            {(kitchens.find((kitchen) => kitchen.id === invite.kitchen_id)?.name || 'Kitchen')} · {invite.role} · {invite.status}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => void handleCopyInvite(invite)}
                            className="inline-flex items-center gap-1 rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-stone-600 hover:border-orange-300 hover:text-orange-500"
                          >
                            <Copy size={12} /> Copy
                          </button>
                          <button
                            onClick={() => void handleResendInvite(invite)}
                            disabled={submitting}
                            className="inline-flex items-center gap-1 rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-stone-600 hover:border-orange-300 hover:text-orange-500 disabled:opacity-50"
                          >
                            <RotateCcw size={12} /> Resend
                          </button>
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
                            {member.username && (
                              <p className="mt-1 text-xs text-stone-400">@{member.username}</p>
                            )}
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

      <Dialog open={!!kitchenToLeave} onOpenChange={(open) => !open && setLeaveKitchenId(null)}>
        <DialogContent className="max-w-sm rounded-3xl">
          <DialogHeader>
            <DialogTitle>Leave Kitchen?</DialogTitle>
          </DialogHeader>
          {kitchenToLeave && (
            <div className="space-y-4">
              <p className="text-sm text-stone-600">
                {kitchenToLeave.role === 'owner'
                  ? `If you leave ${kitchenToLeave.name} as the owner and you're the only member, the kitchen will be closed.`
                  : `You'll stop seeing shared items from ${kitchenToLeave.name} in your app.`}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setLeaveKitchenId(null)}
                  className="flex-1 rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-semibold text-stone-600"
                >
                  Cancel
                </button>
                <button
                  onClick={() => void handleLeaveKitchen()}
                  disabled={submitting}
                  className="flex-1 rounded-xl bg-red-500 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {kitchenToLeave.role === 'owner' ? 'Leave / Close' : 'Leave Kitchen'}
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
