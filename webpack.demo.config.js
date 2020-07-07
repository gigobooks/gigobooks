const path = require('path')
const webpack = require('webpack')
const CopyPlugin = require('copy-webpack-plugin')
const parent = require('./webpack.config.js')

module.exports = (env, argv) => {
  const config = typeof parent === 'function' ? parent(env, argv) : parent

  config.output = {
    path: path.join(process.cwd(), 'demo', 'dist')
  }

  config.plugins.push(new webpack.NormalModuleReplacementPlugin(/\/Project$/, '../sql.js/Project-sqljs.ts'))
  config.plugins.push(new CopyPlugin({patterns: [
    {from: 'index.html', to: '..'},
    {from: 'node_modules/sql.js/dist/sql-wasm-debug.wasm'}
  ]}))

  return config
}
