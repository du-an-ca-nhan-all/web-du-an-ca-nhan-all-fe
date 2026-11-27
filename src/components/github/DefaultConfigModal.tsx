import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Settings2,
  X,
} from 'lucide-react';
import {
  ApiClientError,
  executeApi,
  useBackendClient,
  type GitHubRepoDefaultConfigRequest,
  type GitHubRepoDefaultConfigResponse,
  type RootDomainEntity,
} from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export interface DefaultConfigTarget {
  org: string;
  repoName: string;
  currentDomain?: string | null;
}

interface DefaultConfigModalProps {
  target: DefaultConfigTarget | null;
  rootDomains: RootDomainEntity[];
  onClose: () => void;
  onConfigured: (result: GitHubRepoDefaultConfigResponse) => void;
  onAuthFailure: (message: string) => void;
}

export function DefaultConfigModal({
  target,
  rootDomains,
  onClose,
  onConfigured,
  onAuthFailure,
}: DefaultConfigModalProps) {
  const { serverConfig } = useAuth();
  const { v1 } = useBackendClient();
  const { notify } = useToast();

  const [useCustomRootDomain, setUseCustomRootDomain] = useState(false);
  const [selectedRootDomainId, setSelectedRootDomainId] = useState<string>('');
  const [customRootDomain, setCustomRootDomain] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GitHubRepoDefaultConfigResponse | null>(null);

  useEffect(() => {
    if (!target) return;
    setError(null);
    setResult(null);
    setCustomRootDomain('');

    if (rootDomains.length > 0) {
      setUseCustomRootDomain(false);
      setSelectedRootDomainId(String(rootDomains[0].id ?? ''));
    } else {
      setUseCustomRootDomain(true);
      setSelectedRootDomainId('');
    }
  }, [target, rootDomains]);

  useEffect(() => {
    if (!target) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [target, onClose]);

  if (!target) return null;

  const selectedEntity = rootDomains.find((d) => String(d.id) === selectedRootDomainId);
  const previewRootDomain = (
    useCustomRootDomain ? customRootDomain : selectedEntity?.domain || ''
  )
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/\/.*$/, '');
  const previewCname = previewRootDomain ? `${target.repoName}.${previewRootDomain}` : null;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    const payload: GitHubRepoDefaultConfigRequest = {};
    if (useCustomRootDomain || rootDomains.length === 0) {
      const clean = customRootDomain
        .trim()
        .replace(/^https?:\/\//i, '')
        .replace(/\/.*$/, '');
      if (!clean) {
        setError('Vui lòng nhập hoặc chọn một root domain.');
        return;
      }
      payload.rootDomain = clean;
    } else if (selectedEntity?.id !== undefined) {
      payload.rootDomainId = selectedEntity.id;
      if (selectedEntity.domain) {
        payload.rootDomain = selectedEntity.domain;
      }
    } else {
      setError('Vui lòng chọn một root domain hợp lệ.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await executeApi(
        v1.configureDefaultRepo(
          {
            org: encodeURIComponent(target.org),
            repo: encodeURIComponent(target.repoName),
          },
          payload
        ),
        serverConfig.useProxy
      );
      setResult(response);
      notify({
        tone: 'success',
        title: 'Đã áp dụng Default Config',
        description: response.domainUrl || response.cname || `${target.org}/${target.repoName}`,
      });
      onConfigured(response);
    } catch (err) {
      if (err instanceof ApiClientError && (err.status === 401 || err.status === 403)) {
        onAuthFailure(err.message);
        return;
      }
      setError(
        err instanceof ApiClientError
          ? err.message
          : 'Không thể chạy cấu hình mặc định cho repository này.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/45 dark:bg-black/65 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="default-config-title"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 px-6 py-4">
          <div className="min-w-0">
            <h2
              id="default-config-title"
              className="font-display text-base font-semibold text-slate-900 dark:text-slate-100 truncate"
            >
              Default Config · {target.repoName}
            </h2>
            <p className="mt-0.5 font-mono text-[11px] text-slate-500 dark:text-slate-400 truncate">
              POST /v1/github/orgs/{target.org}/repos/{target.repoName}/default-config
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng hộp thoại"
            className="rounded-lg border border-slate-200 dark:border-slate-800 p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
            Hệ thống sẽ tự động tạo/đảm bảo nhánh cấu hình kèm trang <span className="font-mono">404.html</span>,
            tạo file <span className="font-mono">CNAME</span>, bật GitHub Pages và cập nhật domain mới vào database.
          </p>

          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50/75 dark:bg-red-950/35 px-3.5 py-2.5 text-xs text-red-900 dark:text-red-300"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <label
                  htmlFor="default-config-root-domain"
                  className="text-xs font-medium text-slate-700 dark:text-slate-300"
                >
                  Chọn Root Domain <span className="text-red-600">*</span>
                </label>
                {rootDomains.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setUseCustomRootDomain((prev) => !prev)}
                    className="text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                  >
                    {useCustomRootDomain ? 'Chọn từ danh sách' : 'Nhập tay'}
                  </button>
                )}
              </div>

              {useCustomRootDomain || rootDomains.length === 0 ? (
                <input
                  id="default-config-root-domain"
                  type="text"
                  required
                  value={customRootDomain}
                  onChange={(e) => setCustomRootDomain(e.target.value)}
                  placeholder="Ví dụ: quickgg.top"
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#090D16] px-3 py-2 font-mono text-xs text-slate-900 dark:text-slate-100 placeholder:font-sans placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30"
                />
              ) : (
                <select
                  id="default-config-root-domain"
                  value={selectedRootDomainId}
                  onChange={(e) => setSelectedRootDomainId(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#090D16] px-3 py-2 font-mono text-xs text-slate-900 dark:text-slate-100 focus:border-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30"
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

            {previewCname && (
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090D16] px-3.5 py-2.5 text-xs space-y-1">
                <p className="text-slate-500 dark:text-slate-400">Xem trước cấu hình CNAME &amp; Domain:</p>
                <p className="font-mono text-slate-900 dark:text-slate-100 break-all">
                  CNAME: <span className="font-semibold">{previewCname}</span>
                </p>
                <p className="font-mono text-blue-600 dark:text-blue-400 break-all">
                  URL: https://{previewCname}
                </p>
              </div>
            )}

            {result && (
              <div className="rounded-lg border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/25 p-4 space-y-3 text-xs">
                <div className="flex items-start gap-2 text-emerald-800 dark:text-emerald-300">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  <span className="font-semibold">
                    {result.message || 'Cấu hình mặc định thành công'}
                  </span>
                </div>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 border-t border-emerald-200/70 dark:border-emerald-900/50 pt-3">
                  <div>
                    <dt className="text-slate-500 dark:text-slate-400">Nhánh (branch)</dt>
                    <dd className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                      {result.branch || '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500 dark:text-slate-400">Trang 404.html</dt>
                    <dd className="font-medium text-slate-900 dark:text-slate-100">
                      {result.page404Ready ? 'Đã sẵn sàng' : 'Chưa bật'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500 dark:text-slate-400">File CNAME</dt>
                    <dd className="font-mono text-slate-900 dark:text-slate-100 break-all">
                      {result.cname || '—'} ({result.cnameConfigured ? 'OK' : 'Chưa'})
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500 dark:text-slate-400">GitHub Pages</dt>
                    <dd className="font-medium text-slate-900 dark:text-slate-100">
                      {result.githubPagesConfigured ? 'Đã cấu hình' : 'Chưa cấu hình'}
                    </dd>
                  </div>
                  {result.domainUrl && (
                    <div className="col-span-2 pt-1">
                      <dt className="text-slate-500 dark:text-slate-400">Domain URL</dt>
                      <dd className="mt-0.5">
                        <a
                          href={result.domainUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 font-mono text-blue-600 dark:text-blue-400 hover:underline break-all"
                        >
                          <span>{result.domainUrl}</span>
                          <ExternalLink className="h-3 w-3 shrink-0" />
                        </a>
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 border-t border-slate-200 dark:border-slate-800 pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                {result ? 'Đóng' : 'Hủy'}
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 px-4 py-2 text-xs font-medium text-white disabled:opacity-60 transition-colors"
              >
                {submitting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Settings2 className="h-3.5 w-3.5" />
                )}
                {submitting ? 'Đang cấu hình...' : result ? 'Chạy lại Default Config' : 'Áp dụng Default Config'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
