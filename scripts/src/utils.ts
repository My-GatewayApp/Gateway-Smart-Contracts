import { generateSeedPhrase, parseSeedPhrase } from 'near-seed-phrase';

import * as nearAPI from "near-api-js"
import { GatewayConfig, getConfig } from "./config";
import { parseNearAmount } from 'near-api-js/lib/utils/format';
import { createHash } from 'node:crypto'
import { GatewayNFTMarketplace } from './contracts/GatewayNFTMarketplace';

const { connect, Contract, KeyPair, Account, keyStores } = nearAPI;

export async function loadAdminKeys() {
    return parseSeedPhrase(process.env.GATEWAY_NFT_MARKETPLACE_SEED!);
};

export async function getAdminContract() {
    const { config, contractAccountId } = await getConfig();
    const nearConnection = await connect(config);
    const adminAccount = await nearConnection.account(contractAccountId);
    return new Contract(adminAccount, contractAccountId, config.contractMethods);
}

export async function getUserContract(account: nearAPI.Account) {
    const { config, contractAccountId } = await getConfig();
    return new Contract(account, contractAccountId, config.accessKeyMethods) as GatewayNFTMarketplace;
}


export async function createAccessKeyAccount(near: nearAPI.Near,key:nearAPI.KeyPair) {

    const { config, contractAccountId, keyStore } = await getConfig();



    await keyStore.setKey(config.networkId, contractAccountId, key)

    return new Account(near.connection, contractAccountId)
}

export async function generateAdminSignature(user: nearAPI.Account,) {
    const { secretKey } = await loadAdminKeys()
    const adminKeypair = KeyPair.fromString(secretKey)

    const { contractAccountId, } = await getConfig();

    const userNonce = await user.viewFunctionV2({
        contractId: contractAccountId,
        methodName: "get_nonce",
        args: {
            account_id: user.accountId
        }
    })

    const hash = createHash('sha256');

    //sign nonce using alice account(admin)
    const nextNonce: number = parseInt(userNonce as any) + 1
    const message = nextNonce;

    hash.update(message.toString())

    const hashedMessage = hash.digest()

    const signedMessage = adminKeypair?.sign(hashedMessage);

    return Array.from(signedMessage!.signature)

}

export const sleep = (ms: number): Promise<void> => {
    return new Promise((resolve) => setTimeout(resolve, ms));
};
