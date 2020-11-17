const webpack = require('webpack')
const CopyPlugin = require('copy-webpack-plugin')

const commitDate = require('child_process')
  .execSync('git log -1 --format=%cs HEAD')
  .toString().replace(/-/g, '').trim()

const commitHash = require('child_process')
  .execSync('git log -1 --format=%h HEAD')
  .toString().trim()

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
          test: /\.(gif|png|ogg|wav|mp3)$/i,
          use: ['url-loader'],
        },
        {
          test: /\.(db)$/i,
          loader: 'file-loader',
          options: {
            name: '[path][name].[ext]',
          },      
        },
        {
          test: /\.worker\.(.*)js$/,
          use: { loader: "worker-loader", options: { inline: true } },
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
        __COMMITDATE__: JSON.stringify(commitDate),
        __COMMITHASH__: JSON.stringify(commitHash),
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

      new CopyPlugin({patterns: [
        {from: 'assets/css'},
        {from: 'assets/media/logo.png', to: 'favicon.ico'},
        {from: 'assets/media/Loading_indicator.gif'},
      ]}),
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
