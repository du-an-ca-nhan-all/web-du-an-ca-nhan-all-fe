import { useState } from 'react';
import type { FormEvent } from 'react';
import {
  AlertCircle,
  ExternalLink,
  Globe,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import {
  ApiClientError,
  executeApi,
  useBackendClient,
  type RootDomainEntity,
} from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { formatDateTime } from '../../utils/format';

interface RootDomainsPanelProps {
  rootDomains: RootDomainEntity[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  onAuthFailure: (message: string) => void;
}

function normalizeRootDomainInput(raw: string): string {
  return raw
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/\/.*$/, '')
    .toLowerCase();
}

export function RootDomainsPanel({
  rootDomains,
  loading,
  error,
  onRefresh,
  onAuthFailure,
}: RootDomainsPanelProps) {
  const { serverConfig } = useAuth();
  const { v1 } = useBackendClient();
  const { notify } = useToast();

  const [domainInput, setDomainInput] = useState('');
  const [descriptionInput, setDescriptionInput] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    setCreateError(null);

    const normalized = normalizeRootDomainInput(domainInput);
    if (!normalized || !/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(normalized)) {
      setCreateError('Vui lòng nhập root domain hợp lệ (ví dụ: quickgg.top).');
      return;
    }

    setCreating(true);
    try {
      const created = await executeApi(
        v1.createRootDomain({
          domain: normalized,
          ...(descriptionInput.trim() ? { description: descriptionInput.trim() } : {}),
        }),
        serverConfig.useProxy
      );
      setDomainInput('');
      setDescriptionInput('');
      notify({
        tone: 'success',
        title: 'Đã thêm root domain',
        description: created?.domain || normalized,
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
          : 'Không thể thêm mới root domain. Vui lòng thử lại.'
      );
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (item: RootDomainEntity) => {
    if (item.id === undefined) return;
    setDeletingId(item.id);
    setDeleteError(null);
    try {
      await executeApi(v1.deleteRootDomain({ id: item.id }), serverConfig.useProxy);
      setConfirmDeleteId(null);
      notify({
        tone: 'info',
        title: 'Đã xóa root domain',
        description: item.domain ? `${item.domain} (#${item.id})` : `ID #${item.id}`,
      });
      onRefresh();
    } catch (err) {
      if (err instanceof ApiClientError && (err.status === 401 || err.status === 403)) {
        onAuthFailure(err.message);
        return;
      }
      setDeleteError(
        err instanceof ApiClientError
          ? err.message
          : 'Không thể xóa root domain này.'
      );
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
      {/* Left: Add Root Domain form */}
      <section className="xl:col-span-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] p-6 space-y-5">
        <div>
          <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
            Thêm Root Domain
          </h2>
          <p className="mt-0.5 font-mono text-[11px] text-slate-500 dark:text-slate-400">
            POST /v1/github/root-domains
          </p>
        </div>

        <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
          Root domain được dùng làm tên miền gốc khi cấu hình Default Config cho repository (tự động
          tạo file <span className="font-mono text-slate-800 dark:text-slate-200">CNAME</span> dạng{' '}
          <span className="font-mono text-slate-800 dark:text-slate-200">{'{repo}'}.{'{rootDomain}'}</span>).
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
              htmlFor="root-domain-input"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300"
            >
              Root domain <span className="text-red-600">*</span>
            </label>
            <input
              id="root-domain-input"
              type="text"
              required
              value={domainInput}
              onChange={(e) => setDomainInput(e.target.value)}
              placeholder="Ví dụ: quickgg.top"
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#090D16] px-3 py-2 font-mono text-xs text-slate-900 dark:text-slate-100 placeholder:font-sans placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="root-domain-desc"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300"
            >
              Mô tả (tùy chọn)
            </label>
            <input
              id="root-domain-desc"
              type="text"
              value={descriptionInput}
              onChange={(e) => setDescriptionInput(e.target.value)}
              placeholder="Ví dụ: Root domain chính cho CDN GitHub Pages"
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#090D16] px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30"
            />
          </div>

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
            {creating ? 'Đang lưu root domain...' : 'Thêm root domain'}
          </button>
        </form>
      </section>

      {/* Right: Root Domains list table */}
      <section className="xl:col-span-7 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A]">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 px-5 py-3.5">
          <div className="min-w-0">
            <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
              Danh sách Root Domain
            </h2>
            <p className="mt-0.5 font-mono text-[11px] tabular-nums text-slate-500 dark:text-slate-400">
              GET /v1/github/root-domains · {rootDomains.length} bản ghi
            </p>
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

        {(error || deleteError) && (
          <div
            role="alert"
            className="mx-5 my-4 flex items-start gap-2 rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50/75 dark:bg-red-950/35 px-3.5 py-2.5 text-xs text-red-800 dark:text-red-300"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{deleteError || error}</span>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 text-xs font-medium text-slate-600 dark:text-slate-400">
                <th className="py-3 pl-5 pr-3 w-16 text-right whitespace-nowrap">ID</th>
                <th className="py-3 px-4 whitespace-nowrap">Root Domain</th>
                <th className="py-3 px-4 whitespace-nowrap">Mô tả</th>
                <th className="py-3 px-4 whitespace-nowrap">Ngày tạo</th>
                <th className="py-3 pl-4 pr-5 text-right whitespace-nowrap">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
              {loading && rootDomains.length === 0 ? (
                Array.from({ length: 3 }).map((_, idx) => (
                  <tr key={idx} className="h-[46px]">
                    <td className="py-3 pl-5 pr-3 text-right">
                      <div className="ml-auto h-3.5 w-8 rounded bg-slate-200/80 dark:bg-slate-800 animate-pulse" />
                    </td>
                    <td className="py-3 px-4">
                      <div className="h-3.5 w-36 rounded bg-slate-200/80 dark:bg-slate-800 animate-pulse" />
                    </td>
                    <td className="py-3 px-4">
                      <div className="h-3.5 w-44 rounded bg-slate-200/80 dark:bg-slate-800 animate-pulse" />
                    </td>
                    <td className="py-3 px-4">
                      <div className="h-3.5 w-28 rounded bg-slate-200/80 dark:bg-slate-800 animate-pulse" />
                    </td>
                    <td className="py-3 pl-4 pr-5 text-right">
                      <div className="ml-auto h-3.5 w-14 rounded bg-slate-200/80 dark:bg-slate-800 animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : rootDomains.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <Globe className="mx-auto h-5 w-5 text-slate-400" />
                    <p className="mt-2 font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
                      Chưa có root domain nào
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Thêm root domain đầu tiên bên trái để dùng cho tính năng Default Config.
                    </p>
                  </td>
                </tr>
              ) : (
                rootDomains.map((item) => {
                  const isConfirming = confirmDeleteId === item.id;
                  const isDeleting = deletingId === item.id;
                  const href = item.domain ? `https://${item.domain.replace(/^https?:\/\//i, '')}` : null;

                  return (
                    <tr
                      key={item.id ?? item.domain}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/45 transition-colors"
                    >
                      <td className="py-3 pl-5 pr-3 text-right font-mono tabular-nums text-slate-500 dark:text-slate-400">
                        {item.id ?? '—'}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {href ? (
                          <a
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 font-mono font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            <span>{item.domain}</span>
                            <ExternalLink className="h-3 w-3 shrink-0" />
                          </a>
                        ) : (
                          <span className="font-mono text-slate-800 dark:text-slate-200">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                        {item.description || '—'}
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {formatDateTime(item.createdAt)}
                      </td>
                      <td className="py-3 pl-4 pr-5 text-right whitespace-nowrap">
                        {item.id !== undefined ? (
                          isConfirming ? (
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleDelete(item)}
                                disabled={isDeleting}
                                className="inline-flex items-center gap-1 rounded-md bg-red-600 hover:bg-red-700 px-2.5 py-1 text-xs font-medium text-white disabled:opacity-60 transition-colors"
                              >
                                {isDeleting && <Loader2 className="h-3 w-3 animate-spin" />}
                                Xác nhận
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
                              onClick={() => setConfirmDeleteId(item.id!)}
                              className="inline-flex items-center gap-1 rounded-md border border-slate-200 dark:border-slate-800 px-2.5 py-1 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/35 transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Xóa
                            </button>
                          )
                        ) : (
                          '—'
                        )}
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
