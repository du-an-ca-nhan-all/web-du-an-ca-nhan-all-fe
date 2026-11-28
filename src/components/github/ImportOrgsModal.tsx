import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Download,
  ExternalLink,
  Loader2,
  RefreshCw,
  Search,
  X,
} from 'lucide-react';
import {
  ApiClientError,
  executeApi,
  useBackendClient,
  type GitHubAccessibleOrgResponse,
  type GitHubImportOrganizationsResponse,
  type GitHubTokenResponse,
} from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

interface ImportOrgsModalProps {
  token: GitHubTokenResponse | null;
  onClose: () => void;
  onImported: (result: GitHubImportOrganizationsResponse) => void;
  onAuthFailure: (message: string) => void;
}

type OrgImportFilter = 'all' | 'not_imported' | 'imported';

export function ImportOrgsModal({
  token,
  onClose,
  onImported,
  onAuthFailure,
}: ImportOrgsModalProps) {
  const { serverConfig } = useAuth();
  const { v1 } = useBackendClient();
  const { notify } = useToast();

  const [orgs, setOrgs] = useState<GitHubAccessibleOrgResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<OrgImportFilter>('all');
  const [selectedOrgs, setSelectedOrgs] = useState<Set<string>>(new Set());

  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<GitHubImportOrganizationsResponse | null>(null);

  const tokenId = token?.id || '';

  const loadAccessibleOrgs = useCallback(async () => {
    if (!tokenId) return;
    setLoading(true);
    setError(null);
    try {
      const list = await executeApi(
        v1.getAccessibleOrganizations({ id: encodeURIComponent(tokenId) }),
        serverConfig.useProxy
      );
      const safeList = Array.isArray(list) ? list : [];
      setOrgs(safeList);
      setSelectedOrgs((prev) => {
        const next = new Set<string>();
        const unimportedSlugs = new Set(
          safeList.filter((o) => o.org && !o.imported).map((o) => o.org!)
        );
        prev.forEach((slug) => {
          if (unimportedSlugs.has(slug)) next.add(slug);
        });
        return next;
      });
    } catch (err) {
      if (err instanceof ApiClientError && (err.status === 401 || err.status === 403)) {
        onAuthFailure(err.message);
        return;
      }
      setError(
        err instanceof ApiClientError
          ? err.message
          : 'Không thể tải danh sách GitHub organizations từ token này.'
      );
      setOrgs([]);
    } finally {
      setLoading(false);
    }
  }, [tokenId, v1, serverConfig.useProxy, onAuthFailure]);

  useEffect(() => {
    if (!token) return;
    setSearch('');
    setFilter('all');
    setSelectedOrgs(new Set());
    setImportError(null);
    setImportResult(null);
    void loadAccessibleOrgs();
  }, [token, loadAccessibleOrgs]);

  useEffect(() => {
    if (!token) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !importing) onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [token, importing, onClose]);

  const unimportedOrgs = useMemo(
    () => orgs.filter((o) => Boolean(o.org) && !o.imported),
    [orgs]
  );

  const importedCount = orgs.length - unimportedOrgs.length;

  const visibleOrgs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orgs.filter((item) => {
      if (filter === 'imported' && !item.imported) return false;
      if (filter === 'not_imported' && item.imported) return false;
      if (q) {
        const hay = `${item.org ?? ''} ${item.name ?? ''} ${item.description ?? ''} ${item.githubOrgId ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [orgs, search, filter]);

  if (!token) return null;

  const toggleOrg = (slug: string) => {
    setSelectedOrgs((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  };

  const handleSelectAllVisibleUnimported = () => {
    setSelectedOrgs((prev) => {
      const next = new Set(prev);
      visibleOrgs.forEach((o) => {
        if (o.org && !o.imported) next.add(o.org);
      });
      return next;
    });
  };

  const handleClearSelection = () => {
    setSelectedOrgs(new Set());
  };

  const handleImport = async () => {
    if (!tokenId || selectedOrgs.size === 0) return;
    setImporting(true);
    setImportError(null);
    setImportResult(null);

    try {
      const result = await executeApi(
        v1.importSelectedOrganizations(
          { id: encodeURIComponent(tokenId) },
          { orgs: Array.from(selectedOrgs) }
        ),
        serverConfig.useProxy
      );
      setImportResult(result);
      setSelectedOrgs(new Set());

      const newlyImported = result.importedCount ?? result.imported?.length ?? 0;
      const skipped = result.skippedCount ?? 0;
      const notAccessible = result.notAccessibleCount ?? 0;

      notify({
        tone: newlyImported > 0 ? 'success' : 'info',
        title: `Import Organization hoàn tất (${newlyImported} mới)`,
        description:
          skipped > 0 || notAccessible > 0
            ? `Bỏ qua đã tồn tại: ${skipped} · Không có quyền: ${notAccessible}`
            : `Đã đồng bộ vào bảng organizations.`,
      });

      onImported(result);
      void loadAccessibleOrgs();
    } catch (err) {
      if (err instanceof ApiClientError && (err.status === 401 || err.status === 403)) {
        onAuthFailure(err.message);
        return;
      }
      setImportError(
        err instanceof ApiClientError
          ? err.message
          : 'Không thể import các organization đã chọn.'
      );
    } finally {
      setImporting(false);
    }
  };

  const tokenLabel = token.accountUsername
    ? `@${token.accountUsername}`
    : token.accountName || token.tokenPreview || token.id;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-[2px] p-4"
      onClick={() => {
        if (!importing) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-orgs-modal-title"
        className="w-full max-w-2xl max-h-[88vh] flex flex-col rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 dark:border-slate-800 px-6 py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <h3
                id="import-orgs-modal-title"
                className="font-display text-base font-semibold text-slate-900 dark:text-slate-100 truncate"
              >
                Import Organizations · {tokenLabel}
              </h3>
            </div>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 truncate">
              Chọn các GitHub Organization muốn đồng bộ vào hệ thống
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={importing}
            aria-label="Đóng hộp thoại"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-50 transition-colors"
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
              placeholder="Tìm theo slug, tên hoặc mô tả org..."
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#090D16] pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="inline-flex rounded-lg bg-slate-200/70 dark:bg-slate-800 p-0.5 text-[11px] font-medium">
              {(
                [
                  { id: 'all', label: `Tất cả (${orgs.length})` },
                  { id: 'not_imported', label: `Chưa import (${unimportedOrgs.length})` },
                  { id: 'imported', label: `Đã import (${importedCount})` },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilter(tab.id)}
                  className={`rounded-md px-2 py-1 transition-colors whitespace-nowrap ${
                    filter === tab.id
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
              onClick={() => void loadAccessibleOrgs()}
              disabled={loading || importing}
              title="Tải lại danh sách organizations từ GitHub"
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#090D16] px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {importResult && (
            <div className="rounded-lg border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/75 dark:bg-emerald-950/30 p-3.5 text-xs space-y-2">
              <div className="flex items-center gap-2 font-medium text-emerald-900 dark:text-emerald-300">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>
                  Đã import {importResult.importedCount ?? 0} organization mới
                  {(importResult.skippedCount ?? 0) > 0
                    ? ` · Bỏ qua ${importResult.skippedCount} đã tồn tại`
                    : ''}
                  {(importResult.notAccessibleCount ?? 0) > 0
                    ? ` · ${importResult.notAccessibleCount} không có quyền`
                    : ''}
                </span>
              </div>
              {importResult.imported && importResult.imported.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {importResult.imported.map((item) => (
                    <span
                      key={item.org}
                      className="rounded-md bg-emerald-100 dark:bg-emerald-900/50 px-2 py-0.5 font-mono text-[11px] text-emerald-800 dark:text-emerald-200"
                    >
                      {item.org}
                    </span>
                  ))}
                </div>
              )}
              {importResult.notAccessibleOrgs && importResult.notAccessibleOrgs.length > 0 && (
                <p className="text-[11px] text-amber-800 dark:text-amber-300">
                  Không có quyền: {importResult.notAccessibleOrgs.join(', ')}
                </p>
              )}
            </div>
          )}

          {(error || importError) && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50/75 dark:bg-red-950/35 px-3.5 py-2.5 text-xs text-red-900 dark:text-red-300"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{importError || error}</span>
            </div>
          )}

          {/* Selection bar */}
          {!loading && unimportedOrgs.length > 0 && (
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="text-slate-600 dark:text-slate-400">
                Đã chọn{' '}
                <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                  {selectedOrgs.size}
                </span>{' '}
                / {unimportedOrgs.length} organization chưa import
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSelectAllVisibleUnimported}
                  className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Chọn tất cả chưa import
                </button>
                {selectedOrgs.size > 0 && (
                  <button
                    type="button"
                    onClick={handleClearSelection}
                    className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                  >
                    Bỏ chọn
                  </button>
                )}
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-xs text-slate-500 dark:text-slate-400 gap-2.5">
              <Loader2 className="h-5 w-5 animate-spin text-blue-600 dark:text-blue-400" />
              <span>Đang truy vấn danh sách organizations từ GitHub (/user/orgs)...</span>
            </div>
          ) : visibleOrgs.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 dark:border-slate-800 py-10 px-4 text-center">
              <Building2 className="mx-auto h-5 w-5 text-slate-400" />
              <p className="mt-2 font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
                {orgs.length === 0
                  ? 'Token không có quyền truy cập organization nào'
                  : 'Không có organization nào khớp bộ lọc'}
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {orgs.length === 0
                  ? 'Kiểm tra quyền read:org của token trên GitHub rồi thử tải lại.'
                  : 'Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc trạng thái.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800/80 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
              {visibleOrgs.map((item) => {
                const slug = item.org || '';
                const isImported = Boolean(item.imported);
                const isSelected = slug ? selectedOrgs.has(slug) : false;

                return (
                  <label
                    key={slug || item.githubOrgId}
                    className={`flex items-start gap-3 px-4 py-3 transition-colors ${
                      isImported
                        ? 'bg-slate-50/50 dark:bg-slate-900/30 cursor-default'
                        : isSelected
                          ? 'bg-blue-50/60 dark:bg-blue-950/25 cursor-pointer'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isImported || isSelected}
                      disabled={isImported || importing || !slug}
                      onChange={() => {
                        if (slug && !isImported) toggleOrg(slug);
                      }}
                      className="mt-1 h-4 w-4 rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500 disabled:opacity-60"
                    />

                    {item.avatarUrl ? (
                      <img
                        src={item.avatarUrl}
                        alt={slug}
                        className="h-8 w-8 rounded-lg border border-slate-200 dark:border-slate-700 object-cover shrink-0 bg-white"
                      />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-500 shrink-0">
                        <Building2 className="h-4 w-4" />
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-slate-900 dark:text-slate-100">
                          {slug || '—'}
                        </span>
                        {item.name && item.name !== slug && (
                          <span className="text-xs text-slate-600 dark:text-slate-400">
                            ({item.name})
                          </span>
                        )}
                        {slug && (
                          <a
                            href={`https://github.com/${encodeURIComponent(slug)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center text-slate-400 hover:text-blue-600 dark:hover:text-blue-400"
                            title="Mở trên GitHub"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                      {item.description && (
                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                          {item.description}
                        </p>
                      )}
                      {item.githubOrgId !== undefined && (
                        <p className="mt-0.5 font-mono text-[10px] text-slate-400 dark:text-slate-500">
                          GitHub Org ID: {item.githubOrgId}
                        </p>
                      )}
                    </div>

                    <div className="shrink-0">
                      {isImported ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                          <CheckCircle2 className="h-3 w-3" />
                          Đã import
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/35 px-2.5 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-300">
                          Chưa import
                        </span>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 px-6 py-3.5">
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Chỉ các organization được tích chọn mới được lưu vào hệ thống.
          </p>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={importing}
              className="rounded-lg border border-slate-200 dark:border-slate-700 px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors"
            >
              Đóng
            </button>
            <button
              type="button"
              onClick={() => void handleImport()}
              disabled={importing || selectedOrgs.size === 0}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 px-4 py-2 text-xs font-medium text-white disabled:opacity-50 transition-colors"
            >
              {importing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              {importing
                ? 'Đang import...'
                : `Import ${selectedOrgs.size > 0 ? `${selectedOrgs.size} ` : ''}Organization`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
