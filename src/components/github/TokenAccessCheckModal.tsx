import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  ExternalLink,
  GitFork,
  Loader2,
  Play,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Square,
  UserPlus,
  X,
  XCircle,
} from 'lucide-react';
import {
  ApiClientError,
  executeApi,
  useBackendClient,
  type GitHubOrgAutoJoinResponse,
  type GitHubTokenOrgAccessCheckResponse,
  type GitHubTokenRepoAccessCheckResponse,
  type GitHubTokenResponse,
  type OrganizationEntity,
  type RepositoryEntity,
} from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export interface TokenAccessCheckCache {
  orgs: Record<string, GitHubTokenOrgAccessCheckResponse>;
  repos: Record<string, GitHubTokenRepoAccessCheckResponse>;
}

interface TokenAccessCheckModalProps {
  token: GitHubTokenResponse | null;
  organizations: OrganizationEntity[];
  repositories: RepositoryEntity[];
  initialCache?: TokenAccessCheckCache | null;
  onCacheUpdated?: (tokenId: string, cache: TokenAccessCheckCache) => void;
  onClose: () => void;
  onAuthFailure: (message: string) => void;
}

type ResultTab = 'organizations' | 'repositories';
type StatusFilter = 'all' | 'ok' | 'issues' | 'unchecked';

interface NormalizedRepoTarget {
  key: string;
  org: string;
  repoName: string;
  fullRepository: string;
}

