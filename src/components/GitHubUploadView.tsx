import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  CloudDownload,
  Copy,
  Dices,
  ExternalLink,
  GitFork,
  Globe,
  KeyRound,
  Loader2,
  RefreshCw,
  RotateCcw,
  Search,
  Settings2,
  Square,
  Upload,
  X,
  XCircle,
  Zap,
} from 'lucide-react';
import {
  ApiClientError,
  executeApi,
  useBackendClient,
  type GitHubCreateForkRepoRequest,
  type GitHubCreateRepoResponse,
  type GitHubPullRepoDomainResponse,
  type GitHubTokenResponse,
  type OrganizationEntity,
  type RepositoryEntity,
  type RootDomainEntity,
} from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { formatDateTime, formatShortDate, generateRandomRepoName } from '../utils/format';
import { BatchDefaultConfigModal } from './github/BatchDefaultConfigModal';
import { DefaultConfigModal, type DefaultConfigTarget } from './github/DefaultConfigModal';
import { RootDomainsPanel } from './github/RootDomainsPanel';
import { TokensPanel } from './github/TokensPanel';
import { UploadFilePanel } from './github/UploadFilePanel';

const DEFAULT_SOURCE_REPO = 'https://github.com/apache/kafka';
const DEFAULT_BRANCH_ONLY = true;
const REPO_NAME_PATTERN = /^[a-zA-Z0-9_.-]+$/;
const MAX_BATCH_FORK_COUNT = 50;

