/**
 * @author aliasgarbootwala@gmail.com
 */

import { injectable } from "inversify";
import { User } from "../models/user.model.js";
import { CreateUserInput } from "../types/auth.types.js";
import { BlacklistToken } from "../models/blacklistToken.model.js";
import mongoose from "mongoose";

@injectable()
export default class AuthRepository {
  async createUser(userData: CreateUserInput) {
    return await User.create(userData);
  }

  async findByEmail(email: string) {
    return await User.findOne({ email }).select("+password");
  }

  /**
   * The public shape of a user.
   *
   * `resumeText` is excluded: it is up to 20k characters of raw input that no
   * client needs after extraction, and this endpoint is read on every page
   * load. `password` is already `select: false` on the schema.
   */
  async findUserById(id: string) {
    return await User.findById(id).select("-resumeText");
  }

  async isTokenBlacklisted(token: string) {
    return await BlacklistToken.findOne({ token });
  }

  async createToken(token: string) {
    return await BlacklistToken.create({ token });
  }

}
