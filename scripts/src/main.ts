require('dotenv').config()

import * as nearAPI from "near-api-js"
import { getConfig } from "./config";

const { connect } = nearAPI;


async function main() {
    // const config = await getConfig();
    // const nearConnection = await connect(config);
    //     const account = await nearConnection.account("example-account.testnet");
    // const response = await account.deployContract(fs.readFileSync('./wasm_files/status_message.wasm'));

}
main().then(
    () => process.exit(),
    err => {
        console.error(err);
        process.exit(-1);
    },
);