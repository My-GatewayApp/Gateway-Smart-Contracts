use ed25519_dalek::Verifier;

use crate::{nft_core::NonFungibleTokenCore, *};

/// CUSTOM - owner can burn a locked token for a given user, reducing the enumerable->nft_supply_for_type
#[near_bindgen]
impl Contract {
    pub fn nft_burn(&mut self, token_id: TokenId, owner_public_key: String, signature: Vec<u8>) {
        let public_key = ed25519_dalek::PublicKey::from_bytes(
            &bs58::decode(owner_public_key).into_vec().unwrap(),
        )
        .unwrap();

        let mut owner_id = AccountId::new_unchecked(hex::encode(public_key));

        let token = self.tokens_by_id.get(&token_id).expect("No token");
        //only the owner should be able to burn
        let signer_acct = env::predecessor_account_id();
        if owner_id != token.owner_id && signer_acct != token.owner_id {
            env::panic_str("Unauthorized: wrong owner");
        };

        if signer_acct == token.owner_id {
            owner_id = signer_acct;
        }
        //ensure owner actually signed
        let current_owner_nonce = self.get_nonce(&owner_id);
        let owner_next_nonce = current_owner_nonce + 1;
        let next_nonce_hash = env::sha256(format!("{}", owner_next_nonce).as_bytes());
        let signature = ed25519_dalek::Signature::try_from(signature.as_ref())
            .expect("Signature should be a valid array of 64 bytes [13, 254, 123, ...]");

        if let Ok(_) = public_key.verify(&next_nonce_hash, &signature) {
            self.burn_helper(token_id, owner_id);
        } else {
            panic!("Unauthorized: invalid signature");
        }
    }

    pub fn batch_burn(
        &mut self,
        series_id: SeriesId,
        amount: Option<u64>,
        owner_public_key: String,
        signature: Vec<u8>,
        named_owner_id: Option<AccountId>,
    ) {
        // derive publicKey
        let public_key = ed25519_dalek::PublicKey::from_bytes(
            &bs58::decode(owner_public_key).into_vec().unwrap(),
        )
        .unwrap();
        // derive owner_id
        let owner_id = if let Some(named_owner_id) = named_owner_id {
            require!(
                named_owner_id == env::predecessor_account_id(),
                "Unauthorized: wrong owner"
            );
            named_owner_id
        } else {
            AccountId::new_unchecked(hex::encode(public_key))
        };

        let tokens_for_owner_set = self.tokens_per_owner.get(&owner_id);

        let tokens_to_burn = if let Some(tokens_for_owner_set) = tokens_for_owner_set {
            let tokens = tokens_for_owner_set
                .iter()
                .map(|token_id| self.nft_token(token_id.clone()).unwrap())
                .filter(|token| token.series_id == series_id)
                .take(amount.unwrap_or(10) as usize)
                .collect();
            tokens
        } else {
            vec![]
        };

        if tokens_to_burn.len() > 0 {
            //get the first token property
            let token_0 = &tokens_to_burn[0];

            //only the owner should be able to burn
            if owner_id != token_0.owner_id {
                env::panic_str("Unauthorized: wrong owner");
            };
            let current_owner_nonce = self.get_nonce(&owner_id);
            let owner_next_nonce = current_owner_nonce + 1;

            if owner_id == env::predecessor_account_id() {
                //if owner_id is caller, no other permission is needed
                for token in tokens_to_burn {
                    self.burn_helper(token.token_id, owner_id.clone());
                }
            } else {
                //otherwise, ensure that caller has permission to burn

                let next_nonce_hash = env::sha256(format!("{}", owner_next_nonce).as_bytes());

                let signature = ed25519_dalek::Signature::try_from(signature.as_ref())
                    .expect("Signature should be a valid array of 64 bytes [13, 254, 123, ...]");

                if let Ok(_) = public_key.verify(&next_nonce_hash, &signature) {
                    for token in tokens_to_burn {
                        self.burn_helper(token.token_id, owner_id.clone());
                    }
                } else {
                    panic!("Unauthorized: invalid signature");
                }
            }

            //set new nonce
            self.nonces.insert(&owner_id, &owner_next_nonce);
        }
    }
    fn burn_helper(&mut self, token_id: TokenId, owner_id: AccountId) {
        let token = self.tokens_by_id.get(&token_id).expect("No token");

        self.internal_transfer(
            &owner_id,
            &AccountId::new_unchecked((&"unrecoverable_burn_account").to_string()),
            &token_id,
            None,
            None,
        );

        let nft_burn_log: EventLog = EventLog {
            // Standard name ("nep171").
            standard: NFT_STANDARD_NAME.to_string(),
            // Version of the standard ("nft-1.0.0").
            version: NFT_METADATA_SPEC.to_string(),
            // The data related with the event stored in a vector.
            event: EventLogVariant::NftBurn(vec![NftBurnLog {
                // owner's account ID.
                owner_id: token.owner_id.to_string(),
                // A vector containing the token IDs as strings.
                token_ids: vec![token_id.to_string()],
            }]),
        };
        env::log_str(&nft_burn_log.to_string());
    }
}
