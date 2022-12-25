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
const { connect } = nearAPI;
function createCollection() {
    return __awaiter(this, void 0, void 0, function* () {
        const { config, contractAccountId } = yield (0, config_1.getConfig)();
        const nearConnection = yield connect(config);
        const adminAccount = yield nearConnection.account(contractAccountId);
        const { publicKey: adminPublicKey } = yield (0, utils_1.loadAdminKeys)();
        try {
            yield adminAccount.functionCall({
                contractId: contractAccountId,
                methodName: "new_default_meta",
                args: {
                    owner_id: adminAccount.accountId,
                    owner_public_key: adminPublicKey.split(":")[1],
                }
            });
        }
        catch (error) {
            console.log(error.kind.ExecutionError);
        }
        const new_badge_payload = {
            series_type: 1,
            metadata: {
                title: 'Blue badge',
                description: "first level badge in the gateway nft collection",
                media: "https://pbs.twimg.com/media/Fj4w5HiX0AIqk40?format=jpg&name=small",
            },
            royalty: null,
            price: null,
        };
        const nft_metadata = yield adminAccount.viewFunctionV2({
            contractId: contractAccountId,
            methodName: "nft_metadata",
            args: {}
        });
        console.log("-----------------NFT COLLECTION METADATA------------------------");
        console.log(nft_metadata);
        yield adminAccount.functionCall({
            contractId: contractAccountId,
            methodName: "create_series",
            args: Object.assign({}, new_badge_payload)
        });
        const totalBadges = yield adminAccount.viewFunctionV2({
            contractId: contractAccountId,
            methodName: "get_series_total_supply",
            args: {}
        });
        console.log(totalBadges);
    });
}
createCollection().then(() => process.exit(), err => {
    console.error(err);
    process.exit(-1);
});
