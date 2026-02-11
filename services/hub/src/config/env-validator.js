const fs = require('fs');
const crypto = require('crypto');

class EnvironmentValidator {
  constructor(registryPath) {
    this.registry = JSON.parse(fs.readFileSync(registryPath, 'utf-8'));
    this.errors = [];
    this.warnings = [];
  }

  validate(envVars) {
    this.errors = [];
    this.warnings = [];

    for (const [category, config] of Object.entries(this.registry.categories)) {
      for (const [varName, spec] of Object.entries(config.variables)) {
        const value = envVars[varName];

        // Check required variables
        if (spec.required && !value) {
          this.errors.push({
            variable: varName,
            category,
            error: 'Required variable is missing',
            severity: 'critical'
          });
          continue;
        }

        if (!value) continue; // Skip validation for optional missing vars

        // Type validation
        if (spec.type === 'integer' && !Number.isInteger(Number(value))) {
          this.errors.push({
            variable: varName,
            error: `Expected integer, got ${typeof value}`
          });
        }

        // Length validation
        if (spec.validation?.minLength && value.length < spec.validation.minLength) {
          this.errors.push({
            variable: varName,
            error: `Length ${value.length} below minimum ${spec.validation.minLength}`
          });
        }

        // Pattern validation
        if (spec.validation?.pattern) {
          const regex = new RegExp(spec.validation.pattern);
          if (!regex.test(value)) {
            this.errors.push({
              variable: varName,
              error: `Does not match required pattern`
            });
          }
        }

        // Entropy check for secrets
        if (spec.type === 'secret' && spec.validation?.entropy) {
          const entropy = this.calculateEntropy(value);
          if (entropy < spec.validation.entropy) {
            this.warnings.push({
              variable: varName,
              warning: `Low entropy (${entropy} < ${spec.validation.entropy}). Weak password.`
            });
          }
        }
      }
    }

    return {
      valid: this.errors.length === 0,
      errors: this.errors,
      warnings: this.warnings
    };
  }

  calculateEntropy(str) {
    // Shannon entropy calculation
    const freq = {};
    for (const char of str) {
      freq[char] = (freq[char] || 0) + 1;
    }

    let entropy = 0;
    for (const count of Object.values(freq)) {
      const p = count / str.length;
      entropy -= p * Math.log2(p);
    }

    return entropy * str.length;
  }

  generateSecret(spec) {
    if (spec.validation?.hexadecimal) {
      const length = spec.validation.exactLength || spec.validation.minLength || 32;
      return crypto.randomBytes(length / 2).toString('hex');
    }

    const length = spec.validation?.minLength || 32;
    return crypto.randomBytes(length).toString('base64').substring(0, length);
  }
}

module.exports = EnvironmentValidator;
