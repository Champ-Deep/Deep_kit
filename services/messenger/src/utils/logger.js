/**
 * DeepKit Messenger - Logger
 * Simple logger for DeepKit Messenger (uses winston)
 */

const winston = require('winston');

// Define log colors
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

winston.addColors(colors);

// Determine log level based on environment
const level = () => {
  const env = process.env.NODE_ENV || 'development';
  const isDevelopment = env === 'development';
  return isDevelopment ? 'debug' : 'info';
};

// Define log format
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`,
  ),
);

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || level(),
  format,
  transports: [
    new winston.transports.Console()
  ],
});

module.exports = logger;
