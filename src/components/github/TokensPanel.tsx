import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import {
  AlertCircle,
  Building2,
  Check,
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserCheck,
} from 'lucide-react';
import {
  ApiClientError,
  executeApi,
  useBackendClient,
  type GitHubTokenAccessCheckResponse,
  type GitHubTokenResponse,
  type OrganizationEntity,
} from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { formatDateTime } from '../../utils/format';
import { ImportOrgsModal } from './ImportOrgsModal';
import { TokenAccessCheckModal } from './TokenAccessCheckModal';

interface TokensPanelProps {
  tokens: GitHubTokenResponse[];
  organizations: OrganizationEntity[];
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

  // Create token form
  const [tokenInput, setTokenInput] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [isSuperTokenInput, setIsSuperTokenInput] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // List controls & row actions
  const [search, setSearch] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Import Orgs modal target
  const [importTargetToken, setImportTargetToken] = useState<GitHubTokenResponse | null>(null);

  // Access check modal & cached per-token full-DB results
  const [accessCheckTargetToken, setAccessCheckTargetToken] =
    useState<GitHubTokenResponse | null>(null);
  const [accessCheckResults, setAccessCheckResults] = useState<
    Record<string, GitHubTokenAccessCheckResponse>
  >({});
  const [checkingAllSuperTokens, setCheckingAllSuperTokens] = useState(false);

  const superTokens = useMemo(
    () => tokens.filter((t) => Boolean(t.isSuperToken) && Boolean(t.id)),
    [tokens]
  );

  const handleCheckAllSuperTokens = async () => {
    if (superTokens.length === 0) return;
    setCheckingAllSuperTokens(true);
    setActionError(null);

    let fullCount = 0;
    let partialCount = 0;
    let failedCount = 0;

    for (const item of superTokens) {
      if (!item.id) continue;
      try {
        const res = await executeApi(
          v1.checkTokenAccess({ id: encodeURIComponent(item.id) }),
          serverConfig.useProxy
        );
        setAccessCheckResults((prev) => ({ ...prev, [item.id!]: res }));
        if (res.hasFullAccess) fullCount += 1;
        else partialCount += 1;
      } catch (err) {
        if (err instanceof ApiClientError && (err.status === 401 || err.status === 403)) {
          setCheckingAllSuperTokens(false);
          onAuthFailure(err.message);
          return;
        }
        failedCount += 1;
      }
    }

    setCheckingAllSuperTokens(false);
    notify({
      tone: partialCount === 0 && failedCount === 0 ? 'success' : 'info',
      title: `Đã kiểm tra ${superTokens.length} Super Token`,
      description: `Đủ quyền R/W: ${fullCount} · Thiếu quyền: ${partialCount}${
        failedCount > 0 ? ` · Lỗi kiểm tra: ${failedCount}` : ''
      }`,
    });
  };

