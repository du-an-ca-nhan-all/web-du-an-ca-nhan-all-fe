import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Dices,
  ExternalLink,
  GitFork,
  Loader2,
  RotateCcw,
  Settings2,
  Square,
  X,
  XCircle,
} from 'lucide-react';
import {
  ApiClientError,
  executeApi,
  useBackendClient,
  type GitHubCreateForkRepoRequest,
  type GitHubCreateRepoResponse,
  type OrganizationEntity,
} from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { generateRandomRepoName } from '../../utils/format';

const DEFAULT_SOURCE_REPO = 'https://github.com/apache/kafka';
const DEFAULT_BRANCH_ONLY = true;
const REPO_NAME_PATTERN = /^[a-zA-Z0-9_.-]+$/;
const MAX_BATCH_FORK_COUNT = 50;
const QUICK_COUNTS = [1, 3, 5, 10] as const;

interface BatchForkLogItem {
  index: number;
  name: string;
  fullRepository?: string;
  htmlUrl?: string;
  status: 'success' | 'error';
  message?: string;
}

export interface LastCreatedRepoInfo {
  result: GitHubCreateRepoResponse;
  generatedNameUsed: boolean;
  submittedName: string;
}

interface ForkRepoModalProps {
  open: boolean;
  organizations: OrganizationEntity[];
  defaultOrg: string;
  orgsError: string | null;
  onClose: () => void;
  onCreated: (info: LastCreatedRepoInfo, targetOrg: string) => void;
  onOpenDefaultConfig: (org: string, repoName: string, currentDomain?: string | null) => void;
  onAuthFailure: (message: string) => void;
}

function buildGitHubRepoUrl(slug: string): string {
  const clean = slug.trim().replace(/^\/+|\/+$/g, '');
  return `https://github.com/${clean}`;
}

