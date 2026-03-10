/**
 * Integration test for the sitespeed.io MCP server.
 * Uses the MCP client SDK to verify that the server starts, all expected tools
 * are registered, and list_test_locations successfully calls through to the
 * onlinetest server API.
 */
import { createRequire } from 'node:module';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const require = createRequire(import.meta.url);
const { version } = require('../package.json');

const MCP_URL = process.env.MCP_URL || 'http://localhost:3000/mcp';
const MCP_API_KEY = process.env.MCP_API_KEY;

console.log(`Testing MCP server at ${MCP_URL}`);

const client = new Client({ name: 'ci-test', version }, { capabilities: {} });
const transportOptions = MCP_API_KEY
  ? { requestInit: { headers: { Authorization: `Bearer ${MCP_API_KEY}` } } }
  : {};
const transport = new StreamableHTTPClientTransport(
  new URL(MCP_URL),
  transportOptions
);

await client.connect(transport);
console.log('Connected to MCP server');

// Verify all expected tools are registered
const { tools } = await client.listTools();
const toolNames = tools.map(t => t.name);
console.log('Available tools:', toolNames);

const expected = [
  'list_test_locations',
  'run_performance_test',
  'get_test_status',
  'get_test_result',
  'get_test_har',
  'run_and_wait'
];

let failed = false;
for (const name of expected) {
  if (!toolNames.includes(name)) {
    console.error(`FAIL: missing tool "${name}"`);
    failed = true;
  }
}
if (failed) throw new Error('Some expected tools are missing');
console.log('All expected tools are registered');

// Verify list_test_locations returns valid JSON from the onlinetest server
const result = await client.callTool({
  name: 'list_test_locations',
  arguments: {}
});
const text = result.content[0].text;

let locations;
try {
  locations = JSON.parse(text);
} catch {
  throw new Error(
    'FAIL: list_test_locations did not return valid JSON: ' + text
  );
}

if (!Array.isArray(locations) || locations.length === 0) {
  throw new Error(
    'FAIL: list_test_locations should return a non-empty array, got: ' + text
  );
}

console.log(
  `list_test_locations returned ${locations.length} location(s):`,
  locations.map(l => l.name)
);

await transport.close();
console.log('All tests passed');
