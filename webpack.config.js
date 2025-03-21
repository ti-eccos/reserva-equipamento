const path = require('path');

module.exports = {
  entry: './src/index.js', // Ponto de entrada do seu aplicativo
  output: {
    filename: 'bundle.js', // Nome do arquivo de saída
    path: path.resolve(__dirname, 'dist'), // Pasta de saída
  },
  module: {
    rules: [
      {
        test: /\.js$/, // Processa arquivos JavaScript
        exclude: /node_modules/, // Ignora a pasta node_modules
        use: 'babel-loader', // Usa o Babel para transpilar o código
      },
    ],
  },
  devServer: {
    static: './dist', // Pasta para servir arquivos estáticos
    hot: true, // Ativa o Hot Module Replacement (HMR)
  },
};