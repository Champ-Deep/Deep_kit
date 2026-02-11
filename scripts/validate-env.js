const EnvironmentLoader = require('./env-loader');
const path = require('path');

const loader = new EnvironmentLoader(
  path.join(__dirname, '../config/environment-registry.json'),
  path.join(__dirname, '../.env')
);

loader.load();
const result = loader.validate();

if (!result.valid) {
  console.error('❌ Environment validation failed:');
  result.errors.forEach(err => {
    console.error(`  - ${err.variable}: ${err.error} (${err.category || ''})`);
  });
  process.exit(1);
}

if (result.warnings.length > 0) {
  console.warn('⚠️  Environment warnings:');
  result.warnings.forEach(warn => {
    console.warn(`  - ${warn.variable}: ${warn.warning}`);
  });
}

console.log('✅ Environment is valid');
