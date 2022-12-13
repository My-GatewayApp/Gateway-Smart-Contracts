require('dotenv').config()

import { getAdminContract, loadAdminKeys, } from "./utils";

import * as nearAPI from "near-api-js"
import { getConfig } from "./config";

const { connect } = nearAPI;


async function createCollection() {
    const { config, contractAccountId } = await getConfig();

    const nearConnection = await connect(config);
    const adminAccount = await nearConnection.account(contractAccountId);

    const { publicKey: adminPublicKey } = await loadAdminKeys();

    try {
        await adminAccount.functionCall({
            contractId: contractAccountId,
            methodName: "new_default_meta",
            args: {
                owner_id: adminAccount.accountId,
                owner_public_key: adminPublicKey.split(":")[1],
            }
        })

    } catch (error) {
        console.log((error as any).kind.ExecutionError);
    }

    const new_badge_payload = {
        badge_type: 1,
        metadata: {
            title: 'Blue badge',
            description: "first level badge in the gateway nft collection",
            media:
                "https://external-content.duckduckgo.com/iu/?u=https%3A%2F%2Ftse3.mm.bing.net%2Fth%3Fid%3DOIP.Fhp4lHufCdTzTeGCAblOdgHaF7%26pid%3DApi&f=1",
        },
        royalty: null,
        price: null,
    };

    const nft_metadata = await adminAccount.viewFunctionV2({
        contractId: contractAccountId,
        methodName: "nft_metadata",
        args: {}
    })

    console.log("-----------------NFT COLLECTION METADATA------------------------");

    console.log(nft_metadata);


    await adminAccount.functionCall({
        contractId: contractAccountId,
        methodName: "create_badge_collection",
        args: {
            ...new_badge_payload
        }
    })

}
createCollection().then(
    () => process.exit(),
    err => {
        console.error(err);
        process.exit(-1);
    },
);