const fs = require('fs');
const EnvironmentValidator = require('./env-validator');

/**
 * EnvironmentLoader - Loads and validates .env files
 * Standalone version for use during installation
 */
class EnvironmentLoader {
  constructor(registryPath, envPath = '.env') {
    this.validator = new EnvironmentValidator(registryPath);
    this.envPath = envPath;
    this.env = {};
  }

  load() {
    // Load .env file manually (no dotenv dependency)
    if (!fs.existsSync(this.envPath)) {
      this.env = {};
      return this.env;
    }

    const content = fs.readFileSync(this.envPath, 'utf-8');
    const lines = content.split('\n');

    for (const line of lines) {
      // Skip comments and empty lines
      if (line.trim().startsWith('#') || !line.trim()) continue;

      const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (match) {
        let value = match[2];
        // Clean inline comments
        if (value.includes('#')) {
          value = value.split('#')[0].trim();
        }
        // Remove quotes
        value = value.replace(/^["']|["']$/g, '');
        this.env[match[1]] = value;
      }
    }

    return this.env;
  }

  validate() {
    return this.validator.validate(this.env);
  }

  getRequired() {
    const required = [];

    for (const [category, config] of Object.entries(this.validator.registry.categories)) {
      for (const [varName, spec] of Object.entries(config.variables)) {
        if (spec.required && !this.env[varName]) {
          required.push({
            name: varName,
            category,
            description: spec.description,
            canGenerate: spec.generateOnInstall
          });
        }
      }
    }

    return required;
  }

  exportTemplate() {
    const lines = [
      '# =============================================================================',
      '# DEEPKIT - Environment Configuration',
      '# =============================================================================',
      '# Generated from config/environment-registry.json',
      '# Secrets marked with generateOnInstall will be auto-generated during install',
      '# =============================================================================',
      ''
    ];

    for (const [category, config] of Object.entries(this.validator.registry.categories)) {
      lines.push(`# ${category.toUpperCase().replace(/_/g, ' ')}`);
      lines.push('# ' + '-'.repeat(70));

      for (const [varName, spec] of Object.entries(config.variables)) {
        if (spec.description) {
          lines.push(`# ${spec.description}`);
        }

        const value = spec.default !== null ? spec.default : '';
        let comment = '';

        if (spec.generateOnInstall) {
          comment = ' # Auto-generated on install';
        } else if (spec.required) {
          comment = ' # REQUIRED';
        }

        lines.push(`${varName}=${value}${comment}`);
      }

      lines.push('');
    }

    return lines.join('\n');
  }
}

module.exports = EnvironmentLoader;
