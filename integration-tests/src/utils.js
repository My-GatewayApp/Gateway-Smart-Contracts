"use strict";
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
exports.authorizedNFTMint = exports.createBadgeCollectionRaw = exports.createBadgeCollection = void 0;
const node_crypto_1 = require("node:crypto");
function createBadgeCollection(user, contract, badge_type = 1) {
    return __awaiter(this, void 0, void 0, function* () {
        const new_badge_payload = {
            badge_type,
            metadata: {
                title: 'Blue badge',
                description: "first level badge in the gateway nft collection",
                media: "https://external-content.duckduckgo.com/iu/?u=https%3A%2F%2Ftse3.mm.bing.net%2Fth%3Fid%3DOIP.Fhp4lHufCdTzTeGCAblOdgHaF7%26pid%3DApi&f=1",
            },
            royalty: null,
            price: null,
        };
        return yield user.call(contract, "create_badge_collection", new_badge_payload);
    });
}
exports.createBadgeCollection = createBadgeCollection;
function createBadgeCollectionRaw(user, contract, badge_type = 1) {
    return __awaiter(this, void 0, void 0, function* () {
        const new_badge_payload = {
            badge_type,
            metadata: {
                title: 'Blue badge',
                description: "first level badge in the gateway nft collection",
                media: "https://external-content.duckduckgo.com/iu/?u=https%3A%2F%2Ftse3.mm.bing.net%2Fth%3Fid%3DOIP.Fhp4lHufCdTzTeGCAblOdgHaF7%26pid%3DApi&f=1",
            },
            royalty: null,
            price: null,
        };
        return yield user.callRaw(contract, "create_badge_collection", new_badge_payload);
    });
}
exports.createBadgeCollectionRaw = createBadgeCollectionRaw;
function authorizedNFTMint(root, user, contract, seriesId) {
    return __awaiter(this, void 0, void 0, function* () {
        //get current user nonce
        const nonce = yield contract.call(contract, "get_nonce", {
            account_id: user.accountId
        });
        //sign nonce using alice account(admin)
        const nextNonce = parseInt(nonce) + 1;
        const hash = (0, node_crypto_1.createHash)('sha256');
        const keyPair = yield root.getKey();
        const message = nextNonce;
        hash.update(message.toString());
        const hashedMessage = hash.digest();
        const signedMessage = keyPair === null || keyPair === void 0 ? void 0 : keyPair.sign(hashedMessage);
        // try to mint nft using wrong permission 
        //make an authorized mint
        return yield user.callRaw(contract, "mint_badge", {
            id: seriesId,
            receiver_id: user.accountId,
            signature: Array.from(signedMessage.signature)
        });
    });
}
exports.authorizedNFTMint = authorizedNFTMint;
