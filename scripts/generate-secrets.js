#!/usr/bin/env node

/**
 * generate-secrets.js - Generate cryptographic secrets for DeepKit
 *
 * Reads the environment registry to find all variables marked with generateOnInstall
 * and generates secure random values for any that are empty in .env
 *
 * Usage: node scripts/generate-secrets.js
 */

const fs = require('fs');
const path = require('path');
const EnvironmentValidator = require('./env-validator');

const registryPath = path.join(__dirname, '../config/environment-registry.json');
const envPath = path.join(__dirname, '../.env');

// Initialize validator
const validator = new EnvironmentValidator(registryPath);

// Check if .env exists
if (!fs.existsSync(envPath)) {
  console.error('❌ .env file does not exist. Run "cp .env.example .env" first.');
  process.exit(1);
}

// Read current .env
const envFile = fs.readFileSync(envPath, 'utf-8');
const lines = envFile.split('\n');

let secretsGenerated = 0;
const generatedSecrets = [];

// Process each line
const updatedLines = lines.map(line => {
  // Skip comments and empty lines
  if (line.trim().startsWith('#') || !line.trim()) {
    return line;
  }

  const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (!match) return line;

  let [full, varName, value] = match;

  // Clean value from inline comments
  if (value.includes('#')) {
    value = value.split('#')[0].trim();
  }

  // Remove quotes if present
  value = value.replace(/^["']|["']$/g, '');

  // Find spec in registry
  for (const category of Object.values(validator.registry.categories)) {
    const spec = category.variables[varName];
    if (spec && spec.generateOnInstall && (!value || value === '')) {
      const generated = validator.generateSecret(spec);
      secretsGenerated++;
      generatedSecrets.push(varName);
      return `${varName}=${generated}`;
    }
  }

  return line;
});

// Write updated .env
fs.writeFileSync(envPath, updatedLines.join('\n'));

// Report results
if (secretsGenerated > 0) {
  console.log(`✅ Generated ${secretsGenerated} secret(s):`);
  generatedSecrets.forEach(name => {
    console.log(`   - ${name}`);
  });
} else {
  console.log('✅ All secrets already configured');
}

// Run validation
const envVars = {};
updatedLines.forEach(line => {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (match) {
    let value = match[2];
    if (value.includes('#')) value = value.split('#')[0].trim();
    value = value.replace(/^["']|["']$/g, '');
    envVars[match[1]] = value;
  }
});

const result = validator.validate(envVars);

if (result.warnings.length > 0) {
  console.log('\n⚠️  Warnings:');
  result.warnings.forEach(w => {
    console.log(`   - ${w.variable}: ${w.warning}`);
  });
}

if (!result.valid) {
  console.log('\n❌ Configuration errors:');
  result.errors.forEach(e => {
    console.log(`   - ${e.variable}: ${e.error}`);
  });
  process.exit(1);
}
