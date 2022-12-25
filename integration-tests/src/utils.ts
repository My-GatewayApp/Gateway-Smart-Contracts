import { NearAccount } from "near-workspaces";
import { createHash } from "node:crypto";

export async function createBadgeCollection(
    user: NearAccount,
    contract: NearAccount,
    badge_type: number = 1
) {
    const new_badge_payload = {
        badge_type,
        metadata: {
            title: 'Blue badge',
            description: "first level badge in the gateway nft collection",
            media:
                "https://external-content.duckduckgo.com/iu/?u=https%3A%2F%2Ftse3.mm.bing.net%2Fth%3Fid%3DOIP.Fhp4lHufCdTzTeGCAblOdgHaF7%26pid%3DApi&f=1",
        },
        royalty: null,
        price: null,
    };

    return await user.call(
        contract,
        "create_series",
        new_badge_payload
    )
}
export async function createBadgeCollectionRaw(
    user: NearAccount,
    contract: NearAccount,
    badge_type: number = 1
) {
    const new_badge_payload = {
        badge_type,
        metadata: {
            title: 'Blue badge',
            description: "first level badge in the gateway nft collection",
            media:
                "https://external-content.duckduckgo.com/iu/?u=https%3A%2F%2Ftse3.mm.bing.net%2Fth%3Fid%3DOIP.Fhp4lHufCdTzTeGCAblOdgHaF7%26pid%3DApi&f=1",
        },
        royalty: null,
        price: null,
    };

    return await user.callRaw(
        contract,
        "create_series",
        new_badge_payload
    )
}

export async function authorizedNFTMint(
    root: NearAccount,
    user: NearAccount,
    contract: NearAccount,
    seriesId: number,
) {
    //get current user nonce
    const nonce = await contract.call(contract, "get_nonce", {
        account_id: user.accountId
    });


    //sign nonce using alice account(admin)
    const nextNonce: number = parseInt(nonce as any) + 1
    const hash = createHash('sha256');

    const keyPair = await root.getKey();


    const message = nextNonce;
    hash.update(message.toString())
    const hashedMessage = hash.digest()
    const signedMessage = keyPair?.sign(hashedMessage);

    // try to mint nft using wrong permission 
    //make an authorized mint
    return await user.callRaw(contract, "mint_badge", {
        id: seriesId,
        receiver_id: user.accountId,
        signature: Array.from(signedMessage!.signature)
    })
}

export async function authorizedBatchNFTMint(
    root: NearAccount,
    user: NearAccount,
    contract: NearAccount,
    seriesId: number,
    amount: number
) {
    //get current user nonce
    const nonce = await contract.call(contract, "get_nonce", {
        account_id: user.accountId
    });


    //sign nonce using alice account(admin)
    const nextNonce: number = parseInt(nonce as any) + 1
    const hash = createHash('sha256');

    const keyPair = await root.getKey();


    const message = nextNonce;
    hash.update(message.toString())
    const hashedMessage = hash.digest()
    const signedMessage = keyPair?.sign(hashedMessage);

    // try to mint nft using wrong permission 
    //make an authorized mint
    return await user.callRaw(contract, "batch_mint", {
        series_id: seriesId,
        receiver_id: user.accountId,
        signature: Array.from(signedMessage!.signature),
        amount
    })
}

export async function authorizedNFTBurn(
    user: NearAccount,
    contract: NearAccount,
    token_id: string,
) {
    //get current user nonce
    const nonce = await contract.call(contract, "get_nonce", {
        account_id: user.accountId
    });


    //sign nonce using alice account(admin)
    const nextNonce: number = parseInt(nonce as any) + 1
    const hash = createHash('sha256');

    const keyPair = await user.getKey();


    const message = nextNonce;
    hash.update(message.toString())
    const hashedMessage = hash.digest()
    const signedMessage = keyPair?.sign(hashedMessage);


    return await user.callRaw(contract, "nft_burn", {
        token_id,
        owner_public_key: keyPair?.getPublicKey().toString().split(":")[1],
        signature: Array.from(signedMessage!.signature)
    })
}

export async function authorizedNFBatchTBurn(
    user: NearAccount,
    contract: NearAccount,
    series_id: number,
    amount: number
) {
    //get current user nonce
    const nonce = await contract.call(contract, "get_nonce", {
        account_id: user.accountId
    });


    //sign nonce using alice account(admin)
    const nextNonce: number = parseInt(nonce as any) + 1
    const hash = createHash('sha256');

    const keyPair = await user.getKey();


    const message = nextNonce;
    hash.update(message.toString())
    const hashedMessage = hash.digest()
    const signedMessage = keyPair?.sign(hashedMessage);


    return await user.callRaw(contract, "batch_burn", {
        series_id,
        owner_public_key: keyPair?.getPublicKey().toString().split(":")[1],
        amount,
        signature: Array.from(signedMessage!.signature),//wont be used on the contract as 
        named_owner_id: user.accountId//the owner is the caller here
    })
}
