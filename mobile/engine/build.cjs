// Bundles the CyberChef core into a single engine.js (+ engine.html) for the Android WebView.
const fs = require("fs");
const path = require("path");
const webpack = require("webpack");
const config = require("./webpack.engine.config.js");

webpack(config, (err, stats) => {
    if (err) { console.error(err); process.exit(1); }
    if (stats.hasErrors()) { console.error(stats.toString({ colors: false, errors: true, all: false })); process.exit(1); }
    fs.copyFileSync(path.join(__dirname, "index.html"), path.join(__dirname, "dist", "engine.html"));
    console.log("Engine built:", path.join(__dirname, "dist"));
});
