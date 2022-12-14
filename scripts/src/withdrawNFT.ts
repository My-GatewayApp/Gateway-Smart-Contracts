require('dotenv').config()

import { createAccessKeyAccount, generateAdminSignature, generateUserSignature, getUserContract, sleep, } from "./utils";

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

    let userSeedPhrase = "eager number news brain duty iron eternal cupboard wonder bar sister milk"
    let receiver_id = "gateway1.testnet"
    let token_id = "11:2";

    const { seedPhrase, publicKey, secretKey } = parseSeedPhrase(userSeedPhrase);
    console.log({ seedPhrase, publicKey, secretKey });

    const keypair = KeyPair.fromString(secretKey);



    const newUserAcct = await createAccessKeyAccount(nearConnection, keypair)
    const signature = await generateUserSignature(newUserAcct, userSeedPhrase)

    await newUserAcct.functionCall({
        contractId: contractAccountId,
        methodName: "withdraw",
        args: {
            owner_public_key: publicKey.split(":")[1],
            token_id,
            receiver_id: receiver_id,
            signature: signature
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