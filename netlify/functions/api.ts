import serverless from "serverless-http";
import express from "express";
import { apiRouter } from "../../src/api.js";

const app = express();
app.use(express.json({ limit: '50mb' }));

// Mount the API router
app.use("/api", apiRouter);

// Export the serverless handler
export const handler = serverless(app);
