/**
 * @author aliasgarbootwala@gmail.com
 */
import app, { connectDatabase } from "./app.js";
import http from "node:http";
import { env } from "./config/env.js";
/*
 * The connection is awaited here rather than at module scope in `app.ts`, so
 * importing the app has no side effect. A database that is down should stop
 * the server from starting — not kill an importing process, and not prevent
 * the test suite from building the app.
 */
try {
    await connectDatabase();
}
catch (error) {
    console.error("Failed to connect to the database:", error);
    process.exit(1);
}
const server = http.createServer(app);
const PORT = env.port;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
