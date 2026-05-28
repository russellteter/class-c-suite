// apps/main/src/loadEnv.ts
// Loads apps/main/.env.local into process.env as a side effect at process start.
// MUST be imported before main.ts so the forked utility process (which spreads
// process.env in supervisor.forkUtility) and the connectors see CLAUDE_CODE_OAUTH_TOKEN,
// the NetSuite OAuth vars, Gmail/Chorus keys, etc. Without this the file is inert and
// STUB_MODE=live throws ClaudeAuthMissingError.
//
// Behavior: the first existing candidate file wins; variables already present in the
// environment are NOT overridden (an explicit shell export beats the file). Values are
// never logged — only the count + path.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const candidates = [
  join(here, '..', '.env.local'), // dist/.. = apps/main (production) / src/.. = apps/main (tsx)
  join(process.cwd(), '.env.local'), // cwd = apps/main
  join(process.cwd(), 'apps', 'main', '.env.local'), // cwd = repo root
];

function parseEnvFile(content: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const raw of content.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (key) out[key] = val;
  }
  return out;
}

for (const path of candidates) {
  try {
    const parsed = parseEnvFile(readFileSync(path, 'utf8'));
    let loaded = 0;
    for (const [k, v] of Object.entries(parsed)) {
      if (process.env[k] === undefined) {
        process.env[k] = v;
        loaded++;
      }
    }
    // eslint-disable-next-line no-console
    console.log(`[loadEnv] loaded ${loaded} env var(s) from ${path}`);
    break;
  } catch {
    // file not at this candidate path — try the next
  }
}
