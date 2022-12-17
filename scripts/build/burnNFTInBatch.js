"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
require('dotenv').config();
const utils_1 = require("./utils");
const nearAPI = __importStar(require("near-api-js"));
const config_1 = require("./config");
const near_seed_phrase_1 = require("near-seed-phrase");
const near_api_js_1 = require("near-api-js");
const { connect } = nearAPI;
function burnNFTInBatch() {
    return __awaiter(this, void 0, void 0, function* () {
        const gatewayConfig = yield (0, config_1.getConfig)();
        const { config, contractAccountId } = gatewayConfig;
        const nearConnection = yield connect(config);
        let userSeedPhrase = "horror swallow height behave defense scare mobile ready deer margin brick unveil";
        let series_id = 12;
        let amount = 5;
        const { seedPhrase, publicKey, secretKey } = (0, near_seed_phrase_1.parseSeedPhrase)(userSeedPhrase);
        let owner_public_key = publicKey.split(":")[1];
        console.log({ seedPhrase, publicKey, secretKey });
        const keypair = near_api_js_1.KeyPair.fromString(secretKey);
        const newUserAcct = yield (0, utils_1.createAccessKeyAccount)(nearConnection, keypair);
        const signature = yield (0, utils_1.generateUserSignature)(newUserAcct, userSeedPhrase);
        yield newUserAcct.functionCall({
            contractId: contractAccountId,
            methodName: "batch_burn",
            args: {
                series_id,
                amount,
                owner_public_key,
                signature
            },
            gas: 300000000000000,
        });
    });
}
burnNFTInBatch().then(() => process.exit(), err => {
    console.error(err);
    process.exit(-1);
});
