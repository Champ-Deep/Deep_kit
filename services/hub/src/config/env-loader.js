const dotenv = require('dotenv');
const EnvironmentValidator = require('./env-validator');

class EnvironmentLoader {
  constructor(registryPath, envPath = '.env') {
    this.validator = new EnvironmentValidator(registryPath);
    this.envPath = envPath;
    this.env = {};
  }

  load() {
    // Load .env file
    const result = dotenv.config({ path: this.envPath });

    if (result.error) {
      // Don't throw if .env doesn't exist, we might be generating it
      if (result.error.code === 'ENOENT') {
         this.env = {};
         return this.env;
      }
      throw new Error(`Failed to load .env file: ${result.error.message}`);
    }

    this.env = result.parsed;
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
    const lines = ['# DeepKit Environment Configuration', '# Generated from environment-registry.json', ''];

    for (const [category, config] of Object.entries(this.validator.registry.categories)) {
      lines.push(`# ${category.toUpperCase().replace(/_/g, ' ')}`);

      for (const [varName, spec] of Object.entries(config.variables)) {
        if (spec.description) {
          lines.push(`# ${spec.description}`);
        }

        const value = spec.default !== null ? spec.default : '';
        const required = spec.required ? ' (REQUIRED)' : ' (OPTIONAL)';

        lines.push(`${varName}=${value}${spec.type === 'secret' ? ' # Auto-generated on install' : required}`);
      }

      lines.push('');
    }

    return lines.join('\n');
  }
}

module.exports = EnvironmentLoader;
