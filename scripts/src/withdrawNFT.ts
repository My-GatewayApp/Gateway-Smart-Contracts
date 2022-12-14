require('dotenv').config()

import { createAccessKeyAccount, generateAdminSignature, getUserContract, sleep, } from "./utils";

import * as nearAPI from "near-api-js"
import { getConfig } from "./config";
import { generateSeedPhrase, parseSeedPhrase } from "near-seed-phrase";
import { KeyPair } from "near-api-js";
import { parseNearAmount } from "near-api-js/lib/utils/format";

const { connect } = nearAPI;


async function withdrawNFT() {
    const gatewayConfig = await getConfig();
    const { config, contractAccountId } = gatewayConfig
    const nearConnection = await connect(config);




    const { seedPhrase, publicKey, secretKey } = parseSeedPhrase("hedgehog copper bullet copy very used vacant peanut right cherry neck absent");
    console.log({ seedPhrase, publicKey, secretKey });
    // add key
    const adminAccount = await nearConnection.account(contractAccountId);

    const keypair = KeyPair.fromString(secretKey);
    const userAccountId = Buffer.from(keypair.getPublicKey().data).toString('hex');


    const newUserAcct = await createAccessKeyAccount(nearConnection, keypair)

    await newUserAcct.functionCall({
        contractId: contractAccountId,
        methodName: "withdraw",
        args: {
            token_id: "10:1",
            receiver_id: "gateway1.testnet",
            // signature: signature
        },
        gas: 300000000000000,
    })
}
withdrawNFT().then(
    () => process.exit(),
    err => {
        console.error(err);
        process.exit(-1);
    },
);