import { useCallback, useMemo, useState } from 'react';
import {
  AlertCircle,
  Building2,
  Check,
  CheckCircle2,
  Copy,
  KeyRound,
  Loader2,
  Mail,
  Plus,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserPlus,
  X,
} from 'lucide-react';
import {
  ApiClientError,
  executeApi,
  useBackendClient,
  type GitHubTokenOrgAccessCheckResponse,
  type GitHubTokenResponse,
  type OrganizationEntity,
  type RepositoryEntity,
} from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { formatDateTime } from '../../utils/format';
import { AddTokenModal } from './AddTokenModal';
import { ImportOrgsModal } from './ImportOrgsModal';
import { InviteOrgMemberModal } from './InviteOrgMemberModal';
import { OrgInvitationsModal } from './OrgInvitationsModal';
import {
  TokenAccessCheckModal,
  type TokenAccessCheckCache,
} from './TokenAccessCheckModal';

interface TokensPanelProps {
  tokens: GitHubTokenResponse[];
  organizations: OrganizationEntity[];
  repositories: RepositoryEntity[];
  loading: boolean;
  error: string | null;
  superTokenOnly: boolean;
  onSuperTokenOnlyChange: (value: boolean) => void;
  onRefresh: () => void;
  onOrganizationsImported: () => void;
  onAuthFailure: (message: string) => void;
}

