const { VueLoaderPlugin } = require('vue-loader')
const wbepack = require('webpack')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const HtmlWebpackInlineSourcePlugin = require('html-webpack-inline-source-plugin')
const path = require('path')

module.exports = {
  entry: ['./src/index.js'],
  output: {
    path: path.resolve(__dirname, 'build'),
    publicPath: '/',
  },
  resolve: {
    extensions: ['*', '.js', '.vue'],
    fallback: {
      crypto: require.resolve('crypto-browserify'),
      buffer: require.resolve('buffer/'),
      stream: require.resolve('stream-browserify/'),
    },
  },
  module: {
    rules: [
      {
        test: /\.vue$/,
        loader: 'vue-loader',
      },
      {
        test: /\.js$/,
        loader: 'babel-loader',
      },
      {
        test: /\.css$/,
        use: [
          'vue-style-loader',
          {
            loader: 'css-loader',
            options: { importLoaders: 1 },
          },
        ],
      },
      {
        test: /\.(png|svg|jpg|gif)$/,
        loader: 'file-loader',
        options: {
          publicPath: 'build',
          esModule: false,
        },
      },
    ],
  },
  plugins: [
    new VueLoaderPlugin(),
    new HtmlWebpackPlugin({
      template: 'static/index.ejs',
      filename: 'index.html',
      inlineSource: '.(js|css)',
    }),
    // new HtmlWebpackInlineSourcePlugin(),
  ],
}
