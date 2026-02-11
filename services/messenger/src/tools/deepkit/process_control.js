const { exec } = require('child_process');
const { promisify } = require('util');
const winston = require('winston');

const execAsync = promisify(exec);

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.simple(),
  transports: [new winston.transports.Console()]
});

/**
 * Process Control Tool
 * List, start, and stop processes on the host system
 *
 * SECURITY NOTE: This tool can execute shell commands. Use with caution.
 * In production, restrict to specific commands or disable entirely.
 */

// Security: Allowed commands (whitelist)
const ALLOWED_COMMANDS = [
  'docker',
  'npm',
  'node',
  'python3',
  'python',
  'git'
];

// Security: Blocked patterns (blacklist)
const BLOCKED_PATTERNS = [
  /rm\s+-rf/i,
  /sudo/i,
  /passwd/i,
  /shutdown/i,
  /reboot/i,
  /mkfs/i,
  /dd\s+if=/i,
  /:(){ :|:& };:/  // Fork bomb
];

/**
 * Check if a command is safe to execute
 */
function isCommandSafe(command) {
  // Check blocked patterns
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(command)) {
      return false;
    }
  }

  // Extract first word (command name)
  const firstWord = command.trim().split(/\s+/)[0];

  // Check if command is in allowed list
  return ALLOWED_COMMANDS.includes(firstWord);
}

module.exports = {
  definition: {
    type: 'function',
    function: {
      name: 'process_control',
      description: 'List running processes, start commands, or check process status. Actions: list, exec, docker_ps',
      parameters: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['list', 'exec', 'docker_ps', 'docker_logs', 'docker_stats'],
            description: 'Action to perform'
          },
          command: {
            type: 'string',
            description: 'Command to execute (for exec action). Must be whitelisted.'
          },
          filter: {
            type: 'string',
            description: 'Filter pattern for list action (grep)'
          },
          container: {
            type: 'string',
            description: 'Container name for docker_logs/docker_stats'
          }
        },
        required: ['action']
      }
    }
  },

  async execute(args, context) {
    const { action, command, filter, container } = args;

    try {
      switch (action) {
        case 'list': {
          // List running processes (ps aux)
          let cmd = 'ps aux';
          if (filter) {
            cmd += ` | grep "${filter}" | grep -v grep`;
          }

          const { stdout } = await execAsync(cmd, { timeout: 10000 });
          const lines = stdout.trim().split('\n');
          const processes = lines.slice(1, 11); // First 10 processes

          return {
            success: true,
            message: `Found ${lines.length - 1} processes${filter ? ` matching "${filter}"` : ''}`,
            data: {
              count: lines.length - 1,
              filter,
              processes: processes.map(line => {
                const parts = line.trim().split(/\s+/);
                return {
                  user: parts[0],
                  pid: parts[1],
                  cpu: parts[2],
                  mem: parts[3],
                  command: parts.slice(10).join(' ')
                };
              })
            }
          };
        }

        case 'exec': {
          if (!command) {
            return {
              success: false,
              error: 'Command is required for exec action'
            };
          }

          // Security check
          if (!isCommandSafe(command)) {
            return {
              success: false,
              error: `Command not allowed: ${command}`,
              allowed_commands: ALLOWED_COMMANDS
            };
          }

          const { stdout, stderr } = await execAsync(command, {
            timeout: 30000,
            maxBuffer: 1024 * 1024 // 1MB max output
          });

          return {
            success: true,
            message: `Executed: ${command}`,
            data: {
              command,
              stdout: stdout.substring(0, 2000),
              stderr: stderr.substring(0, 500),
              truncated: stdout.length > 2000
            }
          };
        }

        case 'docker_ps': {
          const { stdout } = await execAsync('docker ps --format "{{.Names}}\t{{.Status}}\t{{.Ports}}"', {
            timeout: 10000
          });

          const lines = stdout.trim().split('\n');
          const containers = lines.map(line => {
            const [name, status, ports] = line.split('\t');
            return { name, status, ports };
          });

          return {
            success: true,
            message: `Found ${containers.length} running containers`,
            data: {
              count: containers.length,
              containers
            }
          };
        }

        case 'docker_logs': {
          if (!container) {
            return {
              success: false,
              error: 'Container name is required for docker_logs'
            };
          }

          const { stdout } = await execAsync(`docker logs ${container} --tail 20`, {
            timeout: 10000
          });

          return {
            success: true,
            message: `Logs for ${container} (last 20 lines)`,
            data: {
              container,
              logs: stdout.substring(0, 3000),
              truncated: stdout.length > 3000
            }
          };
        }

        case 'docker_stats': {
          const { stdout } = await execAsync('docker stats --no-stream --format "{{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}"', {
            timeout: 10000
          });

          const lines = stdout.trim().split('\n');
          const stats = lines.map(line => {
            const [name, cpu, memory] = line.split('\t');
            return { name, cpu, memory };
          });

          return {
            success: true,
            message: `Docker stats for ${stats.length} containers`,
            data: {
              count: stats.length,
              containers: stats
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
      logger.error(`process_control error (${action}):`, error.message);

      return {
        success: false,
        error: error.message,
        code: error.code
      };
    }
  }
};
