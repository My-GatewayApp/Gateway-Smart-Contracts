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
exports.getConfig = void 0;
const nearAPI = __importStar(require("near-api-js"));
const utils_1 = require("./utils");
const { keyStores, KeyPair, InMemorySigner } = nearAPI;
function getConfig() {
    return __awaiter(this, void 0, void 0, function* () {
        //env variables
        const NETWORK_ID = process.env.NETWORK_ID;
        const CONTRACT_ACCOUNT_ID = process.env.CONTRACT_ACCOUNT_ID;
        const CONTRACT_NAME = process.env.CONTRACT_NAME;
        const myKeyStore = new keyStores.InMemoryKeyStore();
        const signer = new InMemorySigner(myKeyStore);
        const { secretKey } = yield (0, utils_1.loadAdminKeys)();
        const keyPair = KeyPair.fromString(secretKey);
        yield myKeyStore.setKey(NETWORK_ID, CONTRACT_ACCOUNT_ID, keyPair);
        const config = {
            networkId: NETWORK_ID,
            keyStore: myKeyStore,
            contractName: CONTRACT_NAME,
            signer,
            GAS: "300000000000000",
            contractMethods: {
                changeMethods: [
                    "new_default_meta",
                    "nft_revoke",
                    "nft_revoke_all",
                    "nft_burn",
                    "batch_burn",
                    "nft_transfer_call",
                    "nft_resolve_transfer",
                    "add_approved_minter",
                    "remove_approved_minter",
                    "add_approved_creator",
                    "remove_approved_creator",
                    "nft_transfer_payout",
                    "create_badge_collection",
                    "create_series",
                    "update_badge_collection_media",
                    "nft_mint",
                    "mint_badge",
                ],
                viewMethods: [
                    "nft_approve",
                    "nft_is_approved",
                    "nft_total_supply",
                    "nft_tokens",
                    "nft_supply_for_owner",
                    "nft_tokens_for_owner",
                    "get_series_total_supply",
                    "get_series",
                    "get_series_details",
                    "nft_supply_for_series",
                    "nft_tokens_for_series",
                    "owner_nft_tokens_for_badges",
                    "owner_nft_tokens_for_series",
                    "owner_nft_tokens_for_series_count",
                    "badge_token_supply_for_owner",
                    "get_badge_series_by_type",
                    "get_nonce",
                    "owner_public_key",
                    "nft_metadata",
                    "nft_transfer",
                    "nft_token",
                    "is_approved_creator",
                    "nft_payout",
                    "is_approved_minter",
                ]
            },
            accessKeyMethods: {
                changeMethods: [
                    "mint_badge",
                    "nft_burn",
                    "batch_burn",
                ],
                viewMethods: [
                    "is_approved_minter",
                    "nft_approve",
                    "nft_is_approved",
                    "nft_total_supply",
                    "nft_tokens",
                    "nft_supply_for_owner",
                    "nft_tokens_for_owner",
                    "get_series_total_supply",
                    "get_series",
                    "get_series_details",
                    "nft_supply_for_series",
                    "nft_tokens_for_series",
                    "owner_nft_tokens_for_badges",
                    "owner_nft_tokens_for_series",
                    "owner_nft_tokens_for_series_count",
                    "badge_token_supply_for_owner",
                    "get_badge_series_by_type",
                    "get_nonce",
                    "owner_public_key",
                    "nft_metadata",
                    "nft_transfer",
                    "nft_token",
                    "is_approved_creator",
                    "nft_payout"
                ]
            }
        };
        const connectionConfig = {
            testnet: Object.assign(Object.assign({}, config), { nodeUrl: "https://rpc.testnet.near.org", walletUrl: "https://wallet.testnet.near.org", helperUrl: "https://helper.testnet.near.org", explorerUrl: "https://explorer.testnet.near.org" }),
            mainnet: Object.assign(Object.assign({}, config), { nodeUrl: "https://rpc.mainnet.near.org", walletUrl: "https://wallet.mainnet.near.org", helperUrl: "https://helper.mainnet.near.org", explorerUrl: "https://explorer.mainnet.near.org" })
        };
        return {
            config: connectionConfig[NETWORK_ID],
            contractAccountId: CONTRACT_ACCOUNT_ID,
            keyStore: myKeyStore,
        };
    });
}
exports.getConfig = getConfig;
