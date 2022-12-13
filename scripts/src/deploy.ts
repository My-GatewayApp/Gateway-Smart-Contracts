require('dotenv').config()
import fs from 'fs'

import * as nearAPI from "near-api-js"
import { getConfig } from "./config";

const { connect } = nearAPI;

nearAPI.Account
async function deploy() {
    const { config, contractAccountId } = await getConfig();
    const nearConnection = await connect(config);
    const account = await nearConnection.account(contractAccountId);
    const response = await account.deployContract(fs.readFileSync('out/gateway_nft_marketplace.wasm'));
    console.log(response);
}
deploy().then(
    () => process.exit(),
    err => {
        console.error(err);
        process.exit(-1);
    },
);