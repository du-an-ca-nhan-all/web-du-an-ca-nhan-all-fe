import type {
  AccountResponse as GeneratedAccountResponse,
  AssignRoleRequest,
  AuthResponse as GeneratedAuthResponse,
  LoginRequest,
  RegisterRequest,
  ServiceRolesCatalogResponse as GeneratedServiceRolesCatalogResponse,
} from '../api/generated/data-contracts';

export type {
  AssignRoleRequest,
  GeneratedAccountResponse,
  GeneratedAuthResponse,
  GeneratedServiceRolesCatalogResponse,
  LoginRequest,
  RegisterRequest,
};

/** Normalized account record guaranteed to have non-optional core fields for UI rendering */
export interface AccountResponse {
  id: number;
  username: string;
  email?: string | null;
  fullName?: string | null;
  isSuperAdmin: boolean;
  status: string;
  serviceRoles: Record<string, string>;
  createdAt?: string | null;
}

/** Normalized auth response backed by generated AuthResponse schema */
export interface AuthResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  currentService?: string | null;
  currentRole?: string | null;
  account: AccountResponse;
}

/** Normalized roles catalog backed by generated ServiceRolesCatalogResponse schema */
export interface ServiceRolesCatalogResponse {
  globalRole: string;
  serviceRoles: Record<string, string[]>;
}

export type ServerPreset = 'staging' | 'local' | 'custom';

export interface ApiServerConfig {
  preset: ServerPreset;
  baseUrl: string;
  useProxy: boolean;
}

export interface AuthSession {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  expiresAt: number;
  currentService?: string | null;
  currentRole?: string | null;
  account: AccountResponse;
  serverBaseUrl: string;
}
