import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateApi } from 'swagger-typescript-api';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SPEC_URL =
  process.env.OPENAPI_SPEC_URL ||
  'http://quickgg.top/be-swagger-api/openapi-main-all.yaml';

const OUTPUT_DIR = path.resolve(__dirname, '../src/api/generated');

async function writeBarrelFile(outputDir) {
  const entries = await fs.readdir(outputDir);
  const apiModules = entries
    .filter(
      (file) =>
        file.endsWith('.ts') &&
        !file.endsWith('Route.ts') &&
        file !== 'data-contracts.ts' &&
        file !== 'http-client.ts' &&
        file !== 'index.ts'
    )
    .map((file) => file.replace(/\.ts$/, ''))
    .sort();

  const lines = [
    '/* eslint-disable */',
    '/* AUTO-GENERATED BARREL — DO NOT EDIT MANUALLY. Run `npm run gen:api` to regenerate. */',
    '',
    'export * from "./data-contracts";',
    'export * from "./http-client";',
    ...apiModules.map((mod) => `export * from "./${mod}";`),
    '',
  ];

  await fs.writeFile(path.join(outputDir, 'index.ts'), lines.join('\n'), 'utf8');
}

async function run() {
  console.log(`Generating typed API client from: ${SPEC_URL}`);

  await generateApi({
    url: SPEC_URL,
    output: OUTPUT_DIR,
    httpClientType: 'fetch',
    modular: true,
    cleanOutput: true,
    generateClient: true,
    generateRouteTypes: true,
    extractRequestParams: true,
    extractRequestBody: true,
    extractEnums: true,
    defaultResponseType: 'unknown',
    singleHttpClient: true,
    sortTypes: true,
    sortRoutes: true,
    silent: false,
  });

  await writeBarrelFile(OUTPUT_DIR);
  console.log(`Generated OpenAPI client + barrel in: ${OUTPUT_DIR}`);
}

run().catch((err) => {
  console.error('Failed to generate OpenAPI client:', err);
  process.exit(1);
});
