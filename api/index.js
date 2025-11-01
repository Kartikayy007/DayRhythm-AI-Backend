// Vercel serverless function entry point
// This imports the Express app and exports it as a serverless handler

const app = require('../dist/server.js').default;

module.exports = app;
