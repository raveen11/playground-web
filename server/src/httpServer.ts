import http from "node:http";
import {app} from "./app.js";


export const httpServer = http.createServer(app);