require('dotenv').config()

import { createAccessKeyAccount, generateAdminSignature, getUserContract, sleep, } from "./utils";

import * as nearAPI from "near-api-js"
import { getConfig } from "./config";
import { generateSeedPhrase } from "near-seed-phrase";
import { KeyPair } from "near-api-js";
import { parseNearAmount } from "near-api-js/lib/utils/format";

const { connect } = nearAPI;


async function mintNFTInBatch() {
    const gatewayConfig = await getConfig();
    const { config, contractAccountId } = gatewayConfig
    const nearConnection = await connect(config);


    const { seedPhrase, publicKey, secretKey } = generateSeedPhrase();
    console.log({ seedPhrase, publicKey, secretKey });

    // add key
    const adminAccount = await nearConnection.account(contractAccountId);
    // await adminAccount.addKey(publicKey, contractAccountId, config.accessKeyMethods.changeMethods, parseNearAmount('0.1'))

    const keypair = KeyPair.fromString(secretKey);
    const userAccountId = Buffer.from(keypair.getPublicKey().data).toString('hex');


    const newUserAcct = await createAccessKeyAccount(nearConnection, keypair)

    const signature = await generateAdminSignature(newUserAcct,);


    await newUserAcct.functionCall({
        contractId: contractAccountId,
        methodName: "batch_mint",
        args: {
            id: "12",
            amount: 5,
            receiver_id: userAccountId,
            signature: signature
        },
        gas: 300000000000000,
    })

}
mintNFTInBatch().then(
    () => process.exit(),
    err => {
        console.error(err);
        process.exit(-1);
    },
);