import http from "node:http";
import { app } from "../../api/app.js";


export const httpServer = http.createServer(app);
