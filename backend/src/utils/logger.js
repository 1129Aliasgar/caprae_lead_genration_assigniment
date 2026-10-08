/**
 * Application logger.
 *
 * Call sites never change:
 *
 *   this.logger.info("user request for register", { userId })
 *   this.logger.error("MinIO upload failed", { key })
 *   this.logger.warn("video not found", { videoId })
 *
 * Every line carries the timestamp and, when the call happens inside a
 * request, that request's id, IP and user agent — pulled from
 * AsyncLocalStorage rather than passed in. See `utils/requestContext.ts`.
 */
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { injectable } from "inversify";
import { getRequestContext } from "./requestContext.js";
const LEVEL_RANK = {
    debug: 10,
    info: 20,
    warn: 30,
    error: 40,
};
/**
 * Lines below this level are dropped. `LOG_LEVEL` lets a noisy
 * environment raise the floor without a code change.
 */
function threshold() {
    const configured = (process.env.LOG_LEVEL ?? "info").toLowerCase();
    const rank = LEVEL_RANK[configured];
    return rank ?? LEVEL_RANK.info;
}
let Logger = class Logger {
    debug(message, meta = {}) {
        this.write("debug", message, meta);
    }
    info(message, meta = {}) {
        this.write("info", message, meta);
    }
    warn(message, meta = {}) {
        this.write("warn", message, meta);
    }
    /**
     * `meta.stack` and `meta.cause` are rendered on their own lines so an
     * Error survives the trip instead of collapsing to "[object Object]".
     */
    error(message, meta = {}) {
        this.write("error", message, meta);
    }
    write(level, message, meta = {}) {
        if (LEVEL_RANK[level] < threshold()) {
            return;
        }
        const timestamp = new Date().toISOString();
        const context = getRequestContext();
        /*
         * `stack` and `cause` are hoisted out of the printed object: an
         * Error passed inside meta would otherwise serialise as
         * [object Object] and the trace would be lost.
         */
        const { stack, cause, ...fields } = meta;
        const segments = [timestamp, level.toUpperCase().padEnd(5)];
        if (context) {
            segments.push(`[req:${context.requestId}]`);
            segments.push(context.ip);
            segments.push(context.userAgent);
            /* Present once authMiddleware has resolved the token. */
            if (context.userId) {
                segments.push(`(user:${context.userId})`);
            }
        }
        segments.push(message);
        const line = segments.join(" ");
        /*
         * Route by severity so `docker logs` and any downstream collector can
         * filter on the stream, and a failure is not buried on stdout.
         */
        const emit = level === "error" || level === "warn" ? console.error : console.log;
        if (Object.keys(fields).length > 0) {
            emit(line, fields);
        }
        else {
            emit(line);
        }
        if (stack) {
            console.error(typeof stack === "string" ? stack : String(stack));
        }
        if (cause instanceof Error && cause.stack) {
            console.error(cause.stack);
        }
    }
};
Logger = __decorate([
    injectable()
], Logger);
export default Logger;
