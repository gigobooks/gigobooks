const webpack = require('webpack')
const CopyPlugin = require('copy-webpack-plugin')

module.exports = (env, argv) => {
  return {
    mode: argv.mode,

    // Enable sourcemaps for debugging webpack's output.
    devtool: "source-map",

    resolve: {
      // Add '.ts' and '.tsx' as resolvable extensions.
      extensions: [".js", ".ts", ".tsx"]
    },

    module: {
      rules: [
        {
          test: /\.ts(x?)$/,
          exclude: /node_modules/,
          use: [
            {
              loader: "ts-loader"
            }
          ]
        },
        {
          test: /\.css$/i,
          use: ['style-loader', 'css-loader'],
        },
        {
          test: /\.(ogg|wav|mp3)$/i,
          use: ['url-loader'],
        },
        // All output '.js' files will have any sourcemaps re-processed by 'source-map-loader'.
        {
          enforce: "pre",
          test: /\.js$/,
          loader: "source-map-loader"
        }
      ]
    },

    plugins: [
      new webpack.DefinePlugin({
        __DEV__: argv.mode === 'development',
      }),

      // https://github.com/knex/knex/issues/1446#issuecomment-537715431
      // force unused dialects to resolve to the only one we use
      // and for whom we have the dependencies installed
      new webpack.ContextReplacementPlugin(/knex\/lib\/dialects/, /sqlite3\/index.js/),

      // knex requires pg-connection-string which requires fs
      // replace pg-connection-string by a noop (conveniently from knex itself)
      new webpack.NormalModuleReplacementPlugin(/pg-connection-string/, 'knex/lib/util/noop'),

      // No-op these as they also reference fs
      new webpack.NormalModuleReplacementPlugin(/MigrationGenerator/, 'knex/lib/util/noop'),
      new webpack.NormalModuleReplacementPlugin(/fs-migrations/, 'knex/lib/util/noop'),

      // Also no-op fs
      new webpack.NormalModuleReplacementPlugin(/^fs$/, 'knex/lib/util/noop'),

      new CopyPlugin({patterns: [{from: 'assets/css'}]}),
    ],

    performance: {
      maxEntrypointSize: 1024000,
      maxAssetSize: 1024000
    },

    // When importing a module whose path matches one of the following, just
    // assume a corresponding global variable exists and use that instead.
    // This is important because it allows us to avoid bundling all of our
    // dependencies, which allows browsers to cache those libraries between builds.
    externals: {
    }
  }
}
