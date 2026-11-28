import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  ExternalLink,
  GitFork,
  Loader2,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  X,
  XCircle,
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

interface TokenAccessCheckModalProps {
  token: GitHubTokenResponse | null;
  organizations: OrganizationEntity[];
  initialResult?: GitHubTokenAccessCheckResponse | null;
  onResultUpdated?: (tokenId: string, result: GitHubTokenAccessCheckResponse) => void;
  onClose: () => void;
  onAuthFailure: (message: string) => void;
}

type ResultTab = 'organizations' | 'repositories';
type StatusFilter = 'all' | 'ok' | 'issues';

export function TokenAccessCheckModal({
  token,
  organizations,
  initialResult,
  onResultUpdated,
  onClose,
  onAuthFailure,
}: TokenAccessCheckModalProps) {
  const { serverConfig } = useAuth();
  const { v1 } = useBackendClient();

  const [selectedOrg, setSelectedOrg] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GitHubTokenAccessCheckResponse | null>(null);

  const [activeTab, setActiveTab] = useState<ResultTab>('organizations');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');

  const tokenId = token?.id || '';

  const runCheck = useCallback(
    async (orgSlug: string) => {
      if (!tokenId) return;
      setLoading(true);
      setError(null);
      try {
        const trimmedOrg = orgSlug.trim();
        const res = trimmedOrg
          ? await executeApi(
              v1.checkTokenOrgAccess({
                id: encodeURIComponent(tokenId),
                org: encodeURIComponent(trimmedOrg),
              }),
              serverConfig.useProxy
            )
          : await executeApi(
              v1.checkTokenAccess({ id: encodeURIComponent(tokenId) }),
              serverConfig.useProxy
            );
        setResult(res);
        if (!trimmedOrg && onResultUpdated) {
          onResultUpdated(tokenId, res);
        }
      } catch (err) {
        if (err instanceof ApiClientError && (err.status === 401 || err.status === 403)) {
          onAuthFailure(err.message);
          return;
        }
        setError(
          err instanceof ApiClientError
            ? err.message
            : 'Không thể kiểm tra quyền truy cập của token.'
        );
      } finally {
        setLoading(false);
      }
    },
    [tokenId, v1, serverConfig.useProxy, onResultUpdated, onAuthFailure]
  );

  useEffect(() => {
    if (!token) return;
    setSelectedOrg('');
    setActiveTab('organizations');
    setStatusFilter('all');
    setSearch('');
    setError(null);

    if (initialResult && !initialResult.targetOrg) {
      setResult(initialResult);
    } else {
      setResult(null);
      void runCheck('');
    }
  }, [token, initialResult, runCheck]);

  useEffect(() => {
    if (!token) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [token, loading, onClose]);

  const orgStatuses = result?.organizations ?? [];
  const repoStatuses = result?.repositories ?? [];

  const visibleOrgs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orgStatuses.filter((item) => {
      const ok = Boolean(item.accessible);
      if (statusFilter === 'ok' && !ok) return false;
      if (statusFilter === 'issues' && ok) return false;
      if (q) {
        const hay = `${item.org ?? ''} ${item.role ?? ''} ${item.state ?? ''} ${item.error ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [orgStatuses, statusFilter, search]);

  const visibleRepos = useMemo(() => {
    const q = search.trim().toLowerCase();
    return repoStatuses.filter((item) => {
      const ok = Boolean(item.accessible && item.canPush);
      if (statusFilter === 'ok' && !ok) return false;
      if (statusFilter === 'issues' && ok) return false;
      if (q) {
        const hay = `${item.fullRepository ?? ''} ${item.org ?? ''} ${item.repoName ?? ''} ${item.error ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [repoStatuses, statusFilter, search]);

  if (!token) return null;

  const tokenLabel = token.accountUsername
    ? `@${token.accountUsername}`
    : token.accountName || token.tokenPreview || token.id;

  const handleOrgScopeChange = (nextOrg: string) => {
    setSelectedOrg(nextOrg);
    void runCheck(nextOrg);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-[2px] p-4"
      onClick={() => {
        if (!loading) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="token-access-check-title"
        className="w-full max-w-3xl max-h-[88vh] flex flex-col rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 dark:border-slate-800 px-6 py-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <h3
                id="token-access-check-title"
                className="font-display text-base font-semibold text-slate-900 dark:text-slate-100 truncate"
              >
                Kiểm tra quyền Đọc / Ghi · {tokenLabel}
              </h3>
              {token.isSuperToken && (
                <span className="rounded-full border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 text-[10px] font-medium text-indigo-700 dark:text-indigo-300">
                  Super Token
                </span>
              )}
            </div>
            <p className="mt-1 font-mono text-[11px] text-slate-500 dark:text-slate-400 truncate">
              {selectedOrg
                ? `GET /v1/github/tokens/${token.id}/organizations/${selectedOrg}/check-access`
                : `GET /v1/github/tokens/${token.id}/check-access`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            aria-label="Đóng hộp thoại"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-50 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scope selector & re-run toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 px-6 py-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <label
              htmlFor="check-access-org-scope"
              className="text-xs font-medium text-slate-600 dark:text-slate-400 whitespace-nowrap"
            >
              Phạm vi:
            </label>
            <select
              id="check-access-org-scope"
              value={selectedOrg}
              disabled={loading}
              onChange={(e) => handleOrgScopeChange(e.target.value)}
              className="flex-1 max-w-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#090D16] px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:border-blue-600 focus:outline-none disabled:opacity-60"
            >
              <option value="">Tất cả Organization trong DB ({organizations.length})</option>
              {organizations.map((org) => (
                <option key={org.org} value={org.org || ''}>
                  {org.org}
                  {org.name && org.name !== org.org ? ` (${org.name})` : ''}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => void runCheck(selectedOrg)}
            disabled={loading}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 px-3.5 py-1.5 text-xs font-medium text-white disabled:opacity-50 transition-colors whitespace-nowrap shrink-0"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Đang kiểm tra...' : 'Kiểm tra lại'}
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50/75 dark:bg-red-950/35 px-3.5 py-2.5 text-xs text-red-900 dark:text-red-300"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {loading && !result ? (
            <div className="flex flex-col items-center justify-center py-14 text-xs text-slate-500 dark:text-slate-400 gap-2.5">
              <Loader2 className="h-5 w-5 animate-spin text-blue-600 dark:text-blue-400" />
              <span>
                Đang kiểm tra quyền truy cập Organization và quyền Đọc/Ghi (Push) trên GitHub...
              </span>
            </div>
          ) : result ? (
            <>
              {/* Verdict banner */}
              <div
                className={`flex items-start gap-3 rounded-xl border p-4 ${
                  result.hasFullAccess
                    ? 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/70 dark:bg-emerald-950/30'
                    : 'border-amber-200 dark:border-amber-900/60 bg-amber-50/75 dark:bg-amber-950/30'
                }`}
              >
                {result.hasFullAccess ? (
                  <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                ) : (
                  <ShieldAlert className="mt-0.5 h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
                )}
                <div className="min-w-0 flex-1 space-y-1">
                  <p
                    className={`font-display text-sm font-semibold ${
                      result.hasFullAccess
                        ? 'text-emerald-900 dark:text-emerald-200'
                        : 'text-amber-900 dark:text-amber-200'
                    }`}
                  >
                    {result.hasFullAccess
                      ? 'Đủ 100% quyền Đọc & Ghi (Push) trong phạm vi kiểm tra'
                      : 'Chưa đủ quyền truy cập hoặc thiếu quyền Ghi (Push)'}
                  </p>
                  <p
                    className={`text-xs ${
                      result.hasFullAccess
                        ? 'text-emerald-800/90 dark:text-emerald-300/90'
                        : 'text-amber-800/90 dark:text-amber-300/90'
                    }`}
                  >
                    Phạm vi:{' '}
                    <span className="font-mono font-medium">
                      {result.targetOrg || 'Toàn bộ Organization & Repository trong DB'}
                    </span>
                    {result.tokenPreview ? ` · Token: ${result.tokenPreview}` : ''}
                  </p>
                </div>
              </div>

              {/* Summary metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 p-3">
                  <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    Organizations truy cập được
                  </p>
                  <p className="mt-1 font-mono text-lg font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                    {result.accessibleOrganizationsCount ?? 0}
                    <span className="text-xs font-normal text-slate-400">
                      {' '}
                      / {result.totalOrganizations ?? orgStatuses.length}
                    </span>
                  </p>
                  {(result.inaccessibleOrganizationsCount ?? 0) > 0 && (
                    <p className="mt-0.5 text-[11px] text-red-600 dark:text-red-400">
                      {result.inaccessibleOrganizationsCount} không truy cập được
                    </p>
                  )}
                </div>

                <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 p-3">
                  <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    Repositories đủ Đọc &amp; Ghi (Push)
                  </p>
                  <p className="mt-1 font-mono text-lg font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                    {result.accessibleRepositoriesCount ?? 0}
                    <span className="text-xs font-normal text-slate-400">
                      {' '}
                      / {result.totalRepositories ?? repoStatuses.length}
                    </span>
                  </p>
                  {(result.inaccessibleRepositoriesCount ?? 0) > 0 && (
                    <p className="mt-0.5 text-[11px] text-red-600 dark:text-red-400">
                      {result.inaccessibleRepositoriesCount} thiếu quyền đọc/ghi
                    </p>
                  )}
                </div>

                <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 p-3">
                  <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    Trạng thái Token
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        result.isActive
                          ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {result.isActive ? 'Đang bật' : 'Đã tắt'}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        result.isSuperToken
                          ? 'bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {result.isSuperToken ? 'Super Token' : 'Thường'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Detail tabs + filters */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
                <div className="inline-flex rounded-lg bg-slate-200/70 dark:bg-slate-800 p-0.5 text-xs font-medium self-start">
                  <button
                    type="button"
                    onClick={() => setActiveTab('organizations')}
                    className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1 transition-colors ${
                      activeTab === 'organizations'
                        ? 'bg-white dark:bg-[#0F172A] text-slate-900 dark:text-slate-100 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    <Building2 className="h-3.5 w-3.5" />
                    Organizations ({orgStatuses.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('repositories')}
                    className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1 transition-colors ${
                      activeTab === 'repositories'
                        ? 'bg-white dark:bg-[#0F172A] text-slate-900 dark:text-slate-100 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    <GitFork className="h-3.5 w-3.5" />
                    Repositories ({repoStatuses.length})
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative flex-1 sm:w-48">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Tìm kiếm..."
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#090D16] pl-8 pr-2.5 py-1 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none"
                    />
                  </div>
                  <div className="inline-flex rounded-lg bg-slate-200/70 dark:bg-slate-800 p-0.5 text-[11px] font-medium shrink-0">
                    {(
                      [
                        { id: 'all', label: 'Tất cả' },
                        { id: 'ok', label: 'Đạt' },
                        { id: 'issues', label: 'Thiếu quyền' },
                      ] as const
                    ).map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setStatusFilter(f.id)}
                        className={`rounded-md px-2 py-1 transition-colors ${
                          statusFilter === f.id
                            ? 'bg-white dark:bg-[#0F172A] text-slate-900 dark:text-slate-100 shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Tab content */}
              {activeTab === 'organizations' ? (
                visibleOrgs.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-slate-200 dark:border-slate-800 py-8 text-center text-xs text-slate-500 dark:text-slate-400">
                    Không có organization nào khớp bộ lọc.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400">
                          <th className="py-2.5 pl-4 pr-3 font-medium">Organization</th>
                          <th className="py-2.5 px-3 font-medium whitespace-nowrap">Truy cập</th>
                          <th className="py-2.5 px-3 font-medium whitespace-nowrap">Role / State</th>
                          <th className="py-2.5 px-3 font-medium">Chi tiết lỗi</th>
                          <th className="py-2.5 pl-3 pr-4 text-right font-medium whitespace-nowrap">
                            Phạm vi
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                        {visibleOrgs.map((item) => (
                          <tr
                            key={item.org}
                            className="hover:bg-slate-50/70 dark:hover:bg-slate-800/35"
                          >
                            <td className="py-2.5 pl-4 pr-3 font-mono font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                              {item.org ? (
                                <a
                                  href={`https://github.com/${encodeURIComponent(item.org)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400"
                                >
                                  {item.org}
                                  <ExternalLink className="h-3 w-3 text-slate-400" />
                                </a>
                              ) : (
                                '—'
                              )}
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              {item.accessible ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                                  <CheckCircle2 className="h-3 w-3" />
                                  Có quyền
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-full bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 px-2 py-0.5 text-[11px] font-medium text-red-700 dark:text-red-300">
                                  <XCircle className="h-3 w-3" />
                                  Không có quyền
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600 dark:text-slate-400 whitespace-nowrap">
                              {item.role || '—'}
                              {item.state ? ` · ${item.state}` : ''}
                            </td>
                            <td className="py-2.5 px-3 text-red-600 dark:text-red-400">
                              {item.error || '—'}
                            </td>
                            <td className="py-2.5 pl-3 pr-4 text-right whitespace-nowrap">
                              {item.org && selectedOrg !== item.org ? (
                                <button
                                  type="button"
                                  disabled={loading}
                                  onClick={() => handleOrgScopeChange(item.org!)}
                                  className="text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50"
                                >
                                  Kiểm tra riêng
                                </button>
                              ) : (
                                <span className="text-[11px] text-slate-400">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              ) : visibleRepos.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-200 dark:border-slate-800 py-8 text-center text-xs text-slate-500 dark:text-slate-400">
                  Không có repository nào khớp bộ lọc.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400">
                        <th className="py-2.5 pl-4 pr-3 font-medium">Repository</th>
                        <th className="py-2.5 px-3 font-medium text-center whitespace-nowrap">
                          Đọc (Read)
                        </th>
                        <th className="py-2.5 px-3 font-medium text-center whitespace-nowrap">
                          Ghi (Push)
                        </th>
                        <th className="py-2.5 px-3 font-medium text-center whitespace-nowrap">
                          Admin
                        </th>
                        <th className="py-2.5 pl-3 pr-4 font-medium">Chi tiết lỗi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                      {visibleRepos.map((item) => {
                        const slug =
                          item.fullRepository ||
                          (item.org && item.repoName ? `${item.org}/${item.repoName}` : '');
                        return (
                          <tr
                            key={slug}
                            className="hover:bg-slate-50/70 dark:hover:bg-slate-800/35"
                          >
                            <td className="py-2.5 pl-4 pr-3 font-mono font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">
                              {slug ? (
                                <a
                                  href={`https://github.com/${slug}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400"
                                >
                                  {slug}
                                  <ExternalLink className="h-3 w-3 text-slate-400" />
                                </a>
                              ) : (
                                '—'
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              {item.accessible ? (
                                <CheckCircle2 className="mx-auto h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                              ) : (
                                <XCircle className="mx-auto h-4 w-4 text-red-500 dark:text-red-400" />
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              {item.canPush ? (
                                <CheckCircle2 className="mx-auto h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                              ) : (
                                <XCircle className="mx-auto h-4 w-4 text-red-500 dark:text-red-400" />
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              {item.canAdmin ? (
                                <CheckCircle2 className="mx-auto h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                              ) : (
                                <span className="text-slate-300 dark:text-slate-600">—</span>
                              )}
                            </td>
                            <td className="py-2.5 pl-3 pr-4 text-red-600 dark:text-red-400">
                              {item.error || '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 px-6 py-3.5">
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Quyền Ghi (Push) được xác định qua GitHub API trên từng repository trong hệ thống.
          </p>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-lg border border-slate-200 dark:border-slate-700 px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
