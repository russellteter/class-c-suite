// apps/utility/src/safewrite/git.ts
// Source: docs/decisions/0003-ch2-safewrite.md §3-4
// Git commit helper for SafeWrite: stages the written file and commits to vault.
// Also defines VaultNotInitializedError + assertVaultInitialized (B22 mitigation).

import { simpleGit } from 'simple-git';
import * as path from 'path';
import { createLogger } from '../logger.js';

const log = createLogger();

// ---------------------------------------------------------------------------
// B22: VaultNotInitializedError
// ---------------------------------------------------------------------------

/** Thrown at startup if the vault has zero git commits.
 *  Source: ADR §4.4 — utility process must assert vault is initialized on startup.
 */
export class VaultNotInitializedError extends Error {
  constructor(vaultPath: string) {
    super(
      `Vault at ${vaultPath} has no commits. Run scripts/vault-bootstrap.sh before starting C-Suite.`
    );
    this.name = 'VaultNotInitializedError';
  }
}

/** Assert vault has at least one commit.
 *  Throws VaultNotInitializedError if the check fails.
 *  Called once at startup from initSafeWrite().
 *  Source: ADR §4.4.
 */
export async function assertVaultInitialized(vaultPath: string): Promise<void> {
  const git = simpleGit(vaultPath);
  try {
    const log = await git.log(['--oneline', '-1']);
    if (!log.latest) {
      throw new VaultNotInitializedError(vaultPath);
    }
  } catch (err) {
    if (err instanceof VaultNotInitializedError) throw err;
    // git log throws on a repo with zero commits — treat as uninitialized.
    throw new VaultNotInitializedError(vaultPath);
  }
}

// ---------------------------------------------------------------------------
// Vault git commit
// ---------------------------------------------------------------------------

export interface CommitArgs {
  vaultPath: string;
  absPath: string;
  agent: string;
  playbook: string;
  runId: string;
}

/** Stage + commit a single file to the vault git repo.
 *  Commit message format: `c-suite: <agent> wrote <relPath> during <playbook> run <runId>`
 *  Source: ADR §3.1.
 *
 *  Returns the new commit SHA from CommitResult.commit (verified from
 *  simple-git 3.36.0 typings: response.d.ts line 79).
 */
export async function commitToVault(args: CommitArgs): Promise<string> {
  const { vaultPath, absPath, agent, playbook, runId } = args;
  const relPath = path.relative(vaultPath, absPath);
  const git = simpleGit(vaultPath);

  await git.add(absPath);

  const message = `c-suite: ${agent} wrote ${relPath} during ${playbook} run ${runId}`;
  const result = await git.commit(message, [absPath]);

  const sha = result.commit;
  log.info({ message: 'vault git commit', sha, relPath, agent, runId });
  return sha;
}
