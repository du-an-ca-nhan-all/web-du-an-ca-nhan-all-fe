import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Play,
  RotateCcw,
  Square,
  X,
  XCircle,
} from 'lucide-react';
import {
  ApiClientError,
  executeApi,
  useBackendClient,
  type GitHubRepoDefaultConfigRequest,
  type GitHubRepoDefaultConfigResponse,
  type RepositoryEntity,
  type RootDomainEntity,
} from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

interface BatchTargetRepo {
  key: string;
  org: string;
  repoName: string;
  fullRepository: string;
}

type ItemStatus = 'pending' | 'running' | 'success' | 'error' | 'skipped';

interface BatchItemResult {
  status: ItemStatus;
  domainUrl?: string;
  cname?: string;
  message?: string;
}

interface BatchDefaultConfigModalProps {
  open: boolean;
  candidates: RepositoryEntity[];
  fallbackOrg: string;
  scopeLabel: string;
  rootDomains: RootDomainEntity[];
  onClose: () => void;
  onProgressOrDone: () => void;
  onAuthFailure: (message: string) => void;
}

function buildTargetList(candidates: RepositoryEntity[], fallbackOrg: string): BatchTargetRepo[] {
  const result: BatchTargetRepo[] = [];
  const seen = new Set<string>();

  for (const repo of candidates) {
    if (repo.domain?.trim()) continue;
    const rawFull = (repo.fullRepository || '').trim();
    const org = (
      repo.org ||
      (rawFull.includes('/') ? rawFull.split('/')[0] : '') ||
      fallbackOrg
    ).trim();
    const repoName = (
      repo.repoName ||
      (rawFull.includes('/') ? rawFull.split('/').slice(1).join('/') : rawFull)
    ).trim();
    if (!org || !repoName) continue;

    const fullRepository = `${org}/${repoName}`;
    const key = fullRepository.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    result.push({ key, org, repoName, fullRepository });
  }

  return result;
}

