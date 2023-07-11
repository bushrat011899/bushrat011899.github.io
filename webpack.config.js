const path = require('path');
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin");
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
    module: {
        rules: [
            {
                test: /\.s[ac]ss$/i,
                use: [
                    // Extract Bundle Into a ".css" File
                    MiniCssExtractPlugin.loader,
                    // Bundle Compiled CSS
                    "css-loader",
                    // Compile SCSS
                    "sass-loader",
                ],
            },
            {
                test: /\.ts$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
        ],
    },

    entry: './src/index.ts',

    resolve: {
        extensions: ['.ts', '.js'],
    },

    output: {
        filename: 'bundle.js',
        path: path.resolve(__dirname, 'dist'),
        clean: true,
    },

    optimization: {
        minimizer: [
            `...`,
            new CssMinimizerPlugin(),
        ],
    },

    plugins: [
        new MiniCssExtractPlugin(),
        new HtmlWebpackPlugin({
            filename: '../index.html',
            template: 'src/pages/index.html'
        })
    ]
};