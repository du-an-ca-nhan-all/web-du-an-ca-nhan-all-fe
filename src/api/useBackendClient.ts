import { useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { createBackendClient, type BackendClient } from './client';

/**
 * React hook returning a memoized, typed OpenAPI client (`v1`, `api`, `test`)
 * pre-configured with the active Staging/Local server, CORS proxy, and Super Admin JWT.
 */
export function useBackendClient(): BackendClient {
  const { serverConfig, session } = useAuth();

  return useMemo(
    () => createBackendClient(serverConfig, session),
    [
      serverConfig.baseUrl,
      serverConfig.preset,
      serverConfig.useProxy,
      session?.accessToken,
      session?.tokenType,
    ]
  );
}