export function TokensPanel({
  tokens,
  organizations,
  repositories,
  loading,
  error,
  superTokenOnly,
  onSuperTokenOnlyChange,
  onRefresh,
  onOrganizationsImported,
  onAuthFailure,
}: TokensPanelProps) {
  const { serverConfig } = useAuth();
  const { v1 } = useBackendClient();
  const { notify } = useToast();

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [importTargetToken, setImportTargetToken] = useState<GitHubTokenResponse | null>(null);
  const [inviteFromToken, setInviteFromToken] = useState<GitHubTokenResponse | null>(null);
  const [invitationsTargetToken, setInvitationsTargetToken] =
    useState<GitHubTokenResponse | null>(null);
  const [pendingInvitationCounts, setPendingInvitationCounts] = useState<Record<string, number>>(
    {}
  );
  const [accessCheckTargetToken, setAccessCheckTargetToken] =
    useState<GitHubTokenResponse | null>(null);
  const [accessCheckCaches, setAccessCheckCaches] = useState<
    Record<string, TokenAccessCheckCache>
  >({});
  const [checkingAllSuperTokens, setCheckingAllSuperTokens] = useState(false);

  const handlePendingCountUpdated = useCallback((tokenId: string, pendingCount: number) => {
    setPendingInvitationCounts((prev) =>
      prev[tokenId] === pendingCount ? prev : { ...prev, [tokenId]: pendingCount }
    );
  }, []);

  const handleAccessCacheUpdated = useCallback(
    (tokenId: string, cache: TokenAccessCheckCache) => {
      setAccessCheckCaches((prev) => ({ ...prev, [tokenId]: cache }));
    },
    []
  );

  const superTokens = useMemo(
    () => tokens.filter((t) => Boolean(t.isSuperToken) && Boolean(t.id)),
    [tokens]
  );

  const visibleTokens = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tokens;
    return tokens.filter((item) => {
      const hay = `${item.id ?? ''} ${item.accountUsername ?? ''} ${item.accountName ?? ''} ${item.accountEmail ?? ''} ${item.tokenPreview ?? ''} ${item.description ?? ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [tokens, search]);

  const handleCheckAllSuperTokens = async () => {
    const validOrgs = organizations.map((o) => (o.org || '').trim()).filter(Boolean);
    if (superTokens.length === 0 || validOrgs.length === 0) return;
    setCheckingAllSuperTokens(true);
    setActionError(null);

    let fullCount = 0;
    let partialCount = 0;

    for (const item of superTokens) {
      if (!item.id) continue;
      const tokenOrgResults: Record<string, GitHubTokenOrgAccessCheckResponse> = {};
      let allOrgsOk = true;

      for (const orgSlug of validOrgs) {
        const key = orgSlug.toLowerCase();
        try {
          const res = await executeApi(
            v1.checkTokenOrgAccess({
              id: encodeURIComponent(item.id),
              org: encodeURIComponent(orgSlug),
            }),
            serverConfig.useProxy
          );
          tokenOrgResults[key] = res;
          if (!res.accessible) allOrgsOk = false;
        } catch (err) {
          if (err instanceof ApiClientError && (err.status === 401 || err.status === 403)) {
            setCheckingAllSuperTokens(false);
            onAuthFailure(err.message);
            return;
          }
          allOrgsOk = false;
          tokenOrgResults[key] = {
            org: orgSlug,
            accessible: false,
            error: err instanceof ApiClientError ? err.message : 'Lỗi kiểm tra quyền org.',
          };
        }
      }

      setAccessCheckCaches((prev) => ({
        ...prev,
        [item.id!]: {
          orgs: tokenOrgResults,
          repos: prev[item.id!]?.repos ?? {},
        },
      }));

      if (allOrgsOk) fullCount += 1;
      else partialCount += 1;
    }

    setCheckingAllSuperTokens(false);
    notify({
      tone: partialCount === 0 ? 'success' : 'info',
      title: `Đã kiểm tra quyền Org cho ${superTokens.length} Super Token`,
      description: `Đủ quyền toàn bộ ${validOrgs.length} Org: ${fullCount} · Thiếu quyền: ${partialCount}`,
    });
  };

  const handleCopyId = async (id?: string) => {
    if (!id) return;
    try {
      await navigator.clipboard.writeText(id);
      setCopiedId(id);
      window.setTimeout(() => {
        setCopiedId((prev) => (prev === id ? null : prev));
      }, 1800);
    } catch {
      // Ignore clipboard failure
    }
  };

  const handleToggleFlags = async (
    item: GitHubTokenResponse,
    next: { isActive?: boolean; isSuperToken?: boolean }
  ) => {
    if (!item.id) return;
    setUpdatingId(item.id);
    setActionError(null);
    try {
      await executeApi(
        v1.updateToken(
          { id: encodeURIComponent(item.id) },
          {
            isActive: next.isActive ?? item.isActive,
            isSuperToken: next.isSuperToken ?? item.isSuperToken,
          }
        ),
        serverConfig.useProxy
      );
      notify({
        tone: 'success',
        title: 'Đã cập nhật trạng thái token',
        description: item.accountUsername
          ? `@${item.accountUsername} · ${item.tokenPreview || item.id}`
          : item.tokenPreview || item.id,
      });
      onRefresh();
    } catch (err) {
      if (err instanceof ApiClientError && (err.status === 401 || err.status === 403)) {
        onAuthFailure(err.message);
        return;
      }
      setActionError(err instanceof ApiClientError ? err.message : 'Không thể cập nhật token.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleSyncAccount = async (item: GitHubTokenResponse) => {
    if (!item.id) return;
    setSyncingId(item.id);
    setActionError(null);
    try {
      const updated = await executeApi(
        v1.syncAccountInfo({ id: encodeURIComponent(item.id) }),
        serverConfig.useProxy
      );
      notify({
        tone: 'success',
        title: 'Đã đồng bộ thông tin GitHub account',
        description: updated.accountUsername
          ? `@${updated.accountUsername}${updated.accountEmail ? ` · ${updated.accountEmail}` : ''}`
          : item.tokenPreview || item.id,
      });
      onRefresh();
    } catch (err) {
      if (err instanceof ApiClientError && (err.status === 401 || err.status === 403)) {
        onAuthFailure(err.message);
        return;
      }
      setActionError(
        err instanceof ApiClientError
          ? err.message
          : 'Không thể đồng bộ thông tin tài khoản GitHub cho token này.'
      );
    } finally {
      setSyncingId(null);
    }
  };

  const handleDelete = async (item: GitHubTokenResponse) => {
    if (!item.id) return;
    setDeletingId(item.id);
    setActionError(null);
    try {
      await executeApi(
        v1.deleteToken({ id: encodeURIComponent(item.id) }),
        serverConfig.useProxy
      );
      setConfirmDeleteId(null);
      notify({
        tone: 'info',
        title: 'Đã xóa GitHub token',
        description: item.accountUsername
          ? `@${item.accountUsername} (${item.tokenPreview || item.id})`
          : item.tokenPreview || item.id,
      });
      onRefresh();
    } catch (err) {
      if (err instanceof ApiClientError && (err.status === 401 || err.status === 403)) {
        onAuthFailure(err.message);
        return;
      }
      setActionError(
        err instanceof ApiClientError ? err.message : 'Không thể xóa GitHub token này.'
      );
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <section className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A]">
        {/* Unified Toolbar */}
        <div className="flex flex-col gap-3 border-b border-slate-200 dark:border-slate-800 px-5 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 flex-1 min-w-0">
              <div className="relative flex-1 max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm theo username, email, token preview..."
                  aria-label="Tìm kiếm token"
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-[#090D16] pl-8.5 pr-7 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:bg-white dark:focus:bg-[#090D16] focus:border-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 transition-colors"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    aria-label="Xóa từ khóa"
                    className="cursor-pointer absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <div className="inline-flex rounded-lg bg-slate-100 dark:bg-slate-800/80 p-1 text-[11px] font-medium self-start">
                <button
                  type="button"
                  onClick={() => onSuperTokenOnlyChange(false)}
                  className={`cursor-pointer rounded-md px-2.5 py-1 transition-colors ${
                    !superTokenOnly
                      ? 'bg-white dark:bg-[#0F172A] text-slate-900 dark:text-slate-100 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  Tất cả
                </button>
                <button
                  type="button"
                  onClick={() => onSuperTokenOnlyChange(true)}
                  className={`cursor-pointer inline-flex items-center gap-1 rounded-md px-2.5 py-1 transition-colors ${
                    superTokenOnly
                      ? 'bg-white dark:bg-[#0F172A] text-slate-900 dark:text-slate-100 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <Shield className="h-3 w-3" />
                  Super Token
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {superTokens.length > 0 && (
                <button
                  type="button"
                  onClick={() => void handleCheckAllSuperTokens()}
                  disabled={checkingAllSuperTokens || loading}
                  className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/75 dark:bg-indigo-950/35 px-3 py-2 text-xs font-medium text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-950/60 disabled:opacity-50 transition-colors whitespace-nowrap"
                >
                  {checkingAllSuperTokens ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <ShieldCheck className="h-3.5 w-3.5" />
                  )}
                  {checkingAllSuperTokens
                    ? 'Đang kiểm tra...'
                    : `Kiểm tra ${superTokens.length} Super Token`}
                </button>
              )}

              <button
                type="button"
                onClick={onRefresh}
                disabled={loading}
                title="Tải lại danh sách token"
                aria-label="Tải lại danh sách token"
                className="cursor-pointer inline-flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#090D16] p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>

              <button
                type="button"
                onClick={() => setAddModalOpen(true)}
                className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 px-3.5 py-2 text-xs font-medium text-white shadow-xs transition-colors whitespace-nowrap"
              >
                <Plus className="h-3.5 w-3.5" />
                Thêm Token
              </button>
            </div>
          </div>
        </div>

        {(error || actionError) && (
          <div
            role="alert"
            className="mx-5 my-4 flex items-start gap-2 rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50/75 dark:bg-red-950/35 px-3.5 py-2.5 text-xs text-red-800 dark:text-red-300"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{actionError || error}</span>
          </div>
        )}

        {/* Token list */}
        {loading && tokens.length === 0 ? (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div key={idx} className="p-5 space-y-2.5">
                <div className="h-4 w-48 rounded bg-slate-200/80 dark:bg-slate-800 animate-pulse" />
                <div className="h-3 w-72 rounded bg-slate-200/80 dark:bg-slate-800 animate-pulse" />
              </div>
            ))}
          </div>
        ) : visibleTokens.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400">
              <KeyRound className="h-5 w-5" />
            </div>
            <p className="mt-3 font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
              {tokens.length === 0
                ? superTokenOnly
                  ? 'Chưa có Super Token nào'
                  : 'Chưa có GitHub Token nào'
                : 'Không có token nào khớp tìm kiếm'}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {tokens.length === 0
                ? 'Thêm GitHub Token để import Organization và quản lý repository.'
                : 'Thử xóa từ khóa tìm kiếm hoặc chuyển bộ lọc.'}
            </p>
            {tokens.length === 0 && !superTokenOnly && (
              <button
                type="button"
                onClick={() => setAddModalOpen(true)}
                className="cursor-pointer mt-4 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 px-3.5 py-2 text-xs font-medium text-white transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                Thêm Token đầu tiên
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {visibleTokens.map((item) => {
              const id = item.id || '';
              const isUpdating = updatingId === id;
              const isSyncing = syncingId === id;
              const isDeleting = deletingId === id;
              const isConfirming = confirmDeleteId === id;
              const isBusy = isUpdating || isSyncing || isDeleting;
              const cachedAccess = id ? accessCheckCaches[id] : undefined;
              const checkedOrgs = cachedAccess ? Object.values(cachedAccess.orgs) : [];
              const checkedRepos = cachedAccess ? Object.values(cachedAccess.repos) : [];
              const hasCachedAccess = checkedOrgs.length > 0 || checkedRepos.length > 0;
              const okOrgsCount = checkedOrgs.filter((o) => o.accessible).length;
              const okReposCount = checkedRepos.filter((r) => r.accessible && r.canPush).length;
              const allCheckedPassed =
                okOrgsCount === checkedOrgs.length && okReposCount === checkedRepos.length;

              return (
                <div
                  key={id || item.tokenPreview}
                  className="p-5 hover:bg-slate-50/70 dark:hover:bg-slate-800/35 transition-colors space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {item.accountUsername ? `@${item.accountUsername}` : 'Chưa đồng bộ account'}
                        </span>
                        {item.accountName && (
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {item.accountName}
                          </span>
                        )}
                        {item.tokenPreview && (
                          <span className="rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#090D16] px-2 py-0.5 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                            {item.tokenPreview}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                        {item.accountEmail && <span>{item.accountEmail}</span>}
                        {id && (
                          <button
                            type="button"
                            onClick={() => void handleCopyId(id)}
                            className="cursor-pointer inline-flex items-center gap-1 font-mono hover:text-slate-800 dark:hover:text-slate-200"
                            title={`Sao chép UUID: ${id}`}
                          >
                            <span>ID: {id.slice(0, 8)}…</span>
                            {copiedId === id ? (
                              <Check className="h-3 w-3 text-emerald-600" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>
                        )}
                        <span className="font-mono tabular-nums text-slate-400 dark:text-slate-500">
                          Tạo: {formatDateTime(item.createdAt)}
                        </span>
                        {item.expiresAt && (
                          <span className="font-mono tabular-nums text-amber-600 dark:text-amber-400">
                            Hết hạn: {formatDateTime(item.expiresAt)}
                          </span>
                        )}
                      </div>

                      {hasCachedAccess && (
                        <button
                          type="button"
                          onClick={() => setAccessCheckTargetToken(item)}
                          className={`cursor-pointer mt-1 inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                            allCheckedPassed
                              ? 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/35 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-950/55'
                              : 'border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/35 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-950/55'
                          }`}
                        >
                          {allCheckedPassed ? (
                            <CheckCircle2 className="h-3 w-3 shrink-0" />
                          ) : (
                            <ShieldAlert className="h-3 w-3 shrink-0" />
                          )}
                          <span>
                            {allCheckedPassed ? 'Đạt kiểm tra' : 'Thiếu quyền'}
                            {checkedOrgs.length > 0
                              ? ` · Org: ${okOrgsCount}/${checkedOrgs.length}`
                              : ''}
                            {checkedRepos.length > 0
                              ? ` · Repo: ${okReposCount}/${checkedRepos.length}`
                              : ''}
                          </span>
                        </button>
                      )}
                    </div>

                    {/* Interactive Status Pills */}
                    <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        disabled={isBusy || !id}
                        onClick={() => void handleToggleFlags(item, { isActive: !item.isActive })}
                        title="Nhấn để bật/tắt token"
                        className={`cursor-pointer inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors disabled:opacity-50 ${
                          item.isActive
                            ? 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-950/60'
                            : 'border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200/70 dark:hover:bg-slate-700'
                        }`}
                      >
                        {isUpdating ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              item.isActive ? 'bg-emerald-500' : 'bg-slate-400'
                            }`}
                          />
                        )}
                        {item.isActive ? 'Đang bật' : 'Đã tắt'}
                      </button>

                      <button
                        type="button"
                        disabled={isBusy || !id}
                        onClick={() =>
                          void handleToggleFlags(item, { isSuperToken: !item.isSuperToken })
                        }
                        title="Nhấn để bật/tắt quyền Super Token"
                        className={`cursor-pointer inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors disabled:opacity-50 ${
                          item.isSuperToken
                            ? 'border-indigo-200 dark:border-indigo-900/60 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-950/60'
                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-[#090D16] text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <Shield className="h-3 w-3" />
                        {item.isSuperToken ? 'Super Token' : 'Thường'}
                      </button>
                    </div>
                  </div>

                  {/* Clean Action Row */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        disabled={isBusy || !id}
                        onClick={() => setImportTargetToken(item)}
                        className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50 transition-colors"
                      >
                        <Building2 className="h-3.5 w-3.5" />
                        Import Org
                      </button>

                      <button
                        type="button"
                        disabled={isBusy || !id}
                        onClick={() => setInviteFromToken(item)}
                        className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#090D16] px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors"
                      >
                        <UserPlus className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                        Mời thành viên
                      </button>

                      <button
                        type="button"
                        disabled={isBusy || !id}
                        onClick={() => setInvitationsTargetToken(item)}
                        className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#090D16] px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors"
                      >
                        <Mail className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                        <span>Lời mời Org</span>
                        {id && pendingInvitationCounts[id] !== undefined && pendingInvitationCounts[id] > 0 && (
                          <span className="rounded-full bg-amber-100 dark:bg-amber-950/70 px-1.5 py-0.5 font-mono text-[10px] font-semibold tabular-nums text-amber-800 dark:text-amber-300">
                            {pendingInvitationCounts[id]}
                          </span>
                        )}
                      </button>

                      <button
                        type="button"
                        disabled={isBusy || !id}
                        onClick={() => setAccessCheckTargetToken(item)}
                        className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#090D16] px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors"
                      >
                        <ShieldCheck className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                        Kiểm tra quyền
                      </button>

                      <button
                        type="button"
                        disabled={isBusy || !id}
                        onClick={() => void handleSyncAccount(item)}
                        className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#090D16] px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors"
                      >
                        {isSyncing ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <UserCheck className="h-3.5 w-3.5" />
                        )}
                        Sync
                      </button>
                    </div>

                    {id &&
                      (isConfirming ? (
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => void handleDelete(item)}
                            disabled={isDeleting}
                            className="cursor-pointer inline-flex items-center gap-1 rounded-md bg-red-600 hover:bg-red-700 px-2.5 py-1 text-xs font-medium text-white disabled:opacity-60 transition-colors"
                          >
                            {isDeleting && <Loader2 className="h-3 w-3 animate-spin" />}
                            Xác nhận xóa
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            disabled={isDeleting}
                            className="cursor-pointer rounded-md border border-slate-200 dark:border-slate-700 px-2 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          >
                            Hủy
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => setConfirmDeleteId(id)}
                          className="cursor-pointer inline-flex items-center gap-1 rounded-md border border-slate-200 dark:border-slate-800 px-2.5 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/35 disabled:opacity-50 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Xóa
                        </button>
                      ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <AddTokenModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onCreated={onRefresh}
        onAuthFailure={onAuthFailure}
      />

      <ImportOrgsModal
        token={importTargetToken}
        onClose={() => setImportTargetToken(null)}
        onImported={() => onOrganizationsImported()}
        onAuthFailure={onAuthFailure}
      />

      <InviteOrgMemberModal
        inviterToken={inviteFromToken}
        allTokens={tokens}
        onClose={() => setInviteFromToken(null)}
        onAuthFailure={onAuthFailure}
      />

      <OrgInvitationsModal
        token={invitationsTargetToken}
        onClose={() => setInvitationsTargetToken(null)}
        onPendingCountUpdated={handlePendingCountUpdated}
        onAuthFailure={onAuthFailure}
      />

      <TokenAccessCheckModal
        token={accessCheckTargetToken}
        organizations={organizations}
        repositories={repositories}
        initialCache={
          accessCheckTargetToken?.id ? accessCheckCaches[accessCheckTargetToken.id] : null
        }
        onCacheUpdated={handleAccessCacheUpdated}
        onClose={() => setAccessCheckTargetToken(null)}
        onAuthFailure={onAuthFailure}
      />
    </>
  );
}
