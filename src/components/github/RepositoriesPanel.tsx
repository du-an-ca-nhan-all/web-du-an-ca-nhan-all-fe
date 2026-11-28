import { useState } from 'react';
import {
  AlertCircle,
  Check,
  CloudDownload,
  Copy,
  ExternalLink,
  GitFork,
  Globe,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  Sparkles,
  X,
  Zap,
} from 'lucide-react';
import type {
  GitHubPullRepoDomainResponse,
  OrganizationEntity,
  RepositoryEntity,
} from '../../api';
import { formatShortDate } from '../../utils/format';
import type { DefaultConfigTarget } from './DefaultConfigModal';

interface RepositoriesPanelProps {
  organizations: OrganizationEntity[];
  repos: RepositoryEntity[];
  loading: boolean;
  error: string | null;
  selectedOrgFilter: string; // '' = all orgs
  onSelectedOrgFilterChange: (org: string) => void;
  domainFilter: 'all' | 'with_domain' | 'no_domain';
  onDomainFilterChange: (filter: 'all' | 'with_domain' | 'no_domain') => void;
  pullingOrg: boolean;
  pullingRepoKey: string | null;
  pullSummary: {
    scopeLabel: string;
    items: GitHubPullRepoDomainResponse[];
  } | null;
  onDismissPullSummary: () => void;
  onRefresh: () => void;
  onOpenForkModal: () => void;
  onOpenDefaultConfig: (target: DefaultConfigTarget) => void;
  onOpenBatchDefaultConfig: () => void;
  onPullOrgDomains: (org: string) => void;
  onPullSingleRepoDomain: (org: string, repoName: string) => void;
}

function buildGitHubRepoUrl(slug: string): string {
  const clean = slug.trim().replace(/^\/+|\/+$/g, '');
  return `https://github.com/${clean}`;
}

function buildDomainHref(rawDomain?: string | null): string | null {
  const trimmed = rawDomain?.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return null;
  return `https://${trimmed}`;
}

