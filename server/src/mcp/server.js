import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { getLogger } from '@sitespeed.io/log';
import { nconf } from '../config.js';
import { registerTools } from './tools.js';

const require = createRequire(import.meta.url);
const { version } = require('../../package.json');

const logger = getLogger('sitespeedio.server.mcp');

function checkApiKey(request, response) {
  const key = nconf.get('api:key');
  if (!key) return true;
  const auth = request.headers['authorization'];
  if (!auth || !auth.startsWith('Bearer ')) {
    response
      .status(401)
      .json({ error: 'Authorization header required: Bearer <api-key>' });
    return false;
  }
  if (auth.slice(7) !== String(key)) {
    response.status(403).json({ error: 'Invalid API key' });
    return false;
  }
  return true;
}

// sessionId -> { transport, timer }
const sessions = new Map();
const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes of inactivity

function touchSession(sessionId) {
  const session = sessions.get(sessionId);
  if (!session) return;
  clearTimeout(session.timer);
  session.timer = setTimeout(() => {
    session.transport.close().catch(() => {});
    sessions.delete(sessionId);
    logger.info(`MCP session ${sessionId} expired after inactivity`);
  }, SESSION_TTL_MS);
}

function createMcpServer() {
  const server = new McpServer({
    name: 'sitespeed-onlinetest',
    version
  });
  registerTools(server);
  return server;
}

export function setupMcp(app) {
  // POST /mcp — main endpoint for all MCP JSON-RPC requests
  app.post('/mcp', async (request, response) => {
    if (!checkApiKey(request, response)) return;
    try {
      const sessionId = request.headers['mcp-session-id'];

      if (sessionId) {
        const session = sessions.get(sessionId);
        if (!session) {
          return response
            .status(404)
            .json({ error: 'Session not found or expired' });
        }
        touchSession(sessionId);
        await session.transport.handleRequest(request, response, request.body);
        return;
      }

      // No session — must be an initialize request
      if (request.body?.method !== 'initialize') {
        return response
          .status(400)
          .json({ error: 'New connections must start with initialize' });
      }

      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID()
      });

      const server = createMcpServer();
      await server.connect(transport);
      await transport.handleRequest(request, response, request.body);

      if (transport.sessionId) {
        const sid = transport.sessionId;
        const timer = setTimeout(() => {
          transport.close().catch(() => {});
          sessions.delete(sid);
          logger.info(`MCP session ${sid} expired after inactivity`);
        }, SESSION_TTL_MS);
        sessions.set(sid, { transport, timer });
        transport.addEventListener('close', () => {
          clearTimeout(sessions.get(sid)?.timer);
          sessions.delete(sid);
        });
      }
    } catch (error) {
      logger.error('MCP POST error', error);
      if (!response.headersSent) {
        response.status(500).json({ error: 'Internal server error' });
      }
    }
  });

  // GET /mcp — SSE streaming channel for server-to-client notifications
  app.get('/mcp', async (request, response) => {
    if (!checkApiKey(request, response)) return;
    try {
      const sessionId = request.headers['mcp-session-id'];
      const session = sessions.get(sessionId);
      if (!sessionId || !session) {
        return response
          .status(400)
          .json({ error: 'Valid Mcp-Session-Id required' });
      }
      touchSession(sessionId);
      await session.transport.handleRequest(request, response);
    } catch (error) {
      logger.error('MCP GET error', error);
      if (!response.headersSent) {
        response.status(500).json({ error: 'Internal server error' });
      }
    }
  });

  // DELETE /mcp — explicit session termination
  app.delete('/mcp', (request, response) => {
    if (!checkApiKey(request, response)) return;
    const sessionId = request.headers['mcp-session-id'];
    const session = sessions.get(sessionId);
    if (sessionId && session) {
      clearTimeout(session.timer);
      session.transport.close().catch(() => {});
      sessions.delete(sessionId);
      return response.status(200).json({ terminated: true });
    }
    response.status(404).json({ error: 'Session not found' });
  });

  logger.info('MCP endpoint available at /mcp');
}
