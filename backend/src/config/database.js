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
import mongoose from "mongoose";
import { injectable } from "inversify";
import ApiError from "../utils/apiError.js";
import { STATUS_CODE } from "../constants/statusCode.js";
mongoose.set("strictQuery", true);
mongoose.set("autoIndex", false);
let MongoDatabase = class MongoDatabase {
    mongoUri;
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
    constructor(mongoUri) {
        if (!mongoUri) {
            throw new ApiError("MONGO_URI is not defined", STATUS_CODE.INTERNAL_SERVER_ERROR);
        }
        this.mongoUri = mongoUri;
    }
    async connect() {
        try {
            await mongoose.connect(this.mongoUri);
            console.log("MongoDB connected");
        }
        catch (error) {
            console.error("MongoDB connection error:", error);
            throw new ApiError("MongoDB connection error", STATUS_CODE.INTERNAL_SERVER_ERROR, [], "", null, false);
        }
    }
    async disconnect() {
        await mongoose.disconnect();
        console.log("MongoDB disconnected");
    }
};
MongoDatabase = __decorate([
    injectable(),
    __metadata("design:paramtypes", [String])
], MongoDatabase);
export default MongoDatabase;
