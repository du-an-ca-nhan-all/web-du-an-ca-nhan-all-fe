import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { AlertCircle, Eye, EyeOff, KeyRound, Loader2, Plus, Shield, X } from 'lucide-react';
import { ApiClientError, executeApi, useBackendClient } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

interface AddTokenModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  onAuthFailure: (message: string) => void;
}

export function AddTokenModal({ open, onClose, onCreated, onAuthFailure }: AddTokenModalProps) {
  const { serverConfig } = useAuth();
  const { v1 } = useBackendClient();
  const { notify } = useToast();

  const [tokenInput, setTokenInput] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [isSuperToken, setIsSuperToken] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setTokenInput('');
    setShowToken(false);
    setIsSuperToken(false);
    setError(null);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !creating) onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, creating, onClose]);

  if (!open) return null;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    const trimmed = tokenInput.trim();
    if (!trimmed) {
      setError('Vui lòng nhập GitHub Personal Access Token hoặc Fine-grained token.');
      return;
    }

    setCreating(true);
    try {
      const created = await executeApi(
        v1.createToken({
          token: trimmed,
          isSuperToken,
        }),
        serverConfig.useProxy
      );
      notify({
        tone: 'success',
        title: 'Đã thêm GitHub token',
        description: created.accountUsername
          ? `@${created.accountUsername} (${created.tokenPreview || created.id})`
          : created.tokenPreview || created.id || 'Lưu token thành công',
      });
      onCreated();
      onClose();
    } catch (err) {
      if (err instanceof ApiClientError && (err.status === 401 || err.status === 403)) {
        onAuthFailure(err.message);
        return;
      }
      setError(
        err instanceof ApiClientError
          ? err.message
          : 'Không thể thêm mới GitHub token. Kiểm tra lại tính hợp lệ của token.'
      );
    } finally {
      setCreating(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 backdrop-blur-[2px] p-4"
      onClick={() => {
        if (!creating) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-token-modal-title"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 px-6 py-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 shrink-0">
              <KeyRound className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h2
                id="add-token-modal-title"
                className="font-display text-base font-semibold text-slate-900 dark:text-slate-100 truncate"
              >
                Thêm GitHub Token
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                Hệ thống tự động xác thực và đồng bộ thông tin tài khoản
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={creating}
            aria-label="Đóng hộp thoại"
            className="cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-40 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50/75 dark:bg-red-950/35 px-3.5 py-2.5 text-xs text-red-900 dark:text-red-300"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label
              htmlFor="github-token-input"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300"
            >
              Personal Access Token <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                id="github-token-input"
                type={showToken ? 'text' : 'password'}
                required
                autoFocus
                autoComplete="off"
                disabled={creating}
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="ghp_... hoặc github_pat_..."
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#090D16] pl-3 pr-9 py-2.5 font-mono text-xs text-slate-900 dark:text-slate-100 placeholder:font-sans placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 disabled:opacity-60"
              />
              <button
                type="button"
                onClick={() => setShowToken((prev) => !prev)}
                aria-label={showToken ? 'Ẩn token' : 'Hiện token'}
                className="cursor-pointer absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <label className="flex items-start gap-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 p-3.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isSuperToken}
              disabled={creating}
              onChange={(e) => setIsSuperToken(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 dark:border-slate-700 accent-blue-600"
            />
            <div className="space-y-0.5">
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-800 dark:text-slate-200">
                <Shield className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                Đánh dấu là Super Token
              </span>
              <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                Dành cho token có quyền Đọc/Ghi toàn bộ organization và repository.
              </span>
            </div>
          </label>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={creating}
              className="cursor-pointer rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={creating}
              className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 px-4 py-2 text-xs font-medium text-white disabled:opacity-60 transition-colors"
            >
              {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              {creating ? 'Đang xác thực...' : 'Lưu Token'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
