/**
 * @author aliasgarbootwala@gmail.com
 */
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { httpPost, controller, httpGet } from "inversify-express-utils";
import { inject } from "inversify";
import { TYPES } from "../config/types.js";
import BaseController from "./base.controller.js";
import { STATUS_CODE } from "../constants/statusCode.js";
import { loginSchema, registerSchema } from "../validators/auth.validator.js";
import AuthService from "../services/auth.service.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import Logger from "../utils/logger.js";
import { AUTH_BASE_ROUTE } from "../constants/routes.constants.js";
import { resolveToken } from "../utils/token.js";
let AuthController = class AuthController extends BaseController {
    authService;
    logger;
    async register(req, res) {
        try {
            const { error } = registerSchema.validate(req.body);
            if (error) {
                return this.error(res, error.details[0].message, STATUS_CODE.BAD_REQUEST);
            }
            const user = await this.authService.register({
                ...req.body,
            });
            res.cookie("token", user.token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "lax",
            });
            return this.success(res, user, STATUS_CODE.CREATED);
        }
        catch (error) {
            return this.handleError(res, error);
        }
    }
    async login(req, res) {
        try {
            const { error } = loginSchema.validate(req.body);
            if (error) {
                return this.error(res, error.details[0].message, STATUS_CODE.BAD_REQUEST);
            }
            const user = await this.authService.login(req.body);
            res.cookie("token", user.token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "lax",
            });
            return this.success(res, user, STATUS_CODE.OK);
        }
        catch (error) {
            return this.handleError(res, error);
        }
    }
    async profile(req, res) {
        try {
            const { token } = req.cookies;
            const user = await this.authService.profile({
                userId: req.user.userId,
                token,
            });
            return this.success(res, user, STATUS_CODE.OK);
        }
        catch (error) {
            return this.handleError(res, error);
        }
    }
    async logout(req, res) {
        this.logger.info("requesting logout", { userId: req.user?.userId });
        try {
            /*
             * The same resolution the middleware used — Bearer first, cookie second.
             * Reading only `req.cookies` here meant logout silently did nothing for
             * any client authenticating by header, which is every non-browser client.
             */
            const token = resolveToken(req);
            if (!token) {
                return this.error(res, "No token to revoke", STATUS_CODE.UNAUTHORIZED);
            }
            await this.authService.logout({ token });
            res.clearCookie("token", {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "lax",
            });
            return this.success(res, { message: "Logged out successfully" }, STATUS_CODE.OK);
        }
        catch (error) {
            return this.handleError(res, error);
        }
    }
};
__decorate([
    inject(TYPES.AuthService),
    __metadata("design:type", AuthService)
], AuthController.prototype, "authService", void 0);
__decorate([
    inject(TYPES.Logger),
    __metadata("design:type", Logger)
], AuthController.prototype, "logger", void 0);
__decorate([
    httpPost("/register"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "register", null);
__decorate([
    httpPost("/login"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "login", null);
__decorate([
    httpGet("/profile", authMiddleware),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "profile", null);
__decorate([
    httpGet("/logout", authMiddleware),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "logout", null);
AuthController = __decorate([
    controller(AUTH_BASE_ROUTE)
], AuthController);
export default AuthController;
