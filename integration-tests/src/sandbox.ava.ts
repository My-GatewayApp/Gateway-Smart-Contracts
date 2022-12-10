import { Worker, NearAccount, NEAR, BN } from 'near-workspaces';
import anyTest, { TestFn } from 'ava';
import path from "path";
import { createHash } from 'node:crypto'
import { authorizedNFTMint, createBadgeCollection, createBadgeCollectionRaw } from './utils';


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
  const series = await root.view("get_series");


  t.deepEqual(
    series,
    expected
  );


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

  const seriesId = "1";

  await authorizedNFTMint(
    root,
    alice,
    contract, seriesId,
  )

    
})