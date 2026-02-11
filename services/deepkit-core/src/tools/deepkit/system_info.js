const os = require('os');

/**
 * system_info - Get system information about the DeepKit host
 * Reports CPU, memory, uptime, and container status.
 */
module.exports = {
  definition: {
    type: 'function',
    function: {
      name: 'system_info',
      description: 'Get system information about the DeepKit host machine. Shows CPU usage, memory, disk, uptime, and running services.',
      parameters: {
        type: 'object',
        properties: {
          detail: {
            type: 'string',
            enum: ['summary', 'full'],
            description: 'Level of detail: summary (quick stats) or full (everything)'
          }
        },
        required: []
      }
    }
  },

  execute: async (args, context) => {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memPercent = Math.round((usedMem / totalMem) * 100);

    const cpus = os.cpus();
    const loadAvg = os.loadavg();
    const uptimeHours = Math.round(os.uptime() / 3600);

    const info = {
      success: true,
      hostname: os.hostname(),
      platform: `${os.type()} ${os.release()}`,
      cpu: {
        model: cpus[0]?.model || 'unknown',
        cores: cpus.length,
        load_1m: loadAvg[0].toFixed(2),
        load_5m: loadAvg[1].toFixed(2),
        load_15m: loadAvg[2].toFixed(2)
      },
      memory: {
        total: `${Math.round(totalMem / 1073741824)}GB`,
        used: `${Math.round(usedMem / 1073741824)}GB`,
        free: `${Math.round(freeMem / 1073741824)}GB`,
        percent: `${memPercent}%`
      },
      uptime: `${uptimeHours} hours`,
      message: `System: ${memPercent}% memory used, ${cpus.length} cores, load ${loadAvg[0].toFixed(1)}, uptime ${uptimeHours}h`
    };

    return info;
  }
};
