import * as nearAPI from "near-api-js"
import { loadAdminKeys } from "./utils";
const { keyStores, KeyPair,InMemorySigner } = nearAPI;

export type GatewayConfig = { 
    config:nearAPI.ConnectConfig&{
        contractMethods: {
            changeMethods: string[], 
            viewMethods: string[],
        },
        accessKeyMethods:  {
            changeMethods: string[], 
            viewMethods: string[],
        }
    },
    contractAccountId: string; 
    keyStore: nearAPI.keyStores.KeyStore; 
}


export async function getConfig(): Promise<GatewayConfig> {
    //env variables
    const NETWORK_ID = process.env.NETWORK_ID!;
    const CONTRACT_ACCOUNT_ID = process.env.CONTRACT_ACCOUNT_ID!;
    const CONTRACT_NAME = process.env.CONTRACT_NAME!;
    const myKeyStore = new keyStores.InMemoryKeyStore();
    const signer = new InMemorySigner(myKeyStore);


    const { secretKey } = await loadAdminKeys()
    const keyPair = KeyPair.fromString(secretKey)

    await myKeyStore.setKey(NETWORK_ID, CONTRACT_ACCOUNT_ID!, keyPair);

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
                "nft_transfer_call",//only called in smart contract
                "nft_resolve_transfer",//only called in smart contract
                "add_approved_minter",
                "remove_approved_minter",
                "add_approved_creator",
                "remove_approved_creator",
                "nft_transfer_payout",
                "create_series",//private
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
                "all_nft_tokens_for_owner",
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
                "all_nft_tokens_for_owner",
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
    }


    const connectionConfig: { [key: string]: any } = {
        testnet: {
            ...config,
            nodeUrl: "https://rpc.testnet.near.org",
            walletUrl: "https://wallet.testnet.near.org",
            helperUrl: "https://helper.testnet.near.org",
            explorerUrl: "https://explorer.testnet.near.org",
        },
        mainnet: {
            ...config,
            nodeUrl: "https://rpc.mainnet.near.org",
            walletUrl: "https://wallet.mainnet.near.org",
            helperUrl: "https://helper.mainnet.near.org",
            explorerUrl: "https://explorer.mainnet.near.org",
        }
    };

    return { 
        config: connectionConfig[NETWORK_ID], 
        contractAccountId: CONTRACT_ACCOUNT_ID, 
        keyStore: myKeyStore,
    }
}