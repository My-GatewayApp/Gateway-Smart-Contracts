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
        series_type: u8,
        metadata: TokenMetadata,
        royalty: Option<HashMap<AccountId, u32>>,
        price: Option<U128>,
    ) {
        // Ensure the caller is an approved creator
        let caller = env::predecessor_account_id();
        require!(
            self.approved_creators.contains(&caller) == true,
            "only approved creators can add a type"
        );
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
                        series_type:  SeriesType::from(series_type)
                    }
                )
                .is_none(),
            "collection ID already exists"
        );
    }

    /// Create a new series. The caller must be an approved creator. All tokens in the series will inherit the same metadata
    /// If copies are set in the metadata, it will enforce that only that number of NFTs can be minted. If not, unlimited NFTs can be minted.
    /// If a title is set in the metadata, enumeration methods will return the `${title} - ${edition}` else, `${series_id} - ${edition}`
    /// All token IDs internally are stored as `${series_id}:${edition}`
    /// Caller must attach enough $NEAR to cover storage.
    #[payable]
    pub fn create_series(
        &mut self,
        series_type: u8,
        metadata: TokenMetadata,
        royalty: Option<HashMap<AccountId, u32>>,
        price: Option<U128>,
    ) {
        // Measure the initial storage being used on the contract
        let initial_storage_usage = env::storage_usage();

        // Ensure the caller is an approved creator
        let caller = env::predecessor_account_id();
        require!(
            self.approved_creators.contains(&caller) == true,
            "only approved creators can add a type"
        );
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
                            account_id_hash: hash_account_id(&format!("{}{}", new_series_id, caller)),
                        }),
                        owner_id: caller,
                        price: price.map(|p| p.into()),
                        series_type:  SeriesType::from(series_type)
                    }
                )
                .is_none(),
            "collection ID already exists"
        );

        //calculate the required storage which was the used - initial
        let required_storage_in_bytes = env::storage_usage() - initial_storage_usage;

        //refund any excess storage if the user attached too much. Panic if they didn't attach enough to cover the required.
        refund_deposit(required_storage_in_bytes);
    }

    pub fn update_series_media(
        &mut self,
        series_id: U64,
        media: Option<String>,
        media_hash: Option<Base64VecU8>,
    ) {
        // Ensure the caller is an approved creator
        let caller = env::predecessor_account_id();
        require!(
            self.approved_creators.contains(&caller) == true,
            "only approved creators can add a type"
        );

        // Get the series 
        let mut series = self.series_by_id.get(&series_id.0).expect("Not a series");
        series.metadata.media = media;
        series.metadata.media_hash = media_hash;
        
        self.series_by_id.insert(&series_id.0,& series);
    }
    /// Mint a new NFT that is part of a series. The caller must be an approved minter.
    /// The series ID must exist and if the metadata specifies a copy limit, you cannot exceed it.
    #[payable]
    pub fn nft_mint(&mut self, id: U64, receiver_id: AccountId) {
        // Measure the initial storage being used on the contract
        let initial_storage_usage = env::storage_usage();

        // Get the series and how many tokens currently exist (edition number = cur_len + 1)
        let mut series = self.series_by_id.get(&id.0).expect("Not a series");

        // Check if the series has a price per token. If it does, ensure the caller has attached at least that amount
        let mut price_per_token = 0;
        if let Some(price) = series.price {
            price_per_token = price;
            require!(
                env::attached_deposit() > price_per_token,
                "Need to attach at least enough to cover price"
            );
        // If the series doesn't have a price, ensure the caller is an approved minter.
        } else {
            // Ensure the caller is an approved minter
            let predecessor = env::predecessor_account_id();
            assert!(
                self.approved_minters.contains(&predecessor),
                "Not approved minter"
            );
        }

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
            owner_id: receiver_id,
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

        // Log the serialized json.
        env::log_str(&nft_mint_log.to_string());

        //calculate the required storage which was the used - initial
        let required_storage_in_bytes = env::storage_usage() - initial_storage_usage;

        // If there's some price for the token, we'll payout the series owner. Otherwise, refund the excess deposit for storage to the caller
        if price_per_token > 0 {
            payout_series_owner(required_storage_in_bytes, price_per_token, series.owner_id);
        } else {
            refund_deposit(required_storage_in_bytes);
        }
    }

    /// NFT Mint for implicit accounts
    /// The series ID must exist and if the metadata specifies a copy limit, you cannot exceed it.
    pub fn mint_badge(&mut self, id: U64, receiver_id: AccountId) {
        // self.only_contract_owner();
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
            owner_id: receiver_id,
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

    // modifiers
    fn only_contract_owner(&mut self) {
        assert_eq!(
            env::signer_account_id(),
            self.owner_id,
            "Only contract owner can call this method."
        );
    }
}
