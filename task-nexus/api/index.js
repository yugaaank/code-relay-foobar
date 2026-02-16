const serverless = require("serverless-http");
const path = require("path");

const app = require(path.join(__dirname, "../server/server"));

module.exports = serverless(app);