const EnvironmentLoader = require('../services/hub/src/config/env-loader');
const path = require('path');

const loader = new EnvironmentLoader(
  path.join(__dirname, '../config/environment-registry.json')
);

console.log(loader.exportTemplate());
