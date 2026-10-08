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
import { inject, injectable } from "inversify";
import { TYPES } from "../config/types.js";
import bcrypt from "bcrypt";
import { generateToken } from "../utils/token.js";
import Logger from "../utils/logger.js";
import AuthRepository from "../repositories/auth.repository.js";
import { STATUS_CODE } from "../constants/statusCode.js";
import ApiError from "../utils/apiError.js";
let AuthService = class AuthService {
    authRepository;
    logger;
    apiError;
    async register(userData) {
        this.logger.info("Registering user", { email: userData.email });
        const existingUser = await this.authRepository.findByEmail(userData.email);
        if (existingUser) {
            this.logger.warn("Registration rejected: email already registered", {
                email: userData.email,
            });
            throw new ApiError("User already exists", STATUS_CODE.CONFLICT);
        }
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        const user = await this.authRepository.createUser({
            username: userData.username,
            email: userData.email,
            password: hashedPassword,
        });
        const checknewUser = await this.authRepository.findUserById(user.id);
        if (!checknewUser) {
            this.logger.error("User was written but could not be read back", {
                userId: user.id,
            });
            throw new ApiError("Something went wrong while registering", STATUS_CODE.INTERNAL_SERVER_ERROR);
        }
        this.logger.info("User registered", { userId: user.id });
        const token = generateToken({
            userId: user.id,
        });
        return { user: checknewUser, token };
    }
    async login(userData) {
        this.logger.info("login try ", { email: userData.email });
        const user = await this.authRepository.findByEmail(userData.email);
        if (!user) {
            this.logger.warn("Login rejected: no account for that email", {
                userEmail: userData.email,
            });
            throw new ApiError("User not found", STATUS_CODE.NOT_FOUND);
        }
        const isPasswordValid = await bcrypt.compare(userData.password, user.password);
        if (!isPasswordValid) {
            this.logger.warn("Login rejected: wrong password", {
                userId: user.id,
            });
            throw new ApiError("Invalid password", STATUS_CODE.UNAUTHORIZED);
        }
        const token = generateToken({
            userId: user.id,
        });
        return { user, token };
    }
    async profile(UserData) {
        this.logger.info("requesting profile", { userId: UserData.userId });
        /*
         * No blacklist check here. `authMiddleware` rejects a revoked token before
         * any handler runs, so by the time this executes the token is known live —
         * and checking again would query the blacklist on this one route while
         * every other route relied on the middleware, which is how the two drifted
         * apart in the first place.
         */
        const user = await this.authRepository.findUserById(UserData.userId);
        if (!user) {
            this.logger.warn("Profile rejected: user no longer exists", {
                userId: UserData.userId,
            });
            throw new ApiError("User not found", STATUS_CODE.NOT_FOUND);
        }
        return { user };
    }
    async logout(token) {
        this.logger.info("logout try for");
        const isBlacklisted = await this.authRepository.isTokenBlacklisted(token.token);
        if (isBlacklisted) {
            this.logger.warn("Logout rejected: token is already blacklisted");
            throw new ApiError("token is already blacklisted", STATUS_CODE.UNAUTHORIZED);
        }
        const result = await this.authRepository.createToken(token.token);
        return result;
    }
};
__decorate([
    inject(TYPES.AuthRepository),
    __metadata("design:type", AuthRepository)
], AuthService.prototype, "authRepository", void 0);
__decorate([
    inject(TYPES.Logger),
    __metadata("design:type", Logger)
], AuthService.prototype, "logger", void 0);
__decorate([
    inject(TYPES.ApiError),
    __metadata("design:type", ApiError)
], AuthService.prototype, "apiError", void 0);
AuthService = __decorate([
    injectable()
], AuthService);
export default AuthService;
