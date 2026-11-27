import { useState } from 'react';
import type { FormEvent } from 'react';
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Moon,
  ShieldAlert,
  ShieldCheck,
  Sun,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { ApiClientError } from '../services/accountApi';
import type { ApiServerConfig } from '../types/api';
import { ServerConfigControl } from './ServerConfigControl';

export function LoginView() {
  const { serverConfig, sessionNotice, clearSessionNotice, login, updateServerConfig } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [localServerConfig, setLocalServerConfig] = useState<ApiServerConfig>(serverConfig);
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [serviceCode, setServiceCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorState, setErrorState] = useState<{
    kind: 'access_denied' | 'error';
    message: string;
  } | null>(null);

  const handleServerChange = (next: ApiServerConfig) => {
    setLocalServerConfig(next);
    updateServerConfig(next);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setErrorState(null);
    clearSessionNotice();

    if (!usernameOrEmail.trim() || !password) {
      setErrorState({
        kind: 'error',
        message: 'Vui lòng nhập đầy đủ tên đăng nhập/email và mật khẩu.',
      });
      return;
    }

    setSubmitting(true);
    try {
      await login(
        {
          usernameOrEmail: usernameOrEmail.trim(),
          password,
          serviceCode: serviceCode.trim() || undefined,
        },
        localServerConfig
      );
    } catch (err) {
      if (err instanceof ApiClientError && err.code === 'NOT_SUPER_ADMIN') {
        setErrorState({
          kind: 'access_denied',
          message: err.message,
        });
      } else if (err instanceof ApiClientError) {
        setErrorState({
          kind: 'error',
          message: err.message,
        });
      } else {
        setErrorState({
          kind: 'error',
          message: 'Đã xảy ra lỗi không xác định khi đăng nhập. Vui lòng thử lại.',
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#090D16] text-slate-900 dark:text-slate-100 flex flex-col">
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A]">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-8 px-6">
          <span className="font-display text-base font-bold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap shrink-0">
            Super Admin Console
          </span>
          <button
            type="button"
            onClick={toggleTheme}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
          >
            {theme === 'dark' ? (
              <>
                <Sun className="h-3.5 w-3.5" />
                Giao diện Sáng
              </>
            ) : (
              <>
                <Moon className="h-3.5 w-3.5" />
                Giao diện Tối
              </>
            )}
          </button>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
          {/* Left column: clear operational scope & Super Admin policy */}
          <div className="lg:col-span-5 space-y-8 pt-2">
            <div className="space-y-3">
              <p className="text-xs font-medium text-blue-600 dark:text-blue-400">
                Web Du An Ca Nhan · Trung tâm xác thực
              </p>
              <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50 leading-tight [text-wrap:balance]">
                Quản trị tài khoản và phân quyền đa dịch vụ
              </h1>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                Cổng điều hành tập trung cho toàn bộ hệ sinh thái. Mọi thao tác quản lý người dùng,
                cấp phát và thu hồi vai trò dịch vụ đều đồng bộ trực tiếp qua JWT Bearer API.
              </p>
            </div>

            <div className="border-t border-slate-200 dark:border-slate-800 pt-6 space-y-4">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-4 w-4 text-slate-700 dark:text-slate-300 shrink-0" />
                <div className="space-y-0.5">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Giới hạn quyền Super Admin
                  </p>
                  <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                    Chỉ tài khoản có cờ <span className="font-mono text-slate-800 dark:text-slate-200">isSuperAdmin = true</span> mới
                    được phép mở phiên làm việc. Tài khoản thường sẽ bị từ chối tự động sau xác thực.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Lock className="mt-0.5 h-4 w-4 text-slate-700 dark:text-slate-300 shrink-0" />
                <div className="space-y-0.5">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Phạm vi quản trị hiện tại
                  </p>
                  <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                    Danh sách tài khoản · Tạo tài khoản mới · Gán &amp; gỡ Role theo Service · Danh mục Role toàn hệ thống.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right column: single-elevation flat login surface */}
          <div className="lg:col-span-7">
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] p-6 sm:p-8">
              <div className="mb-6">
                <h2 className="font-display text-xl font-semibold text-slate-900 dark:text-slate-100">
                  Đăng nhập quản trị viên
                </h2>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                  Xác thực qua endpoint <span className="font-mono">POST /v1/account/login</span>
                </p>
              </div>

              {sessionNotice && (
                <div
                  role="alert"
                  className="mb-5 flex items-start gap-2.5 rounded-lg border border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/30 px-3.5 py-3 text-xs text-amber-900 dark:text-amber-300"
                >
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{sessionNotice}</span>
                </div>
              )}

              {errorState && (
                <div
                  role="alert"
                  className="mb-5 flex items-start gap-2.5 rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50/80 dark:bg-red-950/40 px-3.5 py-3 text-xs text-red-900 dark:text-red-300"
                >
                  <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                  <div className="space-y-0.5">
                    <p className="font-semibold">
                      {errorState.kind === 'access_denied'
                        ? 'Từ chối quyền truy cập'
                        : 'Đăng nhập thất bại'}
                    </p>
                    <p className="leading-relaxed">{errorState.message}</p>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-1.5">
                  <label
                    htmlFor="login-identifier"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300"
                  >
                    Tên đăng nhập hoặc Email
                  </label>
                  <input
                    id="login-identifier"
                    type="text"
                    autoComplete="username"
                    required
                    value={usernameOrEmail}
                    onChange={(e) => setUsernameOrEmail(e.target.value)}
                    placeholder="superadmin hoặc admin@example.com"
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#090D16] px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="login-password"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300"
                  >
                    Mật khẩu
                  </label>
                  <div className="relative">
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Nhập mật khẩu tài khoản"
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#090D16] pl-3.5 pr-10 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <button
                    type="button"
                    onClick={() => setShowAdvanced((prev) => !prev)}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
                  >
                    {showAdvanced ? (
                      <ChevronUp className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5" />
                    )}
                    Tùy chọn serviceCode khi tạo token
                  </button>
                  {showAdvanced && (
                    <div className="mt-2.5 space-y-1.5">
                      <label
                        htmlFor="login-service-code"
                        className="block text-xs font-medium text-slate-700 dark:text-slate-300"
                      >
                        Mã dịch vụ (không bắt buộc)
                      </label>
                      <input
                        id="login-service-code"
                        type="text"
                        value={serviceCode}
                        onChange={(e) => setServiceCode(e.target.value)}
                        placeholder="Ví dụ: VIDEOS_MANAGE"
                        className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#090D16] px-3.5 py-2 font-mono text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 transition-colors"
                      />
                    </div>
                  )}
                </div>

                <div className="border-t border-slate-200 dark:border-slate-800 pt-5">
                  <ServerConfigControl value={localServerConfig} onChange={handleServerChange} compact />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#0F172A]"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {submitting ? 'Đang xác thực quyền Super Admin...' : 'Đăng nhập vào trang quản trị'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
