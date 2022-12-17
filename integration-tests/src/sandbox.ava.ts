import { Worker, NearAccount, NEAR, } from 'near-workspaces';
import anyTest, { TestFn } from 'ava';
import path from "path";
import { createHash } from 'node:crypto'
import { authorizedBatchNFTMint, authorizedNFBatchTBurn, authorizedNFTBurn, authorizedNFTMint, createBadgeCollection, createBadgeCollectionRaw } from './utils';


const test = anyTest as TestFn<{
  worker: Worker;
  accounts: Record<string, NearAccount>;
}>;

test.beforeEach(async (t) => {
  // Init the worker and start a Sandbox server
  const worker = await Worker.init();

  // Deploy contract
  const root = worker.rootAccount;
  const gatewayNftMarketplaceLocation = path.join(__dirname, "../../out/gateway_nft_marketplace.wasm");

  //deploy the contract to root account
  await root.deploy(
    gatewayNftMarketplaceLocation,
  )
  const ownerKeyPair = await root.getKey();
  const owner_public_key = ownerKeyPair?.getPublicKey().toString().split(":")[1];

  await root.call(root, "new_default_meta", { owner_id: root, owner_public_key })

  const alice = await root.createSubAccount("alice", {
    initialBalance: NEAR.parse("100 N").toJSON(),
  });

  const bob = await root.createSubAccount("bob", {
    initialBalance: NEAR.parse("100 N").toJSON(),
  });

  const charlie = await root.createSubAccount("charlie", {
    initialBalance: NEAR.parse("100 N").toJSON(),
  });

  t.context.worker = worker;
  t.context.accounts = { root, contract: root, alice, bob, charlie };

});

test.afterEach.always(async (t) => {
  // Stop Sandbox server
  await t.context.worker.tearDown().catch((error) => {
    console.log('Failed to stop the Sandbox:', error);
  });
});

test("should init contract properly", async (t) => {
  const { root, contract } = t.context.accounts;
  const contract_metadata = await contract.view("nft_metadata", { account_id: root });

  const expected = {
    spec: 'nft-1.0.0',
    name: 'Gateway APP NFTs',
    symbol: 'GATEWAY',
    icon: null,
    base_uri: null,
    reference: null,
    reference_hash: null
  }

  t.deepEqual(
    contract_metadata,
    expected
  );
})

test("should not allow unauthorized Badge creation", async (t) => {
  const { _, contract, alice } = t.context.accounts;

  const result = await createBadgeCollectionRaw(alice, contract)

  t.regex(result.receiptFailureMessages.join("\n"), /Method create_badge_collection is private+/);
})
test('should create a new badge collection', async (t) => {
  const { root, contract, } = t.context.accounts;

  await createBadgeCollection(root, contract)

  const expected = [
    {
      series_id: 1,
      metadata: {
        title: 'Blue badge',
        description: "first level badge in the gateway nft collection",
        media: 'https://external-content.duckduckgo.com/iu/?u=https%3A%2F%2Ftse3.mm.bing.net%2Fth%3Fid%3DOIP.Fhp4lHufCdTzTeGCAblOdgHaF7%26pid%3DApi&f=1',
        media_hash: null,
        copies: null,
        issued_at: null,
        expires_at: null,
        starts_at: null,
        updated_at: null,
        extra: null,
        reference: null,
        reference_hash: null
      },
      royalty: null,
      owner_id: 'test.near',
      badge_type: 1
    }
  ]

  const series: any = await root.view("get_series");

  t.deepEqual(
    series,
    expected
  );

  t.assert(series.length === 1);
  t.assert(series[0].series_id === 1);
  t.assert(series[0].owner_id === contract.accountId);

})



test('should not allow unauthorized nft mint', async (t) => {
  const { _, contract, alice } = t.context.accounts;

  const seriesId = "1";
  //get current user nonce
  const nonce = await alice.call(contract, "get_nonce", {
    account_id: alice.accountId
  });


  //sign nonce using alice account(admin)
  const hash = createHash('sha256');

  const nextNonce: number = parseInt(nonce as any) + 1
  const keyPair = await alice.getKey();


  const message = nextNonce;
  hash.update(message.toString())
  const hashedMessage = hash.digest()
  const signedMessage = keyPair?.sign(hashedMessage);

  // try to mint nft using wrong permission 
  const result = await alice.callRaw(contract, "mint_badge", {
    id: seriesId,
    receiver_id: alice.accountId,
    signature: Array.from(signedMessage!.signature)
  })

  t.regex(result.receiptFailureMessages.join("\n"), /Unauthorized+/);
})



test('should allow authorized nft mint', async (t) => {
  const { root, contract, alice } = t.context.accounts;

  await createBadgeCollection(root, contract)


  await authorizedNFTMint(
    root,
    alice,
    contract,
    "1",
  )

  const nftTotalSupply = await contract.view("nft_total_supply")
  const nftSupplyForOwner = await contract.view("nft_supply_for_owner", {
    account_id: alice.accountId,
  })
  const newBadgeTotalSupply = await contract.view("nft_supply_for_series", {
    id: 1
  })

  const badgeTokenSupplyForOwner = await contract.view("badge_token_supply_for_owner", {
    series_id: 1,
    account_id: alice.accountId,
  })

  t.assert(nftSupplyForOwner, "1")
  t.assert(badgeTokenSupplyForOwner, "1")
  t.assert(nftTotalSupply == "1")
  t.assert(newBadgeTotalSupply == "1")
})


