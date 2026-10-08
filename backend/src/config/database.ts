/**
 * @author aliasgarbootwala@gmail.com
 */

import mongoose from "mongoose";
import { injectable } from "inversify";
import { IDatabase } from "../types/database.types.js";
import ApiError from "../utils/apiError.js";
import { STATUS_CODE } from "../constants/statusCode.js";

mongoose.set("strictQuery", true);
mongoose.set("autoIndex", false);

@injectable()
export default class MongoDatabase implements IDatabase {
  private readonly mongoUri: string;

  /**
   * The URI arrives from the container (see `config/container.ts`), which
   * sources it from `config/env.ts`.
   *
   * It was previously re-read from `process.env` here, ignoring the argument
   * — which made the constructor's parameter decorative and left the class
   * impossible to construct against any database other than the one named in
   * the environment. The env check is kept as a guard: `env` already fails at
   * startup if `MONGO_URI` is missing, so reaching here without a URI means it
   * was constructed outside the container.
   */
  constructor(mongoUri: string) {
    if (!mongoUri) {
      throw new ApiError(
        "MONGO_URI is not defined",
        STATUS_CODE.INTERNAL_SERVER_ERROR,
      );
    }

    this.mongoUri = mongoUri;
  }

  async connect(): Promise<void> {
    try {
      await mongoose.connect(this.mongoUri);
      console.log("MongoDB connected");
    } catch (error) {
      console.error("MongoDB connection error:", error);
      throw new ApiError("MongoDB connection error", STATUS_CODE.INTERNAL_SERVER_ERROR, [], "", null, false);
    }
  }

  async disconnect(): Promise<void> {
    await mongoose.disconnect();
    console.log("MongoDB disconnected");
  }
}
