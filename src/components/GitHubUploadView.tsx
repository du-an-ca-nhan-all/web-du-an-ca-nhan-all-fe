import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Building2,
  GitFork,
  Globe,
  KeyRound,
  Upload,
} from 'lucide-react';
import {
  ApiClientError,
  executeApi,
  useBackendClient,
  type GitHubPullRepoDomainResponse,
  type GitHubTokenResponse,
  type OrganizationEntity,
  type RepositoryEntity,
  type RootDomainEntity,
} from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { BatchDefaultConfigModal } from './github/BatchDefaultConfigModal';
import { DefaultConfigModal, type DefaultConfigTarget } from './github/DefaultConfigModal';
import { ForkRepoModal } from './github/ForkRepoModal';
import { RepositoriesPanel } from './github/RepositoriesPanel';
import { RootDomainsPanel } from './github/RootDomainsPanel';
import { TokensPanel } from './github/TokensPanel';
import { UploadFilePanel } from './github/UploadFilePanel';

interface GitHubUploadViewProps {
  onAuthFailure: (message: string) => void;
}

type GitHubSubTab = 'repositories' | 'upload' | 'root-domains' | 'tokens';

export function GitHubUploadView({ onAuthFailure }: GitHubUploadViewProps) {
  const { serverConfig } = useAuth();
  const { v1, test } = useBackendClient();
  const { notify } = useToast();

  const [activeTab, setActiveTab] = useState<GitHubSubTab>('repositories');

  // Organizations
  const [organizations, setOrganizations] = useState<OrganizationEntity[]>([]);
  const [orgsError, setOrgsError] = useState<string | null>(null);

  // Repositories & filters
  const [repos, setRepos] = useState<RepositoryEntity[]>([]);
  const [reposLoading, setReposLoading] = useState(false);
  const [reposError, setReposError] = useState<string | null>(null);
  const [selectedOrgFilter, setSelectedOrgFilter] = useState(''); // '' = all orgs
  const [domainFilter, setDomainFilter] = useState<'all' | 'with_domain' | 'no_domain'>('all');
  const repoLoadSeqRef = useRef(0);

  // Root domains
  const [rootDomains, setRootDomains] = useState<RootDomainEntity[]>([]);
  const [rootDomainsLoading, setRootDomainsLoading] = useState(true);
  const [rootDomainsError, setRootDomainsError] = useState<string | null>(null);

  // GitHub tokens
  const [tokens, setTokens] = useState<GitHubTokenResponse[]>([]);
  const [tokensLoading, setTokensLoading] = useState(true);
  const [tokensError, setTokensError] = useState<string | null>(null);
  const [superTokenOnly, setSuperTokenOnly] = useState(false);

  // Pull domain states
  const [pullingOrg, setPullingOrg] = useState(false);
  const [pullingRepoKey, setPullingRepoKey] = useState<string | null>(null);
  const [pullSummary, setPullSummary] = useState<{
    scopeLabel: string;
    items: GitHubPullRepoDomainResponse[];
  } | null>(null);

  // Modals
  const [forkModalOpen, setForkModalOpen] = useState(false);
  const [defaultConfigTarget, setDefaultConfigTarget] = useState<DefaultConfigTarget | null>(null);
  const [batchDefaultConfigOpen, setBatchDefaultConfigOpen] = useState(false);

  const loadOrganizations = useCallback(async () => {
    setOrgsError(null);
    try {
      const list = await executeApi(v1.getAllOrganizations(), serverConfig.useProxy);
      const rawList = Array.isArray(list) ? list : [];
      const dedupMap = new Map<string, OrganizationEntity>();
      for (const item of rawList) {
        const rawOrg = item.org || '';
        const trimmedOrg = rawOrg.trim();
        if (!trimmedOrg) continue;
        const key = trimmedOrg.toLowerCase();
        const isClean = rawOrg === trimmedOrg;
        const existing = dedupMap.get(key);
        if (!existing || isClean) {
          dedupMap.set(key, {
            ...item,
            org: trimmedOrg,
            name: item.name?.trim() || trimmedOrg,
          });
        }
      }
      setOrganizations(Array.from(dedupMap.values()));
    } catch (err) {
      if (err instanceof ApiClientError && (err.status === 401 || err.status === 403)) {
        onAuthFailure(err.message);
        return;
      }
      setOrgsError(
        err instanceof ApiClientError
          ? err.message
          : 'Không thể tải danh sách Organization từ máy chủ.'
      );
    }
  }, [v1, serverConfig.useProxy, onAuthFailure]);

  const loadRootDomains = useCallback(async () => {
    setRootDomainsLoading(true);
    setRootDomainsError(null);
    try {
      const list = await executeApi(v1.getAllRootDomains(), serverConfig.useProxy);
      setRootDomains(Array.isArray(list) ? list : []);
    } catch (err) {
      if (err instanceof ApiClientError && (err.status === 401 || err.status === 403)) {
        onAuthFailure(err.message);
        return;
      }
      setRootDomainsError(
        err instanceof ApiClientError
          ? err.message
          : 'Không thể tải danh sách tên miền gốc từ máy chủ.'
      );
    } finally {
      setRootDomainsLoading(false);
    }
  }, [v1, serverConfig.useProxy, onAuthFailure]);

  const loadTokens = useCallback(async () => {
    setTokensLoading(true);
    setTokensError(null);
    try {
      const list = await executeApi(
        v1.getAllTokens({ superTokenOnly }),
        serverConfig.useProxy
      );
      setTokens(Array.isArray(list) ? list : []);
    } catch (err) {
      if (err instanceof ApiClientError && (err.status === 401 || err.status === 403)) {
        onAuthFailure(err.message);
        return;
      }
      setTokensError(
        err instanceof ApiClientError
          ? err.message
          : 'Không thể tải danh sách GitHub token từ máy chủ.'
      );
    } finally {
      setTokensLoading(false);
    }
  }, [v1, superTokenOnly, serverConfig.useProxy, onAuthFailure]);

  const loadRepos = useCallback(
    async (orgName: string) => {
      const cleanOrg = orgName.trim();
      const scope: 'org' | 'all' = cleanOrg ? 'org' : 'all';

      const seq = ++repoLoadSeqRef.current;
      setReposLoading(true);
      setReposError(null);

      const orgReposPromise: Promise<RepositoryEntity[]> =
        scope === 'org'
          ? executeApi(
              v1.getRepositoriesByOrg({ org: encodeURIComponent(cleanOrg) }),
              serverConfig.useProxy
            )
          : Promise.resolve([]);

      const [orgReposRes, allDbReposRes, configuredSlugsRes] = await Promise.allSettled([
        orgReposPromise,
        executeApi(test.getRepositories1(), serverConfig.useProxy),
        executeApi(v1.getRepositories(), serverConfig.useProxy),
      ]);

      if (seq !== repoLoadSeqRef.current) return;

      for (const res of [orgReposRes, allDbReposRes, configuredSlugsRes]) {
        if (
          res.status === 'rejected' &&
          res.reason instanceof ApiClientError &&
          (res.reason.status === 401 || res.reason.status === 403)
        ) {
          onAuthFailure(res.reason.message);
          setReposLoading(false);
          return;
        }
      }

      const byKey = new Map<string, RepositoryEntity>();
      const upsertRepo = (item: RepositoryEntity) => {
        const org = (item.org || (scope === 'org' ? cleanOrg : '')).trim();
        const rName = (
          item.repoName ||
          (item.fullRepository?.includes('/')
            ? item.fullRepository.split('/')[1]
            : item.fullRepository) ||
          ''
        ).trim();
        const fullRepository = (
          item.fullRepository || (org && rName ? `${org}/${rName}` : '')
        ).trim();
        if (!fullRepository) return;

        const key = fullRepository.toLowerCase();
        const existing = byKey.get(key);
        if (!existing) {
          byKey.set(key, {
            id: item.id,
            org: org || fullRepository.split('/')[0] || '',
            repoName: rName || fullRepository,
            fullRepository,
            domain: item.domain ?? undefined,
            createdAt: item.createdAt,
          });
        } else {
          byKey.set(key, {
            id: existing.id ?? item.id,
            org: existing.org || org,
            repoName: existing.repoName || rName,
            fullRepository: existing.fullRepository || fullRepository,
            domain: existing.domain || item.domain || undefined,
            createdAt: existing.createdAt || item.createdAt,
          });
        }
      };

      if (scope === 'org' && orgReposRes.status === 'fulfilled' && Array.isArray(orgReposRes.value)) {
        orgReposRes.value.forEach(upsertRepo);
      }

      if (allDbReposRes.status === 'fulfilled' && Array.isArray(allDbReposRes.value)) {
        const filtered =
          scope === 'org'
            ? allDbReposRes.value.filter(
                (item) => (item.org || '').trim().toLowerCase() === cleanOrg.toLowerCase()
              )
            : allDbReposRes.value;
        filtered.forEach(upsertRepo);
      }

      if (configuredSlugsRes.status === 'fulfilled' && Array.isArray(configuredSlugsRes.value)) {
        const prefix = `${cleanOrg.toLowerCase()}/`;
        const slugs =
          scope === 'org'
            ? configuredSlugsRes.value.filter(
                (slug) => typeof slug === 'string' && slug.trim().toLowerCase().startsWith(prefix)
              )
            : configuredSlugsRes.value.filter(
                (slug) => typeof slug === 'string' && slug.includes('/')
              );
        slugs.forEach((slug) => {
          const cleanSlug = slug.trim();
          const [orgPart, ...rest] = cleanSlug.split('/');
          upsertRepo({
            org: orgPart.trim(),
            repoName: rest.join('/').trim(),
            fullRepository: `${orgPart.trim()}/${rest.join('/').trim()}`,
          });
        });
      }

      const allFailed =
        (scope === 'org' ? orgReposRes.status === 'rejected' : true) &&
        allDbReposRes.status === 'rejected' &&
        configuredSlugsRes.status === 'rejected';

      if (allFailed) {
        const reason =
          scope === 'org' && orgReposRes.status === 'rejected'
            ? orgReposRes.reason
            : allDbReposRes.status === 'rejected'
              ? allDbReposRes.reason
              : configuredSlugsRes.status === 'rejected'
                ? configuredSlugsRes.reason
                : null;
        setReposError(
          reason instanceof ApiClientError
            ? reason.message
            : scope === 'org'
              ? `Không thể tải danh sách repository của organization "${cleanOrg}".`
              : 'Không thể tải danh sách toàn bộ repository.'
        );
        setRepos([]);
      } else {
        const merged = Array.from(byKey.values()).sort((a, b) => {
          const idDiff = (b.id ?? -1) - (a.id ?? -1);
          if (idDiff !== 0) return idDiff;
          const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return timeB - timeA;
        });
        setRepos(merged);
      }

      setReposLoading(false);
    },
    [v1, test, serverConfig.useProxy, onAuthFailure]
  );

  useEffect(() => {
    void loadOrganizations();
    void loadRootDomains();
  }, [loadOrganizations, loadRootDomains]);

  useEffect(() => {
    void loadTokens();
  }, [loadTokens]);

  useEffect(() => {
    void loadRepos(selectedOrgFilter);
  }, [selectedOrgFilter, loadRepos]);

  const handlePullOrgDomains = async (org: string) => {
    if (!org) return;
    setPullingOrg(true);
    try {
      const results = await executeApi(
        v1.pullOrgRepoDomains({ org: encodeURIComponent(org) }),
        serverConfig.useProxy
      );
      const items = Array.isArray(results) ? results : [];
      const updatedCount = items.filter((i) => i.updated).length;
      setPullSummary({
        scopeLabel: `Organization ${org}`,
        items,
      });
      notify({
        tone: 'success',
        title: `Đã đồng bộ domain (${org})`,
        description: `Kiểm tra ${items.length} repository · Cập nhật mới ${updatedCount} bản ghi.`,
      });
      void loadRepos(selectedOrgFilter);
    } catch (err) {
      if (err instanceof ApiClientError && (err.status === 401 || err.status === 403)) {
        onAuthFailure(err.message);
        return;
      }
      notify({
        tone: 'error',
        title: 'Đồng bộ domain thất bại',
        description:
          err instanceof ApiClientError
            ? err.message
            : 'Không thể đồng bộ cấu hình domain từ GitHub.',
      });
    } finally {
      setPullingOrg(false);
    }
  };

  const handlePullSingleRepoDomain = async (org: string, targetRepoName: string) => {
    const key = `${org}/${targetRepoName}`;
    setPullingRepoKey(key);
    try {
      const result = await executeApi(
        v1.pullRepoDomain({
          org: encodeURIComponent(org),
          repo: encodeURIComponent(targetRepoName),
        }),
        serverConfig.useProxy
      );
      setPullSummary({
        scopeLabel: key,
        items: result ? [result] : [],
      });
      notify({
        tone: 'success',
        title: result?.updated ? 'Đã cập nhật domain từ GitHub' : 'Đã kiểm tra domain từ GitHub',
        description:
          result?.message ||
          `${key} · Domain: ${result?.currentDomain || 'Chưa có'}`,
      });
      void loadRepos(selectedOrgFilter);
    } catch (err) {
      if (err instanceof ApiClientError && (err.status === 401 || err.status === 403)) {
        onAuthFailure(err.message);
        return;
      }
      notify({
        tone: 'error',
        title: `Đồng bộ domain lỗi (${targetRepoName})`,
        description:
          err instanceof ApiClientError
            ? err.message
            : 'Không thể đồng bộ cấu hình domain cho repository này.',
      });
    } finally {
      setPullingRepoKey(null);
    }
  };

  const noDomainCount = repos.filter((r) => !r.domain?.trim()).length;
  const activeTokenCount = tokens.filter((t) => t.isActive).length;
  const defaultOrg = selectedOrgFilter || organizations[0]?.org || '';

  return (
    <div className="space-y-5">
      {/* Compact Clickable Overview Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <button
          type="button"
          onClick={() => {
            setActiveTab('repositories');
            setDomainFilter('all');
          }}
          className={`cursor-pointer text-left rounded-xl border p-3.5 transition-all duration-150 ${
            activeTab === 'repositories' && domainFilter !== 'no_domain'
              ? 'border-blue-300 dark:border-blue-800 bg-blue-50/40 dark:bg-blue-950/20'
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] hover:border-slate-300 dark:hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Repositories
            </span>
            <GitFork className="h-3.5 w-3.5 text-slate-400" />
          </div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="font-mono text-xl font-bold tabular-nums text-slate-900 dark:text-slate-50">
              {repos.length}
            </span>
            {noDomainCount > 0 && (
              <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
                {noDomainCount} chưa domain
              </span>
            )}
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('repositories')}
          className="cursor-pointer text-left rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] hover:border-slate-300 dark:hover:border-slate-700 p-3.5 transition-all duration-150"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Organizations
            </span>
            <Building2 className="h-3.5 w-3.5 text-slate-400" />
          </div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="font-mono text-xl font-bold tabular-nums text-slate-900 dark:text-slate-50">
              {organizations.length}
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">đã liên kết</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('root-domains')}
          className={`cursor-pointer text-left rounded-xl border p-3.5 transition-all duration-150 ${
            activeTab === 'root-domains'
              ? 'border-blue-300 dark:border-blue-800 bg-blue-50/40 dark:bg-blue-950/20'
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] hover:border-slate-300 dark:hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Tên miền gốc
            </span>
            <Globe className="h-3.5 w-3.5 text-slate-400" />
          </div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="font-mono text-xl font-bold tabular-nums text-slate-900 dark:text-slate-50">
              {rootDomains.length}
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">domain CDN</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('tokens')}
          className={`cursor-pointer text-left rounded-xl border p-3.5 transition-all duration-150 ${
            activeTab === 'tokens'
              ? 'border-blue-300 dark:border-blue-800 bg-blue-50/40 dark:bg-blue-950/20'
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] hover:border-slate-300 dark:hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              GitHub Tokens
            </span>
            <KeyRound className="h-3.5 w-3.5 text-slate-400" />
          </div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="font-mono text-xl font-bold tabular-nums text-slate-900 dark:text-slate-50">
              {activeTokenCount}
              <span className="text-xs font-normal text-slate-400">/{tokens.length}</span>
            </span>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400">đang hoạt động</span>
          </div>
        </button>
      </div>

      {/* Clean Segmented Sub-Navigation */}
      <div className="border-b border-slate-200 dark:border-slate-800">
        <nav aria-label="Phân mục GitHub" className="-mb-px flex items-center gap-1 overflow-x-auto">
          {(
            [
              {
                id: 'repositories',
                label: 'Kho lưu trữ',
                icon: GitFork,
                count: repos.length,
              },
              {
                id: 'upload',
                label: 'Tải tệp CDN',
                icon: Upload,
              },
              {
                id: 'root-domains',
                label: 'Tên miền gốc',
                icon: Globe,
                count: rootDomains.length,
              },
              {
                id: 'tokens',
                label: 'Tokens & Tổ chức',
                icon: KeyRound,
                count: tokens.length,
              },
            ] as const
          ).map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`cursor-pointer inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                    : 'border-transparent text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
                {'count' in tab && (
                  <span
                    className={`rounded-full px-1.5 py-0.5 font-mono text-[10px] tabular-nums ${
                      active
                        ? 'bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Active Tab Content */}
      {activeTab === 'repositories' && (
        <RepositoriesPanel
          organizations={organizations}
          repos={repos}
          loading={reposLoading}
          error={reposError}
          selectedOrgFilter={selectedOrgFilter}
          onSelectedOrgFilterChange={setSelectedOrgFilter}
          domainFilter={domainFilter}
          onDomainFilterChange={setDomainFilter}
          pullingOrg={pullingOrg}
          pullingRepoKey={pullingRepoKey}
          pullSummary={pullSummary}
          onDismissPullSummary={() => setPullSummary(null)}
          onRefresh={() => {
            void loadOrganizations();
            void loadRootDomains();
            void loadRepos(selectedOrgFilter);
          }}
          onOpenForkModal={() => setForkModalOpen(true)}
          onOpenDefaultConfig={(target) => setDefaultConfigTarget(target)}
          onOpenBatchDefaultConfig={() => setBatchDefaultConfigOpen(true)}
          onPullOrgDomains={(org) => void handlePullOrgDomains(org)}
          onPullSingleRepoDomain={(org, repoName) => void handlePullSingleRepoDomain(org, repoName)}
        />
      )}

      {activeTab === 'upload' && (
        <UploadFilePanel
          repos={repos}
          activeOrg={defaultOrg}
          onAuthFailure={onAuthFailure}
        />
      )}

      {activeTab === 'root-domains' && (
        <RootDomainsPanel
          rootDomains={rootDomains}
          loading={rootDomainsLoading}
          error={rootDomainsError}
          onRefresh={() => void loadRootDomains()}
          onAuthFailure={onAuthFailure}
        />
      )}

      {activeTab === 'tokens' && (
        <TokensPanel
          tokens={tokens}
          organizations={organizations}
          repositories={repos}
          loading={tokensLoading}
          error={tokensError}
          superTokenOnly={superTokenOnly}
          onSuperTokenOnlyChange={setSuperTokenOnly}
          onRefresh={() => void loadTokens()}
          onOrganizationsImported={() => void loadOrganizations()}
          onAuthFailure={onAuthFailure}
        />
      )}

      {/* Modals */}
      <ForkRepoModal
        open={forkModalOpen}
        organizations={organizations}
        defaultOrg={defaultOrg}
        orgsError={orgsError}
        onClose={() => setForkModalOpen(false)}
        onCreated={(_info, targetOrg) => {
          void loadRepos(selectedOrgFilter || (targetOrg ? '' : selectedOrgFilter));
        }}
        onOpenDefaultConfig={(org, repoName, currentDomain) =>
          setDefaultConfigTarget({ org, repoName, currentDomain })
        }
        onAuthFailure={onAuthFailure}
      />

      <DefaultConfigModal
        target={defaultConfigTarget}
        rootDomains={rootDomains}
        onClose={() => setDefaultConfigTarget(null)}
        onConfigured={() => void loadRepos(selectedOrgFilter)}
        onAuthFailure={onAuthFailure}
      />

      <BatchDefaultConfigModal
        open={batchDefaultConfigOpen}
        candidates={repos}
        fallbackOrg={defaultOrg}
        scopeLabel={
          selectedOrgFilter ? `Organization ${selectedOrgFilter}` : 'Tất cả Organization'
        }
        rootDomains={rootDomains}
        onClose={() => setBatchDefaultConfigOpen(false)}
        onProgressOrDone={() => void loadRepos(selectedOrgFilter)}
        onAuthFailure={onAuthFailure}
      />
    </div>
  );
}
