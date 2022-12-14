use ed25519_dalek::Verifier;
use near_sdk::json_types::U64;

use crate::*;

#[near_bindgen]
impl Contract {
    /// Create a new series. The caller must be an approved creator. All tokens in the series will inherit the same metadata
    /// If copies are set in the metadata, it will enforce that only that number of NFTs can be minted. If not, unlimited NFTs can be minted.
    /// If a title is set in the metadata, enumeration methods will return the `${title} - ${edition}` else, `${series_id} - ${edition}`
    /// All token IDs internally are stored as `${series_id}:${edition}`
    #[private]
    pub fn create_badge_collection(
        &mut self,
        badge_type: u8,
        metadata: TokenMetadata,
        royalty: Option<HashMap<AccountId, u32>>,
        price: Option<U128>,
    ) {
        // Ensure the caller is an approved creator
        let caller = env::predecessor_account_id();
        require!(
            self.approved_creators.contains(&caller) == true,
            "only approved creators can add a new badge collection"
        );
        require!(badge_type <= 2, "Invalid badge type");
        let new_series_id = self.series_by_id.len() + 1;
        // Insert the series and ensure it doesn't already exist
        require!(
            self.series_by_id
                .insert(
                    &new_series_id,
                    &Series {
                        metadata,
                        royalty,
                        tokens: UnorderedSet::new(StorageKey::SeriesByIdInner {
                            // We get a new unique prefix for the collection
                            account_id_hash: hash_account_id(&format!(
                                "{}{}",
                                new_series_id, caller
                            )),
                        }),
                        owner_id: caller,
                        price: price.map(|p| p.into()),
                        badge_type: SeriesType::from(badge_type)
                    }
                )
                .is_none(),
            "collection ID already exists"
        );
    }

    pub fn update_badge_collection_media(
        &mut self,
        series_id: U64,
        media: Option<String>,
        media_hash: Option<Base64VecU8>,
    ) {
        // Ensure the caller is an approved creator
        let caller = env::predecessor_account_id();
        require!(
            self.approved_creators.contains(&caller) == true,
            "only approved creators can update metadata"
        );

        // Get the series
        let mut series = self.series_by_id.get(&series_id.0).expect("Not a series");
        series.metadata.media = media;
        series.metadata.media_hash = media_hash;

        self.series_by_id.insert(&series_id.0, &series);
    }

    /// NFT Mint for implicit accounts
    /// The series ID must exist and if the metadata specifies a copy limit, you cannot exceed it.
    pub fn mint_badge(&mut self, id: U64, receiver_id: AccountId, signature: Vec<u8>) {
        let current_receiver_nonce = self.get_nonce(&receiver_id);

        // verify that `nonce` was signed by owner.
        //thereby granting `receiver_id` permission to mint
        let public_key = ed25519_dalek::PublicKey::from_bytes(
            &bs58::decode(self.owner_public_key.clone())
                .into_vec()
                .unwrap(),
        )
        .unwrap();

        let signature = ed25519_dalek::Signature::try_from(signature.as_ref())
            .expect("Signature should be a valid array of 64 bytes [13, 254, 123, ...]");

        let receiver_next_nonce = current_receiver_nonce + 1;
        let next_nonce_hash = env::sha256(format!("{}", receiver_next_nonce).as_bytes());

        if let Ok(_) = public_key.verify(&next_nonce_hash, &signature) {
            let initial_storage_usage = env::storage_usage();

            // Get the series and how many tokens currently exist (edition number = cur_len + 1)
            let mut series = self.series_by_id.get(&id.0).expect("Not a series");

            let cur_len = series.tokens.len();
            // Ensure we haven't overflowed on the number of copies minted
            if let Some(copies) = series.metadata.copies {
                require!(
                    cur_len < copies,
                    "cannot mint anymore NFTs for the given series. Limit reached"
                );
            }

            // The token ID is stored internally as `${series_id}:${edition}`
            let token_id = format!("{}:{}", id.0, cur_len + 1);
            series.tokens.insert(&token_id);
            self.series_by_id.insert(&id.0, &series);

            //specify the token struct that contains the owner ID
            let mut approved_account_ids = HashMap::new();
            approved_account_ids.insert(self.owner_id.clone(), 0);

            let token = Token {
                // Series ID that the token belongs to
                series_id: id.0,
                //set the owner ID equal to the receiver ID passed into the function
                owner_id: receiver_id.clone(),
                //we set the approved account IDs to the default value (an empty map)
                approved_account_ids: approved_account_ids,
                //the next approval ID is set to 0
                next_approval_id: 1,
            };

            //insert the token ID and token struct and make sure that the token doesn't exist
            require!(
                self.tokens_by_id.insert(&token_id, &token).is_none(),
                "Token already exists"
            );

            //call the internal method for adding the token to the owner
            self.internal_add_token_to_owner(&token.owner_id, &token_id);

            // Construct the mint log as per the events standard.
            let nft_mint_log: EventLog = EventLog {
                // Standard name ("nep171").
                standard: NFT_STANDARD_NAME.to_string(),
                // Version of the standard ("nft-1.0.0").
                version: NFT_METADATA_SPEC.to_string(),
                // The data related with the event stored in a vector.
                event: EventLogVariant::NftMint(vec![NftMintLog {
                    // Owner of the token.
                    owner_id: token.owner_id.to_string(),
                    // Vector of token IDs that were minted.
                    token_ids: vec![token_id.to_string()],
                    // An optional memo to include.
                    memo: None,
                }]),
            };
            let current_storage = env::storage_usage();
            let storage_used = current_storage - initial_storage_usage;
            let required_cost = env::storage_byte_cost() * Balance::from(storage_used);
            let required_cost = format!("{}", required_cost);

            //update nonce
            self.nonces.insert(&receiver_id, &receiver_next_nonce);

            env::log_str(&required_cost);
            // Log the serialized json.
            env::log_str(&nft_mint_log.to_string());
        } else {
            panic!("Unauthorized");
        }
    }

