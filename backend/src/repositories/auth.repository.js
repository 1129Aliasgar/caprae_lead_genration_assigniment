/**
 * @author aliasgarbootwala@gmail.com
 */
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { injectable } from "inversify";
import { User } from "../models/user.model.js";
import { BlacklistToken } from "../models/blacklistToken.model.js";
let AuthRepository = class AuthRepository {
    async createUser(userData) {
        return await User.create(userData);
    }
    async findByEmail(email) {
        return await User.findOne({ email }).select("+password");
    }
    /**
     * The public shape of a user.
     *
     * `resumeText` is excluded: it is up to 20k characters of raw input that no
     * client needs after extraction, and this endpoint is read on every page
     * load. `password` is already `select: false` on the schema.
     */
    async findUserById(id) {
        return await User.findById(id).select("-resumeText");
    }
    async isTokenBlacklisted(token) {
        return await BlacklistToken.findOne({ token });
    }
    async createToken(token) {
        return await BlacklistToken.create({ token });
    }
};
AuthRepository = __decorate([
    injectable()
], AuthRepository);
export default AuthRepository;
