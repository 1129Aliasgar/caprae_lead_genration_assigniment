/**
 * @author aliasgarbootwala@gmail.com
 */
import "./config/config.js";
import express from "express";
import "reflect-metadata";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import { InversifyExpressServer } from "inversify-express-utils";
import container from "./config/container.js";
import "./controllers/index.js";
import { TYPES } from "./config/types.js";
import { requestContextMiddleware } from "./middlewares/requestContext.middleware.js";
import cors from "cors";
import { env } from "./config/env.js";
import { buildCorsOptions } from "./config/cors.js";
import { profileRateLimiter, recommendationRateLimiter, } from "./middlewares/rateLimit.middleware.js";
import { BODY_SIZE_LIMIT, HEALTH_ROUTE, PROFILE_BASE_ROUTE, RECOMMENDATIONS_BASE_ROUTE, } from "./constants/routes.constants.js";
const server = new InversifyExpressServer(container);
server.setConfig((app) => {
    /*
     * First, so every later log line — including the body parsers and
     * morgan — carries the request id.
     */
    app.use(requestContextMiddleware);
    /*
     * 64kb, up from the previous 16kb.
     *
     * A pasted resume runs to tens of kilobytes on its own — a typical one is
     * 20-40kb of text, and the extracted-profile echo is smaller but not tiny.
     * At 16kb the body parser rejected the request with a bare 413 before any
     * handler ran, so `resumeText` could never reach Joi for a realistic resume.
     *
     * 64kb is a ceiling, not a target: extraction regexes over the text, so an
     * unbounded body would be a CPU-cost lever rather than just a bandwidth one.
     */
    app.use(express.json({ limit: BODY_SIZE_LIMIT }));
    app.use(express.urlencoded({ extended: true, limit: BODY_SIZE_LIMIT }));
    app.use(morgan("dev"));
    app.use(cookieParser());
    app.use(express.static("public"));
    /*
     * Policy lives in `config/cors.ts`; this only mounts it.
     *
     * The notable part is that `origin` is a *function*. Passing the configured
     * value straight through — which is what this used to do — meant
     * `CORS_ORIGIN=*` produced `Access-Control-Allow-Origin: *` alongside
     * `Access-Control-Allow-Credentials: true`. Browsers reject that pairing
     * outright, so the preflight returned 204 and the browser silently dropped
     * every subsequent request: register and login appeared to hang while the
     * network tab showed a successful preflight and no POST at all.
     *
     * Reflecting the requesting origin is valid with credentials, so long as the
     * allowlist is still enforced — which the resolver does.
     */
    app.use(cors(buildCorsOptions(env.corsOrigin)));
    /*
     * Rate limiting is mounted after the body parsers but before the routers, so
     * a rejected request never reaches a handler and never touches Mongo.
     *
     * Mounted by path rather than per-route because these controllers own their
     * routes internally — `inversify-express-utils` registers them when the
     * controller module is evaluated, which happens at the `import
     * "./controllers/index.js"` above and is not reachable from this config
     * callback.
     */
    app.use(PROFILE_BASE_ROUTE, profileRateLimiter);
    app.use(RECOMMENDATIONS_BASE_ROUTE, recommendationRateLimiter);
});
const app = server.build();
app.get(HEALTH_ROUTE, (req, res) => {
    res.send("OK");
});
/**
 * Open the database connection.
 *
 * Exported rather than done at module scope. A top-level `await` here made
 * `import "./app.js"` a promise, which meant:
 *
 *  - the Jest integration suite could not import the app at all (its
 *    CommonJS transform has no top-level await), and
 *  - a connection failure called `process.exit(1)` as a side effect of
 *    *importing*, so a consumer could not catch it.
 *
 * `server.ts` awaits this before listening, which is where the original
 * behaviour — refuse to serve without a database — actually belongs.
 */
export async function connectDatabase() {
    const db = container.get(TYPES.Database);
    await db.connect();
}
export default app;