export function ForkRepoModal({
  open,
  organizations,
  defaultOrg,
  orgsError,
  onClose,
  onCreated,
  onOpenDefaultConfig,
  onAuthFailure,
}: ForkRepoModalProps) {
  const { serverConfig } = useAuth();
  const { v1 } = useBackendClient();
  const { notify } = useToast();

  const [useCustomOrg, setUseCustomOrg] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState('');
  const [customOrg, setCustomOrg] = useState('');

  const [repoName, setRepoName] = useState('');
  const [domain, setDomain] = useState('');
  const [sourceRepo, setSourceRepo] = useState(DEFAULT_SOURCE_REPO);
  const [defaultBranchOnly, setDefaultBranchOnly] = useState(DEFAULT_BRANCH_ONLY);
  const [forkCountInput, setForkCountInput] = useState('1');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [stoppingForkBatch, setStoppingForkBatch] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [singleResult, setSingleResult] = useState<LastCreatedRepoInfo | null>(null);
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

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      forkStopRef.current = true;
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    setSubmitError(null);
    setSingleResult(null);
    setForkBatchState(null);
    setStoppingForkBatch(false);
    forkStopRef.current = false;

    if (organizations.length > 0) {
      setUseCustomOrg(false);
      const preferred =
        defaultOrg && organizations.some((o) => o.org === defaultOrg)
          ? defaultOrg
          : organizations[0]?.org || '';
      setSelectedOrg(preferred);
    } else {
      setUseCustomOrg(true);
      setCustomOrg(defaultOrg || '');
    }
  }, [open, organizations, defaultOrg]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, submitting, onClose]);

  if (!open) return null;

  const activeOrg = (useCustomOrg ? customOrg : selectedOrg).trim();

  const parsedForkCount = (() => {
    const num = Number.parseInt(forkCountInput.trim(), 10);
    if (!Number.isFinite(num) || num < 1) return 1;
    return Math.min(num, MAX_BATCH_FORK_COUNT);
  })();

  const isForkOptionsModified =
    sourceRepo !== DEFAULT_SOURCE_REPO || defaultBranchOnly !== DEFAULT_BRANCH_ONLY;

  const handleResetForkDefaults = () => {
    setSourceRepo(DEFAULT_SOURCE_REPO);
    setDefaultBranchOnly(DEFAULT_BRANCH_ONLY);
  };

  const handleStopBatchFork = () => {
    forkStopRef.current = true;
    setStoppingForkBatch(true);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitError(null);
    setSingleResult(null);

    if (!activeOrg) {
      setSubmitError('Vui lòng chọn hoặc nhập tên Organization đích.');
      return;
    }

    const rawCount = Number.parseInt(forkCountInput.trim(), 10);
    if (!Number.isFinite(rawCount) || rawCount < 1 || rawCount > MAX_BATCH_FORK_COUNT) {
      setSubmitError(`Số lượng tạo phải là số nguyên từ 1 đến ${MAX_BATCH_FORK_COUNT}.`);
      return;
    }

    const count = rawCount;
    const trimmedInputName = repoName.trim();
    const generatedNameUsed = trimmedInputName.length === 0;

    if (!generatedNameUsed && !REPO_NAME_PATTERN.test(trimmedInputName)) {
      setSubmitError(
        'Tên repository chỉ được phép chứa chữ cái (a-z, A-Z), chữ số (0-9) và ký tự _ . -'
      );
      return;
    }

    const trimmedDomain = count === 1 ? domain.trim() : '';
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

        const info: LastCreatedRepoInfo = {
          result,
          generatedNameUsed,
          submittedName: finalName,
        };
        setSingleResult(info);
        setRepoName('');
        setDomain('');
        onCreated(info, activeOrg);

        notify({
          tone: 'success',
          title: 'Đã tạo repository từ fork',
          description: result.fullRepository || `${activeOrg}/${finalName}`,
        });
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
        if (mountedRef.current) setSubmitting(false);
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
    let latestInfo: LastCreatedRepoInfo | null = null;

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
        latestInfo = { result, generatedNameUsed, submittedName: finalName };

        if (mountedRef.current) {
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
          err instanceof ApiClientError ? err.message : 'Không thể tạo repository fork.';

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

    if (successCount > 0 && latestInfo) {
      setRepoName('');
      setDomain('');
      onCreated(latestInfo, activeOrg);
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 backdrop-blur-[2px] p-4"
      onClick={() => {
        if (!submitting) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="fork-repo-modal-title"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg max-h-[90vh] flex flex-col rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 px-6 py-4 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 shrink-0">
              <GitFork className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h2
                id="fork-repo-modal-title"
                className="font-display text-base font-semibold text-slate-900 dark:text-slate-100 truncate"
              >
                Tạo Repository từ Fork
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                Tạo 1 hoặc nhiều repository mới vào Organization đã chọn
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Đóng hộp thoại"
            className="cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-40 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
            {orgsError && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-200 dark:border-amber-900/60 bg-amber-50/75 dark:bg-amber-950/30 px-3.5 py-2.5 text-xs text-amber-900 dark:text-amber-300">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{orgsError} Bạn có thể nhập thủ công tên Organization bên dưới.</span>
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

            {/* 1. Organization */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <label
                  htmlFor="fork-org"
                  className="text-xs font-medium text-slate-700 dark:text-slate-300"
                >
                  Organization đích <span className="text-red-500">*</span>
                </label>
                {organizations.length > 0 && (
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => setUseCustomOrg((prev) => !prev)}
                    className="cursor-pointer text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 disabled:opacity-50 transition-colors"
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
                  disabled={submitting}
                  value={customOrg}
                  onChange={(e) => setCustomOrg(e.target.value)}
                  placeholder="Nhập tên organization (ví dụ: my-org)"
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#090D16] px-3 py-2 font-mono text-xs text-slate-900 dark:text-slate-100 placeholder:font-sans placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 disabled:opacity-60"
                />
              ) : (
                <select
                  id="fork-org"
                  disabled={submitting}
                  value={selectedOrg}
                  onChange={(e) => setSelectedOrg(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#090D16] px-3 py-2 font-mono text-xs text-slate-900 dark:text-slate-100 focus:border-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 disabled:opacity-60"
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

            {/* 2. Quantity selector (Quick pills + custom number) */}
            <div className="space-y-1.5">
              <label
                htmlFor="fork-batch-count"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                Số lượng repository cần tạo
              </label>
              <div className="flex items-center gap-2">
                <div className="inline-flex items-center gap-1 rounded-lg bg-slate-100 dark:bg-slate-800/80 p-1">
                  {QUICK_COUNTS.map((preset) => {
                    const active = parsedForkCount === preset;
                    return (
                      <button
                        key={preset}
                        type="button"
                        disabled={submitting}
                        onClick={() => setForkCountInput(String(preset))}
                        className={`cursor-pointer rounded-md px-3 py-1.5 font-mono text-xs font-semibold tabular-nums transition-colors disabled:opacity-50 ${
                          active
                            ? 'bg-white dark:bg-[#0F172A] text-blue-600 dark:text-blue-400 shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                        }`}
                      >
                        {preset}
                      </button>
                    );
                  })}
                </div>
                <div className="relative flex-1">
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
                    aria-label="Số lượng tùy chỉnh (1-50)"
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#090D16] px-3 py-2 font-mono text-xs font-semibold tabular-nums text-slate-900 dark:text-slate-100 focus:border-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 disabled:opacity-60"
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-slate-400">
                    tối đa {MAX_BATCH_FORK_COUNT}
                  </span>
                </div>
              </div>
            </div>

            {/* 3. Repository Name */}
            <div className="space-y-1.5">
              <label
                htmlFor="fork-repo-name"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                Tên Repository{' '}
                <span className="font-normal text-slate-400">(không bắt buộc)</span>
              </label>
              <div className="relative">
                <input
                  id="fork-repo-name"
                  type="text"
                  disabled={submitting}
                  value={repoName}
                  onChange={(e) => setRepoName(e.target.value)}
                  placeholder="Để trống để tự sinh tên ngẫu nhiên (16 ký tự)"
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#090D16] pl-3 pr-24 py-2 font-mono text-xs text-slate-900 dark:text-slate-100 placeholder:font-sans placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 disabled:opacity-60"
                />
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setRepoName(generateRandomRepoName(16))}
                  className="cursor-pointer absolute right-1.5 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-1 text-[11px] font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors"
                >
                  <Dices className="h-3 w-3" />
                  Random
                </button>
              </div>
              {parsedForkCount > 1 && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {repoName.trim()
                    ? `Sẽ tự động gắn hậu tố: ${repoName.trim()}-1 … ${repoName.trim()}-${parsedForkCount}`
                    : `Mỗi repo trong ${parsedForkCount} repo sẽ được sinh tên ngẫu nhiên riêng biệt.`}
                </p>
              )}
            </div>

            {/* 4. Optional custom domain (only when creating 1 repo) */}
            {parsedForkCount === 1 && (
              <div className="space-y-1.5">
                <label
                  htmlFor="fork-domain"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300"
                >
                  Domain tùy chỉnh{' '}
                  <span className="font-normal text-slate-400">(không bắt buộc)</span>
                </label>
                <input
                  id="fork-domain"
                  type="text"
                  disabled={submitting}
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  placeholder="Để trống nếu muốn gắn domain sau bằng Default Config"
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#090D16] px-3 py-2 font-mono text-xs text-slate-900 dark:text-slate-100 placeholder:font-sans placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 disabled:opacity-60"
                />
              </div>
            )}

            {/* 5. Collapsible Advanced Fork Options */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 overflow-hidden">
              <button
                type="button"
                onClick={() => setShowAdvanced((prev) => !prev)}
                className="cursor-pointer w-full flex items-center justify-between gap-2 px-3.5 py-2.5 text-left text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100/70 dark:hover:bg-slate-800/50 transition-colors"
              >
                <span className="flex items-center gap-2 min-w-0">
                  <span>Tùy chọn nguồn Fork</span>
                  <span className="truncate font-mono text-[11px] font-normal text-slate-500 dark:text-slate-400">
                    ({sourceRepo.replace(/^https?:\/\/github\.com\//i, '')}
                    {defaultBranchOnly ? ' · nhánh mặc định' : ' · tất cả nhánh'})
                  </span>
                </span>
                <ChevronDown
                  className={`h-4 w-4 text-slate-400 shrink-0 transition-transform duration-150 ${
                    showAdvanced ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {showAdvanced && (
                <div className="border-t border-slate-200 dark:border-slate-800 px-3.5 py-3.5 space-y-3 bg-white dark:bg-[#0F172A]/60">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <label
                        htmlFor="fork-source-repo"
                        className="text-xs font-medium text-slate-700 dark:text-slate-300"
                      >
                        Repository nguồn
                      </label>
                      {isForkOptionsModified && (
                        <button
                          type="button"
                          onClick={handleResetForkDefaults}
                          className="cursor-pointer inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          <RotateCcw className="h-3 w-3" />
                          Mặc định
                        </button>
                      )}
                    </div>
                    <input
                      id="fork-source-repo"
                      type="text"
                      disabled={submitting}
                      value={sourceRepo}
                      onChange={(e) => setSourceRepo(e.target.value)}
                      placeholder={DEFAULT_SOURCE_REPO}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#090D16] px-3 py-2 font-mono text-xs text-slate-900 dark:text-slate-100 focus:border-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 disabled:opacity-60"
                    />
                  </div>

                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      disabled={submitting}
                      checked={defaultBranchOnly}
                      onChange={(e) => setDefaultBranchOnly(e.target.checked)}
                      className="h-3.5 w-3.5 rounded border-slate-300 dark:border-slate-700 accent-blue-600"
                    />
                    <span className="text-xs text-slate-700 dark:text-slate-300">
                      Chỉ fork nhánh mặc định (nhanh hơn)
                    </span>
                  </label>
                </div>
              )}
            </div>

            {/* Single fork success card */}
            {singleResult && (
              <div className="rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/70 dark:bg-emerald-950/25 p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2 min-w-0">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-emerald-900 dark:text-emerald-200">
                        Tạo repository thành công
                      </p>
                      <a
                        href={
                          singleResult.result.htmlUrl ||
                          buildGitHubRepoUrl(
                            singleResult.result.fullRepository ||
                              `${singleResult.result.org || activeOrg}/${singleResult.result.repoName || singleResult.submittedName}`
                          )
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-0.5 inline-flex items-center gap-1 font-mono text-xs text-blue-600 dark:text-blue-400 hover:underline break-all"
                      >
                        <span>
                          {singleResult.result.fullRepository ||
                            `${singleResult.result.org || activeOrg}/${singleResult.result.repoName || singleResult.submittedName}`}
                        </span>
                        <ExternalLink className="h-3 w-3 shrink-0" />
                      </a>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const org = singleResult.result.org || activeOrg;
                      const name = singleResult.result.repoName || singleResult.submittedName;
                      onClose();
                      onOpenDefaultConfig(org, name, singleResult.result.domain);
                    }}
                    className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 px-3 py-1.5 text-xs font-medium text-white transition-colors whitespace-nowrap shrink-0"
                  >
                    <Settings2 className="h-3.5 w-3.5" />
                    Gắn domain
                  </button>
                </div>
              </div>
            )}

            {/* Batch fork live progress */}
            {forkBatchState && forkBatchState.total > 1 && (
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-[#090D16] p-3.5 space-y-2.5">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    {submitting
                      ? stoppingForkBatch
                        ? 'Đang dừng sau repo hiện tại...'
                        : `Đang tạo (${forkBatchState.completed}/${forkBatchState.total})`
                      : forkBatchState.stopped
                        ? `Đã dừng (${forkBatchState.completed}/${forkBatchState.total})`
                        : `Hoàn tất (${forkBatchState.completed}/${forkBatchState.total})`}
                  </span>
                  <span className="font-mono text-[11px] tabular-nums text-slate-600 dark:text-slate-400">
                    OK:{' '}
                    <strong className="text-emerald-700 dark:text-emerald-400">
                      {forkBatchState.success}
                    </strong>{' '}
                    · Lỗi:{' '}
                    <strong className="text-red-700 dark:text-red-400">
                      {forkBatchState.failed}
                    </strong>
                  </span>
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
                  <div className="max-h-40 overflow-y-auto divide-y divide-slate-200/70 dark:divide-slate-800 text-[11px]">
                    {forkBatchState.items.map((item) => {
                      const repoHref =
                        item.htmlUrl ||
                        (item.fullRepository ? buildGitHubRepoUrl(item.fullRepository) : null);
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
                            <span
                              className="text-red-600 dark:text-red-400 truncate max-w-[180px]"
                              title={item.message}
                            >
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

          {/* Footer */}
          <div className="flex items-center justify-end gap-2.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 px-6 py-3.5 shrink-0">
            {submitting && forkBatchState && forkBatchState.total > 1 ? (
              <button
                type="button"
                onClick={handleStopBatchFork}
                disabled={stoppingForkBatch}
                className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-4 py-2 text-xs font-medium text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/50 disabled:opacity-50 transition-colors"
              >
                <Square className="h-3.5 w-3.5" />
                {stoppingForkBatch ? 'Đang dừng...' : 'Dừng tạo hàng loạt'}
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
                  disabled={submitting || !activeOrg}
                  className="cursor-pointer inline-flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 px-4 py-2 text-xs font-medium text-white disabled:opacity-60 transition-colors"
                >
                  {submitting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <GitFork className="h-3.5 w-3.5" />
                  )}
                  {submitting
                    ? forkBatchState && forkBatchState.total > 1
                      ? `Đang tạo ${forkBatchState.completed}/${forkBatchState.total}...`
                      : 'Đang tạo Fork...'
                    : parsedForkCount > 1
                      ? `Tạo ${parsedForkCount} Repository`
                      : 'Tạo Repository'}
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
