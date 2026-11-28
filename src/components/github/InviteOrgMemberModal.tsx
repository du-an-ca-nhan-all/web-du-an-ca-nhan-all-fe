import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  ExternalLink,
  KeyRound,
  Loader2,
  RefreshCw,
  Square,
  UserPlus,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import {
  ApiClientError,
  executeApi,
  useBackendClient,
  type GitHubInviteOrgMemberRequest,
  type GitHubOrgInvitationResponse,
  type GitHubOrgInviteMemberResponse,
  type GitHubTokenResponse,
} from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

interface InviteOrgMemberModalProps {
  inviterToken: GitHubTokenResponse | null;
  allTokens: GitHubTokenResponse[];
  onClose: () => void;
  onAuthFailure: (message: string) => void;
}

type TargetMode = 'token' | 'username';
type OrgMode = 'single' | 'multiple';

interface MultiInviteLogItem {
  org: string;
  status: 'success' | 'error';
  state?: string;
  role?: string;
  invitationUrl?: string;
  message?: string;
}

export function InviteOrgMemberModal({
  inviterToken,
  allTokens,
  onClose,
  onAuthFailure,
}: InviteOrgMemberModalProps) {
  const { serverConfig } = useAuth();
  const { v1 } = useBackendClient();
  const { notify } = useToast();

  // Managed orgs (role === 'admin', state === 'active') fetched for inviterToken
  const [managedOrgs, setManagedOrgs] = useState<GitHubOrgInvitationResponse[]>([]);
  const [orgsLoading, setOrgsLoading] = useState(false);
  const [orgsError, setOrgsError] = useState<string | null>(null);

  // Target user selection (from token list or manual username)
  const [targetMode, setTargetMode] = useState<TargetMode>('token');
  const [targetTokenId, setTargetTokenId] = useState('');
  const [targetUsername, setTargetUsername] = useState('');

  // Target organization(s)
  const [orgMode, setOrgMode] = useState<OrgMode>('single');
  const [selectedOrg, setSelectedOrg] = useState('');
  const [selectedMultiOrgs, setSelectedMultiOrgs] = useState<Set<string>>(new Set());

  const [submitting, setSubmitting] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [singleResult, setSingleResult] = useState<GitHubOrgInviteMemberResponse | null>(null);
  const [batchState, setBatchState] = useState<{
    total: number;
    completed: number;
    success: number;
    failed: number;
    stopped: boolean;
    items: MultiInviteLogItem[];
  } | null>(null);

  const stopRef = useRef(false);
  const mountedRef = useRef(true);

  const inviterTokenId = inviterToken?.id || '';

  const candidateTargetTokens = useMemo(
    () => allTokens.filter((t) => Boolean(t.id) && t.id !== inviterTokenId),
    [allTokens, inviterTokenId]
  );

  const loadManagedOrgs = useCallback(async () => {
    if (!inviterTokenId) return;
    setOrgsLoading(true);
    setOrgsError(null);
    try {
      const memberships = await executeApi(
        v1.listOrgInvitations({
          id: encodeURIComponent(inviterTokenId),
          state: 'active',
        }),
        serverConfig.useProxy
      );
      if (!mountedRef.current) return;
      const list = Array.isArray(memberships) ? memberships : [];
      const adminOrgs = list.filter(
        (item) =>
          Boolean(item.org?.trim()) &&
          (item.role || '').toLowerCase() === 'admin' &&
          (item.state || '').toLowerCase() === 'active'
      );
      setManagedOrgs(adminOrgs);
      if (adminOrgs.length > 0) {
        const slugs = adminOrgs.map((o) => o.org!.trim());
        setSelectedOrg((prev) => (prev && slugs.includes(prev) ? prev : slugs[0]));
        setSelectedMultiOrgs(new Set(slugs));
      } else {
        setSelectedOrg('');
        setSelectedMultiOrgs(new Set());
      }
    } catch (err) {
      if (err instanceof ApiClientError && (err.status === 401 || err.status === 403)) {
        onAuthFailure(err.message);
        return;
      }
      if (!mountedRef.current) return;
      setOrgsError(
        err instanceof ApiClientError
          ? err.message
          : 'Không thể tải danh sách Organization do token này quản lý.'
      );
      setManagedOrgs([]);
      setSelectedOrg('');
      setSelectedMultiOrgs(new Set());
    } finally {
      if (mountedRef.current) setOrgsLoading(false);
    }
  }, [inviterTokenId, v1, serverConfig.useProxy, onAuthFailure]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      stopRef.current = true;
    };
  }, []);

  useEffect(() => {
    if (!inviterTokenId) return;
    stopRef.current = false;
    setStopping(false);
    setError(null);
    setSingleResult(null);
    setBatchState(null);
    setOrgMode('single');
    setTargetUsername('');

    if (candidateTargetTokens.length > 0) {
      setTargetMode('token');
      setTargetTokenId(candidateTargetTokens[0].id || '');
    } else {
      setTargetMode('username');
      setTargetTokenId('');
    }

    void loadManagedOrgs();
    // Reset only when modal opens for a token
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inviterTokenId]);

  useEffect(() => {
    if (!inviterTokenId) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [inviterTokenId, submitting, onClose]);

  if (!inviterToken) return null;

  const inviterLabel = inviterToken.accountUsername
    ? `@${inviterToken.accountUsername}`
    : inviterToken.accountName || inviterToken.tokenPreview || inviterToken.id;

  const toggleMultiOrg = (orgSlug: string) => {
    if (submitting) return;
    setSelectedMultiOrgs((prev) => {
      const next = new Set(prev);
      if (next.has(orgSlug)) next.delete(orgSlug);
      else next.add(orgSlug);
      return next;
    });
  };

  const allMultiSelected =
    managedOrgs.length > 0 && selectedMultiOrgs.size === managedOrgs.length;

  const toggleAllMultiOrgs = () => {
    if (submitting) return;
    if (allMultiSelected) setSelectedMultiOrgs(new Set());
    else setSelectedMultiOrgs(new Set(managedOrgs.map((o) => o.org!.trim())));
  };

  const handleStop = () => {
    stopRef.current = true;
    setStopping(true);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSingleResult(null);
    setBatchState(null);

    if (managedOrgs.length === 0) {
      setError('Token này chưa quản lý (quyền admin) Organization nào.');
      return;
    }

    const payload: GitHubInviteOrgMemberRequest = {};
    if (targetMode === 'token') {
      if (!targetTokenId.trim()) {
        setError('Vui lòng chọn token đích cần mời.');
        return;
      }
      payload.targetTokenId = targetTokenId.trim();
    } else {
      const cleanUser = targetUsername.trim().replace(/^@/, '');
      if (!cleanUser) {
        setError('Vui lòng nhập GitHub username cần mời.');
        return;
      }
      payload.username = cleanUser;
    }

    if (orgMode === 'single') {
      const targetOrg = selectedOrg.trim();
      if (!targetOrg) {
        setError('Vui lòng chọn Organization.');
        return;
      }

      setSubmitting(true);
      try {
        const res = await executeApi(
          v1.inviteMemberToOrg(
            {
              id: encodeURIComponent(inviterTokenId),
              org: encodeURIComponent(targetOrg),
            },
            payload
          ),
          serverConfig.useProxy
        );
        if (!mountedRef.current) return;
        setSingleResult(res);
        notify({
          tone: 'success',
          title: `Đã gửi lời mời vào ${res.org || targetOrg}`,
          description:
            res.message ||
            `${res.username ? `@${res.username}` : 'User'} · Trạng thái: ${res.state || 'pending'}`,
        });
      } catch (err) {
        if (err instanceof ApiClientError && (err.status === 401 || err.status === 403)) {
          onAuthFailure(err.message);
          return;
        }
        if (mountedRef.current) {
          setError(
            err instanceof ApiClientError
              ? err.message
              : `Không thể gửi lời mời vào organization "${targetOrg}".`
          );
        }
      } finally {
        if (mountedRef.current) setSubmitting(false);
      }
      return;
    }

    // Multiple orgs mode: FE sequential for-loop
    const targetOrgs = managedOrgs
      .map((o) => o.org!.trim())
      .filter((org) => selectedMultiOrgs.has(org));
    if (targetOrgs.length === 0) {
      setError('Vui lòng chọn ít nhất 1 Organization để gửi lời mời.');
      return;
    }

    stopRef.current = false;
    setStopping(false);
    setSubmitting(true);
    setBatchState({
      total: targetOrgs.length,
      completed: 0,
      success: 0,
      failed: 0,
      stopped: false,
      items: [],
    });

    let okCount = 0;
    let errCount = 0;
    let stoppedEarly = false;

    for (let i = 0; i < targetOrgs.length; i++) {
      if (stopRef.current || !mountedRef.current) {
        stoppedEarly = true;
        break;
      }

      const orgSlug = targetOrgs[i];
      try {
        const res = await executeApi(
          v1.inviteMemberToOrg(
            {
              id: encodeURIComponent(inviterTokenId),
              org: encodeURIComponent(orgSlug),
            },
            payload
          ),
          serverConfig.useProxy
        );
        okCount += 1;
        if (mountedRef.current) {
          setBatchState((prev) =>
            prev
              ? {
                  ...prev,
                  completed: i + 1,
                  success: prev.success + 1,
                  items: [
                    {
                      org: res.org || orgSlug,
                      status: 'success',
                      state: res.state,
                      role: res.role,
                      invitationUrl: res.invitationUrl,
                      message: res.message,
                    },
                    ...prev.items,
                  ],
                }
              : null
          );
        }
      } catch (err) {
        if (err instanceof ApiClientError && (err.status === 401 || err.status === 403)) {
          if (mountedRef.current) {
            setSubmitting(false);
            setStopping(false);
          }
          onAuthFailure(err.message);
          return;
        }
        errCount += 1;
        if (mountedRef.current) {
          setBatchState((prev) =>
            prev
              ? {
                  ...prev,
                  completed: i + 1,
                  failed: prev.failed + 1,
                  items: [
                    {
                      org: orgSlug,
                      status: 'error',
                      message:
                        err instanceof ApiClientError
                          ? err.message
                          : 'Không thể gửi lời mời vào org này.',
                    },
                    ...prev.items,
                  ],
                }
              : null
          );
        }
      }
    }

    if (!mountedRef.current) return;
    setSubmitting(false);
    setStopping(false);
    setBatchState((prev) => (prev ? { ...prev, stopped: stoppedEarly } : null));

    notify({
      tone: errCount === 0 && !stoppedEarly ? 'success' : okCount > 0 ? 'info' : 'error',
      title: stoppedEarly
        ? `Đã dừng gửi lời mời (${okCount}/${targetOrgs.length} thành công)`
        : `Đã gửi lời mời tới ${okCount}/${targetOrgs.length} Organization`,
      description: errCount > 0 ? `Thành công: ${okCount} · Lỗi: ${errCount}` : undefined,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-[2px] p-4"
      onClick={() => {
        if (!submitting) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="invite-member-modal-title"
        className="w-full max-w-lg max-h-[90vh] flex flex-col rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 dark:border-slate-800 px-6 py-4 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 shrink-0">
              <UserPlus className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h3
                id="invite-member-modal-title"
                className="font-display text-base font-semibold text-slate-900 dark:text-slate-100 truncate"
              >
                Mời thành viên vào Org · {inviterLabel}
              </h3>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 truncate">
                Chỉ hiển thị các Organization do tài khoản {inviterLabel} quản lý (quyền admin)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Đóng hộp thoại"
            className="cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-50 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
            {(error || orgsError) && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50/75 dark:bg-red-950/35 px-3.5 py-2.5 text-xs text-red-900 dark:text-red-300"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error || orgsError}</span>
              </div>
            )}

            {/* 1. Target User (Token or Username) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Tài khoản cần mời <span className="text-red-500">*</span>
                </span>
                <div className="inline-flex rounded-lg bg-slate-100 dark:bg-slate-800 p-0.5 text-[11px] font-medium">
                  <button
                    type="button"
                    disabled={submitting || candidateTargetTokens.length === 0}
                    onClick={() => setTargetMode('token')}
                    className={`cursor-pointer inline-flex items-center gap-1 rounded-md px-2 py-1 transition-colors disabled:opacity-40 ${
                      targetMode === 'token'
                        ? 'bg-white dark:bg-[#0F172A] text-slate-900 dark:text-slate-100 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    <KeyRound className="h-3 w-3" />
                    Chọn từ Token
                  </button>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => setTargetMode('username')}
                    className={`cursor-pointer inline-flex items-center gap-1 rounded-md px-2 py-1 transition-colors disabled:opacity-50 ${
                      targetMode === 'username'
                        ? 'bg-white dark:bg-[#0F172A] text-slate-900 dark:text-slate-100 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    <Users className="h-3 w-3" />
                    Nhập Username
                  </button>
                </div>
              </div>

              {targetMode === 'token' && candidateTargetTokens.length > 0 ? (
                <select
                  value={targetTokenId}
                  disabled={submitting}
                  onChange={(e) => setTargetTokenId(e.target.value)}
                  aria-label="Chọn token đích cần mời"
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#090D16] px-3 py-2 font-mono text-xs text-slate-900 dark:text-slate-100 focus:border-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 disabled:opacity-60"
                >
                  {candidateTargetTokens.map((t) => (
                    <option key={t.id} value={t.id || ''}>
                      {t.accountUsername ? `@${t.accountUsername}` : 'Chưa đồng bộ'}
                      {t.tokenPreview ? ` (${t.tokenPreview})` : ''}
                      {t.isSuperToken ? ' · Super Token' : ''}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  required
                  disabled={submitting}
                  value={targetUsername}
                  onChange={(e) => setTargetUsername(e.target.value)}
                  placeholder="Nhập GitHub username (ví dụ: octocat)"
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#090D16] px-3 py-2 font-mono text-xs text-slate-900 dark:text-slate-100 placeholder:font-sans placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 disabled:opacity-60"
                />
              )}
            </div>

            {/* 2. Managed Organizations (role === admin only) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    Organization quản lý ({managedOrgs.length}){' '}
                    <span className="text-red-500">*</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => void loadManagedOrgs()}
                    disabled={orgsLoading || submitting}
                    title="Tải lại danh sách Organization quản lý"
                    className="cursor-pointer rounded p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-40 transition-colors"
                  >
                    <RefreshCw className={`h-3 w-3 ${orgsLoading ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                {managedOrgs.length > 1 && (
                  <div className="inline-flex rounded-lg bg-slate-100 dark:bg-slate-800 p-0.5 text-[11px] font-medium">
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => setOrgMode('single')}
                      className={`cursor-pointer rounded-md px-2 py-1 transition-colors disabled:opacity-50 ${
                        orgMode === 'single'
                          ? 'bg-white dark:bg-[#0F172A] text-slate-900 dark:text-slate-100 shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                      }`}
                    >
                      1 Org
                    </button>
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => setOrgMode('multiple')}
                      className={`cursor-pointer rounded-md px-2 py-1 transition-colors disabled:opacity-50 ${
                        orgMode === 'multiple'
                          ? 'bg-white dark:bg-[#0F172A] text-slate-900 dark:text-slate-100 shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                      }`}
                    >
                      Nhiều Org ({selectedMultiOrgs.size})
                    </button>
                  </div>
                )}
              </div>

              {orgsLoading ? (
                <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 py-6 text-xs text-slate-500 dark:text-slate-400">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600 dark:text-blue-400" />
                  <span>Đang tải các Organization do {inviterLabel} quản lý...</span>
                </div>
              ) : managedOrgs.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 px-4 py-6 text-center">
                  <Building2 className="mx-auto h-5 w-5 text-slate-400" />
                  <p className="mt-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Token này không quản lý Organization nào
                  </p>
                  <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                    Chỉ tài khoản có vai trò <span className="font-mono font-medium">admin</span>{' '}
                    trong Organization mới có quyền gửi lời mời thành viên.
                  </p>
                </div>
              ) : orgMode === 'single' ? (
                <select
                  value={selectedOrg}
                  disabled={submitting}
                  onChange={(e) => setSelectedOrg(e.target.value)}
                  aria-label="Chọn Organization quản lý"
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#090D16] px-3 py-2 font-mono text-xs text-slate-900 dark:text-slate-100 focus:border-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 disabled:opacity-60"
                >
                  {managedOrgs.map((o) => {
                    const slug = o.org!.trim();
                    return (
                      <option key={slug} value={slug}>
                        {slug} ({o.role || 'admin'})
                      </option>
                    );
                  })}
                </select>
              ) : (
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                  <div className="flex items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/50 px-3.5 py-2 text-xs">
                    <label className="inline-flex items-center gap-2 font-medium text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={allMultiSelected}
                        disabled={submitting}
                        onChange={toggleAllMultiOrgs}
                        className="h-3.5 w-3.5 rounded border-slate-300 dark:border-slate-700 accent-blue-600"
                      />
                      <span>
                        Chọn tất cả ({selectedMultiOrgs.size}/{managedOrgs.length})
                      </span>
                    </label>
                  </div>
                  <div className="max-h-40 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80">
                    {managedOrgs.map((o) => {
                      const slug = o.org!.trim();
                      const checked = selectedMultiOrgs.has(slug);
                      return (
                        <label
                          key={slug}
                          className="flex items-center justify-between gap-2.5 px-3.5 py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer select-none"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={submitting}
                              onChange={() => toggleMultiOrg(slug)}
                              className="h-3.5 w-3.5 rounded border-slate-300 dark:border-slate-700 accent-blue-600 shrink-0"
                            />
                            {o.avatarUrl && (
                              <img
                                src={o.avatarUrl}
                                alt={slug}
                                className="h-5 w-5 rounded border border-slate-200 dark:border-slate-700 object-cover shrink-0 bg-white"
                              />
                            )}
                            <span className="font-mono font-medium text-slate-900 dark:text-slate-100 truncate">
                              {slug}
                            </span>
                          </div>
                          <span className="rounded bg-indigo-50 dark:bg-indigo-950/40 px-1.5 py-0.5 font-mono text-[10px] font-medium text-indigo-700 dark:text-indigo-300 shrink-0">
                            {o.role || 'admin'}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Single Invite Success Result */}
            {singleResult && (
              <div className="rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/70 dark:bg-emerald-950/25 p-4 space-y-2 text-xs">
                <div className="flex items-start gap-2 text-emerald-900 dark:text-emerald-200">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="font-semibold">
                      {singleResult.message || 'Đã gửi lời mời thành công'}
                    </p>
                    <p className="text-emerald-800/90 dark:text-emerald-300/90">
                      User:{' '}
                      <span className="font-mono font-semibold">
                        @{singleResult.username || '—'}
                      </span>{' '}
                      · Org: <span className="font-mono font-semibold">{singleResult.org}</span> ·
                      Role: <span className="font-mono">{singleResult.role || 'member'}</span> ·
                      Trạng thái:{' '}
                      <span className="font-mono font-semibold">
                        {singleResult.state || 'pending'}
                      </span>
                    </p>
                    {singleResult.invitationUrl && (
                      <a
                        href={singleResult.invitationUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-mono text-blue-600 dark:text-blue-400 hover:underline break-all"
                      >
                        <span>{singleResult.invitationUrl}</span>
                        <ExternalLink className="h-3 w-3 shrink-0" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Multi-org Batch Progress */}
            {batchState && (
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-[#090D16] p-3.5 space-y-2.5">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    {submitting
                      ? stopping
                        ? 'Đang dừng sau org hiện tại...'
                        : `Đang gửi lời mời (${batchState.completed}/${batchState.total})...`
                      : batchState.stopped
                        ? `Đã dừng (${batchState.completed}/${batchState.total})`
                        : `Hoàn tất (${batchState.completed}/${batchState.total})`}
                  </span>
                  <span className="font-mono text-[11px] tabular-nums text-slate-600 dark:text-slate-400">
                    OK:{' '}
                    <strong className="text-emerald-700 dark:text-emerald-400">
                      {batchState.success}
                    </strong>{' '}
                    · Lỗi:{' '}
                    <strong className="text-red-700 dark:text-red-400">{batchState.failed}</strong>
                  </span>
                </div>

                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                  <div
                    className="h-full bg-blue-600 dark:bg-blue-500 transition-all duration-150"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.round((batchState.completed / Math.max(1, batchState.total)) * 100)
                      )}%`,
                    }}
                  />
                </div>

                {batchState.items.length > 0 && (
                  <div className="max-h-36 overflow-y-auto divide-y divide-slate-200/70 dark:divide-slate-800 text-[11px]">
                    {batchState.items.map((item) => (
                      <div
                        key={item.org}
                        className="flex items-center justify-between gap-2 py-1.5"
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          {item.status === 'success' ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          ) : (
                            <XCircle className="h-3.5 w-3.5 text-red-600 dark:text-red-400 shrink-0" />
                          )}
                          <span className="font-mono font-medium text-slate-800 dark:text-slate-200 truncate">
                            {item.org}
                          </span>
                        </div>
                        {item.status === 'success' ? (
                          <span className="font-mono text-emerald-700 dark:text-emerald-400 shrink-0">
                            {item.state || 'pending'}
                          </span>
                        ) : (
                          <span
                            className="text-red-600 dark:text-red-400 truncate max-w-[180px]"
                            title={item.message}
                          >
                            {item.message}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 px-6 py-3.5 shrink-0">
            {submitting && orgMode === 'multiple' ? (
              <button
                type="button"
                onClick={handleStop}
                disabled={stopping}
                className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-4 py-2 text-xs font-medium text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/50 disabled:opacity-50 transition-colors"
              >
                <Square className="h-3.5 w-3.5" />
                {stopping ? 'Đang dừng...' : 'Dừng gửi'}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={submitting}
                  className="cursor-pointer rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={submitting || orgsLoading || managedOrgs.length === 0}
                  className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 px-4 py-2 text-xs font-medium text-white disabled:opacity-50 transition-colors"
                >
                  {submitting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <UserPlus className="h-3.5 w-3.5" />
                  )}
                  {submitting
                    ? 'Đang gửi lời mời...'
                    : orgMode === 'multiple'
                      ? `Gửi lời mời (${selectedMultiOrgs.size} Org)`
                      : 'Gửi lời mời'}
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
