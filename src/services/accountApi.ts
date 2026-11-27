import {
  ApiClientError,
  createBackendClient,
  executeApi,
  getDefaultServerConfig,
  isLocalhostUrl,
  normalizeBaseUrl,
  SERVER_PRESETS,
} from '../api/client';
import type {
  AccountResponse,
  ApiServerConfig,
  AssignRoleRequest,
  AuthResponse,
  AuthSession,
  GeneratedAccountResponse,
  LoginRequest,
  RegisterRequest,
  ServiceRolesCatalogResponse,
} from '../types/api';

export {
  ApiClientError,
  getDefaultServerConfig,
  isLocalhostUrl,
  normalizeBaseUrl,
  SERVER_PRESETS,
};

function normalizeAccount(raw?: GeneratedAccountResponse | null): AccountResponse {
  return {
    id: Number(raw?.id ?? 0),
    username: String(raw?.username ?? ''),
    email: raw?.email ?? null,
    fullName: raw?.fullName ?? null,
    isSuperAdmin: Boolean(raw?.isSuperAdmin),
    status: String(raw?.status ?? 'ACTIVE'),
    serviceRoles:
      raw?.serviceRoles && typeof raw.serviceRoles === 'object' ? raw.serviceRoles : {},
    createdAt: raw?.createdAt ?? null,
  };
}

export async function loginAccount(
  config: ApiServerConfig,
  payload: LoginRequest
): Promise<AuthResponse> {
  const client = createBackendClient(config);
  const cleanPayload: LoginRequest = {
    usernameOrEmail: payload.usernameOrEmail.trim(),
    password: payload.password,
  };
  if (payload.serviceCode?.trim()) {
    cleanPayload.serviceCode = payload.serviceCode.trim();
  }

  const data = await executeApi(client.v1.login(cleanPayload), config.useProxy);

  if (!data || !data.accessToken || !data.account) {
    throw new ApiClientError(
      'Phản hồi đăng nhập từ máy chủ không đúng định dạng OpenAPI dự kiến.',
      500,
      'INVALID_RESPONSE'
    );
  }

  return {
    accessToken: data.accessToken,
    tokenType: data.tokenType || 'Bearer',
    expiresIn: Number(data.expiresIn || 86400),
    currentService: data.currentService ?? null,
    currentRole: data.currentRole ?? null,
    account: normalizeAccount(data.account),
  };
}

export async function registerAccount(
  config: ApiServerConfig,
  payload: RegisterRequest
): Promise<AuthResponse> {
  const client = createBackendClient(config);
  const cleanPayload: RegisterRequest = {
    username: payload.username.trim(),
    password: payload.password,
  };
  if (payload.email?.trim()) cleanPayload.email = payload.email.trim();
  if (payload.fullName?.trim()) cleanPayload.fullName = payload.fullName.trim();
  if (payload.serviceCode?.trim()) cleanPayload.serviceCode = payload.serviceCode.trim();

  const data = await executeApi(client.v1.register(cleanPayload), config.useProxy);

  return {
    accessToken: data?.accessToken || '',
    tokenType: data?.tokenType || 'Bearer',
    expiresIn: Number(data?.expiresIn || 86400),
    currentService: data?.currentService ?? null,
    currentRole: data?.currentRole ?? null,
    account: normalizeAccount(data?.account),
  };
}

export async function getAllAccounts(
  config: ApiServerConfig,
  session: AuthSession
): Promise<AccountResponse[]> {
  const client = createBackendClient(config, session);
  const data = await executeApi(client.v1.getAllAccounts(), config.useProxy);

  if (!Array.isArray(data)) {
    return [];
  }
  return data.map(normalizeAccount);
}

export async function getAccountById(
  config: ApiServerConfig,
  session: AuthSession,
  id: number
): Promise<AccountResponse> {
  const client = createBackendClient(config, session);
  const data = await executeApi(client.v1.getAccountById({ id }), config.useProxy);
  return normalizeAccount(data);
}

export async function assignServiceRole(
  config: ApiServerConfig,
  session: AuthSession,
  id: number,
  payload: AssignRoleRequest
): Promise<AccountResponse> {
  const client = createBackendClient(config, session);
  const data = await executeApi(
    client.v1.assignServiceRole(
      { id },
      {
        serviceCode: payload.serviceCode.trim(),
        role: payload.role.trim(),
      }
    ),
    config.useProxy
  );
  return normalizeAccount(data);
}

export async function removeServiceRole(
  config: ApiServerConfig,
  session: AuthSession,
  id: number,
  serviceCode: string
): Promise<AccountResponse> {
  const client = createBackendClient(config, session);
  const data = await executeApi(
    client.v1.removeServiceRole({
      id,
      serviceCode: encodeURIComponent(serviceCode.trim()),
    }),
    config.useProxy
  );
  return normalizeAccount(data);
}

export async function getServiceRolesCatalog(
  config: ApiServerConfig,
  serviceCode?: string,
  session?: AuthSession | null
): Promise<ServiceRolesCatalogResponse> {
  const client = createBackendClient(config, session);
  const query = serviceCode?.trim() ? { serviceCode: serviceCode.trim() } : {};
  const data = await executeApi(
    client.v1.getServiceRolesCatalog(query),
    config.useProxy
  );

  return {
    globalRole: data?.globalRole || 'SUPER_ADMIN',
    serviceRoles:
      data?.serviceRoles && typeof data.serviceRoles === 'object' ? data.serviceRoles : {},
  };
}
