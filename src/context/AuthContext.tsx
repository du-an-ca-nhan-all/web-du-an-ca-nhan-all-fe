import { createContext, useCallback, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import type { ApiServerConfig, AuthSession, LoginRequest } from '../types/api';
import {
  ApiClientError,
  getDefaultServerConfig,
  loginAccount,
  normalizeBaseUrl,
} from '../services/accountApi';

const SESSION_STORAGE_KEY = 'sac_super_admin_session';
const SERVER_STORAGE_KEY = 'sac_server_config';

interface AuthContextValue {
  session: AuthSession | null;
  serverConfig: ApiServerConfig;
  sessionNotice: string | null;
  clearSessionNotice: () => void;
  updateServerConfig: (next: ApiServerConfig) => void;
  login: (payload: LoginRequest, overrideConfig?: ApiServerConfig) => Promise<AuthSession>;
  logout: (reason?: string) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function loadStoredServerConfig(): ApiServerConfig {
  try {
    const raw = localStorage.getItem(SERVER_STORAGE_KEY);
    if (!raw) return getDefaultServerConfig();
    const parsed = JSON.parse(raw) as Partial<ApiServerConfig>;
    if (
      (parsed.preset === 'staging' || parsed.preset === 'local' || parsed.preset === 'custom') &&
      typeof parsed.baseUrl === 'string' &&
      parsed.baseUrl.trim()
    ) {
      return {
        preset: parsed.preset,
        baseUrl: normalizeBaseUrl(parsed.baseUrl),
        useProxy: typeof parsed.useProxy === 'boolean' ? parsed.useProxy : true,
      };
    }
  } catch {
    // Fall back to default Staging config
  }
  return getDefaultServerConfig();
}

function loadStoredSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AuthSession>;
    if (
      !parsed ||
      typeof parsed.accessToken !== 'string' ||
      !parsed.accessToken ||
      !parsed.account ||
      parsed.account.isSuperAdmin !== true
    ) {
      localStorage.removeItem(SESSION_STORAGE_KEY);
      return null;
    }
    if (typeof parsed.expiresAt === 'number' && Date.now() >= parsed.expiresAt) {
      localStorage.removeItem(SESSION_STORAGE_KEY);
      return null;
    }
    return parsed as AuthSession;
  } catch {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [serverConfig, setServerConfig] = useState<ApiServerConfig>(loadStoredServerConfig);
  const [session, setSession] = useState<AuthSession | null>(loadStoredSession);
  const [sessionNotice, setSessionNotice] = useState<string | null>(null);

  const clearSessionNotice = useCallback(() => setSessionNotice(null), []);

  const logout = useCallback((reason?: string) => {
    setSession(null);
    try {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    } catch {
      // Ignore storage errors
    }
    if (reason) {
      setSessionNotice(reason);
    }
  }, []);

  const updateServerConfig = useCallback(
    (next: ApiServerConfig) => {
      const normalized: ApiServerConfig = {
        ...next,
        baseUrl: normalizeBaseUrl(next.baseUrl),
      };
      const serverChanged =
        session && normalizeBaseUrl(session.serverBaseUrl) !== normalized.baseUrl;

      setServerConfig(normalized);
      try {
        localStorage.setItem(SERVER_STORAGE_KEY, JSON.stringify(normalized));
      } catch {
        // Ignore storage errors
      }

      if (serverChanged) {
        logout('Đã chuyển máy chủ API. Vui lòng đăng nhập lại trên máy chủ mới.');
      }
    },
    [logout, session]
  );

  const login = useCallback(
    async (payload: LoginRequest, overrideConfig?: ApiServerConfig): Promise<AuthSession> => {
      const activeConfig = overrideConfig
        ? { ...overrideConfig, baseUrl: normalizeBaseUrl(overrideConfig.baseUrl) }
        : serverConfig;

      const authResponse = await loginAccount(activeConfig, payload);

      // Strict Super Admin access gate: reject any account without isSuperAdmin === true
      if (authResponse.account.isSuperAdmin !== true) {
        throw new ApiClientError(
          `Tài khoản "${authResponse.account.username}" không phải Super Admin. Hiện tại cổng quản trị chỉ cho phép tài khoản Super Admin truy cập.`,
          403,
          'NOT_SUPER_ADMIN'
        );
      }

      const expiresIn = authResponse.expiresIn || 86400;
      const nextSession: AuthSession = {
        accessToken: authResponse.accessToken,
        tokenType: authResponse.tokenType || 'Bearer',
        expiresIn,
        expiresAt: Date.now() + expiresIn * 1000,
        currentService: authResponse.currentService ?? null,
        currentRole: authResponse.currentRole ?? 'SUPER_ADMIN',
        account: authResponse.account,
        serverBaseUrl: activeConfig.baseUrl,
      };

      setServerConfig(activeConfig);
      setSession(nextSession);
      setSessionNotice(null);

      try {
        localStorage.setItem(SERVER_STORAGE_KEY, JSON.stringify(activeConfig));
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(nextSession));
      } catch {
        // Ignore storage errors
      }

      return nextSession;
    },
    [serverConfig]
  );

  return (
    <AuthContext.Provider
      value={{
        session,
        serverConfig,
        sessionNotice,
        clearSessionNotice,
        updateServerConfig,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}
