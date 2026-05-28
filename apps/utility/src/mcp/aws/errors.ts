// apps/utility/src/mcp/aws/errors.ts
// Source: docs/decisions/0010-ch8-mcp-integration.md §6

export class AWSError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'AWSError';
  }
}

/** ~/.aws/config profile not present — Russell must configure it. */
export class AWSProfileNotFoundError extends AWSError {
  constructor(public readonly profile: string) {
    super(
      `AWS profile '${profile}' not found in ~/.aws/config. ` +
      `Add it or run: aws configure sso --profile ${profile}`
    );
    this.name = 'AWSProfileNotFoundError';
  }
}

/** SSO session token has expired — requires `aws sso login --profile <name>`. */
export class AWSSSOExpiredError extends AWSError {
  constructor(public readonly profile: string) {
    super(
      `AWS SSO token expired for profile '${profile}'. ` +
      `Run: aws sso login --profile ${profile}`
    );
    this.name = 'AWSSSOExpiredError';
  }
}

/** Cost Explorer API returned an error. */
export class AWSCostExplorerError extends AWSError {
  constructor(message: string, cause?: unknown) {
    super(message, cause);
    this.name = 'AWSCostExplorerError';
  }
}
