const fs = require('fs').promises;
const path = require('path');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.simple(),
  transports: [new winston.transports.Console()]
});

/**
 * File Operations Tool
 * Allows the agent to read, write, list, and delete files on the host system
 *
 * SECURITY NOTE: This tool has full filesystem access. In production, restrict to specific directories.
 */

// Security: Allowed base directories (whitelist)
const ALLOWED_DIRS = [
  '/tmp',
  '/app',
  process.env.HOME || '/home/deepkit',
  '/Users/champion/DeepKit'  // User's workspace
];

// Security: Blocked paths (blacklist)
const BLOCKED_PATHS = [
  '/etc/passwd',
  '/etc/shadow',
  '/.ssh',
  '/root'
];

/**
 * Check if a path is allowed
 */
function isPathAllowed(filePath) {
  const resolved = path.resolve(filePath);

  // Check blocked paths
  for (const blocked of BLOCKED_PATHS) {
    if (resolved.startsWith(blocked)) {
      return false;
    }
  }

  // Check allowed directories
  for (const allowed of ALLOWED_DIRS) {
    if (resolved.startsWith(allowed)) {
      return true;
    }
  }

  return false;
}

module.exports = {
  definition: {
    type: 'function',
    function: {
      name: 'file_ops',
      description: 'Read, write, list, or delete files. Actions: read, write, list, delete, stat',
      parameters: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['read', 'write', 'list', 'delete', 'stat'],
            description: 'Action to perform'
          },
          path: {
            type: 'string',
            description: 'File or directory path (absolute or relative)'
          },
          content: {
            type: 'string',
            description: 'Content to write (required for write action)'
          },
          encoding: {
            type: 'string',
            enum: ['utf8', 'base64', 'hex'],
            description: 'File encoding (default: utf8)'
          }
        },
        required: ['action', 'path']
      }
    }
  },

  async execute(args, context) {
    const { action, path: filePath, content, encoding = 'utf8' } = args;

    try {
      // Security check
      if (!isPathAllowed(filePath)) {
        return {
          success: false,
          error: `Access denied: ${filePath} is outside allowed directories`,
          allowed_dirs: ALLOWED_DIRS
        };
      }

      const resolved = path.resolve(filePath);

      switch (action) {
        case 'read': {
          const data = await fs.readFile(resolved, encoding);
          const stats = await fs.stat(resolved);

          return {
            success: true,
            message: `Read ${stats.size} bytes from ${path.basename(resolved)}`,
            data: {
              path: resolved,
              content: encoding === 'utf8' && data.length > 1000
                ? data.substring(0, 1000) + '\n... (truncated)'
                : data,
              size: stats.size,
              encoding,
              truncated: encoding === 'utf8' && data.length > 1000
            }
          };
        }

        case 'write': {
          if (!content && content !== '') {
            return {
              success: false,
              error: 'Content is required for write action'
            };
          }

          await fs.writeFile(resolved, content, encoding);
          const stats = await fs.stat(resolved);

          return {
            success: true,
            message: `Wrote ${stats.size} bytes to ${path.basename(resolved)}`,
            data: {
              path: resolved,
              size: stats.size,
              encoding
            }
          };
        }

        case 'list': {
          const entries = await fs.readdir(resolved, { withFileTypes: true });
          const files = [];
          const dirs = [];

          for (const entry of entries) {
            const fullPath = path.join(resolved, entry.name);
            const stats = await fs.stat(fullPath);

            const item = {
              name: entry.name,
              type: entry.isDirectory() ? 'directory' : 'file',
              size: stats.size,
              modified: stats.mtime.toISOString()
            };

            if (entry.isDirectory()) {
              dirs.push(item);
            } else {
              files.push(item);
            }
          }

          return {
            success: true,
            message: `Found ${files.length} files, ${dirs.length} directories in ${path.basename(resolved)}`,
            data: {
              path: resolved,
              directories: dirs,
              files: files,
              total: entries.length
            }
          };
        }

        case 'delete': {
          const stats = await fs.stat(resolved);

          if (stats.isDirectory()) {
            await fs.rmdir(resolved, { recursive: true });
            return {
              success: true,
              message: `Deleted directory ${path.basename(resolved)}`
            };
          } else {
            await fs.unlink(resolved);
            return {
              success: true,
              message: `Deleted file ${path.basename(resolved)} (${stats.size} bytes)`
            };
          }
        }

        case 'stat': {
          const stats = await fs.stat(resolved);

          return {
            success: true,
            message: `Stats for ${path.basename(resolved)}`,
            data: {
              path: resolved,
              type: stats.isDirectory() ? 'directory' : 'file',
              size: stats.size,
              created: stats.birthtime.toISOString(),
              modified: stats.mtime.toISOString(),
              accessed: stats.atime.toISOString(),
              permissions: stats.mode.toString(8).slice(-3)
            }
          };
        }

        default:
          return {
            success: false,
            error: `Unknown action: ${action}`
          };
      }
    } catch (error) {
      logger.error(`file_ops error (${action}):`, error.message);

      return {
        success: false,
        error: error.message,
        code: error.code
      };
    }
  }
};