function waitMs(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export function BatchDefaultConfigModal({
  open,
  candidates,
  fallbackOrg,
  scopeLabel,
  rootDomains,
  onClose,
  onProgressOrDone,
  onAuthFailure,
}: BatchDefaultConfigModalProps) {
  const { serverConfig } = useAuth();
  const { v1 } = useBackendClient();
  const { notify } = useToast();

  // Snapshot targets when modal opens so live parent refreshes during/after run don't mutate the visible progress list
  const [targets, setTargets] = useState<BatchTargetRepo[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [results, setResults] = useState<Record<string, BatchItemResult>>({});

  const [useCustomRootDomain, setUseCustomRootDomain] = useState(false);
  const [selectedRootDomainId, setSelectedRootDomainId] = useState('');
  const [customRootDomain, setCustomRootDomain] = useState('');
  const [delayMs, setDelayMs] = useState<number>(300);

  const [running, setRunning] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [hasFinishedRun, setHasFinishedRun] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const stopRequestedRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      stopRequestedRef.current = true;
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const list = buildTargetList(candidates, fallbackOrg);
    setTargets(list);
    setSelectedKeys(new Set(list.map((t) => t.key)));
    setResults({});
    setValidationError(null);
    setRunning(false);
    setStopping(false);
    setHasFinishedRun(false);
    stopRequestedRef.current = false;

    if (rootDomains.length > 0) {
      setUseCustomRootDomain(false);
      setSelectedRootDomainId(String(rootDomains[0].id ?? ''));
    } else {
      setUseCustomRootDomain(true);
      setSelectedRootDomainId('');
    }
    setCustomRootDomain('');
    // Only snapshot when modal transitions to open
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !running) {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, running, onClose]);

  const selectedEntity = useMemo(
    () => rootDomains.find((d) => String(d.id) === selectedRootDomainId),
    [rootDomains, selectedRootDomainId]
  );

  const previewRootDomain = (
    useCustomRootDomain || rootDomains.length === 0
      ? customRootDomain
      : selectedEntity?.domain || ''
  )
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/\/.*$/, '');

  if (!open) return null;

  const selectedTargets = targets.filter((t) => selectedKeys.has(t.key));
  const allSelected = targets.length > 0 && selectedKeys.size === targets.length;

  let successCount = 0;
  let errorCount = 0;
  let skippedCount = 0;
  let doneCount = 0;
  let runningTargetKey: string | null = null;

  for (const t of targets) {
    const r = results[t.key];
    if (!r) continue;
    if (r.status === 'running') runningTargetKey = t.key;
    if (r.status === 'success') {
      successCount += 1;
      doneCount += 1;
    } else if (r.status === 'error') {
      errorCount += 1;
      doneCount += 1;
    } else if (r.status === 'skipped') {
      skippedCount += 1;
    }
  }

  const totalToProcess = Object.keys(results).length || selectedTargets.length;
  const progressPercent =
    totalToProcess > 0 ? Math.min(100, Math.round((doneCount / totalToProcess) * 100)) : 0;

  const toggleAll = () => {
    if (running) return;
    if (allSelected) {
      setSelectedKeys(new Set());
    } else {
      setSelectedKeys(new Set(targets.map((t) => t.key)));
    }
  };

  const toggleOne = (key: string) => {
    if (running) return;
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const buildPayload = (): GitHubRepoDefaultConfigRequest | null => {
    const payload: GitHubRepoDefaultConfigRequest = {};
    if (useCustomRootDomain || rootDomains.length === 0) {
      const clean = customRootDomain
        .trim()
        .replace(/^https?:\/\//i, '')
        .replace(/\/.*$/, '');
      if (!clean) {
        setValidationError('Vui lòng nhập hoặc chọn một root domain trước khi chạy.');
        return null;
      }
      payload.rootDomain = clean;
      return payload;
    }

    if (selectedEntity?.id !== undefined) {
      payload.rootDomainId = selectedEntity.id;
      if (selectedEntity.domain) {
        payload.rootDomain = selectedEntity.domain;
      }
      return payload;
    }

    setValidationError('Vui lòng chọn một root domain hợp lệ.');
    return null;
  };

  const runBatch = async (queue: BatchTargetRepo[]) => {
    setValidationError(null);
    if (queue.length === 0) {
      setValidationError('Chưa có repository nào được chọn để cấu hình.');
      return;
    }

    const payload = buildPayload();
    if (!payload) return;

    stopRequestedRef.current = false;
    setRunning(true);
    setStopping(false);
    setHasFinishedRun(false);

    // Initialize queued items to pending (preserve earlier successes when retrying failed items)
    setResults((prev) => {
      const next: Record<string, BatchItemResult> = { ...prev };
      for (const item of queue) {
        next[item.key] = { status: 'pending' };
      }
      return next;
    });

    let localSuccess = 0;
    let localError = 0;
    let abortedByStop = false;

    for (let i = 0; i < queue.length; i++) {
      const item = queue[i];

      if (stopRequestedRef.current || !mountedRef.current) {
        abortedByStop = true;
        if (mountedRef.current) {
          setResults((prev) => {
            const next = { ...prev };
            for (let j = i; j < queue.length; j++) {
              next[queue[j].key] = { status: 'skipped', message: 'Đã dừng bởi người dùng' };
            }
            return next;
          });
        }
        break;
      }

      setResults((prev) => ({
        ...prev,
        [item.key]: { status: 'running' },
      }));

      try {
        const res: GitHubRepoDefaultConfigResponse = await executeApi(
          v1.configureDefaultRepo(
            {
              org: encodeURIComponent(item.org),
              repo: encodeURIComponent(item.repoName),
            },
            payload
          ),
          serverConfig.useProxy
        );

        localSuccess += 1;
        if (mountedRef.current) {
          setResults((prev) => ({
            ...prev,
            [item.key]: {
              status: 'success',
              domainUrl: res.domainUrl || (res.cname ? `https://${res.cname}` : undefined),
              cname: res.cname,
              message: res.message || 'Cấu hình thành công',
            },
          }));
        }
      } catch (err) {
        if (err instanceof ApiClientError && (err.status === 401 || err.status === 403)) {
          if (mountedRef.current) {
            setRunning(false);
            setStopping(false);
          }
          onAuthFailure(err.message);
          return;
        }

        localError += 1;
        if (mountedRef.current) {
          setResults((prev) => ({
            ...prev,
            [item.key]: {
              status: 'error',
              message:
                err instanceof ApiClientError
                  ? err.message
                  : 'Lỗi không xác định khi chạy default-config.',
            },
          }));
        }
      }

      if (i < queue.length - 1 && delayMs > 0 && !stopRequestedRef.current && mountedRef.current) {
        await waitMs(delayMs);
      }
    }

    if (!mountedRef.current) return;

    setRunning(false);
    setStopping(false);
    setHasFinishedRun(true);

    if (localSuccess > 0) {
      onProgressOrDone();
    }

    notify({
      tone: localError === 0 && !abortedByStop ? 'success' : localSuccess > 0 ? 'info' : 'error',
      title: abortedByStop
        ? 'Đã dừng cấu hình hàng loạt'
        : 'Hoàn tất cấu hình Default Config hàng loạt',
      description: `Thành công: ${localSuccess} · Lỗi: ${localError}${
        abortedByStop ? ' · Đã dừng giữa chừng' : ''
      }`,
    });
  };

  const handleStop = () => {
    stopRequestedRef.current = true;
    setStopping(true);
  };

  const failedTargets = targets.filter((t) => {
    const status = results[t.key]?.status;
    return status === 'error' || status === 'skipped';
  });

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/45 dark:bg-black/65 p-4"
      onClick={() => {
        if (!running) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="batch-default-config-title"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 px-6 py-4 shrink-0">
          <div className="min-w-0">
            <h2
              id="batch-default-config-title"
              className="font-display text-base font-semibold text-slate-900 dark:text-slate-100 truncate"
            >
              Chạy nhanh Default Config hàng loạt ({targets.length} repo chưa có domain)
            </h2>
            <p className="mt-0.5 font-mono text-[11px] text-slate-500 dark:text-slate-400 truncate">
              Phạm vi: {scopeLabel} · Tuần tự gọi POST /v1/github/orgs/{'{org}'}/repos/{'{repo}'}/default-config
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={running}
            aria-label="Đóng hộp thoại"
            className="rounded-lg border border-slate-200 dark:border-slate-800 p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {validationError && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50/75 dark:bg-red-950/35 px-3.5 py-2.5 text-xs text-red-900 dark:text-red-300"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Root domain & delay controls */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
            <div className="sm:col-span-8 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <label
                  htmlFor="batch-root-domain"
                  className="text-xs font-medium text-slate-700 dark:text-slate-300"
                >
                  Root Domain áp dụng <span className="text-red-600">*</span>
                </label>
                {rootDomains.length > 0 && (
                  <button
                    type="button"
                    disabled={running}
                    onClick={() => setUseCustomRootDomain((prev) => !prev)}
                    className="text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 disabled:opacity-50 transition-colors"
                  >
                    {useCustomRootDomain ? 'Chọn từ danh sách' : 'Nhập tay'}
                  </button>
                )}
              </div>

              {useCustomRootDomain || rootDomains.length === 0 ? (
                <input
                  id="batch-root-domain"
                  type="text"
                  disabled={running}
                  value={customRootDomain}
                  onChange={(e) => setCustomRootDomain(e.target.value)}
                  placeholder="Ví dụ: quickgg.top"
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#090D16] px-3 py-2 font-mono text-xs text-slate-900 dark:text-slate-100 placeholder:font-sans placeholder:text-slate-400 disabled:opacity-60 focus:border-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30"
                />
              ) : (
                <select
                  id="batch-root-domain"
                  disabled={running}
                  value={selectedRootDomainId}
                  onChange={(e) => setSelectedRootDomainId(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#090D16] px-3 py-2 font-mono text-xs text-slate-900 dark:text-slate-100 disabled:opacity-60 focus:border-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30"
                >
                  {rootDomains.map((item) => (
                    <option key={item.id ?? item.domain} value={String(item.id ?? '')}>
                      #{item.id} · {item.domain}
                      {item.description ? ` (${item.description})` : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="sm:col-span-4 space-y-1.5">
              <label
                htmlFor="batch-delay"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                Khoảng nghỉ giữa mỗi repo
              </label>
              <select
                id="batch-delay"
                disabled={running}
                value={String(delayMs)}
                onChange={(e) => setDelayMs(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#090D16] px-3 py-2 font-mono text-xs text-slate-900 dark:text-slate-100 disabled:opacity-60 focus:border-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30"
              >
                <option value="0">0 ms (nhanh nhất)</option>
                <option value="300">300 ms (khuyên dùng)</option>
                <option value="1000">1000 ms (an toàn rate-limit)</option>
              </select>
            </div>
          </div>

          {previewRootDomain && (
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090D16] px-3.5 py-2 text-xs text-slate-600 dark:text-slate-400">
              Cấu trúc domain sẽ gắn:{' '}
              <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">
                https://{'{repoName}'}.{previewRootDomain}
              </span>
            </div>
          )}

          {/* Progress summary bar */}
          {(running || hasFinishedRun || doneCount > 0) && (
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/50 p-3.5 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-medium text-slate-900 dark:text-slate-100">
                  {running
                    ? stopping
                      ? 'Đang dừng sau repository hiện tại...'
                      : `Đang cấu hình (${doneCount}/${totalToProcess})...`
                    : 'Tiến trình thực thi'}
                </span>
                <span className="font-mono text-[11px] tabular-nums text-slate-600 dark:text-slate-400">
                  Thành công: <strong className="text-emerald-700 dark:text-emerald-400">{successCount}</strong> · Lỗi:{' '}
                  <strong className="text-red-700 dark:text-red-400">{errorCount}</strong>
                  {skippedCount > 0 ? ` · Bỏ qua: ${skippedCount}` : ''} · {progressPercent}%
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                <div
                  className="h-full bg-blue-600 dark:bg-blue-500 transition-all duration-200"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* Target list */}
          <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 px-4 py-2.5 text-xs">
              <label className="inline-flex items-center gap-2 font-medium text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={allSelected}
                  disabled={running || targets.length === 0}
                  onChange={toggleAll}
                  className="h-3.5 w-3.5 rounded border-slate-300 dark:border-slate-700 accent-blue-600"
                />
                <span>
                  Chọn tất cả ({selectedTargets.length}/{targets.length})
                </span>
              </label>
              <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                Trạng thái thực thi
              </span>
            </div>

            {targets.length === 0 ? (
              <div className="px-4 py-8 text-center text-xs text-slate-500 dark:text-slate-400">
                Tất cả repository trong phạm vi hiện tại đều đã có domain.
              </div>
            ) : (
              <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80">
                {targets.map((item) => {
                  const checked = selectedKeys.has(item.key);
                  const res = results[item.key];
                  const isCurrent = runningTargetKey === item.key;

                  return (
                    <div
                      key={item.key}
                      className={`flex items-center justify-between gap-3 px-4 py-2.5 text-xs transition-colors ${
                        isCurrent ? 'bg-blue-50/60 dark:bg-blue-950/25' : ''
                      }`}
                    >
                      <label className="flex min-w-0 items-start gap-2.5 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={running}
                          onChange={() => toggleOne(item.key)}
                          className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 dark:border-slate-700 accent-blue-600 shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="font-mono font-semibold text-slate-900 dark:text-slate-100 truncate">
                            {item.repoName}
                          </p>
                          <p className="font-mono text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            {item.fullRepository}
                          </p>
                          {res?.status === 'error' && res.message && (
                            <p className="mt-0.5 text-[11px] text-red-700 dark:text-red-400 break-words">
                              {res.message}
                            </p>
                          )}
                        </div>
                      </label>

                      <div className="shrink-0 text-right">
                        {!res ? (
                          <span className="text-[11px] text-slate-400 dark:text-slate-500">
                            {checked ? 'Sẵn sàng' : 'Không chọn'}
                          </span>
                        ) : res.status === 'pending' ? (
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">
                            Đang chờ...
                          </span>
                        ) : res.status === 'running' ? (
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-blue-600 dark:text-blue-400">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Đang cấu hình...
                          </span>
                        ) : res.status === 'success' ? (
                          <div className="inline-flex flex-col items-end">
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Thành công
                            </span>
                            {res.domainUrl && (
                              <a
                                href={res.domainUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-0.5 inline-flex items-center gap-1 font-mono text-[11px] text-blue-600 dark:text-blue-400 hover:underline"
                              >
                                <span>{res.cname || res.domainUrl}</span>
                                <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                              </a>
                            )}
                          </div>
                        ) : res.status === 'error' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-red-700 dark:text-red-400">
                            <XCircle className="h-3.5 w-3.5" />
                            Thất bại
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">
                            Đã bỏ qua
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 dark:border-slate-800 px-6 py-4 shrink-0">
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            {running
              ? 'Vui lòng giữ hộp thoại mở trong lúc vòng lặp đang chạy.'
              : 'Mỗi repository sẽ được tạo 404.html, CNAME và bật GitHub Pages.'}
          </div>

          <div className="flex items-center gap-2">
            {running ? (
              <button
                type="button"
                onClick={handleStop}
                disabled={stopping}
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-3.5 py-2 text-xs font-medium text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/50 disabled:opacity-50 transition-colors"
              >
                <Square className="h-3.5 w-3.5" />
                {stopping ? 'Đang dừng...' : 'Dừng vòng lặp'}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  {hasFinishedRun ? 'Đóng' : 'Hủy'}
                </button>

                {hasFinishedRun && failedTargets.length > 0 && (
                  <button
                    type="button"
                    onClick={() => void runBatch(failedTargets)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 px-3.5 py-2 text-xs font-medium text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Chạy lại mục lỗi ({failedTargets.length})
                  </button>
                )}

                <button
                  type="button"
                  disabled={selectedTargets.length === 0}
                  onClick={() => void runBatch(selectedTargets)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 px-4 py-2 text-xs font-medium text-white disabled:opacity-50 transition-colors"
                >
                  <Play className="h-3.5 w-3.5" />
                  {hasFinishedRun
                    ? `Chạy lại (${selectedTargets.length} repo)`
                    : `Bắt đầu chạy (${selectedTargets.length} repo)`}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
