const axios = require('axios');

/**
 * hardware_status - Get detailed hardware metrics
 *
 * Provides CPU, memory, disk usage and other system metrics.
 */
module.exports = {
  definition: {
    type: 'function',
    function: {
      name: 'hardware_status',
      description: 'Get detailed hardware metrics including CPU, memory, disk, and process stats. Use when asked about "hardware", "resource usage", "RAM", "CPU", "memory usage", or "disk space".',
      parameters: {
        type: 'object',
        properties: {
          metric: {
            type: 'string',
            enum: ['all', 'cpu', 'memory', 'disk', 'process'],
            description: 'Which metric to focus on (default: all)'
          }
        }
      }
    }
  },

  execute: async (args, context) => {
    const { metric = 'all' } = args;
    const baseUrl = `http://localhost:${process.env.PORT || 7777}`;

    try {
      const response = await axios.get(`${baseUrl}/api/hardware/metrics`, { timeout: 10000 });
      const data = response.data;

      let result = {
        success: true,
        type: 'hardware_metrics',
        data: {}
      };

      if (metric === 'all' || metric === 'cpu') {
        result.data.cpu = {
          cores: data.cpu.cores,
          model: data.cpu.model,
          loadAvg: data.cpu.loadAvg
        };
      }

      if (metric === 'all' || metric === 'memory') {
        result.data.memory = {
          total: `${data.memory.total}MB`,
          used: `${data.memory.used}MB`,
          free: `${data.memory.free}MB`,
          usedPercent: `${data.memory.usedPercent}%`
        };
      }

      if (metric === 'all' || metric === 'process') {
        result.data.process = {
          heapUsed: `${data.process.heapUsed}MB`,
          heapTotal: `${data.process.heapTotal}MB`,
          rss: `${data.process.rss}MB`
        };
      }

      if (metric === 'all') {
        result.data.uptime = {
          system: formatDuration(data.uptime.system),
          process: formatDuration(data.uptime.process)
        };
        result.data.platform = data.platform;
      }

      // Build summary message
      const memPct = data.memory.usedPercent;
      const load = data.cpu.loadAvg[0].toFixed(2);
      const cores = data.cpu.cores;

      result.message = `Memory: ${memPct}% used (${data.memory.used}/${data.memory.total}MB), ` +
                       `CPU: ${cores} cores, load ${load}, ` +
                       `Uptime: ${formatDuration(data.uptime.system)}`;

      return result;

    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: `Failed to get hardware metrics: ${error.message}`
      };
    }
  }
};

function formatDuration(seconds) {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  return `${Math.floor(seconds / 86400)}d ${Math.floor((seconds % 86400) / 3600)}h`;
}