export function RepositoriesPanel({
  organizations,
  repos,
  loading,
  error,
  selectedOrgFilter,
  onSelectedOrgFilterChange,
  domainFilter,
  onDomainFilterChange,
  pullingOrg,
  pullingRepoKey,
  pullSummary,
  onDismissPullSummary,
  onRefresh,
  onOpenForkModal,
  onOpenDefaultConfig,
  onOpenBatchDefaultConfig,
  onPullOrgDomains,
  onPullSingleRepoDomain,
}: RepositoriesPanelProps) {
  const [search, setSearch] = useState('');
  const [copiedValue, setCopiedValue] = useState<string | null>(null);

  const handleCopyText = async (value?: string | null) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopiedValue(value);
      window.setTimeout(() => {
        setCopiedValue((prev) => (prev === value ? null : prev));
      }, 1800);
    } catch {
      // Ignore clipboard failure
    }
  };

  const noDomainCount = repos.filter((r) => !r.domain?.trim()).length;
  const withDomainCount = repos.length - noDomainCount;
  const normalizedSearch = search.trim().toLowerCase();

  const visibleRepos = repos.filter((r) => {
    const hasDomain = Boolean(r.domain?.trim());
    if (domainFilter === 'with_domain' && !hasDomain) return false;
    if (domainFilter === 'no_domain' && hasDomain) return false;
    if (normalizedSearch) {
      const haystack = `${r.id ?? ''} ${r.org ?? ''} ${r.repoName ?? ''} ${r.fullRepository ?? ''} ${r.domain ?? ''}`.toLowerCase();
      if (!haystack.includes(normalizedSearch)) return false;
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Contextual smart callout when repos are missing domain */}
      {noDomainCount > 0 && !loading && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/75 dark:bg-amber-950/25 px-4 py-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 shrink-0">
              <Sparkles className="h-3.5 w-3.5" />
            </div>
            <p className="text-xs text-amber-950 dark:text-amber-200">
              Có <strong className="font-mono font-semibold tabular-nums">{noDomainCount}</strong>{' '}
              repository chưa gắn domain CDN. Bạn có thể cấu hình tự động hàng loạt chỉ với 1 bước.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenBatchDefaultConfig}
            className="cursor-pointer inline-flex items-center justify-center gap-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 dark:bg-amber-600 dark:hover:bg-amber-500 px-3.5 py-1.5 text-xs font-medium text-white transition-colors whitespace-nowrap shrink-0"
          >
            <Zap className="h-3.5 w-3.5" />
            Cấu hình nhanh ({noDomainCount})
          </button>
        </div>
      )}

      {/* Pull Domain Result Summary (dismissible) */}
      {pullSummary && (
        <section className="overflow-hidden rounded-xl border border-blue-200 dark:border-blue-900/60 bg-white dark:bg-[#0F172A]">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 bg-blue-50/50 dark:bg-blue-950/25 px-5 py-3">
            <div>
              <h3 className="font-display text-xs font-semibold text-slate-900 dark:text-slate-100">
                Kết quả đồng bộ domain · {pullSummary.scopeLabel}
              </h3>
              <p className="mt-0.5 text-[11px] tabular-nums text-slate-500 dark:text-slate-400">
                Đã kiểm tra {pullSummary.items.length} repo · Cập nhật mới{' '}
                {pullSummary.items.filter((i) => i.updated).length} bản ghi
              </p>
            </div>
            <button
              type="button"
              onClick={onDismissPullSummary}
              aria-label="Đóng kết quả đồng bộ"
              className="cursor-pointer rounded-lg p-1 text-slate-400 hover:bg-slate-200/70 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {pullSummary.items.length > 0 && (
            <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
              {pullSummary.items.map((item, idx) => {
                const currentHref = buildDomainHref(item.currentDomain);
                return (
                  <div
                    key={item.fullRepository || item.repoName || idx}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-5 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="font-mono font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {item.repoName || item.fullRepository}
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                        {currentHref ? (
                          <a
                            href={currentHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            {item.currentDomain}
                          </a>
                        ) : (
                          'Không tìm thấy domain trên GitHub'
                        )}
                      </p>
                    </div>
                    <span
                      className={`text-[11px] font-medium whitespace-nowrap shrink-0 ${
                        item.updated
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {item.updated ? 'Đã cập nhật' : 'Không thay đổi'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Main Full-Width Repositories Card */}
      <section className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A]">
        {/* Unified Single-Zone Toolbar */}
        <div className="flex flex-col gap-3 border-b border-slate-200 dark:border-slate-800 px-5 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Left: Search + Org filter */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 flex-1 min-w-0">
              <div className="relative flex-1 max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm tên repo, organization, domain..."
                  aria-label="Tìm kiếm repository"
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-[#090D16] pl-8.5 pr-7 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:bg-white dark:focus:bg-[#090D16] focus:border-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 transition-colors"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    aria-label="Xóa từ khóa tìm kiếm"
                    className="cursor-pointer absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <select
                value={selectedOrgFilter}
                onChange={(e) => onSelectedOrgFilterChange(e.target.value)}
                aria-label="Lọc theo Organization"
                className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#090D16] px-3 py-2 font-mono text-xs text-slate-800 dark:text-slate-200 focus:border-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 sm:max-w-[220px]"
              >
                <option value="">Tất cả Organization ({organizations.length})</option>
                {organizations.map((orgItem) => (
                  <option key={orgItem.org} value={orgItem.org || ''}>
                    {orgItem.org}
                  </option>
                ))}
              </select>
            </div>

            {/* Right: Primary + Secondary Actions */}
            <div className="flex items-center gap-2 shrink-0">
              {selectedOrgFilter && (
                <button
                  type="button"
                  onClick={() => onPullOrgDomains(selectedOrgFilter)}
                  disabled={pullingOrg}
                  title={`Đồng bộ domain từ GitHub cho toàn bộ ${selectedOrgFilter}`}
                  className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#090D16] px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors whitespace-nowrap"
                >
                  {pullingOrg ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <CloudDownload className="h-3.5 w-3.5" />
                  )}
                  <span>{pullingOrg ? 'Đang đồng bộ...' : 'Đồng bộ Org'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={onRefresh}
                disabled={loading}
                title="Tải lại danh sách repository"
                aria-label="Tải lại danh sách repository"
                className="cursor-pointer inline-flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#090D16] p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>

              <button
                type="button"
                onClick={onOpenForkModal}
                className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 px-3.5 py-2 text-xs font-medium text-white shadow-xs transition-colors whitespace-nowrap"
              >
                <Plus className="h-3.5 w-3.5" />
                Tạo Repo (Fork)
              </button>
            </div>
          </div>

          {/* Domain status segmented filter + result count */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex items-center gap-1 rounded-lg bg-slate-100 dark:bg-slate-800/80 p-1">
              {(
                [
                  { id: 'all', label: `Tất cả (${repos.length})` },
                  { id: 'with_domain', label: `Đã có domain (${withDomainCount})` },
                  { id: 'no_domain', label: `Chưa có domain (${noDomainCount})` },
                ] as const
              ).map((tab) => {
                const active = domainFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => onDomainFilterChange(tab.id)}
                    className={`cursor-pointer rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors whitespace-nowrap ${
                      active
                        ? 'bg-white dark:bg-[#0F172A] text-slate-900 dark:text-slate-100 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <span className="text-[11px] tabular-nums text-slate-500 dark:text-slate-400">
              Hiển thị <strong className="font-mono text-slate-700 dark:text-slate-300">{visibleRepos.length}</strong> / {repos.length} repository
            </span>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="mx-5 my-4 flex items-start gap-2 rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50/75 dark:bg-red-950/35 px-3.5 py-2.5 text-xs text-red-800 dark:text-red-300"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/50 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <th className="py-3 pl-5 pr-4 whitespace-nowrap">Repository</th>
                <th className="py-3 px-4 whitespace-nowrap">Domain CDN</th>
                <th className="py-3 px-4 whitespace-nowrap">Ngày tạo</th>
                <th className="py-3 pl-4 pr-5 text-right whitespace-nowrap">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
              {loading && repos.length === 0 ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx}>
                    <td className="py-3.5 pl-5 pr-4">
                      <div className="h-4 w-44 rounded bg-slate-200/80 dark:bg-slate-800 animate-pulse" />
                      <div className="mt-1.5 h-3 w-28 rounded bg-slate-200/60 dark:bg-slate-800/60 animate-pulse" />
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="h-4 w-52 rounded bg-slate-200/80 dark:bg-slate-800 animate-pulse" />
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="h-4 w-20 rounded bg-slate-200/80 dark:bg-slate-800 animate-pulse" />
                    </td>
                    <td className="py-3.5 pl-4 pr-5">
                      <div className="ml-auto h-7 w-28 rounded bg-slate-200/80 dark:bg-slate-800 animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : visibleRepos.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-14 text-center">
                    <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400">
                      <GitFork className="h-5 w-5" />
                    </div>
                    <p className="mt-3 font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {repos.length === 0
                        ? 'Chưa có repository nào'
                        : 'Không tìm thấy repository phù hợp'}
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {repos.length === 0
                        ? 'Nhấn "Tạo Repo (Fork)" để khởi tạo repository đầu tiên.'
                        : 'Thử xóa từ khóa tìm kiếm hoặc chuyển bộ lọc trạng thái.'}
                    </p>
                    {repos.length === 0 && (
                      <button
                        type="button"
                        onClick={onOpenForkModal}
                        className="cursor-pointer mt-4 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 px-3.5 py-2 text-xs font-medium text-white transition-colors"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Tạo Repo (Fork)
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                visibleRepos.map((repo, index) => {
                  const rowOrg = (
                    repo.org ||
                    (repo.fullRepository?.includes('/') ? repo.fullRepository.split('/')[0] : '') ||
                    selectedOrgFilter
                  ).trim();
                  const rowRepoName = (
                    repo.repoName ||
                    (repo.fullRepository?.includes('/')
                      ? repo.fullRepository.split('/')[1]
                      : repo.fullRepository || '')
                  ).trim();
                  const slug = repo.fullRepository || `${rowOrg}/${rowRepoName}`;
                  const githubUrl = buildGitHubRepoUrl(slug);
                  const domainHref = buildDomainHref(repo.domain);
                  const isPullingRow = pullingRepoKey === `${rowOrg}/${rowRepoName}`;

                  return (
                    <tr
                      key={repo.id ?? `${slug}-${index}`}
                      className="group hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Repository */}
                      <td className="py-3.5 pl-5 pr-4">
                        <div className="flex flex-col min-w-0">
                          <a
                            href={githubUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={`Mở ${githubUrl} trên GitHub`}
                            className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-slate-900 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors w-fit"
                          >
                            <span>{rowRepoName || slug}</span>
                            <ExternalLink className="h-3 w-3 text-slate-400 opacity-70 group-hover:opacity-100 shrink-0" />
                          </a>
                          <div className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                            <span className="font-mono">{rowOrg || '—'}</span>
                            {repo.id !== undefined && (
                              <span className="font-mono text-slate-400 dark:text-slate-500">
                                #{repo.id}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Domain status */}
                      <td className="py-3.5 px-4">
                        {domainHref ? (
                          <div className="flex items-center gap-2">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                            <a
                              href={domainHref}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 font-mono text-xs text-blue-600 dark:text-blue-400 hover:underline break-all"
                            >
                              <span>{repo.domain}</span>
                              <ExternalLink className="h-3 w-3 shrink-0" />
                            </a>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/35 px-2.5 py-0.5 text-[11px] font-medium text-amber-800 dark:text-amber-300">
                            <Globe className="h-3 w-3" />
                            Chưa gắn domain
                          </span>
                        )}
                      </td>

                      {/* Created Date */}
                      <td className="py-3.5 px-4 font-mono tabular-nums text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {formatShortDate(repo.createdAt)}
                      </td>

                      {/* Clean Action Bar */}
                      <td className="py-3.5 pl-4 pr-5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              onOpenDefaultConfig({
                                org: rowOrg,
                                repoName: rowRepoName,
                                currentDomain: repo.domain,
                              })
                            }
                            disabled={!rowRepoName}
                            title="Cấu hình 404.html, CNAME và bật GitHub Pages"
                            className={`cursor-pointer inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-colors disabled:opacity-50 ${
                              domainHref
                                ? 'border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                                : 'bg-blue-600 hover:bg-blue-700 text-white'
                            }`}
                          >
                            <Settings2 className="h-3 w-3" />
                            {domainHref ? 'Cấu hình' : 'Gắn domain'}
                          </button>

                          <button
                            type="button"
                            onClick={() => onPullSingleRepoDomain(rowOrg, rowRepoName)}
                            disabled={isPullingRow || !rowRepoName}
                            title="Đồng bộ domain từ GitHub"
                            aria-label={`Đồng bộ domain cho ${slug}`}
                            className="cursor-pointer inline-flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors"
                          >
                            {isPullingRow ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <CloudDownload className="h-3.5 w-3.5" />
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => void handleCopyText(slug)}
                            title={`Sao chép ${slug}`}
                            aria-label={`Sao chép ${slug}`}
                            className="cursor-pointer inline-flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          >
                            {copiedValue === slug ? (
                              <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
