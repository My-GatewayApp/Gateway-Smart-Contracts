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
        series_type: 1,
        metadata: {
            title: 'Blue badge',
            description: "first level badge in the gateway nft collection",
            media:
                "https://pbs.twimg.com/media/Fj4w5HiX0AIqk40?format=jpg&name=small",
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
        methodName: "create_series",
        args: {
            ...new_badge_payload
        }
    })
    const totalBadges = await adminAccount.viewFunctionV2(
        {
            contractId: contractAccountId,
            methodName: "get_series_total_supply",
            args: {}
        }
    )
    console.log(totalBadges);
}
createCollection().then(
    () => process.exit(),
    err => {
        console.error(err);
        process.exit(-1);
    },
);