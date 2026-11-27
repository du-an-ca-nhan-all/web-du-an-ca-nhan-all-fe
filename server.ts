import express from 'express';
import type { Request, Response } from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_UPSTREAM = 'https://be.quickgg.top';
const PORT = Number(process.env.PORT) || 3000;

function resolveTargetBaseUrl(rawHeader: string | undefined): { url: string | null; error?: string } {
  const candidate = (rawHeader || DEFAULT_UPSTREAM).trim().replace(/\/+$/, '');
  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { url: null, error: 'URL máy chủ API chỉ hỗ trợ giao thức HTTP hoặc HTTPS.' };
    }
    if (parsed.hostname === '169.254.169.254' || parsed.hostname === 'metadata.google.internal') {
      return { url: null, error: 'Địa chỉ máy chủ không được phép truy cập.' };
    }
    return { url: parsed.origin + parsed.pathname.replace(/\/+$/, '') };
  } catch {
    return { url: null, error: 'Địa chỉ URL máy chủ API không hợp lệ.' };
  }
}

async function startServer() {
  const app = express();

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', defaultUpstream: DEFAULT_UPSTREAM });
  });

  // Transparent reverse proxy preserving raw JSON and multipart/form-data payloads across all HTTP methods
  app.use(
    '/api/proxy',
    express.raw({ type: '*/*', limit: '50mb' }),
    async (req: Request, res: Response) => {
      const rawHeader =
        typeof req.headers['x-target-base-url'] === 'string'
          ? req.headers['x-target-base-url']
          : undefined;

      const { url: baseUrl, error } = resolveTargetBaseUrl(rawHeader);
      if (!baseUrl) {
        res.status(400).json({ message: error || 'Invalid target API server URL.' });
        return;
      }

      const method = req.method.toUpperCase();
      let upstreamPath = req.url;
      if (method === 'GET' && !/[?&]_t=/.test(upstreamPath)) {
        upstreamPath += `${upstreamPath.includes('?') ? '&' : '?'}_t=${Date.now()}`;
      }
      const upstreamUrl = `${baseUrl}${upstreamPath}`;
      const forwardHeaders: Record<string, string> = {
        Accept:
          typeof req.headers.accept === 'string'
            ? req.headers.accept
            : 'application/json, text/plain, */*',
      };

      if (typeof req.headers.authorization === 'string') {
        forwardHeaders.Authorization = req.headers.authorization;
      }

      const hasBody = !['GET', 'HEAD'].includes(method);
      const rawBody =
        hasBody && Buffer.isBuffer(req.body) && req.body.length > 0 ? req.body : undefined;

      if (rawBody && typeof req.headers['content-type'] === 'string') {
        forwardHeaders['Content-Type'] = req.headers['content-type'];
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      try {
        const upstreamResponse = await fetch(upstreamUrl, {
          method,
          headers: forwardHeaders,
          body: rawBody ? new Uint8Array(rawBody) : undefined,
          cache: 'no-store',
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        const contentType = upstreamResponse.headers.get('content-type');
        if (contentType) {
          res.setHeader('Content-Type', contentType);
        }

        if (method === 'GET') {
          res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
          res.setHeader('Pragma', 'no-cache');
          res.setHeader('Expires', '0');
        }

        res.status(upstreamResponse.status);

        if (method === 'HEAD') {
          res.end();
          return;
        }

        const responseBuffer = Buffer.from(await upstreamResponse.arrayBuffer());
        res.send(responseBuffer);
      } catch (err: unknown) {
        clearTimeout(timeoutId);
        const isAbort = err instanceof Error && err.name === 'AbortError';
        const detail = err instanceof Error ? err.message : 'Unknown network error';
        res.status(isAbort ? 504 : 502).json({
          message: isAbort
            ? `Hết thời gian chờ phản hồi từ máy chủ API (${baseUrl}).`
            : `Không thể kết nối tới máy chủ API (${baseUrl}). Vui lòng kiểm tra URL hoặc trạng thái backend.`,
          detail,
        });
      }
    }
  );

  app.use(express.json({ limit: '2mb' }));

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Super Admin Console listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