interface BatchForkLogItem {
  index: number;
  name: string;
  fullRepository?: string;
  htmlUrl?: string;
  status: 'success' | 'error';
  message?: string;
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

interface GitHubUploadViewProps {
  onAuthFailure: (message: string) => void;
}

type GitHubSubTab = 'repositories' | 'upload' | 'root-domains' | 'tokens';

export function GitHubUploadView({ onAuthFailure }: GitHubUploadViewProps) {
  const { serverConfig } = useAuth();
  const { v1, test } = useBackendClient();
  const { notify } = useToast();

  const [activeTab, setActiveTab] = useState<GitHubSubTab>('repositories');

  // Organizations loaded from GET /v1/github/orgs
  const [organizations, setOrganizations] = useState<OrganizationEntity[]>([]);
  const [orgsLoading, setOrgsLoading] = useState(true);
  const [orgsError, setOrgsError] = useState<string | null>(null);

  // Selected or manually typed Organization
  const [useCustomOrg, setUseCustomOrg] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState('');
  const [customOrg, setCustomOrg] = useState('');

  // Repositories (either active org or all orgs, merged across endpoints with cache-busting)
  const [repos, setRepos] = useState<RepositoryEntity[]>([]);
  const [reposLoading, setReposLoading] = useState(false);
  const [reposError, setReposError] = useState<string | null>(null);
  const [repoScope, setRepoScope] = useState<'org' | 'all'>('all');
  const [domainFilter, setDomainFilter] = useState<'all' | 'with_domain' | 'no_domain'>('all');
  const [repoSearch, setRepoSearch] = useState('');
  const repoLoadSeqRef = useRef(0);

  // Root domains loaded from GET /v1/github/root-domains
  const [rootDomains, setRootDomains] = useState<RootDomainEntity[]>([]);
  const [rootDomainsLoading, setRootDomainsLoading] = useState(true);
  const [rootDomainsError, setRootDomainsError] = useState<string | null>(null);

  // GitHub tokens loaded from GET /v1/github/tokens
  const [tokens, setTokens] = useState<GitHubTokenResponse[]>([]);
  const [tokensLoading, setTokensLoading] = useState(true);
  const [tokensError, setTokensError] = useState<string | null>(null);
  const [superTokenOnly, setSuperTokenOnly] = useState(false);

  // Pull domain config states
  const [pullingOrg, setPullingOrg] = useState(false);
  const [pullingRepoKey, setPullingRepoKey] = useState<string | null>(null);
  const [pullSummary, setPullSummary] = useState<{
    scopeLabel: string;
    items: GitHubPullRepoDomainResponse[];
  } | null>(null);

  // Default config modal targets (single & batch)
  const [defaultConfigTarget, setDefaultConfigTarget] = useState<DefaultConfigTarget | null>(null);
  const [batchDefaultConfigOpen, setBatchDefaultConfigOpen] = useState(false);

  // Fork form state (exact requested defaults)
  const [repoName, setRepoName] = useState('');
  const [domain, setDomain] = useState('');
  const [sourceRepo, setSourceRepo] = useState(DEFAULT_SOURCE_REPO);
  const [defaultBranchOnly, setDefaultBranchOnly] = useState(DEFAULT_BRANCH_ONLY);
  const [forkCountInput, setForkCountInput] = useState('1');

  const [submitting, setSubmitting] = useState(false);
  const [stoppingForkBatch, setStoppingForkBatch] = useState(false);
  const [forkBatchState, setForkBatchState] = useState<{
    total: number;
    completed: number;
    success: number;
    failed: number;
    stopped: boolean;
    items: BatchForkLogItem[];
  } | null>(null);
  const forkStopRef = useRef(false);
  const mountedRef = useRef(true);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [lastCreated, setLastCreated] = useState<{
    result: GitHubCreateRepoResponse;
    generatedNameUsed: boolean;
    submittedName: string;
  } | null>(null);
  const [copiedValue, setCopiedValue] = useState<string | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      forkStopRef.current = true;
    };
  }, []);

  const activeOrg = (useCustomOrg ? customOrg : selectedOrg).trim();

  const loadOrganizations = useCallback(async () => {
    setOrgsLoading(true);
    setOrgsError(null);
    try {
      const list = await executeApi(v1.getAllOrganizations(), serverConfig.useProxy);
      const rawList = Array.isArray(list) ? list : [];
      // Deduplicate orgs that only differ by trailing whitespace in DB
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
      const safeList = Array.from(dedupMap.values());
      setOrganizations(safeList);
      if (safeList.length > 0) {
        setSelectedOrg((prev) => {
          const cleanPrev = prev.trim();
          if (cleanPrev && safeList.some((o) => o.org === cleanPrev)) return cleanPrev;
          return safeList[0]?.org || '';
        });
      } else {
        setUseCustomOrg(true);
      }
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
    } finally {
      setOrgsLoading(false);
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
          : 'Không thể tải danh sách root domain từ máy chủ.'
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
    async (scope: 'org' | 'all', orgName: string) => {
      const cleanOrg = orgName.trim();
      if (scope === 'org' && !cleanOrg) {
        setRepos([]);
        setReposError(null);
        return;
      }

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
          (item.fullRepository?.includes('/') ? item.fullRepository.split('/')[1] : item.fullRepository) ||
          ''
        ).trim();
        const fullRepository = (item.fullRepository || (org && rName ? `${org}/${rName}` : '')).trim();
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
            : configuredSlugsRes.value.filter((slug) => typeof slug === 'string' && slug.includes('/'));
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
    if (repoScope === 'org' && !activeOrg) {
      setRepos([]);
      return;
    }
    const timer = window.setTimeout(() => {
      void loadRepos(repoScope, activeOrg);
    }, repoScope === 'org' && useCustomOrg ? 350 : 0);
    return () => window.clearTimeout(timer);
  }, [repoScope, activeOrg, useCustomOrg, loadRepos]);

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

  const handleResetForkDefaults = () => {
    setSourceRepo(DEFAULT_SOURCE_REPO);
    setDefaultBranchOnly(DEFAULT_BRANCH_ONLY);
  };

  const parsedForkCount = (() => {
    const num = Number.parseInt(forkCountInput.trim(), 10);
    if (!Number.isFinite(num) || num < 1) return 1;
    return Math.min(num, MAX_BATCH_FORK_COUNT);
  })();

  const handleStopBatchFork = () => {
    forkStopRef.current = true;
    setStoppingForkBatch(true);
  };

  const handleSubmitFork = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitError(null);

    if (!activeOrg) {
      setSubmitError('Vui lòng chọn hoặc nhập tên Organization đích.');
      return;
    }

    const rawCount = Number.parseInt(forkCountInput.trim(), 10);
    if (!Number.isFinite(rawCount) || rawCount < 1 || rawCount > MAX_BATCH_FORK_COUNT) {
      setSubmitError(`Số lượng N phải là số nguyên từ 1 đến ${MAX_BATCH_FORK_COUNT}.`);
      return;
    }

    const count = rawCount;
    const trimmedInputName = repoName.trim();
    const generatedNameUsed = trimmedInputName.length === 0;

    if (!generatedNameUsed && !REPO_NAME_PATTERN.test(trimmedInputName)) {
      setSubmitError(
        'Tên repository chỉ được phép chứa chữ cái (a-z, A-Z), chữ số (0-9) và các ký tự _ . -'
      );
      return;
    }

    const trimmedDomain = domain.trim();
    if (count > 1 && trimmedDomain) {
      setSubmitError(
        'Khi tạo nhiều hơn 1 repository, vui lòng để trống Domain tùy chỉnh (sau khi tạo có thể dùng "Cấu hình nhanh chưa có domain").'
      );
      return;
    }

    const trimmedSourceRepo = sourceRepo.trim() || DEFAULT_SOURCE_REPO;

    forkStopRef.current = false;
    setStoppingForkBatch(false);
    setSubmitting(true);

    if (count === 1) {
      setForkBatchState(null);
      const finalName = generatedNameUsed ? generateRandomRepoName(16) : trimmedInputName;
      const payload: GitHubCreateForkRepoRequest = {
        name: finalName,
        sourceRepo: trimmedSourceRepo,
        defaultBranchOnly,
        ...(trimmedDomain ? { domain: trimmedDomain } : {}),
      };

      try {
        const result = await executeApi(
          v1.createForkRepository({ org: encodeURIComponent(activeOrg) }, payload),
          serverConfig.useProxy
        );

        if (!mountedRef.current) return;

        setLastCreated({
          result,
          generatedNameUsed,
          submittedName: finalName,
        });

        setRepoName('');
        setDomain('');

        notify({
          tone: 'success',
          title: 'Đã tạo repository từ fork',
          description: result.fullRepository || `${activeOrg}/${finalName}`,
        });

        void loadRepos(repoScope, activeOrg);
      } catch (err) {
        if (err instanceof ApiClientError && (err.status === 401 || err.status === 403)) {
          onAuthFailure(err.message);
          return;
        }
        if (mountedRef.current) {
          setSubmitError(
            err instanceof ApiClientError
              ? err.message
              : 'Không thể tạo repository fork. Vui lòng thử lại.'
          );
        }
      } finally {
        if (mountedRef.current) {
          setSubmitting(false);
        }
      }
      return;
    }

    // Batch mode: N > 1
    setForkBatchState({
      total: count,
      completed: 0,
      success: 0,
      failed: 0,
      stopped: false,
      items: [],
    });

    let successCount = 0;
    let failedCount = 0;
    let stoppedEarly = false;

    for (let i = 0; i < count; i++) {
      if (forkStopRef.current || !mountedRef.current) {
        stoppedEarly = true;
        break;
      }

      const finalName = generatedNameUsed
        ? generateRandomRepoName(16)
        : `${trimmedInputName}-${i + 1}`;

      const payload: GitHubCreateForkRepoRequest = {
        name: finalName,
        sourceRepo: trimmedSourceRepo,
        defaultBranchOnly,
      };

      try {
        const result = await executeApi(
          v1.createForkRepository({ org: encodeURIComponent(activeOrg) }, payload),
          serverConfig.useProxy
        );

        successCount += 1;
        if (mountedRef.current) {
          setLastCreated({
            result,
            generatedNameUsed,
            submittedName: finalName,
          });
          setForkBatchState((prev) =>
            prev
              ? {
                  ...prev,
                  completed: i + 1,
                  success: prev.success + 1,
                  items: [
                    {
                      index: i + 1,
                      name: result.repoName || finalName,
                      fullRepository: result.fullRepository || `${activeOrg}/${finalName}`,
                      htmlUrl: result.htmlUrl,
                      status: 'success',
                      message: result.message,
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
            setStoppingForkBatch(false);
          }
          onAuthFailure(err.message);
          return;
        }

        failedCount += 1;
        const errMsg =
          err instanceof ApiClientError
            ? err.message
            : 'Không thể tạo repository fork.';

        if (mountedRef.current) {
          setForkBatchState((prev) =>
            prev
              ? {
                  ...prev,
                  completed: i + 1,
                  failed: prev.failed + 1,
                  items: [
                    {
                      index: i + 1,
                      name: finalName,
                      fullRepository: `${activeOrg}/${finalName}`,
                      status: 'error',
                      message: errMsg,
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
    setStoppingForkBatch(false);
    setForkBatchState((prev) => (prev ? { ...prev, stopped: stoppedEarly } : null));

    if (successCount > 0) {
      setRepoName('');
      setDomain('');
      void loadRepos(repoScope, activeOrg);
    }

    notify({
      tone: failedCount === 0 && !stoppedEarly ? 'success' : successCount > 0 ? 'info' : 'error',
      title: stoppedEarly
        ? `Đã dừng tạo hàng loạt (${successCount}/${count} thành công)`
        : `Hoàn tất tạo ${successCount}/${count} repo từ fork`,
      description:
        failedCount > 0
          ? `Organization: ${activeOrg} · Thành công: ${successCount} · Lỗi: ${failedCount}`
          : `Organization: ${activeOrg}`,
    });
  };

  const handlePullOrgDomains = async () => {
    if (!activeOrg) return;
    setPullingOrg(true);
    try {
      const results = await executeApi(
        v1.pullOrgRepoDomains({ org: encodeURIComponent(activeOrg) }),
        serverConfig.useProxy
      );
      const items = Array.isArray(results) ? results : [];
      const updatedCount = items.filter((i) => i.updated).length;
      setPullSummary({
        scopeLabel: `Toàn bộ Organization ${activeOrg}`,
        items,
      });
      notify({
        tone: 'success',
        title: `Đã pull cấu hình domain (${activeOrg})`,
        description: `Kiểm tra ${items.length} repository · Cập nhật mới ${updatedCount} bản ghi.`,
      });
      void loadRepos(repoScope, activeOrg);
    } catch (err) {
      if (err instanceof ApiClientError && (err.status === 401 || err.status === 403)) {
        onAuthFailure(err.message);
        return;
      }
      notify({
        tone: 'error',
        title: 'Pull domain thất bại',
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
          `${key} · Nguồn: ${result?.source || 'NONE'} · Domain: ${result?.currentDomain || 'Chưa có'}`,
      });
      void loadRepos(repoScope, activeOrg || org);
    } catch (err) {
      if (err instanceof ApiClientError && (err.status === 401 || err.status === 403)) {
        onAuthFailure(err.message);
        return;
      }
      notify({
        tone: 'error',
        title: `Pull domain lỗi (${targetRepoName})`,
        description:
          err instanceof ApiClientError
            ? err.message
            : 'Không thể pull cấu hình domain cho repository này.',
      });
    } finally {
      setPullingRepoKey(null);
    }
  };

  const isForkOptionsModified =
    sourceRepo !== DEFAULT_SOURCE_REPO || defaultBranchOnly !== DEFAULT_BRANCH_ONLY;

  const noDomainCount = repos.filter((r) => !r.domain?.trim()).length;
  const withDomainCount = repos.length - noDomainCount;
  const normalizedRepoSearch = repoSearch.trim().toLowerCase();
  const visibleRepos = repos.filter((r) => {
    const hasDomain = Boolean(r.domain?.trim());
    if (domainFilter === 'with_domain' && !hasDomain) return false;
    if (domainFilter === 'no_domain' && hasDomain) return false;
    if (normalizedRepoSearch) {
      const haystack = `${r.id ?? ''} ${r.org ?? ''} ${r.repoName ?? ''} ${r.fullRepository ?? ''} ${r.domain ?? ''}`.toLowerCase();
      if (!haystack.includes(normalizedRepoSearch)) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Sub-navigation tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="inline-flex items-center gap-1 rounded-lg bg-slate-200/70 dark:bg-slate-800/80 p-1 self-start">
          <button
            type="button"
            onClick={() => setActiveTab('repositories')}
            className={`inline-flex items-center gap-2 rounded-md px-3.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'repositories'
                ? 'bg-white dark:bg-[#0F172A] text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <GitFork className="h-3.5 w-3.5" />
            Repositories &amp; Fork ({repos.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`inline-flex items-center gap-2 rounded-md px-3.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'upload'
                ? 'bg-white dark:bg-[#0F172A] text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Upload className="h-3.5 w-3.5" />
            Upload File
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('root-domains')}
            className={`inline-flex items-center gap-2 rounded-md px-3.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'root-domains'
                ? 'bg-white dark:bg-[#0F172A] text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Globe className="h-3.5 w-3.5" />
            Root Domains ({rootDomains.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('tokens')}
            className={`inline-flex items-center gap-2 rounded-md px-3.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'tokens'
                ? 'bg-white dark:bg-[#0F172A] text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <KeyRound className="h-3.5 w-3.5" />
            Tokens &amp; Import Org ({tokens.length})
          </button>
        </div>

        <p className="font-mono text-[11px] tabular-nums text-slate-500 dark:text-slate-400">
          {organizations.length} Organization · {rootDomains.length} Root Domain · {tokens.length} Token
        </p>
      </div>

      {activeTab === 'upload' ? (
        <UploadFilePanel
          repos={repos}
          activeOrg={activeOrg}
          onAuthFailure={onAuthFailure}
        />
      ) : activeTab === 'root-domains' ? (
        <RootDomainsPanel
          rootDomains={rootDomains}
          loading={rootDomainsLoading}
          error={rootDomainsError}
          onRefresh={() => void loadRootDomains()}
          onAuthFailure={onAuthFailure}
        />
      ) : activeTab === 'tokens' ? (
        <TokensPanel
          tokens={tokens}
          organizations={organizations}
          loading={tokensLoading}
          error={tokensError}
          superTokenOnly={superTokenOnly}
          onSuperTokenOnlyChange={setSuperTokenOnly}
          onRefresh={() => void loadTokens()}
          onOrganizationsImported={() => {
            void loadOrganizations();
          }}
          onAuthFailure={onAuthFailure}
        />
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* Left column: Fork Repository Form */}
          <section className="xl:col-span-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] p-6 space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                  Tạo Repository từ Fork
                </h2>
                <p className="mt-0.5 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                  POST /v1/github/orgs/{'{org}'}/repos/fork
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  void loadOrganizations();
                  void loadRootDomains();
                  void loadRepos(repoScope, activeOrg);
                }}
                disabled={orgsLoading}
                title="Tải lại danh sách Organization"
                className="rounded-lg border border-slate-200 dark:border-slate-800 p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors shrink-0"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${orgsLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {orgsError && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/30 px-3.5 py-2.5 text-xs text-amber-900 dark:text-amber-300">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{orgsError} Bạn vẫn có thể nhập thủ công tên Organization bên dưới.</span>
              </div>
            )}

            {submitError && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50/75 dark:bg-red-950/35 px-3.5 py-2.5 text-xs text-red-900 dark:text-red-300"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitFork} className="space-y-4">
              {/* Organization selector */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <label
                    htmlFor="fork-org"
                    className="text-xs font-medium text-slate-700 dark:text-slate-300"
                  >
                    Organization đích <span className="text-red-600">*</span>
                  </label>
                  {organizations.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setUseCustomOrg((prev) => !prev)}
                      className="text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                    >
                      {useCustomOrg ? 'Chọn từ danh sách' : 'Nhập tay'}
                    </button>
                  )}
                </div>

                {useCustomOrg || organizations.length === 0 ? (
                  <input
                    id="fork-org"
                    type="text"
                    required
                    value={customOrg}
                    onChange={(e) => setCustomOrg(e.target.value)}
                    placeholder="Ví dụ: ABaiSt3LG9ALGNJD"
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#090D16] px-3 py-2 font-mono text-xs text-slate-900 dark:text-slate-100 placeholder:font-sans placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30"
                  />
                ) : (
                  <select
                    id="fork-org"
                    value={selectedOrg}
                    onChange={(e) => setSelectedOrg(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#090D16] px-3 py-2 font-mono text-xs text-slate-900 dark:text-slate-100 focus:border-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30"
                  >
                    {organizations.map((orgItem) => (
                      <option key={orgItem.org} value={orgItem.org || ''}>
                        {orgItem.org}
                        {orgItem.name && orgItem.name !== orgItem.org ? ` — ${orgItem.name}` : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Repository Name (defaults empty -> auto random [a-zA-Z0-9] on submit) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <label
                    htmlFor="fork-repo-name"
                    className="text-xs font-medium text-slate-700 dark:text-slate-300"
                  >
                    Tên Repository mới (name)
                  </label>
                  <button
                    type="button"
                    onClick={() => setRepoName(generateRandomRepoName(16))}
                    className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                  >
                    <Dices className="h-3.5 w-3.5" />
                    Random tên (a-Z, 0-9)
                  </button>
                </div>
                <input
                  id="fork-repo-name"
                  type="text"
                  value={repoName}
                  onChange={(e) => setRepoName(e.target.value)}
                  placeholder="Để trống sẽ tự random gồm a-Z và 0-9 khi tạo"
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#090D16] px-3 py-2 font-mono text-xs text-slate-900 dark:text-slate-100 placeholder:font-sans placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30"
                />
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Mặc định để trống: hệ thống tự sinh chuỗi ngẫu nhiên 16 ký tự gồm{' '}
                  <span className="font-mono">a-Z</span> và <span className="font-mono">0-9</span>{' '}
                  trước khi gửi API.
                </p>
              </div>

              {/* Domain (defaults empty) */}
              <div className="space-y-1.5">
                <label
                  htmlFor="fork-domain"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300"
                >
                  Domain tùy chỉnh (domain)
                </label>
                <input
                  id="fork-domain"
                  type="text"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  placeholder="Để trống nếu không gắn domain"
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#090D16] px-3 py-2 font-mono text-xs text-slate-900 dark:text-slate-100 placeholder:font-sans placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30"
                />
              </div>

              {/* Default preserved fields: sourceRepo & defaultBranchOnly */}
              <div className="border-t border-slate-200 dark:border-slate-800 pt-4 space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Cấu hình nguồn Fork (giữ mặc định nếu không đổi)
                  </span>
                  {isForkOptionsModified && (
                    <button
                      type="button"
                      onClick={handleResetForkDefaults}
                      className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
                    >
                      <RotateCcw className="h-3 w-3" />
                      Khôi phục mặc định
                    </button>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="fork-source-repo"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300"
                  >
                    Repository gốc (sourceRepo)
                  </label>
                  <input
                    id="fork-source-repo"
                    type="text"
                    value={sourceRepo}
                    onChange={(e) => setSourceRepo(e.target.value)}
                    placeholder={DEFAULT_SOURCE_REPO}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#090D16] px-3 py-2 font-mono text-xs text-slate-900 dark:text-slate-100 focus:border-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30"
                  />
                </div>

                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={defaultBranchOnly}
                    onChange={(e) => setDefaultBranchOnly(e.target.checked)}
                    className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 dark:border-slate-700 accent-blue-600"
                  />
                  <span className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                    Chỉ fork nhánh mặc định (
                    <span className="font-mono">
                      defaultBranchOnly = {String(defaultBranchOnly)}
                    </span>
                    )
                  </span>
                </label>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-stretch gap-2">
                  <div className="relative w-24 shrink-0">
                    <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 font-mono text-[11px] font-medium text-slate-400">
                      N=
                    </span>
                    <input
                      id="fork-batch-count"
                      type="number"
                      min={1}
                      max={MAX_BATCH_FORK_COUNT}
                      step={1}
                      disabled={submitting}
                      value={forkCountInput}
                      onChange={(e) => setForkCountInput(e.target.value)}
                      onBlur={() => setForkCountInput(String(parsedForkCount))}
                      aria-label="Số lượng repository cần tạo từ fork (N)"
                      title={`Số lượng repository muốn tạo liên tiếp (1–${MAX_BATCH_FORK_COUNT})`}
                      className="h-full w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#090D16] pl-8 pr-2.5 py-2 font-mono text-xs font-semibold tabular-nums text-slate-900 dark:text-slate-100 disabled:opacity-60 focus:border-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting || !activeOrg}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 px-4 py-2.5 text-xs font-medium text-white disabled:opacity-60 transition-colors whitespace-nowrap"
                  >
                    {submitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <GitFork className="h-4 w-4" />
                    )}
                    {submitting
                      ? forkBatchState && forkBatchState.total > 1
                        ? `Đang tạo ${forkBatchState.completed}/${forkBatchState.total}...`
                        : 'Đang khởi tạo bản Fork...'
                      : parsedForkCount > 1
                        ? `Tạo ${parsedForkCount} Repo từ Fork`
                        : 'Tạo Repository từ Fork'}
                  </button>

                  {submitting && forkBatchState && forkBatchState.total > 1 && (
                    <button
                      type="button"
                      onClick={handleStopBatchFork}
                      disabled={stoppingForkBatch}
                      title="Dừng tạo hàng loạt sau lượt hiện tại"
                      className="inline-flex items-center justify-center gap-1 rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-3 py-2 text-xs font-medium text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/50 disabled:opacity-50 transition-colors shrink-0"
                    >
                      <Square className="h-3.5 w-3.5" />
                      {stoppingForkBatch ? 'Đang dừng' : 'Dừng'}
                    </button>
                  )}
                </div>

                {parsedForkCount > 1 && !submitting && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Chế độ tạo <span className="font-mono font-semibold">{parsedForkCount}</span> repo liên tiếp:{' '}
                    {repoName.trim()
                      ? `tự gắn hậu tố "${repoName.trim()}-1" … "${repoName.trim()}-${parsedForkCount}".`
                      : 'mỗi repo tự sinh tên ngẫu nhiên 16 ký tự (a-Z, 0-9).'}
                  </p>
                )}

                {forkBatchState && forkBatchState.total > 1 && (
                  <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-[#090D16] p-3 space-y-2.5">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-medium text-slate-800 dark:text-slate-200">
                        {submitting
                          ? stoppingForkBatch
                            ? 'Đang dừng sau repo hiện tại...'
                            : `Đang tạo hàng loạt (${forkBatchState.completed}/${forkBatchState.total})`
                          : forkBatchState.stopped
                            ? `Đã dừng (${forkBatchState.completed}/${forkBatchState.total})`
                            : `Hoàn tất (${forkBatchState.completed}/${forkBatchState.total})`}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] tabular-nums text-slate-600 dark:text-slate-400">
                          OK: <strong className="text-emerald-700 dark:text-emerald-400">{forkBatchState.success}</strong> · Lỗi:{' '}
                          <strong className="text-red-700 dark:text-red-400">{forkBatchState.failed}</strong>
                        </span>
                        {!submitting && (
                          <button
                            type="button"
                            onClick={() => setForkBatchState(null)}
                            aria-label="Đóng tiến trình tạo hàng loạt"
                            className="rounded p-0.5 text-slate-400 hover:bg-slate-200/70 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                      <div
                        className="h-full bg-blue-600 dark:bg-blue-500 transition-all duration-200"
                        style={{
                          width: `${Math.min(100, Math.round((forkBatchState.completed / forkBatchState.total) * 100))}%`,
                        }}
                      />
                    </div>

                    {forkBatchState.items.length > 0 && (
                      <div className="max-h-36 overflow-y-auto divide-y divide-slate-200/70 dark:divide-slate-800 text-[11px]">
                        {forkBatchState.items.map((item) => {
                          const repoHref = item.htmlUrl || (item.fullRepository ? buildGitHubRepoUrl(item.fullRepository) : null);
                          return (
                            <div
                              key={`${item.index}-${item.name}`}
                              className="flex items-center justify-between gap-2 py-1.5"
                            >
                              <div className="min-w-0 flex items-center gap-1.5">
                                {item.status === 'success' ? (
                                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                ) : (
                                  <XCircle className="h-3.5 w-3.5 text-red-600 dark:text-red-400 shrink-0" />
                                )}
                                <span className="font-mono text-slate-400 tabular-nums shrink-0">
                                  #{item.index}
                                </span>
                                {item.status === 'success' && repoHref ? (
                                  <a
                                    href={repoHref}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="font-mono font-medium text-blue-600 dark:text-blue-400 hover:underline truncate"
                                  >
                                    {item.name}
                                  </a>
                                ) : (
                                  <span className="font-mono text-slate-700 dark:text-slate-300 truncate">
                                    {item.name}
                                  </span>
                                )}
                              </div>
                              {item.status === 'error' && item.message && (
                                <span className="text-red-600 dark:text-red-400 truncate max-w-[160px]" title={item.message}>
                                  {item.message}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </form>
          </section>

          {/* Right column: Last Fork Result + Pull Summary + Repositories Table */}
          <div className="xl:col-span-7 space-y-6">
            {lastCreated && (
              <section className="rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-white dark:bg-[#0F172A] p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <div>
                      <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {lastCreated.result.message || 'Khởi tạo repository từ fork thành công'}
                      </h3>
                      <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
                        {lastCreated.generatedNameUsed
                          ? `Tên được sinh ngẫu nhiên: ${lastCreated.submittedName}`
                          : `Tên đã chỉ định: ${lastCreated.submittedName}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        setDefaultConfigTarget({
                          org: lastCreated.result.org || activeOrg,
                          repoName: lastCreated.result.repoName || lastCreated.submittedName,
                          currentDomain: lastCreated.result.domain,
                        })
                      }
                      className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 px-3 py-1.5 text-xs font-medium text-white transition-colors whitespace-nowrap"
                    >
                      <Settings2 className="h-3.5 w-3.5" />
                      Default Config
                    </button>
                    <button
                      type="button"
                      onClick={() => setLastCreated(null)}
                      aria-label="Ẩn kết quả fork"
                      className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 border-t border-slate-200 dark:border-slate-800 pt-4 text-xs">
                  <div>
                    <dt className="text-slate-500 dark:text-slate-400">Repository đầy đủ</dt>
                    <dd className="mt-0.5 flex items-center gap-2 font-mono font-semibold text-slate-900 dark:text-slate-100">
                      {(() => {
                        const createdSlug =
                          lastCreated.result.fullRepository ||
                          `${lastCreated.result.org || activeOrg}/${lastCreated.result.repoName || lastCreated.submittedName}`;
                        const createdGithubUrl =
                          lastCreated.result.htmlUrl || buildGitHubRepoUrl(createdSlug);
                        return (
                          <>
                            <a
                              href={createdGithubUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-blue-600 dark:text-blue-400 hover:underline truncate"
                            >
                              <span className="truncate">{createdSlug}</span>
                              <ExternalLink className="h-3 w-3 shrink-0" />
                            </a>
                            <button
                              type="button"
                              onClick={() => handleCopyText(createdSlug)}
                              aria-label="Sao chép full repository"
                              className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 shrink-0"
                            >
                              {copiedValue === createdSlug ? (
                                <Check className="h-3.5 w-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </>
                        );
                      })()}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-slate-500 dark:text-slate-400">Nguồn fork · Nhánh</dt>
                    <dd className="mt-0.5 font-mono text-slate-800 dark:text-slate-200">
                      {lastCreated.result.sourceRepo || sourceRepo} ·{' '}
                      {lastCreated.result.defaultBranch || 'main'}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-slate-500 dark:text-slate-400">Domain</dt>
                    <dd className="mt-0.5 font-mono text-slate-800 dark:text-slate-200">
                      {(() => {
                        const domainHref = buildDomainHref(lastCreated.result.domain);
                        if (!domainHref) return 'Trống';
                        return (
                          <a
                            href={domainHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline break-all"
                          >
                            <span>{lastCreated.result.domain}</span>
                            <ExternalLink className="h-3 w-3 shrink-0" />
                          </a>
                        );
                      })()}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-slate-500 dark:text-slate-400">Thời gian tạo</dt>
                    <dd className="mt-0.5 font-mono tabular-nums text-slate-700 dark:text-slate-300">
                      {formatDateTime(lastCreated.result.createdAt)}
                    </dd>
                  </div>
                </dl>
              </section>
            )}

            {/* Pull Domain Config Result Summary */}
            {pullSummary && (
              <section className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A]">
                <div className="flex items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 px-5 py-3">
                  <div>
                    <h3 className="font-display text-xs font-semibold text-slate-900 dark:text-slate-100">
                      Kết quả Pull cấu hình domain · {pullSummary.scopeLabel}
                    </h3>
                    <p className="mt-0.5 font-mono text-[11px] tabular-nums text-slate-500 dark:text-slate-400">
                      {pullSummary.items.length} repository đã kiểm tra ·{' '}
                      {pullSummary.items.filter((i) => i.updated).length} cập nhật vào DB
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPullSummary(null)}
                    aria-label="Đóng kết quả pull"
                    className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                {pullSummary.items.length > 0 && (
                  <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
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
                              Nguồn: <span className="font-mono">{item.source || 'NONE'}</span> ·{' '}
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
                                'Không có domain trên GitHub'
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
                            {item.updated ? 'Đã cập nhật DB' : 'Không thay đổi'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            )}

            {/* Organization Repositories Table */}
            <section className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A]">
              <div className="flex flex-col gap-3 border-b border-slate-200 dark:border-slate-800 px-5 py-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="min-w-0">
                    <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {repoScope === 'all'
                        ? 'Tất cả Repositories'
                        : `Repositories thuộc ${activeOrg || 'Organization'}`}
                    </h2>
                    <p className="mt-0.5 font-mono text-[11px] tabular-nums text-slate-500 dark:text-slate-400">
                      Hiển thị {visibleRepos.length}/{repos.length} · Có domain: {withDomainCount} · Chưa có domain:{' '}
                      {noDomainCount}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setBatchDefaultConfigOpen(true)}
                      disabled={noDomainCount === 0 || reposLoading}
                      title="Chạy vòng lặp Default Config cho tất cả repository chưa có domain"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50 transition-colors whitespace-nowrap shrink-0"
                    >
                      <Zap className="h-3.5 w-3.5" />
                      Cấu hình nhanh chưa có domain ({noDomainCount})
                    </button>
                    <button
                      type="button"
                      onClick={handlePullOrgDomains}
                      disabled={pullingOrg || !activeOrg}
                      title="Gọi POST /v1/github/orgs/{org}/repos/domain/pull"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 dark:border-blue-900/60 bg-blue-50/70 dark:bg-blue-950/40 px-3 py-1.5 text-xs font-medium text-blue-700 dark:text-blue-300 hover:bg-blue-100/70 dark:hover:bg-blue-900/50 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0"
                    >
                      {pullingOrg ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <CloudDownload className="h-3.5 w-3.5" />
                      )}
                      {pullingOrg ? 'Đang pull cả Org...' : 'Pull domain cả Org'}
                    </button>
                    <button
                      type="button"
                      onClick={() => void loadRepos(repoScope, activeOrg)}
                      disabled={reposLoading || (repoScope === 'org' && !activeOrg)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-800 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${reposLoading ? 'animate-spin' : ''}`} />
                      Tải lại
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="inline-flex items-center gap-1 rounded-lg bg-slate-100 dark:bg-slate-800/80 p-1">
                      <button
                        type="button"
                        onClick={() => setRepoScope('all')}
                        className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 ${
                          repoScope === 'all'
                            ? 'bg-white dark:bg-[#0F172A] text-slate-900 dark:text-slate-100 shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                        }`}
                      >
                        Tất cả Org
                      </button>
                      <button
                        type="button"
                        onClick={() => setRepoScope('org')}
                        className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 ${
                          repoScope === 'org'
                            ? 'bg-white dark:bg-[#0F172A] text-slate-900 dark:text-slate-100 shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                        }`}
                      >
                        {activeOrg ? `Org: ${activeOrg}` : 'Theo Org'}
                      </button>
                    </div>

                    <div className="inline-flex items-center gap-1 rounded-lg bg-slate-100 dark:bg-slate-800/80 p-1">
                      {(
                        [
                          { id: 'all', label: 'Tất cả' },
                          { id: 'no_domain', label: 'Chưa có domain' },
                          { id: 'with_domain', label: 'Có domain' },
                        ] as const
                      ).map((tab) => {
                        const active = domainFilter === tab.id;
                        return (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() => setDomainFilter(tab.id)}
                            className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 ${
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
                  </div>

                  <div className="relative flex-1 min-w-[180px] sm:max-w-[230px]">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      value={repoSearch}
                      onChange={(e) => setRepoSearch(e.target.value)}
                      placeholder="Tìm repo, org, domain..."
                      aria-label="Tìm kiếm repository"
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#090D16] pl-8 pr-7 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30"
                    />
                    {repoSearch && (
                      <button
                        type="button"
                        onClick={() => setRepoSearch('')}
                        aria-label="Xóa từ khóa tìm kiếm"
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {reposError && (
                <div className="mx-5 my-4 flex items-start gap-2 rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50/75 dark:bg-red-950/35 px-3.5 py-2.5 text-xs text-red-800 dark:text-red-300">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{reposError}</span>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 text-xs font-medium text-slate-600 dark:text-slate-400">
                      <th className="py-3 pl-5 pr-3 w-14 text-right whitespace-nowrap">ID</th>
                      <th className="py-3 px-4 whitespace-nowrap">Repository</th>
                      <th className="py-3 px-4 whitespace-nowrap">Domain</th>
                      <th className="py-3 px-4 whitespace-nowrap">Ngày tạo</th>
                      <th className="py-3 pl-4 pr-5 text-right whitespace-nowrap">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
                    {reposLoading && repos.length === 0 ? (
                      Array.from({ length: 4 }).map((_, idx) => (
                        <tr key={idx} className="h-[46px]">
                          <td className="py-3 pl-5 pr-3 text-right">
                            <div className="ml-auto h-3.5 w-8 rounded bg-slate-200/80 dark:bg-slate-800 animate-pulse" />
                          </td>
                          <td className="py-3 px-4">
                            <div className="h-3.5 w-40 rounded bg-slate-200/80 dark:bg-slate-800 animate-pulse" />
                          </td>
                          <td className="py-3 px-4">
                            <div className="h-3.5 w-28 rounded bg-slate-200/80 dark:bg-slate-800 animate-pulse" />
                          </td>
                          <td className="py-3 px-4">
                            <div className="h-3.5 w-20 rounded bg-slate-200/80 dark:bg-slate-800 animate-pulse" />
                          </td>
                          <td className="py-3 pl-4 pr-5 text-right">
                            <div className="ml-auto h-3.5 w-28 rounded bg-slate-200/80 dark:bg-slate-800 animate-pulse" />
                          </td>
                        </tr>
                      ))
                    ) : repoScope === 'org' && !activeOrg ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-6 py-10 text-center text-slate-500 dark:text-slate-400"
                        >
                          Chọn hoặc nhập một Organization để xem danh sách repository.
                        </td>
                      </tr>
                    ) : visibleRepos.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-10 text-center">
                          <p className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {repos.length > 0
                              ? 'Không có repository nào khớp bộ lọc domain'
                              : 'Chưa có repository nào trong cơ sở dữ liệu'}
                          </p>
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            {repos.length > 0 ? (
                              'Chuyển bộ lọc về "Tất cả" để xem toàn bộ repository của organization.'
                            ) : (
                              <>
                                Sử dụng biểu mẫu bên trái để tạo repository mới từ bản fork cho{' '}
                                <span className="font-mono">{activeOrg}</span>.
                              </>
                            )}
                          </p>
                        </td>
                      </tr>
                    ) : (
                      visibleRepos.map((repo, index) => {
                        const rowOrg = repo.org || activeOrg;
                        const rowRepoName =
                          repo.repoName ||
                          (repo.fullRepository?.includes('/')
                            ? repo.fullRepository.split('/')[1]
                            : repo.fullRepository || '');
                        const slug = repo.fullRepository || `${rowOrg}/${rowRepoName}`;
                        const githubUrl = buildGitHubRepoUrl(slug);
                        const domainHref = buildDomainHref(repo.domain);
                        const isPullingRow = pullingRepoKey === `${rowOrg}/${rowRepoName}`;

                        return (
                          <tr
                            key={repo.id ?? `${slug}-${index}`}
                            className="hover:bg-slate-50 dark:hover:bg-slate-800/45 transition-colors"
                          >
                            <td className="py-3 pl-5 pr-3 text-right font-mono tabular-nums text-slate-500 dark:text-slate-400">
                              {repo.id ?? '—'}
                            </td>
                            <td className="py-3 px-4">
                              <a
                                href={githubUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                title={`Mở ${githubUrl} trên GitHub`}
                                className="group inline-flex flex-col text-left focus:outline-none focus-visible:underline"
                              >
                                <span className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:underline transition-colors">
                                  {rowRepoName || slug}
                                  <ExternalLink className="h-3 w-3 text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 shrink-0 transition-colors" />
                                </span>
                                {repo.fullRepository && repo.fullRepository !== rowRepoName && (
                                  <span className="mt-0.5 font-mono text-[11px] text-slate-500 dark:text-slate-400 group-hover:text-blue-600/80 dark:group-hover:text-blue-400/80 transition-colors">
                                    {repo.fullRepository}
                                  </span>
                                )}
                              </a>
                            </td>
                            <td className="py-3 px-4">
                              {domainHref ? (
                                <a
                                  href={domainHref}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title={`Mở ${domainHref}`}
                                  className="inline-flex items-center gap-1.5 font-mono text-blue-600 dark:text-blue-400 hover:underline break-all"
                                >
                                  <span>{repo.domain}</span>
                                  <ExternalLink className="h-3 w-3 shrink-0" />
                                </a>
                              ) : (
                                <span className="text-amber-700 dark:text-amber-400 font-medium">
                                  Chưa có domain
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 font-mono tabular-nums text-slate-600 dark:text-slate-400 whitespace-nowrap">
                              {formatShortDate(repo.createdAt)}
                            </td>
                            <td className="py-3 pl-4 pr-5 text-right whitespace-nowrap">
                              <div className="inline-flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setDefaultConfigTarget({
                                      org: rowOrg,
                                      repoName: rowRepoName,
                                      currentDomain: repo.domain,
                                    })
                                  }
                                  disabled={!rowRepoName}
                                  title="Cấu hình mặc định (404.html, CNAME, GitHub Pages)"
                                  className="inline-flex items-center gap-1 rounded-md border border-slate-200 dark:border-slate-700 px-2.5 py-1 text-[11px] font-medium text-slate-700 dark:text-slate-200 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 dark:hover:border-blue-800 dark:hover:bg-blue-950/40 dark:hover:text-blue-300 disabled:opacity-50 transition-colors whitespace-nowrap"
                                >
                                  <Settings2 className="h-3 w-3" />
                                  Default config
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void handlePullSingleRepoDomain(rowOrg, rowRepoName)}
                                  disabled={isPullingRow || !rowRepoName}
                                  title="Pull lại cấu hình domain từ GitHub"
                                  className="inline-flex items-center gap-1 rounded-md border border-slate-200 dark:border-slate-700 px-2.5 py-1 text-[11px] font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors whitespace-nowrap"
                                >
                                  {isPullingRow ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <CloudDownload className="h-3 w-3" />
                                  )}
                                  Pull
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleCopyText(slug)}
                                  title={`Sao chép ${slug}`}
                                  aria-label={`Sao chép ${slug}`}
                                  className="inline-flex items-center justify-center rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100 transition-colors"
                                >
                                  {copiedValue === slug ? (
                                    <Check className="h-3.5 w-3.5 text-emerald-600" />
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
        </div>
      )}

      {/* Default Config Modal */}
      <DefaultConfigModal
        target={defaultConfigTarget}
        rootDomains={rootDomains}
        onClose={() => setDefaultConfigTarget(null)}
        onConfigured={() => {
          void loadRepos(repoScope, activeOrg);
        }}
        onAuthFailure={onAuthFailure}
      />

      {/* Batch Default Config Modal */}
      <BatchDefaultConfigModal
        open={batchDefaultConfigOpen}
        candidates={repos}
        fallbackOrg={activeOrg}
        scopeLabel={repoScope === 'all' ? 'Tất cả Organization' : `Organization ${activeOrg}`}
        rootDomains={rootDomains}
        onClose={() => setBatchDefaultConfigOpen(false)}
        onProgressOrDone={() => {
          void loadRepos(repoScope, activeOrg);
        }}
        onAuthFailure={onAuthFailure}
      />
    </div>
  );
}
