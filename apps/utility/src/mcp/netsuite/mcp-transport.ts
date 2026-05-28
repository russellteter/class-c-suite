// apps/utility/src/mcp/netsuite/mcp-transport.ts
// Source: docs/decisions/0015-netsuite-oauth-migration.md §2
//
// Thin wrapper that opens an MCP session to the NetSuite AI Connector Service
// (hosted remote MCP server) over streamable HTTP, injecting the OAuth 2.0
// Bearer access token on the connection. Used by NetSuiteClient to invoke the
// MCP Standard Tools (ns_runCustomSuiteQL, ns_runSavedSearch).
//
// The @modelcontextprotocol/sdk Client + StreamableHTTPClientTransport handle the
// 2025-06-18 protocol handshake; we just supply the URL + Authorization header.

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

/**
 * MCP Standard Tools tool names (MCP Standard Tools SuiteApp).
 * Live here (not in client.ts) so scripts can import them without pulling in
 * @c-suite/shared-types (whose package `exports` only declares an `import`
 * condition and fails under tsx's CJS resolver).
 */
export const TOOL_SUITEQL = 'ns_runCustomSuiteQL';
export const TOOL_SAVED_SEARCH = 'ns_runSavedSearch';

export interface McpToolResult {
  /** Raw content blocks returned by the tool (text/json). */
  content: Array<{ type: string; text?: string; [k: string]: unknown }>;
  isError?: boolean;
}

/**
 * Open a connected MCP client to the NetSuite hosted server.
 * Caller is responsible for calling `close()` on the returned client.
 */
export async function openNetSuiteMcpSession(
  serverUrl: string,
  accessToken: string,
): Promise<Client> {
  const transport = new StreamableHTTPClientTransport(new URL(serverUrl), {
    requestInit: {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  });
  const client = new Client(
    { name: 'c-suite', version: '0.1.0' },
    { capabilities: {} },
  );
  await client.connect(transport);
  return client;
}

/**
 * Invoke a single MCP tool against the hosted server and return its result.
 * Opens a fresh session per call (the hosted server is point-to-point and the
 * cash-lever query volume is low); closes it before returning.
 */
export async function callNetSuiteTool(
  serverUrl: string,
  accessToken: string,
  toolName: string,
  args: Record<string, unknown>,
): Promise<McpToolResult> {
  const client = await openNetSuiteMcpSession(serverUrl, accessToken);
  try {
    const result = (await client.callTool({ name: toolName, arguments: args })) as McpToolResult;
    return result;
  } finally {
    await client.close().catch(() => {});
  }
}
