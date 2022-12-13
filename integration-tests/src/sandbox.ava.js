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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const near_workspaces_1 = require("near-workspaces");
const ava_1 = __importDefault(require("ava"));
const path_1 = __importDefault(require("path"));
const node_crypto_1 = require("node:crypto");
const utils_1 = require("./utils");
const test = ava_1.default;
test.beforeEach((t) => __awaiter(void 0, void 0, void 0, function* () {
    // Init the worker and start a Sandbox server
    const worker = yield near_workspaces_1.Worker.init();
    // Deploy contract
    const root = worker.rootAccount;
    const gatewayNftMarketplaceLocation = path_1.default.join(__dirname, "../../out/gateway_nft_marketplace.wasm");
    //deploy the contract to root account
    yield root.deploy(gatewayNftMarketplaceLocation);
    const ownerKeyPair = yield root.getKey();
    const owner_public_key = ownerKeyPair === null || ownerKeyPair === void 0 ? void 0 : ownerKeyPair.getPublicKey().toString().split(":")[1];
    yield root.call(root, "new_default_meta", { owner_id: root, owner_public_key });
    const alice = yield root.createSubAccount("alice", {
        initialBalance: near_workspaces_1.NEAR.parse("100 N").toJSON(),
    });
    const bob = yield root.createSubAccount("bob", {
        initialBalance: near_workspaces_1.NEAR.parse("100 N").toJSON(),
    });
    const charlie = yield root.createSubAccount("charlie", {
        initialBalance: near_workspaces_1.NEAR.parse("100 N").toJSON(),
    });
    t.context.worker = worker;
    t.context.accounts = { root, contract: root, alice, bob, charlie };
}));
test.afterEach.always((t) => __awaiter(void 0, void 0, void 0, function* () {
    // Stop Sandbox server
    yield t.context.worker.tearDown().catch((error) => {
        console.log('Failed to stop the Sandbox:', error);
    });
}));
test("should init contract properly", (t) => __awaiter(void 0, void 0, void 0, function* () {
    const { root, contract } = t.context.accounts;
    const contract_metadata = yield contract.view("nft_metadata", { account_id: root });
    const expected = {
        spec: 'nft-1.0.0',
        name: 'Gateway APP NFTs',
        symbol: 'GATEWAY',
        icon: null,
        base_uri: null,
        reference: null,
        reference_hash: null
    };
    t.deepEqual(contract_metadata, expected);
}));
test("should not allow unauthorized Badge creation", (t) => __awaiter(void 0, void 0, void 0, function* () {
    const { _, contract, alice } = t.context.accounts;
    const result = yield (0, utils_1.createBadgeCollectionRaw)(alice, contract);
    t.regex(result.receiptFailureMessages.join("\n"), /Method create_badge_collection is private+/);
}));
test('should create a new badge collection', (t) => __awaiter(void 0, void 0, void 0, function* () {
    const { root, contract, } = t.context.accounts;
    yield (0, utils_1.createBadgeCollection)(root, contract);
    const expected = [
        {
            series_id: 1,
            metadata: {
                title: 'Blue badge',
                description: "first level badge in the gateway nft collection",
                media: 'https://external-content.duckduckgo.com/iu/?u=https%3A%2F%2Ftse3.mm.bing.net%2Fth%3Fid%3DOIP.Fhp4lHufCdTzTeGCAblOdgHaF7%26pid%3DApi&f=1',
                media_hash: null,
                copies: null,
                issued_at: null,
                expires_at: null,
                starts_at: null,
                updated_at: null,
                extra: null,
                reference: null,
                reference_hash: null
            },
            royalty: null,
            owner_id: 'test.near',
            badge_type: 1
        }
    ];
    const series = yield root.view("get_series");
    t.deepEqual(series, expected);
    t.assert(series.length === 1);
    t.assert(series[0].series_id === 1);
    t.assert(series[0].owner_id === contract.accountId);
}));
test('should not allow unauthorized nft mint', (t) => __awaiter(void 0, void 0, void 0, function* () {
    const { _, contract, alice } = t.context.accounts;
    const seriesId = "1";
    //get current user nonce
    const nonce = yield alice.call(contract, "get_nonce", {
        account_id: alice.accountId
    });
    //sign nonce using alice account(admin)
    const hash = (0, node_crypto_1.createHash)('sha256');
    const nextNonce = parseInt(nonce) + 1;
    const keyPair = yield alice.getKey();
    const message = nextNonce;
    hash.update(message.toString());
    const hashedMessage = hash.digest();
    const signedMessage = keyPair === null || keyPair === void 0 ? void 0 : keyPair.sign(hashedMessage);
    // try to mint nft using wrong permission 
    const result = yield alice.callRaw(contract, "mint_badge", {
        id: seriesId,
        receiver_id: alice.accountId,
        signature: Array.from(signedMessage.signature)
    });
    t.regex(result.receiptFailureMessages.join("\n"), /Unauthorized+/);
}));
test('should allow authorized nft mint', (t) => __awaiter(void 0, void 0, void 0, function* () {
    const { root, contract, alice } = t.context.accounts;
    yield (0, utils_1.createBadgeCollection)(root, contract);
    yield (0, utils_1.authorizedNFTMint)(root, alice, contract, "1");
    const nftTotalSupply = yield contract.view("nft_total_supply");
    const nftSupplyForOwner = yield contract.view("nft_supply_for_owner", {
        account_id: alice.accountId,
    });
    const newBadgeTotalSupply = yield contract.view("nft_supply_for_series", {
        id: 1
    });
    const badgeTokenSupplyForOwner = yield contract.view("badge_token_supply_for_owner", {
        series_id: 1,
        account_id: alice.accountId,
    });
    t.assert(nftSupplyForOwner, "1");
    t.assert(badgeTokenSupplyForOwner, "1");
    t.assert(nftTotalSupply == "1");
    t.assert(newBadgeTotalSupply == "1");
}));
test("should burn nft ", (t) => __awaiter(void 0, void 0, void 0, function* () {
    const { root, contract, alice } = t.context.accounts;
    yield (0, utils_1.createBadgeCollection)(root, contract);
    yield (0, utils_1.authorizedNFTMint)(root, alice, contract, "1");
    const aliceNFTs = yield contract.view("nft_tokens_for_owner", {
        account_id: alice.accountId,
    });
    yield alice.call(contract, "nft_burn", {
        token_id: aliceNFTs[0].token_id,
    });
    const nftTotalSupply = yield contract.view("nft_total_supply");
    const nftSupplyForOwner = yield contract.view("nft_supply_for_owner", {
        account_id: alice.accountId,
    });
    const newBadgeTotalSupply = yield contract.view("nft_supply_for_series", {
        id: 1
    });
    t.assert(nftSupplyForOwner, "0");
    t.assert(nftTotalSupply == "0");
    t.assert(newBadgeTotalSupply == "0");
}));
test("supply burn nft in batches", (t) => __awaiter(void 0, void 0, void 0, function* () {
    const { root, contract, alice } = t.context.accounts;
    yield (0, utils_1.createBadgeCollection)(root, contract);
    yield (0, utils_1.authorizedNFTMint)(root, alice, contract, "1");
    yield (0, utils_1.authorizedNFTMint)(root, alice, contract, "1");
    yield (0, utils_1.authorizedNFTMint)(root, alice, contract, "1");
    yield (0, utils_1.authorizedNFTMint)(root, alice, contract, "1");
    let nftTotalSupply = yield contract.view("nft_total_supply");
    let nftSupplyForOwner = yield contract.view("nft_supply_for_owner", {
        account_id: alice.accountId,
    });
    let newBadgeTotalSupply = yield contract.view("nft_supply_for_series", {
        id: 1
    });
    let badgeTokenSupplyForOwner = yield contract.view("badge_token_supply_for_owner", {
        series_id: 1,
        account_id: alice.accountId,
    });
    t.assert(nftSupplyForOwner, "4");
    t.assert(badgeTokenSupplyForOwner, "4");
    t.assert(nftTotalSupply == "4");
    t.assert(newBadgeTotalSupply == "4");
    yield alice.call(contract, "batch_burn", {
        series_id: 1,
        limit: 2,
    });
    nftTotalSupply = yield contract.view("nft_total_supply");
    nftSupplyForOwner = yield contract.view("nft_supply_for_owner", {
        account_id: alice.accountId,
    });
    newBadgeTotalSupply = yield contract.view("nft_supply_for_series", {
        id: 1
    });
    badgeTokenSupplyForOwner = yield contract.view("badge_token_supply_for_owner", {
        series_id: 1,
        account_id: alice.accountId,
    });
    t.assert(nftSupplyForOwner, "2");
    t.assert(badgeTokenSupplyForOwner, "2");
    t.assert(nftTotalSupply == "2");
    t.assert(newBadgeTotalSupply == "2");
}));
test("reject update Badge media update for unauthorized acct", (t) => __awaiter(void 0, void 0, void 0, function* () {
    const { root, contract, alice, } = t.context.accounts;
    const hash = (0, node_crypto_1.createHash)('sha256');
    yield (0, utils_1.createBadgeCollection)(root, contract);
    yield (0, utils_1.authorizedNFTMint)(root, alice, contract, "1");
    const newMediaUrl = "https://news.artnet.com/app/news-upload/2021/09/Yuga-Labs-Bored-Ape-Yacht-Club-4466.jpg";
    hash.update(newMediaUrl);
    const newMediaHash = hash.digest('hex');
    const result = yield alice.callRaw(contract, "update_badge_collection_media", {
        series_id: "1",
        media: newMediaUrl,
        media_hash: (newMediaHash)
    });
    t.regex(result.receiptFailureMessages.join("\n"), /Smart contract panicked: only approved creators can update metadata+/);
}));
test("allow update Badge media update for authorized acct", (t) => __awaiter(void 0, void 0, void 0, function* () {
    const { root, contract, alice, } = t.context.accounts;
    const hash = (0, node_crypto_1.createHash)('sha256');
    yield (0, utils_1.createBadgeCollection)(root, contract);
    yield (0, utils_1.authorizedNFTMint)(root, alice, contract, "1");
    const newMediaUrl = "https://news.artnet.com/app/news-upload/2021/09/Yuga-Labs-Bored-Ape-Yacht-Club-4466.jpg";
    hash.update(newMediaUrl);
    const newMediaHash = hash.digest('hex');
    yield root.callRaw(contract, "update_badge_collection_media", {
        series_id: "1",
        media: newMediaUrl,
        media_hash: (newMediaHash)
    });
    const aliceNFTs = yield contract.view("nft_tokens_for_owner", {
        account_id: alice.accountId,
    });
    t.assert(aliceNFTs[0].metadata.media, newMediaUrl);
}));
test("should get user tokens by badge(series) type", (t) => __awaiter(void 0, void 0, void 0, function* () {
    const { root, contract, alice, } = t.context.accounts;
    yield (0, utils_1.createBadgeCollection)(root, contract);
    yield (0, utils_1.createBadgeCollection)(root, contract);
    yield (0, utils_1.createBadgeCollection)(root, contract);
    yield (0, utils_1.authorizedNFTMint)(root, alice, contract, "1");
    yield (0, utils_1.authorizedNFTMint)(root, alice, contract, "2");
    yield (0, utils_1.authorizedNFTMint)(root, alice, contract, "2");
    let aliceBadge1Tokens = yield contract.view("badge_token_supply_for_owner", {
        series_id: 1,
        account_id: alice.accountId,
    });
    let aliceBadge2Tokens = yield contract.view("badge_token_supply_for_owner", {
        series_id: 2,
        account_id: alice.accountId,
    });
    t.assert(aliceBadge1Tokens, "1");
    t.assert(aliceBadge2Tokens, "2");
}));
