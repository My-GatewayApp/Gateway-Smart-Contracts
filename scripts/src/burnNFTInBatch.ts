require('dotenv').config()

import { createAccessKeyAccount, generateAdminSignature, generateUserSignature, } from "./utils";

import * as nearAPI from "near-api-js"
import { getConfig } from "./config";
import { parseSeedPhrase } from "near-seed-phrase";
import { KeyPair } from "near-api-js";
import { parseNearAmount } from "near-api-js/lib/utils/format";

const { connect } = nearAPI;


async function burnNFTInBatch() {
    const gatewayConfig = await getConfig();
    const { config, contractAccountId } = gatewayConfig
    const nearConnection = await connect(config);

    let userSeedPhrase = process.env.USER_SEED_PHRASE || ""
    let series_id = 12;
    let amount = 5;

    const { seedPhrase, publicKey, secretKey } = parseSeedPhrase(userSeedPhrase);

    let owner_public_key = publicKey.split(":")[1]

    console.log({ seedPhrase, publicKey, secretKey });

    const keypair = KeyPair.fromString(secretKey);

    const newUserAcct = await createAccessKeyAccount(nearConnection, keypair)
    const signature = await generateUserSignature(newUserAcct,userSeedPhrase);


    await newUserAcct.functionCall({
        contractId: contractAccountId,
        methodName: "batch_burn",
        args: {
            series_id,
            amount,
            owner_public_key,
            signature
        },
        gas: 300000000000000,
    })

}
burnNFTInBatch().then(
    () => process.exit(),
    err => {
        console.error(err);
        process.exit(-1);
    },
);