import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Building2,
  Check,
  CheckCheck,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Mail,
  RefreshCw,
  Search,
  X,
  XCircle,
} from 'lucide-react';
import {
  ApiClientError,
  executeApi,
  GitHubOrgInvitationActionRequestActionEnum,
  useBackendClient,
  type GitHubOrgInvitationResponse,
  type GitHubTokenResponse,
} from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

interface OrgInvitationsModalProps {
  token: GitHubTokenResponse | null;
  onClose: () => void;
  onPendingCountUpdated?: (tokenId: string, pendingCount: number) => void;
  onAuthFailure: (message: string) => void;
}

type InvitationStateFilter = 'pending' | 'active' | 'all';

export function OrgInvitationsModal({
  token,
  onClose,
  onPendingCountUpdated,
  onAuthFailure,
}: OrgInvitationsModalProps) {
  const { serverConfig } = useAuth();
  const { v1 } = useBackendClient();
  const { notify } = useToast();

  const [stateFilter, setStateFilter] = useState<InvitationStateFilter>('pending');
  const [invitations, setInvitations] = useState<GitHubOrgInvitationResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const [actingKey, setActingKey] = useState<string | null>(null);
  const [confirmDeclineOrg, setConfirmDeclineOrg] = useState<string | null>(null);
  const [acceptingAll, setAcceptingAll] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const tokenId = token?.id || '';
  const onPendingCountUpdatedRef = useRef(onPendingCountUpdated);
  onPendingCountUpdatedRef.current = onPendingCountUpdated;

  const loadInvitations = useCallback(
    async (targetState: InvitationStateFilter) => {
      if (!tokenId) return;
      setLoading(true);
      setError(null);
      setActionError(null);
      try {
        const list = await executeApi(
          v1.listOrgInvitations({
            id: encodeURIComponent(tokenId),
            state: targetState,
          }),
          serverConfig.useProxy
        );
        const safeList = Array.isArray(list) ? list : [];
        setInvitations(safeList);

        if (onPendingCountUpdatedRef.current) {
          if (targetState === 'pending') {
            onPendingCountUpdatedRef.current(tokenId, safeList.length);
          } else if (targetState === 'all') {
            const pendingCount = safeList.filter(
              (item) => (item.state || '').toLowerCase() === 'pending'
            ).length;
            onPendingCountUpdatedRef.current(tokenId, pendingCount);
          }
        }
      } catch (err) {
        if (err instanceof ApiClientError && (err.status === 401 || err.status === 403)) {
          onAuthFailure(err.message);
          return;
        }
        setError(
          err instanceof ApiClientError
            ? err.message
            : 'Không thể tải danh sách lời mời Organization từ GitHub.'
        );
        setInvitations([]);
      } finally {
        setLoading(false);
      }
    },
    [tokenId, v1, serverConfig.useProxy, onAuthFailure]
  );

  useEffect(() => {
    if (!tokenId) return;
    setStateFilter('pending');
    setSearch('');
    setConfirmDeclineOrg(null);
    setActionError(null);
    void loadInvitations('pending');
  }, [tokenId, loadInvitations]);

  useEffect(() => {
    if (!token) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !actingKey && !acceptingAll) {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [token, actingKey, acceptingAll, onClose]);

  const pendingInvitations = useMemo(
    () =>
      invitations.filter(
        (item) => Boolean(item.org) && (item.state || '').toLowerCase() === 'pending'
      ),
    [invitations]
  );

  const visibleInvitations = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return invitations;
    return invitations.filter((item) => {
      const hay = `${item.org ?? ''} ${item.description ?? ''} ${item.role ?? ''} ${item.state ?? ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [invitations, search]);

  if (!token) return null;

  const isBusy = Boolean(actingKey) || acceptingAll;
  const tokenLabel = token.accountUsername
    ? `@${token.accountUsername}`
    : token.accountName || token.tokenPreview || token.id;

  const handleStateFilterChange = (nextState: InvitationStateFilter) => {
    if (isBusy) return;
    setStateFilter(nextState);
    setConfirmDeclineOrg(null);
    void loadInvitations(nextState);
  };

  const handleRespond = async (
    org: string,
    action: GitHubOrgInvitationActionRequestActionEnum
  ) => {
    if (!tokenId || !org) return;
    const key = `${org}:${action}`;
    setActingKey(key);
    setActionError(null);
    try {
      const res = await executeApi(
        v1.respondToOrgInvitation(
          {
            id: encodeURIComponent(tokenId),
            org: encodeURIComponent(org),
          },
          { action }
        ),
        serverConfig.useProxy
      );
      setConfirmDeclineOrg(null);
      notify({
        tone: action === GitHubOrgInvitationActionRequestActionEnum.ACCEPT ? 'success' : 'info',
        title:
          action === GitHubOrgInvitationActionRequestActionEnum.ACCEPT
            ? `Đã đồng ý lời mời vào ${org}`
            : `Đã từ chối lời mời vào ${org}`,
        description: res.message || (res.role ? `Vai trò: ${res.role}` : undefined),
      });
      await loadInvitations(stateFilter);
    } catch (err) {
      if (err instanceof ApiClientError && (err.status === 401 || err.status === 403)) {
        onAuthFailure(err.message);
        return;
      }
      setActionError(
        err instanceof ApiClientError
          ? err.message
          : `Không thể xử lý lời mời cho organization "${org}".`
      );
    } finally {
      setActingKey(null);
    }
  };

  const handleAcceptAllPending = async () => {
    if (!tokenId || pendingInvitations.length === 0) return;
    setAcceptingAll(true);
    setActionError(null);
    setConfirmDeclineOrg(null);

    let okCount = 0;
    let errCount = 0;

    for (const item of pendingInvitations) {
      if (!item.org) continue;
      try {
        await executeApi(
          v1.respondToOrgInvitation(
            {
              id: encodeURIComponent(tokenId),
              org: encodeURIComponent(item.org),
            },
            { action: GitHubOrgInvitationActionRequestActionEnum.ACCEPT }
          ),
          serverConfig.useProxy
        );
        okCount += 1;
      } catch (err) {
        if (err instanceof ApiClientError && (err.status === 401 || err.status === 403)) {
          setAcceptingAll(false);
          onAuthFailure(err.message);
          return;
        }
        errCount += 1;
      }
    }

    setAcceptingAll(false);
    notify({
      tone: errCount === 0 ? 'success' : okCount > 0 ? 'info' : 'error',
      title: `Đã đồng ý ${okCount}/${pendingInvitations.length} lời mời`,
      description: errCount > 0 ? `Có ${errCount} lời mời gặp lỗi khi xử lý.` : undefined,
    });
    await loadInvitations(stateFilter);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-[2px] p-4"
      onClick={() => {
        if (!isBusy) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="org-invitations-modal-title"
        className="w-full max-w-2xl max-h-[88vh] flex flex-col rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 dark:border-slate-800 px-6 py-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 shrink-0">
              <Mail className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h3
                id="org-invitations-modal-title"
                className="font-display text-base font-semibold text-slate-900 dark:text-slate-100 truncate"
              >
                Lời mời Organization · {tokenLabel}
              </h3>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 truncate">
                Xem và đồng ý hoặc từ chối lời mời tham gia GitHub Organization
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isBusy}
            aria-label="Đóng hộp thoại"
            className="cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-50 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 px-6 py-3">
          <div className="relative flex-1 min-w-0">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm tên organization, vai trò..."
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#090D16] pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="inline-flex rounded-lg bg-slate-200/70 dark:bg-slate-800 p-0.5 text-[11px] font-medium">
              {(
                [
                  { id: 'pending', label: 'Đang chờ' },
                  { id: 'active', label: 'Đã tham gia' },
                  { id: 'all', label: 'Tất cả' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  disabled={isBusy}
                  onClick={() => handleStateFilterChange(tab.id)}
                  className={`cursor-pointer rounded-md px-2.5 py-1 transition-colors whitespace-nowrap disabled:opacity-50 ${
                    stateFilter === tab.id
                      ? 'bg-white dark:bg-[#0F172A] text-slate-900 dark:text-slate-100 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => void loadInvitations(stateFilter)}
              disabled={loading || isBusy}
              title="Tải lại danh sách lời mời"
              aria-label="Tải lại danh sách lời mời"
              className="cursor-pointer inline-flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#090D16] p-1.5 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {(error || actionError) && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50/75 dark:bg-red-950/35 px-3.5 py-2.5 text-xs text-red-900 dark:text-red-300"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{actionError || error}</span>
            </div>
          )}

          {/* Bulk accept bar when multiple pending invitations exist */}
          {!loading && pendingInvitations.length > 1 && (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/60 dark:bg-emerald-950/25 px-4 py-2.5">
              <span className="text-xs text-emerald-900 dark:text-emerald-200">
                Có <strong className="font-mono">{pendingInvitations.length}</strong> lời mời đang
                chờ xác nhận.
              </span>
              <button
                type="button"
                disabled={isBusy}
                onClick={() => void handleAcceptAllPending()}
                className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50 transition-colors whitespace-nowrap"
              >
                {acceptingAll ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CheckCheck className="h-3.5 w-3.5" />
                )}
                {acceptingAll ? 'Đang xử lý...' : `Đồng ý tất cả (${pendingInvitations.length})`}
              </button>
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-xs text-slate-500 dark:text-slate-400 gap-2.5">
              <Loader2 className="h-5 w-5 animate-spin text-blue-600 dark:text-blue-400" />
              <span>Đang tải danh sách lời mời từ GitHub...</span>
            </div>
          ) : visibleInvitations.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 py-12 px-4 text-center">
              <Mail className="mx-auto h-5 w-5 text-slate-400" />
              <p className="mt-2 font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
                {invitations.length === 0
                  ? stateFilter === 'pending'
                    ? 'Không có lời mời nào đang chờ'
                    : stateFilter === 'active'
                      ? 'Chưa tham gia Organization nào'
                      : 'Không có dữ liệu membership nào'
                  : 'Không có kết quả nào khớp từ khóa'}
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {invitations.length === 0
                  ? 'Khi tài khoản được mời vào GitHub Organization, lời mời sẽ hiển thị tại đây.'
                  : 'Thử xóa từ khóa tìm kiếm hoặc chuyển tab trạng thái.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              {visibleInvitations.map((item) => {
                const org = item.org || '';
                const isPending = (item.state || '').toLowerCase() === 'pending';
                const isAccepting =
                  actingKey === `${org}:${GitHubOrgInvitationActionRequestActionEnum.ACCEPT}`;
                const isDeclining =
                  actingKey === `${org}:${GitHubOrgInvitationActionRequestActionEnum.DECLINE}`;
                const isConfirmingDecline = confirmDeclineOrg === org;
                const externalHref =
                  item.invitationUrl || (org ? `https://github.com/${encodeURIComponent(org)}` : null);

                return (
                  <div
                    key={`${org}-${item.githubOrgId ?? item.state}`}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3.5 hover:bg-slate-50/70 dark:hover:bg-slate-800/35 transition-colors"
                  >
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      {item.avatarUrl ? (
                        <img
                          src={item.avatarUrl}
                          alt={org}
                          className="h-9 w-9 rounded-lg border border-slate-200 dark:border-slate-700 object-cover shrink-0 bg-white"
                        />
                      ) : (
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-500 shrink-0">
                          <Building2 className="h-4 w-4" />
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {externalHref ? (
                            <a
                              href={externalHref}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-slate-900 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                            >
                              <span>{org || '—'}</span>
                              <ExternalLink className="h-3 w-3 text-slate-400" />
                            </a>
                          ) : (
                            <span className="font-mono text-xs font-semibold text-slate-900 dark:text-slate-100">
                              {org || '—'}
                            </span>
                          )}

                          {item.role && (
                            <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] font-medium text-slate-600 dark:text-slate-300">
                              {item.role}
                            </span>
                          )}

                          {isPending ? (
                            <span className="inline-flex items-center rounded-full border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/35 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300">
                              Đang chờ
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-300">
                              <CheckCircle2 className="h-2.5 w-2.5" />
                              Đã tham gia
                            </span>
                          )}
                        </div>

                        {item.description && (
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                            {item.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Actions for pending invitations */}
                    {isPending && org && (
                      <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                        {isConfirmingDecline ? (
                          <>
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() =>
                                void handleRespond(
                                  org,
                                  GitHubOrgInvitationActionRequestActionEnum.DECLINE
                                )
                              }
                              className="cursor-pointer inline-flex items-center gap-1 rounded-lg bg-red-600 hover:bg-red-700 px-2.5 py-1.5 text-xs font-medium text-white disabled:opacity-50 transition-colors"
                            >
                              {isDeclining ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <XCircle className="h-3.5 w-3.5" />
                              )}
                              Xác nhận từ chối
                            </button>
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => setConfirmDeclineOrg(null)}
                              className="cursor-pointer rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors"
                            >
                              Hủy
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() =>
                                void handleRespond(
                                  org,
                                  GitHubOrgInvitationActionRequestActionEnum.ACCEPT
                                )
                              }
                              className="cursor-pointer inline-flex items-center gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50 transition-colors"
                            >
                              {isAccepting ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Check className="h-3.5 w-3.5" />
                              )}
                              Đồng ý
                            </button>
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => setConfirmDeclineOrg(org)}
                              className="cursor-pointer inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/35 disabled:opacity-50 transition-colors"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              Từ chối
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 px-6 py-3.5">
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Sau khi đồng ý lời mời, bạn có thể nhấn <strong className="font-medium text-slate-700 dark:text-slate-300">Import Org</strong> để thêm organization vào hệ thống.
          </p>
          <button
            type="button"
            onClick={onClose}
            disabled={isBusy}
            className="cursor-pointer rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors shrink-0"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
