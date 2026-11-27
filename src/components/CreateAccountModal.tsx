import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import {
  AlertCircle,
  Check,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ApiClientError, registerAccount } from '../services/accountApi';
import type { AccountResponse } from '../types/api';
import { generateStrongPassword } from '../utils/format';

interface CreateAccountModalProps {
  open: boolean;
  knownServices: string[];
  onClose: () => void;
  onCreated: (account: AccountResponse) => void;
}

export function CreateAccountModal({
  open,
  knownServices,
  onClose,
  onCreated,
}: CreateAccountModalProps) {
  const { serverConfig } = useAuth();
  const { notify } = useToast();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [serviceCode, setServiceCode] = useState('');
  const [showPassword, setShowPassword] = useState(true);
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const resetForm = () => {
    setUsername('');
    setPassword('');
    setFullName('');
    setEmail('');
    setServiceCode('');
    setError(null);
  };

  const handleGeneratePassword = () => {
    setPassword(generateStrongPassword(14));
    setShowPassword(true);
  };

  const handleCopyPassword = async () => {
    if (!password) return;
    try {
      await navigator.clipboard.writeText(password);
      setCopiedPassword(true);
      window.setTimeout(() => setCopiedPassword(false), 1800);
    } catch {
      // Ignore clipboard failure
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    const trimmedUsername = username.trim();
    if (trimmedUsername.length < 4 || trimmedUsername.length > 50) {
      setError('Tên đăng nhập phải có độ dài từ 4 đến 50 ký tự.');
      return;
    }

    if (password.length < 6 || password.length > 100) {
      setError('Mật khẩu phải có ít nhất 6 ký tự (tối đa 100 ký tự).');
      return;
    }

    const trimmedEmail = email.trim();
    if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError('Định dạng email không hợp lệ.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await registerAccount(serverConfig, {
        username: trimmedUsername,
        password,
        email: trimmedEmail || undefined,
        fullName: fullName.trim() || undefined,
        serviceCode: serviceCode.trim() || undefined,
      });

      notify({
        tone: 'success',
        title: 'Đã tạo tài khoản mới',
        description: `Tài khoản ${response.account.username} đã sẵn sàng trong hệ thống.`,
      });
      resetForm();
      onCreated(response.account);
      onClose();
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : 'Không thể tạo tài khoản mới. Vui lòng thử lại.'
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
      aria-labelledby="create-account-title"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 px-6 py-4">
          <div>
            <h2
              id="create-account-title"
              className="font-display text-base font-semibold text-slate-900 dark:text-slate-100"
            >
              Tạo tài khoản mới
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Gọi <span className="font-mono">POST /v1/account/register</span> · Giữ nguyên phiên Super Admin hiện tại
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng hộp thoại"
            className="rounded-lg border border-slate-200 dark:border-slate-800 p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50/75 dark:bg-red-950/35 px-3.5 py-2.5 text-xs text-red-800 dark:text-red-300"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label
                htmlFor="reg-username"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                Tên đăng nhập <span className="text-red-600">*</span>
              </label>
              <input
                id="reg-username"
                type="text"
                required
                minLength={4}
                maxLength={50}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="nguyen_van_a"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#090D16] px-3 py-2 font-mono text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="reg-fullname"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                Họ và tên
              </label>
              <input
                id="reg-fullname"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Nguyễn Văn A"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#090D16] px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor="reg-password"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                Mật khẩu <span className="text-red-600">*</span>
              </label>
              <div className="flex items-center gap-3">
                {password && (
                  <button
                    type="button"
                    onClick={handleCopyPassword}
                    className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
                  >
                    {copiedPassword ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-600" />
                        Đã sao chép
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        Sao chép
                      </>
                    )}
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleGeneratePassword}
                  className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                >
                  <KeyRound className="h-3 w-3" />
                  Tạo ngẫu nhiên
                </button>
              </div>
            </div>
            <div className="relative">
              <input
                id="reg-password"
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                maxLength={100}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ít nhất 6 ký tự"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#090D16] pl-3 pr-9 py-2 font-mono text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label
                htmlFor="reg-email"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                Email (tùy chọn)
              </label>
              <input
                id="reg-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vana@example.com"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#090D16] px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="reg-service"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                Service khởi tạo (tùy chọn)
              </label>
              <input
                id="reg-service"
                type="text"
                list="register-service-suggestions"
                value={serviceCode}
                onChange={(e) => setServiceCode(e.target.value)}
                placeholder="Mặc định role USER nếu điền"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#090D16] px-3 py-2 font-mono text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30"
              />
              <datalist id="register-service-suggestions">
                {knownServices.map((svc) => (
                  <option key={svc} value={svc} />
                ))}
              </datalist>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 border-t border-slate-200 dark:border-slate-800 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 px-4 py-2 text-xs font-medium text-white disabled:opacity-60 transition-colors"
            >
              {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {submitting ? 'Đang tạo...' : 'Tạo tài khoản'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
