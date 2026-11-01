const path = require("path");
const webpack = require("webpack");
const base = require("../../webpack.config.js");

module.exports = {
    ...base,
    mode: "production",
    target: "web",
    devtool: false,
    entry: { engine: path.resolve(__dirname, "entry.js") },
    output: {
        path: path.resolve(__dirname, "dist"),
        filename: "[name].js",
        publicPath: "",
        globalObject: "this",
        assetModuleFilename: "assets/[hash][ext][query]",
        clean: true
    },
    plugins: [
        ...base.plugins.filter(p => !["CompressionPlugin", "CopyPlugin"].includes(p.constructor.name)),
        new webpack.optimize.LimitChunkCountPlugin({ maxChunks: 1 })
    ],
    optimization: { minimize: true, splitChunks: false, runtimeChunk: false }
};
