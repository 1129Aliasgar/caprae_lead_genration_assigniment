/**
 * @author aliasgarbootwala@gmail.com
 */

import { inject, injectable } from "inversify";
import { TYPES } from "../config/types.js";
import bcrypt from "bcrypt";
import { generateToken } from "../utils/token.js";
import {
  RegisterUserInput,
  LoginUserInput,
  LogoutUserInput,
  ProfileUserInput,
} from "../types/auth.types.js";
import Logger from "../utils/logger.js";
import AuthRepository from "../repositories/auth.repository.js";
import { STATUS_CODE } from "../constants/statusCode.js";
import ApiError from "../utils/apiError.js";

@injectable()
export default class AuthService {
  @inject(TYPES.AuthRepository)
  authRepository!: AuthRepository;

  @inject(TYPES.Logger)
  logger!: Logger;

  @inject(TYPES.ApiError)
  apiError!: ApiError;

  async register(userData: RegisterUserInput) {
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

      throw new ApiError(
        "Something went wrong while registering",
        STATUS_CODE.INTERNAL_SERVER_ERROR,
      );
    }

    this.logger.info("User registered", { userId: user.id });

    const token = generateToken({
      userId: user.id,
    });

    return { user: checknewUser, token };
  }

  async login(userData: LoginUserInput) {
    this.logger.info("login try ", { email: userData.email });
    
    const user = await this.authRepository.findByEmail(userData.email);

    if (!user) {
      this.logger.warn("Login rejected: no account for that email", {
        userEmail: userData.email,
      });

      throw new ApiError("User not found", STATUS_CODE.NOT_FOUND);
    }

    const isPasswordValid = await bcrypt.compare(
      userData.password,
      user.password,
    );

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

  async profile(UserData: ProfileUserInput) {
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

  async logout(token: LogoutUserInput) {
    this.logger.info("logout try for");

    const isBlacklisted = await this.authRepository.isTokenBlacklisted(
      token.token,
    );

    if (isBlacklisted) {
      this.logger.warn("Logout rejected: token is already blacklisted");

      throw new ApiError(
        "token is already blacklisted",
        STATUS_CODE.UNAUTHORIZED,
      );
    }

    const result = await this.authRepository.createToken(token.token);

    return result;
  }
  
}

