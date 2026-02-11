const esbuild = require('esbuild');

esbuild.buildSync({
  entryPoints: ['dist/index.js'],
  bundle: true,
  outfile: 'bundle/index.js',
  platform: 'node',
  target: 'node18',
  format: 'cjs',
  // Express and pg are peer deps - provided by host service
  external: ['express', 'pg'],
  minify: false,
  sourcemap: true,
});

console.log('Bundled deepkit-fabric -> bundle/index.js');