test('should allow authorized batch nft mint', async (t) => {
  const { root, contract, alice } = t.context.accounts;

  await createBadgeCollection(root, contract)


  await authorizedBatchNFTMint(
    root,
    alice,
    contract,
    "1",
    5
  )

  const nftTotalSupply = await contract.view("nft_total_supply")
  const nftSupplyForOwner = await contract.view("nft_supply_for_owner", {
    account_id: alice.accountId,
  })
  const newBadgeTotalSupply = await contract.view("nft_supply_for_series", {
    id: 1
  })

  const badgeTokenSupplyForOwner = await contract.view("badge_token_supply_for_owner", {
    series_id: 1,
    account_id: alice.accountId,
  })

  t.assert(nftSupplyForOwner, "5")
  t.assert(badgeTokenSupplyForOwner, "5")
  t.assert(nftTotalSupply == "5")
  t.assert(newBadgeTotalSupply == "5")
})

test("should burn nft ", async (t) => {
  const { root, contract, alice } = t.context.accounts;

  await createBadgeCollection(root, contract)

  await authorizedNFTMint(
    root,
    alice,
    contract,
    "1",
  )
  const aliceNFTs: any = await contract.view("nft_tokens_for_owner", {
    account_id: alice.accountId,
  })


  await authorizedNFTBurn(alice, contract, aliceNFTs[0].token_id);

  const nftTotalSupply = await contract.view("nft_total_supply")
  const nftSupplyForOwner = await contract.view("nft_supply_for_owner", {
    account_id: alice.accountId,
  })
  const newBadgeTotalSupply = await contract.view("nft_supply_for_series", {
    id: 1
  })

  t.assert(nftSupplyForOwner, "0")
  t.assert(nftTotalSupply == "0")
  t.assert(newBadgeTotalSupply == "0")

})

test("supply burn nft in batches", async (t) => {


  const { root, contract, alice } = t.context.accounts;

  await createBadgeCollection(root, contract)
  await authorizedBatchNFTMint(
    root,
    alice,
    contract,
    "1",
    4
  )


  let nftTotalSupply = await contract.view("nft_total_supply")
  let nftSupplyForOwner = await contract.view("nft_supply_for_owner", {
    account_id: alice.accountId,
  })
  let newBadgeTotalSupply = await contract.view("nft_supply_for_series", {
    id: 1
  })

  let badgeTokenSupplyForOwner = await contract.view("badge_token_supply_for_owner", {
    series_id: 1,
    account_id: alice.accountId,
  })

  t.assert(nftSupplyForOwner, "4")
  t.assert(badgeTokenSupplyForOwner, "4")
  t.assert(nftTotalSupply == "4")
  t.assert(newBadgeTotalSupply == "4")


 const result = await authorizedNFBatchTBurn(alice, contract, 1, 2);

  
  
  nftTotalSupply = await contract.view("nft_total_supply")
  nftSupplyForOwner = await contract.view("nft_supply_for_owner", {
    account_id: alice.accountId,
  })
  newBadgeTotalSupply = await contract.view("nft_supply_for_series", {
    id: 1
  })

  badgeTokenSupplyForOwner = await contract.view("badge_token_supply_for_owner", {
    series_id: 1,
    account_id: alice.accountId,
  })

  t.assert(nftSupplyForOwner, "2")
  t.assert(badgeTokenSupplyForOwner, "2")
  t.assert(nftTotalSupply == "2")
  t.assert(newBadgeTotalSupply == "2")

})

test("reject update Badge media update for unauthorized acct", async (t) => {
  const { root, contract, alice, } = t.context.accounts;
  const hash = createHash('sha256');

  await createBadgeCollection(root, contract)

  await authorizedNFTMint(root, alice, contract, "1",)

  const newMediaUrl = "https://news.artnet.com/app/news-upload/2021/09/Yuga-Labs-Bored-Ape-Yacht-Club-4466.jpg";
  hash.update(newMediaUrl);
  const newMediaHash = hash.digest('hex');

  const result = await alice.callRaw(contract, "update_badge_collection_media", {
    series_id: "1",
    media: newMediaUrl,
    media_hash: (newMediaHash)
  })
  t.regex(result.receiptFailureMessages.join("\n"), /Smart contract panicked: only approved creators can update metadata+/)


})

test("allow update Badge media update for authorized acct", async (t) => {
  const { root, contract, alice, } = t.context.accounts;
  const hash = createHash('sha256');

  await createBadgeCollection(root, contract)

  await authorizedNFTMint(root, alice, contract, "1",)

  const newMediaUrl = "https://news.artnet.com/app/news-upload/2021/09/Yuga-Labs-Bored-Ape-Yacht-Club-4466.jpg";
  hash.update(newMediaUrl);
  const newMediaHash = hash.digest('hex');

  await root.callRaw(contract, "update_badge_collection_media", {
    series_id: "1",
    media: newMediaUrl,
    media_hash: (newMediaHash)
  })
  const aliceNFTs: any = await contract.view("nft_tokens_for_owner", {
    account_id: alice.accountId,
  })

  t.assert(aliceNFTs[0].metadata.media, newMediaUrl)
})

test("should get user tokens by badge(series) type", async (t) => {
  const { root, contract, alice, } = t.context.accounts;

  await createBadgeCollection(root, contract)
  await createBadgeCollection(root, contract)
  await createBadgeCollection(root, contract)

  await authorizedNFTMint(root, alice, contract, "1",)
  await authorizedNFTMint(root, alice, contract, "2",)
  await authorizedNFTMint(root, alice, contract, "2",)

  let aliceBadge1Tokens = await contract.view("badge_token_supply_for_owner", {
    series_id: 1,
    account_id: alice.accountId,
  })
  let aliceBadge2Tokens = await contract.view("badge_token_supply_for_owner", {
    series_id: 2,
    account_id: alice.accountId,
  })

  t.assert(aliceBadge1Tokens, "1")
  t.assert(aliceBadge2Tokens, "2")

})