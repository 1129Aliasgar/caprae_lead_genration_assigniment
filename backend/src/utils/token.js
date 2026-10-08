import jwt from "jsonwebtoken";
export const generateToken = (payload) => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error("JWT_SECRET is not defined");
    }
    const options = {
        expiresIn: (process.env.JWT_EXPIRES_IN || "1d"),
    };
    return jwt.sign(payload, secret, options);
};
export const verifyToken = (token) => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error("JWT_SECRET is not defined");
    }
    return jwt.verify(token, secret);
};
/**
 * The raw JWT from a request, whichever way it was sent.
 *
 * Bearer header first, cookie second — the same precedence `authMiddleware`
 * uses. Both places need to resolve *the same* token: if logout read only the
 * cookie while auth accepted the header, then any client holding the JWT in a
 * header and no cookie (curl, a script, a native app) would authenticate fine
 * and "log out" to no effect at all.
 *
 * Lives here rather than in the middleware because the middleware must not
 * depend on a handler needing it.
 */
export function resolveToken(req) {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
        return authHeader.slice("Bearer ".length);
    }
    return req.cookies?.token;
}