  const visibleTokens = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tokens;
    return tokens.filter((item) => {
      const hay = `${item.id ?? ''} ${item.accountUsername ?? ''} ${item.accountName ?? ''} ${item.accountEmail ?? ''} ${item.tokenPreview ?? ''} ${item.description ?? ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [tokens, search]);

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

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    setCreateError(null);

    const trimmed = tokenInput.trim();
    if (!trimmed) {
      setCreateError('Vui lòng nhập GitHub Personal Access Token hoặc Fine-grained token.');
      return;
    }

    setCreating(true);
    try {
      const created = await executeApi(
        v1.createToken({
          token: trimmed,
          isSuperToken: isSuperTokenInput,
        }),
        serverConfig.useProxy
      );
      setTokenInput('');
      setShowToken(false);
      setIsSuperTokenInput(false);
      notify({
        tone: 'success',
        title: 'Đã thêm GitHub token',
        description: created.accountUsername
          ? `@${created.accountUsername} (${created.tokenPreview || created.id})`
          : created.tokenPreview || created.id || 'Lưu token thành công',
      });
      onRefresh();
    } catch (err) {
      if (err instanceof ApiClientError && (err.status === 401 || err.status === 403)) {
        onAuthFailure(err.message);
        return;
      }
      setCreateError(
        err instanceof ApiClientError
          ? err.message
          : 'Không thể thêm mới GitHub token. Kiểm tra lại tính hợp lệ của token.'
      );
    } finally {
      setCreating(false);
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
      setActionError(
        err instanceof ApiClientError ? err.message : 'Không thể cập nhật token.'
      );
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
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left: Add GitHub Token form */}
        <section className="xl:col-span-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] p-6 space-y-5">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
              Thêm GitHub Token
            </h2>
            <p className="mt-0.5 font-mono text-[11px] text-slate-500 dark:text-slate-400">
              POST /v1/github/tokens
            </p>
          </div>

          <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
            Hệ thống sẽ tự động sinh mã định danh UUID, kích hoạt mặc định và truy vấn thông tin tài
            khoản GitHub (<span className="font-mono text-slate-800 dark:text-slate-200">/user</span>).
            Sau khi thêm, bạn có thể dùng token để import các Organization tương ứng.
          </p>

          {createError && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50/75 dark:bg-red-950/35 px-3.5 py-2.5 text-xs text-red-900 dark:text-red-300"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{createError}</span>
            </div>
          )}

          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="github-token-input"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                GitHub Token <span className="text-red-600">*</span>
              </label>
              <div className="relative">
                <input
                  id="github-token-input"
                  type={showToken ? 'text' : 'password'}
                  required
                  autoComplete="off"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  placeholder="ghp_... hoặc github_pat_..."
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#090D16] pl-3 pr-9 py-2 font-mono text-xs text-slate-900 dark:text-slate-100 placeholder:font-sans placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30"
                />
                <button
                  type="button"
                  onClick={() => setShowToken((prev) => !prev)}
                  aria-label={showToken ? 'Ẩn token' : 'Hiện token'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                >
                  {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <label className="flex items-start gap-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 p-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isSuperTokenInput}
                onChange={(e) => setIsSuperTokenInput(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500"
              />
              <div className="space-y-0.5">
                <span className="block text-xs font-medium text-slate-800 dark:text-slate-200">
                  Đánh dấu là Super Token
                </span>
                <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                  Token có quyền truy cập toàn bộ repository. Hệ thống hỗ trợ nhiều super token.
                </span>
              </div>
            </label>

            <button
              type="submit"
              disabled={creating}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 px-4 py-2.5 text-xs font-medium text-white disabled:opacity-60 transition-colors"
            >
              {creating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              {creating ? 'Đang xác thực & lưu token...' : 'Thêm GitHub token'}
            </button>
          </form>
        </section>

        {/* Right: Tokens list */}
        <section className="xl:col-span-8 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 px-5 py-3.5">
            <div className="min-w-0">
              <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
                Danh sách GitHub Tokens
              </h2>
              <p className="mt-0.5 font-mono text-[11px] tabular-nums text-slate-500 dark:text-slate-400">
                GET /v1/github/tokens{superTokenOnly ? '?superTokenOnly=true' : ''} ·{' '}
                {visibleTokens.length}/{tokens.length} token
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {superTokens.length > 0 && (
                <button
                  type="button"
                  onClick={() => void handleCheckAllSuperTokens()}
                  disabled={checkingAllSuperTokens || loading}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/80 dark:bg-indigo-950/35 px-3 py-1.5 text-xs font-medium text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-950/60 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0"
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

              <div className="inline-flex rounded-lg bg-slate-200/70 dark:bg-slate-800 p-0.5 text-[11px] font-medium">
                <button
                  type="button"
                  onClick={() => onSuperTokenOnlyChange(false)}
                  className={`rounded-md px-2.5 py-1 transition-colors ${
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
                  className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 transition-colors ${
                    superTokenOnly
                      ? 'bg-white dark:bg-[#0F172A] text-slate-900 dark:text-slate-100 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <Shield className="h-3 w-3" />
                  Super Token
                </button>
              </div>

              <button
                type="button"
                onClick={onRefresh}
                disabled={loading}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-800 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                Tải lại
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 px-5 py-2.5">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Lọc theo username, email, token preview hoặc UUID..."
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#090D16] pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none"
              />
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
            <div className="px-6 py-12 text-center">
              <KeyRound className="mx-auto h-5 w-5 text-slate-400" />
              <p className="mt-2 font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
                {tokens.length === 0
                  ? superTokenOnly
                    ? 'Chưa có Super Token nào'
                    : 'Chưa có GitHub token nào'
                  : 'Không có token nào khớp từ khóa tìm kiếm'}
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {tokens.length === 0
                  ? 'Thêm GitHub token bên trái để bắt đầu quản lý và import Organization.'
                  : 'Thử xóa từ khóa tìm kiếm hoặc chuyển bộ lọc.'}
              </p>
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
                const cachedAccess = id ? accessCheckResults[id] : undefined;

                return (
                  <div
                    key={id || item.tokenPreview}
                    className="p-5 hover:bg-slate-50/70 dark:hover:bg-slate-800/35 transition-colors space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      {/* Account + token metadata */}
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {item.accountUsername ? `@${item.accountUsername}` : 'Chưa đồng bộ account'}
                          </span>
                          {item.accountName && (
                            <span className="text-xs text-slate-600 dark:text-slate-400">
                              {item.accountName}
                            </span>
                          )}
                          {item.accountType && (
                            <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] text-slate-600 dark:text-slate-400">
                              {item.accountType}
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
                          {item.githubAccountId !== undefined && (
                            <span className="font-mono">GH ID: {item.githubAccountId}</span>
                          )}
                          {id && (
                            <button
                              type="button"
                              onClick={() => void handleCopyId(id)}
                              className="inline-flex items-center gap-1 font-mono hover:text-slate-800 dark:hover:text-slate-200"
                              title={`Sao chép UUID: ${id}`}
                            >
                              <span>UUID: {id.slice(0, 8)}…</span>
                              {copiedId === id ? (
                                <Check className="h-3 w-3 text-emerald-600" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </button>
                          )}
                        </div>

                        {item.description && (
                          <p className="text-xs text-slate-600 dark:text-slate-400">
                            {item.description}
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] tabular-nums text-slate-400 dark:text-slate-500">
                          <span>Tạo: {formatDateTime(item.createdAt)}</span>
                          {item.updatedAt && <span>Cập nhật: {formatDateTime(item.updatedAt)}</span>}
                          {item.expiresAt && (
                            <span className="text-amber-600 dark:text-amber-400">
                              Hết hạn: {formatDateTime(item.expiresAt)}
                            </span>
                          )}
                        </div>

                        {cachedAccess && (
                          <button
                            type="button"
                            onClick={() => setAccessCheckTargetToken(item)}
                            className={`mt-1 inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-medium transition-colors ${
                              cachedAccess.hasFullAccess
                                ? 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/35 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-950/55'
                                : 'border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/35 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-950/55'
                            }`}
                          >
                            {cachedAccess.hasFullAccess ? (
                              <CheckCircle2 className="h-3 w-3 shrink-0" />
                            ) : (
                              <ShieldAlert className="h-3 w-3 shrink-0" />
                            )}
                            <span>
                              {cachedAccess.hasFullAccess ? 'Đủ quyền Đọc/Ghi' : 'Thiếu quyền'} ·{' '}
                              {cachedAccess.accessibleOrganizationsCount ?? 0}/
                              {cachedAccess.totalOrganizations ?? 0} Org ·{' '}
                              {cachedAccess.accessibleRepositoriesCount ?? 0}/
                              {cachedAccess.totalRepositories ?? 0} Repo
                            </span>
                          </button>
                        )}
                      </div>

                      {/* Status toggles */}
                      <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          disabled={isBusy || !id}
                          onClick={() => void handleToggleFlags(item, { isActive: !item.isActive })}
                          title="Bật/tắt trạng thái kích hoạt của token"
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors disabled:opacity-50 ${
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
                          title="Bật/tắt quyền Super Token"
                          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors disabled:opacity-50 ${
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

                    {/* Action row */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          disabled={isBusy || !id}
                          onClick={() => setImportTargetToken(item)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50 transition-colors"
                        >
                          <Building2 className="h-3.5 w-3.5" />
                          Import Org
                        </button>

                        <button
                          type="button"
                          disabled={isBusy || !id}
                          onClick={() => setAccessCheckTargetToken(item)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/70 dark:bg-indigo-950/30 px-3 py-1.5 text-xs font-medium text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-950/55 disabled:opacity-50 transition-colors"
                        >
                          <ShieldCheck className="h-3.5 w-3.5" />
                          Kiểm tra quyền R/W
                        </button>

                        <button
                          type="button"
                          disabled={isBusy || !id}
                          onClick={() => void handleSyncAccount(item)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#090D16] px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors"
                        >
                          {isSyncing ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <UserCheck className="h-3.5 w-3.5" />
                          )}
                          Sync Account
                        </button>
                      </div>

                      {id && (
                        isConfirming ? (
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => void handleDelete(item)}
                              disabled={isDeleting}
                              className="inline-flex items-center gap-1 rounded-md bg-red-600 hover:bg-red-700 px-2.5 py-1 text-xs font-medium text-white disabled:opacity-60 transition-colors"
                            >
                              {isDeleting && <Loader2 className="h-3 w-3 animate-spin" />}
                              Xác nhận xóa
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              disabled={isDeleting}
                              className="rounded-md border border-slate-200 dark:border-slate-700 px-2 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                              Hủy
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => setConfirmDeleteId(id)}
                            className="inline-flex items-center gap-1 rounded-md border border-slate-200 dark:border-slate-800 px-2.5 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/35 disabled:opacity-50 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Xóa
                          </button>
                        )
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <ImportOrgsModal
        token={importTargetToken}
        onClose={() => setImportTargetToken(null)}
        onImported={() => onOrganizationsImported()}
        onAuthFailure={onAuthFailure}
      />

      <TokenAccessCheckModal
        token={accessCheckTargetToken}
        organizations={organizations}
        initialResult={
          accessCheckTargetToken?.id ? accessCheckResults[accessCheckTargetToken.id] : null
        }
        onResultUpdated={(tokenId, res) => {
          setAccessCheckResults((prev) => ({ ...prev, [tokenId]: res }));
        }}
        onClose={() => setAccessCheckTargetToken(null)}
        onAuthFailure={onAuthFailure}
      />
    </>
  );
}
