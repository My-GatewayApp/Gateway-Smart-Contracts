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
exports.sleep = exports.generateUserSignature = exports.generateAdminSignature = exports.createAccessKeyAccount = exports.getUserContract = exports.getAdminContract = exports.loadAdminKeys = void 0;
const near_seed_phrase_1 = require("near-seed-phrase");
const nearAPI = __importStar(require("near-api-js"));
const config_1 = require("./config");
const node_crypto_1 = require("node:crypto");
const { connect, Contract, KeyPair, Account, keyStores } = nearAPI;
function loadAdminKeys() {
    return __awaiter(this, void 0, void 0, function* () {
        return (0, near_seed_phrase_1.parseSeedPhrase)(process.env.GATEWAY_NFT_MARKETPLACE_SEED);
    });
}
exports.loadAdminKeys = loadAdminKeys;
;
function getAdminContract() {
    return __awaiter(this, void 0, void 0, function* () {
        const { config, contractAccountId } = yield (0, config_1.getConfig)();
        const nearConnection = yield connect(config);
        const adminAccount = yield nearConnection.account(contractAccountId);
        return new Contract(adminAccount, contractAccountId, config.contractMethods);
    });
}
exports.getAdminContract = getAdminContract;
function getUserContract(account) {
    return __awaiter(this, void 0, void 0, function* () {
        const { config, contractAccountId } = yield (0, config_1.getConfig)();
        return new Contract(account, contractAccountId, config.accessKeyMethods);
    });
}
exports.getUserContract = getUserContract;
function createAccessKeyAccount(near, key) {
    return __awaiter(this, void 0, void 0, function* () {
        const { config, contractAccountId, keyStore } = yield (0, config_1.getConfig)();
        yield keyStore.setKey(config.networkId, contractAccountId, key);
        return new Account(near.connection, contractAccountId);
    });
}
exports.createAccessKeyAccount = createAccessKeyAccount;
function generateAdminSignature(user) {
    return __awaiter(this, void 0, void 0, function* () {
        const { secretKey } = yield loadAdminKeys();
        const adminKeypair = KeyPair.fromString(secretKey);
        const { contractAccountId, } = yield (0, config_1.getConfig)();
        const userNonce = yield user.viewFunctionV2({
            contractId: contractAccountId,
            methodName: "get_nonce",
            args: {
                account_id: user.accountId
            }
        });
        const hash = (0, node_crypto_1.createHash)('sha256');
        //sign nonce using alice account(admin)
        const nextNonce = parseInt(userNonce) + 1;
        const message = nextNonce;
        hash.update(message.toString());
        const hashedMessage = hash.digest();
        const signedMessage = adminKeypair === null || adminKeypair === void 0 ? void 0 : adminKeypair.sign(hashedMessage);
        return Array.from(signedMessage.signature);
    });
}
exports.generateAdminSignature = generateAdminSignature;
function generateUserSignature(account, userSeedPhrase) {
    return __awaiter(this, void 0, void 0, function* () {
        //we assume user with (userSeedPhrase) is the owner... so should have the ability to sign
        // for withdrawals else, panic
        const { secretKey } = yield (0, near_seed_phrase_1.parseSeedPhrase)(userSeedPhrase);
        const userKeyPair = KeyPair.fromString(secretKey);
        const userAccountId = Buffer.from(userKeyPair.getPublicKey().data).toString('hex');
        const { contractAccountId, } = yield (0, config_1.getConfig)();
        const userNonce = yield account.viewFunctionV2({
            contractId: contractAccountId,
            methodName: "get_nonce",
            args: {
                account_id: userAccountId
            }
        });
        const hash = (0, node_crypto_1.createHash)('sha256');
        //sign nonce using user account(owner)
        const nextNonce = parseInt(userNonce) + 1;
        const message = nextNonce;
        hash.update(message.toString());
        const hashedMessage = hash.digest();
        const signedMessage = userKeyPair === null || userKeyPair === void 0 ? void 0 : userKeyPair.sign(hashedMessage);
        return Array.from(signedMessage.signature);
    });
}
exports.generateUserSignature = generateUserSignature;
const sleep = (ms) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
};
exports.sleep = sleep;
