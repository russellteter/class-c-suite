// apps/utility/src/mcp/powerbi/errors.ts
// Source: docs/decisions/0010-ch8-mcp-integration.md §9
// Typed error hierarchy for the PowerBI subprocess client.

export class PowerBIPythonMissingError extends Error {
  readonly code = 'POWERBI_PYTHON_MISSING' as const;
  constructor(pythonPath?: string) {
    super(
      pythonPath
        ? `python3 not found at ${pythonPath}. Install via: brew install python@3.12`
        : 'python3 not on PATH. Install via: brew install python@3.12'
    );
    this.name = 'PowerBIPythonMissingError';
  }
}

export class PowerBIVenvMissingError extends Error {
  readonly code = 'POWERBI_VENV_MISSING' as const;
  readonly projectPath: string;
  constructor(projectPath: string) {
    super(
      `customer-dashboard venv not found at ${projectPath}/.venv/. ` +
      `Bootstrap: cd "${projectPath}" && python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt`
    );
    this.name = 'PowerBIVenvMissingError';
    this.projectPath = projectPath;
  }
}

export class PowerBISubprocessError extends Error {
  readonly code = 'POWERBI_SUBPROCESS_ERROR' as const;
  readonly exitCode: number | null;
  readonly stderrTail: string;
  constructor({ exitCode, stderrTail }: { exitCode: number | null; stderrTail: string }) {
    super(
      `customer-dashboard subprocess failed (exit=${exitCode ?? 'null'}). ` +
      `stderr tail: ${stderrTail.slice(-500)}`
    );
    this.name = 'PowerBISubprocessError';
    this.exitCode = exitCode;
    this.stderrTail = stderrTail;
  }
}

export class PowerBIJsonInvalidError extends Error {
  readonly code = 'POWERBI_JSON_INVALID' as const;
  readonly zodError: unknown;
  readonly jsonPath: string;
  constructor({ zodError, jsonPath }: { zodError: unknown; jsonPath: string }) {
    super(
      `PowerBI JSON failed schema validation at ${jsonPath}. ` +
      `Zod error: ${JSON.stringify(zodError)}`
    );
    this.name = 'PowerBIJsonInvalidError';
    this.zodError = zodError;
    this.jsonPath = jsonPath;
  }
}