export function TokenAccessCheckModal({
  token,
  organizations,
  repositories,
  initialCache,
  onCacheUpdated,
  onClose,
  onAuthFailure,
}: TokenAccessCheckModalProps) {
  const { serverConfig } = useAuth();
  const { v1 } = useBackendClient();
  const { notify } = useToast();

  const [activeTab, setActiveTab] = useState<ResultTab>('organizations');
  const [selectedRepoOrg, setSelectedRepoOrg] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');

  const [orgResults, setOrgResults] = useState<Record<string, GitHubTokenOrgAccessCheckResponse>>(
    {}
  );
  const [repoResults, setRepoResults] = useState<
    Record<string, GitHubTokenRepoAccessCheckResponse>
  >({});

  const [checkingOrgKey, setCheckingOrgKey] = useState<string | null>(null);
  const [checkingRepoKey, setCheckingRepoKey] = useState<string | null>(null);
  const [grantingOrgKey, setGrantingOrgKey] = useState<string | null>(null);
  const [batchProgress, setBatchProgress] = useState<{
    mode: ResultTab | 'grant-orgs';
    completed: number;
    total: number;
    ok: number;
    issues: number;
  } | null>(null);
  const [stopping, setStopping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stopRef = useRef(false);
  const mountedRef = useRef(true);
  const onCacheUpdatedRef = useRef(onCacheUpdated);
  onCacheUpdatedRef.current = onCacheUpdated;

  const orgResultsRef = useRef(orgResults);
  orgResultsRef.current = orgResults;
  const repoResultsRef = useRef(repoResults);
  repoResultsRef.current = repoResults;

  const tokenId = token?.id || '';

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      stopRef.current = true;
    };
  }, []);

  useEffect(() => {
    if (!tokenId) return;
    stopRef.current = false;
    setStopping(false);
    setBatchProgress(null);
    setCheckingOrgKey(null);
    setCheckingRepoKey(null);
    setGrantingOrgKey(null);
    setActiveTab('organizations');
    setSelectedRepoOrg('');
    setStatusFilter('all');
    setSearch('');
    setError(null);
    setOrgResults(initialCache?.orgs ? { ...initialCache.orgs } : {});
    setRepoResults(initialCache?.repos ? { ...initialCache.repos } : {});
    // Only reset when switching to a different token
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokenId]);

  const isRunning = Boolean(checkingOrgKey || checkingRepoKey || grantingOrgKey || batchProgress);

  useEffect(() => {
    if (!tokenId) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isRunning) onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [tokenId, isRunning, onClose]);

  const normalizedOrgs = useMemo(() => {
    return organizations
      .map((o) => ({
        org: (o.org || '').trim(),
        name: o.name?.trim() || '',
      }))
      .filter((o) => o.org.length > 0);
  }, [organizations]);

  const normalizedRepos = useMemo<NormalizedRepoTarget[]>(() => {
    const seen = new Set<string>();
    const list: NormalizedRepoTarget[] = [];
    for (const r of repositories) {
      const rawFull = (r.fullRepository || '').trim();
      const org = (r.org || (rawFull.includes('/') ? rawFull.split('/')[0] : '')).trim();
      const repoName = (
        r.repoName || (rawFull.includes('/') ? rawFull.split('/').slice(1).join('/') : rawFull)
      ).trim();
      if (!org || !repoName) continue;
      const fullRepository = `${org}/${repoName}`;
      const key = fullRepository.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      list.push({ key, org, repoName, fullRepository });
    }
    return list;
  }, [repositories]);

  const scopedRepos = useMemo(() => {
    if (!selectedRepoOrg) return normalizedRepos;
    const lower = selectedRepoOrg.toLowerCase();
    return normalizedRepos.filter((r) => r.org.toLowerCase() === lower);
  }, [normalizedRepos, selectedRepoOrg]);

  const missingAccessOrgs = useMemo(() => {
    return normalizedOrgs.filter((item) => {
      const res = orgResults[item.org.toLowerCase()];
      return Boolean(res && !res.accessible);
    });
  }, [normalizedOrgs, orgResults]);

  const visibleOrgs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return normalizedOrgs.filter((item) => {
      const res = orgResults[item.org.toLowerCase()];
      if (statusFilter === 'ok' && !res?.accessible) return false;
      if (statusFilter === 'issues' && (!res || res.accessible)) return false;
      if (statusFilter === 'unchecked' && Boolean(res)) return false;
      if (q) {
        const hay = `${item.org} ${item.name} ${res?.role ?? ''} ${res?.state ?? ''} ${res?.error ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [normalizedOrgs, orgResults, statusFilter, search]);

  const visibleRepos = useMemo(() => {
    const q = search.trim().toLowerCase();
    return scopedRepos.filter((item) => {
      const res = repoResults[item.key];
      const ok = Boolean(res?.accessible && res?.canPush);
      if (statusFilter === 'ok' && !ok) return false;
      if (statusFilter === 'issues' && (!res || ok)) return false;
      if (statusFilter === 'unchecked' && Boolean(res)) return false;
      if (q) {
        const hay = `${item.fullRepository} ${item.org} ${item.repoName} ${res?.error ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [scopedRepos, repoResults, statusFilter, search]);

  if (!token) return null;

  const tokenLabel = token.accountUsername
    ? `@${token.accountUsername}`
    : token.accountName || token.tokenPreview || token.id;

  const syncCacheToParent = (
    nextOrgs: Record<string, GitHubTokenOrgAccessCheckResponse>,
    nextRepos: Record<string, GitHubTokenRepoAccessCheckResponse>
  ) => {
    if (tokenId && onCacheUpdatedRef.current) {
      onCacheUpdatedRef.current(tokenId, { orgs: nextOrgs, repos: nextRepos });
    }
  };

  const checkSingleOrg = async (orgSlug: string) => {
    if (!tokenId || !orgSlug) return;
    const key = orgSlug.toLowerCase();
    setCheckingOrgKey(key);
    setError(null);
    try {
      const res = await executeApi(
        v1.checkTokenOrgAccess({
          id: encodeURIComponent(tokenId),
          org: encodeURIComponent(orgSlug),
        }),
        serverConfig.useProxy
      );
      if (!mountedRef.current) return;
      const nextOrgs = { ...orgResultsRef.current, [key]: res };
      setOrgResults(nextOrgs);
      syncCacheToParent(nextOrgs, repoResultsRef.current);
    } catch (err) {
      if (err instanceof ApiClientError && (err.status === 401 || err.status === 403)) {
        onAuthFailure(err.message);
        return;
      }
      if (!mountedRef.current) return;
      const msg =
        err instanceof ApiClientError
          ? err.message
          : `Không thể kiểm tra quyền truy cập org "${orgSlug}".`;
      const failedRes: GitHubTokenOrgAccessCheckResponse = {
        org: orgSlug,
        accessible: false,
        error: msg,
      };
      const nextOrgs = { ...orgResultsRef.current, [key]: failedRes };
      setOrgResults(nextOrgs);
      syncCacheToParent(nextOrgs, repoResultsRef.current);
    } finally {
      if (mountedRef.current) setCheckingOrgKey(null);
    }
  };

  const checkSingleRepo = async (target: NormalizedRepoTarget) => {
    if (!tokenId) return;
    setCheckingRepoKey(target.key);
    setError(null);
    try {
      const res = await executeApi(
        v1.checkTokenRepoAccess({
          id: encodeURIComponent(tokenId),
          org: encodeURIComponent(target.org),
          repo: encodeURIComponent(target.repoName),
        }),
        serverConfig.useProxy
      );
      if (!mountedRef.current) return;
      const nextRepos = { ...repoResultsRef.current, [target.key]: res };
      setRepoResults(nextRepos);
      syncCacheToParent(orgResultsRef.current, nextRepos);
    } catch (err) {
      if (err instanceof ApiClientError && (err.status === 401 || err.status === 403)) {
        onAuthFailure(err.message);
        return;
      }
      if (!mountedRef.current) return;
      const msg =
        err instanceof ApiClientError
          ? err.message
          : `Không thể kiểm tra quyền truy cập repo "${target.fullRepository}".`;
      const failedRes: GitHubTokenRepoAccessCheckResponse = {
        org: target.org,
        repoName: target.repoName,
        fullRepository: target.fullRepository,
        accessible: false,
        canPush: false,
        canAdmin: false,
        error: msg,
      };
      const nextRepos = { ...repoResultsRef.current, [target.key]: failedRes };
      setRepoResults(nextRepos);
      syncCacheToParent(orgResultsRef.current, nextRepos);
    } finally {
      if (mountedRef.current) setCheckingRepoKey(null);
    }
  };

  const buildGrantedOrgResult = (
    prev: GitHubTokenOrgAccessCheckResponse | undefined,
    orgSlug: string,
    joinRes: GitHubOrgAutoJoinResponse
  ): GitHubTokenOrgAccessCheckResponse => ({
    ...prev,
    org: joinRes.org || orgSlug,
    accessible: true,
    role: joinRes.role || 'member',
    state: joinRes.state || 'active',
    error: undefined,
    isActive: prev?.isActive ?? token.isActive,
    isSuperToken: prev?.isSuperToken ?? token.isSuperToken,
  });

  const formatAutoJoinDescription = (joinRes: GitHubOrgAutoJoinResponse, orgSlug: string) => {
    if (joinRes.message?.trim()) return joinRes.message.trim();
    const parts: string[] = [];
    if (joinRes.status === 'ALREADY_MEMBER') {
      parts.push(`Đã là thành viên của ${joinRes.org || orgSlug}`);
    } else if (joinRes.status === 'ACCEPTED_EXISTING_INVITATION') {
      parts.push(`Đã đồng ý lời mời sẵn có vào ${joinRes.org || orgSlug}`);
    } else {
      parts.push(`Đã mời và đồng ý vào ${joinRes.org || orgSlug}`);
    }
    if (joinRes.managerUsername) parts.push(`Admin: @${joinRes.managerUsername}`);
    if (joinRes.role) parts.push(`Role: ${joinRes.role}`);
    return parts.join(' · ');
  };

  const grantSingleOrg = async (orgSlug: string) => {
    if (!tokenId || !orgSlug) return;
    const key = orgSlug.toLowerCase();
    setGrantingOrgKey(key);
    setError(null);
    try {
      const joinRes = await executeApi(
        v1.autoJoinOrganization({
          id: encodeURIComponent(tokenId),
          org: encodeURIComponent(orgSlug),
        }),
        serverConfig.useProxy
      );
      if (!mountedRef.current) return;
      const nextOrgs = {
        ...orgResultsRef.current,
        [key]: buildGrantedOrgResult(orgResultsRef.current[key], orgSlug, joinRes),
      };
      setOrgResults(nextOrgs);
      syncCacheToParent(nextOrgs, repoResultsRef.current);
      notify({
        tone: 'success',
        title: `Đã cấp quyền vào ${joinRes.org || orgSlug}`,
        description: formatAutoJoinDescription(joinRes, orgSlug),
      });
    } catch (err) {
      if (err instanceof ApiClientError && (err.status === 401 || err.status === 403)) {
        onAuthFailure(err.message);
        return;
      }
      if (!mountedRef.current) return;
      const msg =
        err instanceof ApiClientError
          ? err.message
          : `Không thể tự động cấp quyền vào org "${orgSlug}".`;
      const prev = orgResultsRef.current[key];
      const failedRes: GitHubTokenOrgAccessCheckResponse = {
        ...prev,
        org: prev?.org || orgSlug,
        accessible: false,
        error: msg,
      };
      const nextOrgs = { ...orgResultsRef.current, [key]: failedRes };
      setOrgResults(nextOrgs);
      syncCacheToParent(nextOrgs, repoResultsRef.current);
      notify({
        tone: 'error',
        title: `Cấp quyền thất bại (${orgSlug})`,
        description: msg,
      });
    } finally {
      if (mountedRef.current) setGrantingOrgKey(null);
    }
  };

  const handleGrantMissingOrgs = async () => {
    const targets = [...missingAccessOrgs];
    if (!tokenId || targets.length === 0) return;
    stopRef.current = false;
    setStopping(false);
    setError(null);
    setBatchProgress({
      mode: 'grant-orgs',
      completed: 0,
      total: targets.length,
      ok: 0,
      issues: 0,
    });

    let okCount = 0;
    let issueCount = 0;
    let stoppedEarly = false;
    let latestOrgs = { ...orgResultsRef.current };

    for (let i = 0; i < targets.length; i++) {
      if (stopRef.current || !mountedRef.current) {
        stoppedEarly = true;
        break;
      }

      const item = targets[i];
      const key = item.org.toLowerCase();
      setGrantingOrgKey(key);

      try {
        const joinRes = await executeApi(
          v1.autoJoinOrganization({
            id: encodeURIComponent(tokenId),
            org: encodeURIComponent(item.org),
          }),
          serverConfig.useProxy
        );
        latestOrgs = {
          ...latestOrgs,
          [key]: buildGrantedOrgResult(latestOrgs[key], item.org, joinRes),
        };
        okCount += 1;
      } catch (err) {
        if (err instanceof ApiClientError && (err.status === 401 || err.status === 403)) {
          if (mountedRef.current) {
            setGrantingOrgKey(null);
            setBatchProgress(null);
            setStopping(false);
          }
          onAuthFailure(err.message);
          return;
        }
        issueCount += 1;
        const prev = latestOrgs[key];
        latestOrgs = {
          ...latestOrgs,
          [key]: {
            ...prev,
            org: prev?.org || item.org,
            accessible: false,
            error:
              err instanceof ApiClientError
                ? err.message
                : `Không thể tự động cấp quyền vào org "${item.org}".`,
          },
        };
      }

      if (mountedRef.current) {
        setOrgResults(latestOrgs);
        setBatchProgress({
          mode: 'grant-orgs',
          completed: i + 1,
          total: targets.length,
          ok: okCount,
          issues: issueCount,
        });
      }
    }

    if (!mountedRef.current) return;
    setGrantingOrgKey(null);
    setBatchProgress(null);
    setStopping(false);
    syncCacheToParent(latestOrgs, repoResultsRef.current);

    notify({
      tone: issueCount === 0 && !stoppedEarly ? 'success' : 'info',
      title: stoppedEarly
        ? `Đã dừng cấp quyền Org (${okCount + issueCount}/${targets.length})`
        : `Hoàn tất cấp quyền ${targets.length} Organization`,
      description: `Thành công: ${okCount} · Thất bại: ${issueCount}`,
    });
  };

  const handleCheckAllOrgs = async () => {
    if (!tokenId || normalizedOrgs.length === 0) return;
    stopRef.current = false;
    setStopping(false);
    setError(null);
    setBatchProgress({
      mode: 'organizations',
      completed: 0,
      total: normalizedOrgs.length,
      ok: 0,
      issues: 0,
    });

    let okCount = 0;
    let issueCount = 0;
    let stoppedEarly = false;
    let latestOrgs = { ...orgResultsRef.current };

    for (let i = 0; i < normalizedOrgs.length; i++) {
      if (stopRef.current || !mountedRef.current) {
        stoppedEarly = true;
        break;
      }

      const item = normalizedOrgs[i];
      const key = item.org.toLowerCase();
      setCheckingOrgKey(key);

      try {
        const res = await executeApi(
          v1.checkTokenOrgAccess({
            id: encodeURIComponent(tokenId),
            org: encodeURIComponent(item.org),
          }),
          serverConfig.useProxy
        );
        latestOrgs = { ...latestOrgs, [key]: res };
        if (res.accessible) okCount += 1;
        else issueCount += 1;
      } catch (err) {
        if (err instanceof ApiClientError && (err.status === 401 || err.status === 403)) {
          if (mountedRef.current) {
            setCheckingOrgKey(null);
            setBatchProgress(null);
            setStopping(false);
          }
          onAuthFailure(err.message);
          return;
        }
        issueCount += 1;
        latestOrgs = {
          ...latestOrgs,
          [key]: {
            org: item.org,
            accessible: false,
            error: err instanceof ApiClientError ? err.message : 'Lỗi khi kiểm tra org.',
          },
        };
      }

      if (mountedRef.current) {
        setOrgResults(latestOrgs);
        setBatchProgress({
          mode: 'organizations',
          completed: i + 1,
          total: normalizedOrgs.length,
          ok: okCount,
          issues: issueCount,
        });
      }
    }

    if (!mountedRef.current) return;
    setCheckingOrgKey(null);
    setBatchProgress(null);
    setStopping(false);
    syncCacheToParent(latestOrgs, repoResultsRef.current);

    notify({
      tone: issueCount === 0 && !stoppedEarly ? 'success' : 'info',
      title: stoppedEarly
        ? `Đã dừng kiểm tra Org (${okCount + issueCount}/${normalizedOrgs.length})`
        : `Hoàn tất kiểm tra ${normalizedOrgs.length} Organization`,
      description: `Có quyền: ${okCount} · Không có quyền/Lỗi: ${issueCount}`,
    });
  };

  const handleCheckAllRepos = async () => {
    if (!tokenId || scopedRepos.length === 0) return;
    stopRef.current = false;
    setStopping(false);
    setError(null);
    setBatchProgress({
      mode: 'repositories',
      completed: 0,
      total: scopedRepos.length,
      ok: 0,
      issues: 0,
    });

    let okCount = 0;
    let issueCount = 0;
    let stoppedEarly = false;
    let latestRepos = { ...repoResultsRef.current };

    for (let i = 0; i < scopedRepos.length; i++) {
      if (stopRef.current || !mountedRef.current) {
        stoppedEarly = true;
        break;
      }

      const item = scopedRepos[i];
      setCheckingRepoKey(item.key);

      try {
        const res = await executeApi(
          v1.checkTokenRepoAccess({
            id: encodeURIComponent(tokenId),
            org: encodeURIComponent(item.org),
            repo: encodeURIComponent(item.repoName),
          }),
          serverConfig.useProxy
        );
        latestRepos = { ...latestRepos, [item.key]: res };
        if (res.accessible && res.canPush) okCount += 1;
        else issueCount += 1;
      } catch (err) {
        if (err instanceof ApiClientError && (err.status === 401 || err.status === 403)) {
          if (mountedRef.current) {
            setCheckingRepoKey(null);
            setBatchProgress(null);
            setStopping(false);
          }
          onAuthFailure(err.message);
          return;
        }
        issueCount += 1;
        latestRepos = {
          ...latestRepos,
          [item.key]: {
            org: item.org,
            repoName: item.repoName,
            fullRepository: item.fullRepository,
            accessible: false,
            canPush: false,
            canAdmin: false,
            error: err instanceof ApiClientError ? err.message : 'Lỗi khi kiểm tra repo.',
          },
        };
      }

      if (mountedRef.current) {
        setRepoResults(latestRepos);
        setBatchProgress({
          mode: 'repositories',
          completed: i + 1,
          total: scopedRepos.length,
          ok: okCount,
          issues: issueCount,
        });
      }
    }

    if (!mountedRef.current) return;
    setCheckingRepoKey(null);
    setBatchProgress(null);
    setStopping(false);
    syncCacheToParent(orgResultsRef.current, latestRepos);

    notify({
      tone: issueCount === 0 && !stoppedEarly ? 'success' : 'info',
      title: stoppedEarly
        ? `Đã dừng kiểm tra Repo (${okCount + issueCount}/${scopedRepos.length})`
        : `Hoàn tất kiểm tra ${scopedRepos.length} Repository`,
      description: `Đủ Đọc/Ghi: ${okCount} · Thiếu quyền/Lỗi: ${issueCount}`,
    });
  };

  const handleStopBatch = () => {
    stopRef.current = true;
    setStopping(true);
  };

  // Summary metrics
  const checkedOrgValues = Object.values(orgResults);
  const okOrgCount = checkedOrgValues.filter((o) => o.accessible).length;
  const issueOrgCount = checkedOrgValues.length - okOrgCount;

  const scopedRepoResults = scopedRepos
    .map((r) => repoResults[r.key])
    .filter((r): r is GitHubTokenRepoAccessCheckResponse => Boolean(r));
  const okRepoCount = scopedRepoResults.filter((r) => r.accessible && r.canPush).length;
  const issueRepoCount = scopedRepoResults.length - okRepoCount;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-[2px] p-4"
      onClick={() => {
        if (!isRunning) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="token-access-check-title"
        className="w-full max-w-3xl max-h-[88vh] flex flex-col rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] shadow-2xl overflow-hidden"
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
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 truncate">
              Kiểm tra riêng từng Organization hoặc từng Repository, hoặc chạy vòng lặp kiểm tra tất cả
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isRunning}
            aria-label="Đóng hộp thoại"
            className="cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-50 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Mode Switcher + Check All Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 px-6 py-3">
          <div className="inline-flex rounded-lg bg-slate-200/70 dark:bg-slate-800 p-0.5 text-xs font-medium self-start">
            <button
              type="button"
              disabled={isRunning}
              onClick={() => {
                setActiveTab('organizations');
                setSearch('');
                setStatusFilter('all');
              }}
              className={`cursor-pointer inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 transition-colors disabled:opacity-50 ${
                activeTab === 'organizations'
                  ? 'bg-white dark:bg-[#0F172A] text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Building2 className="h-3.5 w-3.5" />
              <span>Organizations ({normalizedOrgs.length})</span>
            </button>
            <button
              type="button"
              disabled={isRunning}
              onClick={() => {
                setActiveTab('repositories');
                setSearch('');
                setStatusFilter('all');
              }}
              className={`cursor-pointer inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 transition-colors disabled:opacity-50 ${
                activeTab === 'repositories'
                  ? 'bg-white dark:bg-[#0F172A] text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <GitFork className="h-3.5 w-3.5" />
              <span>Repositories ({scopedRepos.length})</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {batchProgress ? (
              <button
                type="button"
                onClick={handleStopBatch}
                disabled={stopping}
                className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-3.5 py-1.5 text-xs font-medium text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/50 disabled:opacity-50 transition-colors"
              >
                <Square className="h-3.5 w-3.5" />
                {stopping
                  ? 'Đang dừng...'
                  : batchProgress.mode === 'grant-orgs'
                    ? 'Dừng cấp quyền'
                    : 'Dừng kiểm tra'}
              </button>
            ) : activeTab === 'organizations' ? (
              <>
                {missingAccessOrgs.length > 0 && (
                  <button
                    type="button"
                    disabled={isRunning}
                    onClick={() => void handleGrantMissingOrgs()}
                    title="Tự động tìm token quản trị của từng org, mời vào org (member) và đồng ý luôn"
                    className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500 px-3.5 py-1.5 text-xs font-medium text-white disabled:opacity-50 transition-colors whitespace-nowrap"
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    Cấp quyền tất cả ({missingAccessOrgs.length})
                  </button>
                )}
                <button
                  type="button"
                  disabled={isRunning || normalizedOrgs.length === 0}
                  onClick={() => void handleCheckAllOrgs()}
                  className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 px-3.5 py-1.5 text-xs font-medium text-white disabled:opacity-50 transition-colors whitespace-nowrap"
                >
                  <Play className="h-3.5 w-3.5" />
                  Kiểm tra tất cả Org ({normalizedOrgs.length})
                </button>
              </>
            ) : (
              <button
                type="button"
                disabled={isRunning || scopedRepos.length === 0}
                onClick={() => void handleCheckAllRepos()}
                className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 px-3.5 py-1.5 text-xs font-medium text-white disabled:opacity-50 transition-colors whitespace-nowrap"
              >
                <Play className="h-3.5 w-3.5" />
                Kiểm tra tất cả Repo ({scopedRepos.length})
              </button>
            )}
          </div>
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

          {/* Live FE Loop Progress Bar */}
          {batchProgress && (
            <div
              className={`rounded-xl border p-3.5 space-y-2 ${
                batchProgress.mode === 'grant-orgs'
                  ? 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/60 dark:bg-emerald-950/25'
                  : 'border-blue-200 dark:border-blue-900/60 bg-blue-50/60 dark:bg-blue-950/25'
              }`}
            >
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="inline-flex items-center gap-2 font-medium text-slate-900 dark:text-slate-100">
                  <Loader2
                    className={`h-3.5 w-3.5 animate-spin ${
                      batchProgress.mode === 'grant-orgs'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-blue-600 dark:text-blue-400'
                    }`}
                  />
                  {stopping
                    ? 'Đang dừng sau mục hiện tại...'
                    : batchProgress.mode === 'grant-orgs'
                      ? `Đang cấp quyền Organization (${batchProgress.completed}/${batchProgress.total})...`
                      : `Đang kiểm tra ${
                          batchProgress.mode === 'organizations' ? 'Organization' : 'Repository'
                        } (${batchProgress.completed}/${batchProgress.total})...`}
                </span>
                <span className="font-mono text-[11px] tabular-nums text-slate-600 dark:text-slate-400">
                  {batchProgress.mode === 'grant-orgs' ? 'Thành công: ' : 'Đạt: '}
                  <strong className="text-emerald-700 dark:text-emerald-400">
                    {batchProgress.ok}
                  </strong>{' '}
                  · {batchProgress.mode === 'grant-orgs' ? 'Thất bại: ' : 'Thiếu quyền: '}
                  <strong className="text-red-700 dark:text-red-400">
                    {batchProgress.issues}
                  </strong>
                </span>
              </div>
              <div
                className={`h-1.5 w-full overflow-hidden rounded-full ${
                  batchProgress.mode === 'grant-orgs'
                    ? 'bg-emerald-200/70 dark:bg-slate-800'
                    : 'bg-blue-200/70 dark:bg-slate-800'
                }`}
              >
                <div
                  className={`h-full transition-all duration-150 ${
                    batchProgress.mode === 'grant-orgs'
                      ? 'bg-emerald-600 dark:bg-emerald-500'
                      : 'bg-blue-600 dark:bg-blue-500'
                  }`}
                  style={{
                    width: `${Math.min(
                      100,
                      Math.round((batchProgress.completed / Math.max(1, batchProgress.total)) * 100)
                    )}%`,
                  }}
                />
              </div>
            </div>
          )}

          {/* Compact Summary Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 p-3">
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Organizations đã kiểm tra
              </p>
              <p className="mt-1 font-mono text-base font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                <span className="text-emerald-600 dark:text-emerald-400">{okOrgCount}</span>
                <span className="text-xs font-normal text-slate-400">
                  {' '}
                  / {checkedOrgValues.length} đã check
                </span>
              </p>
              {issueOrgCount > 0 && (
                <p className="mt-0.5 text-[11px] text-red-600 dark:text-red-400">
                  {issueOrgCount} không có quyền
                </p>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 p-3">
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Repositories đủ Đọc &amp; Ghi
              </p>
              <p className="mt-1 font-mono text-base font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                <span className="text-emerald-600 dark:text-emerald-400">{okRepoCount}</span>
                <span className="text-xs font-normal text-slate-400">
                  {' '}
                  / {scopedRepoResults.length} đã check
                </span>
              </p>
              {issueRepoCount > 0 && (
                <p className="mt-0.5 text-[11px] text-red-600 dark:text-red-400">
                  {issueRepoCount} thiếu quyền
                </p>
              )}
            </div>

            <div className="col-span-2 sm:col-span-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 p-3">
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Trạng thái Token
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                    token.isActive
                      ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {token.isActive ? 'Đang bật' : 'Đã tắt'}
                </span>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                    token.isSuperToken
                      ? 'bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {token.isSuperToken ? 'Super Token' : 'Thường'}
                </span>
              </div>
            </div>
          </div>

          {/* Filters row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-1 min-w-0">
              <div className="relative flex-1 max-w-xs">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={
                    activeTab === 'organizations' ? 'Tìm organization...' : 'Tìm repository...'
                  }
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#090D16] pl-8 pr-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none"
                />
              </div>

              {activeTab === 'repositories' && (
                <select
                  value={selectedRepoOrg}
                  disabled={isRunning}
                  onChange={(e) => setSelectedRepoOrg(e.target.value)}
                  aria-label="Lọc repository theo Organization"
                  className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#090D16] px-2.5 py-1.5 font-mono text-xs text-slate-800 dark:text-slate-200 focus:border-blue-600 focus:outline-none disabled:opacity-60 sm:max-w-[200px]"
                >
                  <option value="">Tất cả Org ({normalizedRepos.length})</option>
                  {normalizedOrgs.map((o) => (
                    <option key={o.org} value={o.org}>
                      {o.org}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="inline-flex rounded-lg bg-slate-200/70 dark:bg-slate-800 p-0.5 text-[11px] font-medium shrink-0 self-start sm:self-auto">
              {(
                [
                  { id: 'all', label: 'Tất cả' },
                  { id: 'ok', label: 'Đạt' },
                  { id: 'issues', label: 'Thiếu quyền' },
                  { id: 'unchecked', label: 'Chưa check' },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setStatusFilter(f.id)}
                  className={`cursor-pointer rounded-md px-2 py-1 transition-colors whitespace-nowrap ${
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

          {/* Tab Content: Organizations */}
          {activeTab === 'organizations' ? (
            visibleOrgs.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 py-10 text-center text-xs text-slate-500 dark:text-slate-400">
                {normalizedOrgs.length === 0
                  ? 'Chưa có organization nào trong hệ thống.'
                  : 'Không có organization nào khớp bộ lọc.'}
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400">
                      <th className="py-2.5 pl-4 pr-3 font-medium">Organization</th>
                      <th className="py-2.5 px-3 font-medium whitespace-nowrap">Kết quả</th>
                      <th className="py-2.5 px-3 font-medium whitespace-nowrap">Role / State</th>
                      <th className="py-2.5 px-3 font-medium">Chi tiết lỗi</th>
                      <th className="py-2.5 pl-3 pr-4 text-right font-medium whitespace-nowrap">
                        Thao tác
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {visibleOrgs.map((item) => {
                      const key = item.org.toLowerCase();
                      const res = orgResults[key];
                      const isRowChecking = checkingOrgKey === key;
                      const isRowGranting = grantingOrgKey === key;

                      return (
                        <tr
                          key={item.org}
                          className={`transition-colors ${
                            isRowGranting
                              ? 'bg-emerald-50/50 dark:bg-emerald-950/20'
                              : isRowChecking
                                ? 'bg-blue-50/50 dark:bg-blue-950/20'
                                : 'hover:bg-slate-50/70 dark:hover:bg-slate-800/35'
                          }`}
                        >
                          <td className="py-2.5 pl-4 pr-3 font-mono font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                            <a
                              href={`https://github.com/${encodeURIComponent(item.org)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400"
                            >
                              {item.org}
                              <ExternalLink className="h-3 w-3 text-slate-400" />
                            </a>
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            {isRowGranting ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                                <Loader2 className="h-3 w-3 animate-spin" />
                                Đang cấp quyền...
                              </span>
                            ) : isRowChecking ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 dark:text-blue-400">
                                <Loader2 className="h-3 w-3 animate-spin" />
                                Đang kiểm tra...
                              </span>
                            ) : !res ? (
                              <span className="text-[11px] text-slate-400 dark:text-slate-500">
                                Chưa kiểm tra
                              </span>
                            ) : res.accessible ? (
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
                            {res?.role || '—'}
                            {res?.state ? ` · ${res.state}` : ''}
                          </td>
                          <td className="py-2.5 px-3 text-red-600 dark:text-red-400">
                            {res?.error || '—'}
                          </td>
                          <td className="py-2.5 pl-3 pr-4 text-right whitespace-nowrap">
                            <div className="inline-flex items-center justify-end gap-1.5">
                              {res && !res.accessible && (
                                <button
                                  type="button"
                                  disabled={isRunning}
                                  onClick={() => void grantSingleOrg(item.org)}
                                  title="Tự động tìm token quản trị của org, gửi lời mời member và đồng ý luôn"
                                  className="cursor-pointer inline-flex items-center gap-1 rounded-md border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 disabled:opacity-50 transition-colors"
                                >
                                  {isRowGranting ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <UserPlus className="h-3 w-3" />
                                  )}
                                  Cấp quyền
                                </button>
                              )}
                              <button
                                type="button"
                                disabled={isRunning}
                                onClick={() => void checkSingleOrg(item.org)}
                                className="cursor-pointer inline-flex items-center gap-1 rounded-md border border-slate-200 dark:border-slate-700 px-2.5 py-1 text-[11px] font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors"
                              >
                                {isRowChecking ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <RefreshCw className="h-3 w-3" />
                                )}
                                {res ? 'Kiểm tra lại' : 'Kiểm tra'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          ) : visibleRepos.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 py-10 text-center text-xs text-slate-500 dark:text-slate-400">
              {scopedRepos.length === 0
                ? 'Không có repository nào trong phạm vi này.'
                : 'Không có repository nào khớp bộ lọc.'}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400">
                    <th className="py-2.5 pl-4 pr-3 font-medium">Repository</th>
                    <th className="py-2.5 px-2.5 font-medium text-center whitespace-nowrap">
                      Đọc
                    </th>
                    <th className="py-2.5 px-2.5 font-medium text-center whitespace-nowrap">
                      Ghi (Push)
                    </th>
                    <th className="py-2.5 px-2.5 font-medium text-center whitespace-nowrap">
                      Admin
                    </th>
                    <th className="py-2.5 px-3 font-medium">Chi tiết lỗi</th>
                    <th className="py-2.5 pl-3 pr-4 text-right font-medium whitespace-nowrap">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {visibleRepos.map((item) => {
                    const res = repoResults[item.key];
                    const isRowChecking = checkingRepoKey === item.key;

                    return (
                      <tr
                        key={item.key}
                        className={`transition-colors ${
                          isRowChecking
                            ? 'bg-blue-50/50 dark:bg-blue-950/20'
                            : 'hover:bg-slate-50/70 dark:hover:bg-slate-800/35'
                        }`}
                      >
                        <td className="py-2.5 pl-4 pr-3 font-mono font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">
                          <a
                            href={`https://github.com/${item.fullRepository}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400"
                          >
                            {item.fullRepository}
                            <ExternalLink className="h-3 w-3 text-slate-400" />
                          </a>
                        </td>
                        <td className="py-2.5 px-2.5 text-center">
                          {isRowChecking ? (
                            <Loader2 className="mx-auto h-3.5 w-3.5 animate-spin text-blue-600" />
                          ) : !res ? (
                            <span className="text-slate-300 dark:text-slate-600">—</span>
                          ) : res.accessible ? (
                            <CheckCircle2 className="mx-auto h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <XCircle className="mx-auto h-4 w-4 text-red-500 dark:text-red-400" />
                          )}
                        </td>
                        <td className="py-2.5 px-2.5 text-center">
                          {isRowChecking ? (
                            <span className="text-slate-300 dark:text-slate-600">…</span>
                          ) : !res ? (
                            <span className="text-slate-300 dark:text-slate-600">—</span>
                          ) : res.canPush ? (
                            <CheckCircle2 className="mx-auto h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <XCircle className="mx-auto h-4 w-4 text-red-500 dark:text-red-400" />
                          )}
                        </td>
                        <td className="py-2.5 px-2.5 text-center">
                          {!res ? (
                            <span className="text-slate-300 dark:text-slate-600">—</span>
                          ) : res.canAdmin ? (
                            <CheckCircle2 className="mx-auto h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                          ) : (
                            <span className="text-slate-300 dark:text-slate-600">—</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-red-600 dark:text-red-400">
                          {res?.error || '—'}
                        </td>
                        <td className="py-2.5 pl-3 pr-4 text-right whitespace-nowrap">
                          <button
                            type="button"
                            disabled={isRunning}
                            onClick={() => void checkSingleRepo(item)}
                            className="cursor-pointer inline-flex items-center gap-1 rounded-md border border-slate-200 dark:border-slate-700 px-2.5 py-1 text-[11px] font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors"
                          >
                            {isRowChecking ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <RefreshCw className="h-3 w-3" />
                            )}
                            {res ? 'Kiểm tra lại' : 'Kiểm tra'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 px-6 py-3.5">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
            <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
            <span>
              Chế độ &ldquo;Kiểm tra tất cả&rdquo; gọi tuần tự từng API riêng trên trình duyệt và có thể dừng bất kỳ lúc nào.
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isRunning}
            className="cursor-pointer rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors shrink-0"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