    //transfer to external wallet
    pub fn withdraw(
        &mut self,
        receiver_id: AccountId,
        token_id: TokenId,
        approval_id: Option<u64>,
        memo: Option<String>,
    ) {
        //get the sender to transfer the token from the sender to the receiver
        let sender_id = env::predecessor_account_id();

        self.internal_transfer(&sender_id, &receiver_id, &token_id, approval_id, memo);
    }

    #[cfg(test)]
    ///mint without restriction
    /// for testing purposes only
    pub fn badge_mint_test(&mut self, id: U64, receiver_id: AccountId) {
        let initial_storage_usage = env::storage_usage();

        // Get the series and how many tokens currently exist (edition number = cur_len + 1)
        let mut series = self.series_by_id.get(&id.0).expect("Not a series");

        let cur_len = series.tokens.len();
        // Ensure we haven't overflowed on the number of copies minted
        if let Some(copies) = series.metadata.copies {
            require!(
                cur_len < copies,
                "cannot mint anymore NFTs for the given series. Limit reached"
            );
        }

        // The token ID is stored internally as `${series_id}:${edition}`
        let token_id = format!("{}:{}", id.0, cur_len + 1);
        series.tokens.insert(&token_id);
        self.series_by_id.insert(&id.0, &series);

        //specify the token struct that contains the owner ID
        let token = Token {
            // Series ID that the token belongs to
            series_id: id.0,
            //set the owner ID equal to the receiver ID passed into the function
            owner_id: receiver_id.clone(),
            //we set the approved account IDs to the default value (an empty map)
            approved_account_ids: Default::default(),
            //the next approval ID is set to 0
            next_approval_id: 0,
        };

        //insert the token ID and token struct and make sure that the token doesn't exist
        require!(
            self.tokens_by_id.insert(&token_id, &token).is_none(),
            "Token already exists"
        );

        //call the internal method for adding the token to the owner
        self.internal_add_token_to_owner(&token.owner_id, &token_id);

        // Construct the mint log as per the events standard.
        let nft_mint_log: EventLog = EventLog {
            // Standard name ("nep171").
            standard: NFT_STANDARD_NAME.to_string(),
            // Version of the standard ("nft-1.0.0").
            version: NFT_METADATA_SPEC.to_string(),
            // The data related with the event stored in a vector.
            event: EventLogVariant::NftMint(vec![NftMintLog {
                // Owner of the token.
                owner_id: token.owner_id.to_string(),
                // Vector of token IDs that were minted.
                token_ids: vec![token_id.to_string()],
                // An optional memo to include.
                memo: None,
            }]),
        };
        let current_storage = env::storage_usage();
        let storage_used = current_storage - initial_storage_usage;
        let required_cost = env::storage_byte_cost() * Balance::from(storage_used);
        let required_cost = format!("{}", required_cost);

        env::log_str(&required_cost);
        // Log the serialized json.
        env::log_str(&nft_mint_log.to_string());
    }
}
