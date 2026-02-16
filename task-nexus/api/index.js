const path = require("path");
const app = require(path.join(__dirname, "../server/server"));

// Vercel serverless function entrypoint
module.exports = app;
