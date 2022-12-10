use crate::{nft_core::NonFungibleTokenCore, *};

/// CUSTOM - owner can burn a locked token for a given user, reducing the enumerable->nft_supply_for_type
#[near_bindgen]
impl Contract {
    pub fn nft_burn(&mut self, token_id: TokenId) {
        let owner_id = env::predecessor_account_id();
        let token = self.tokens_by_id.get(&token_id).expect("No token");
        let series = self.series_by_id.get(&token.series_id);

        if let Some(mut series) = series {
            series.tokens.remove(&token_id);
            self.series_by_id.insert(&token.series_id, &series);
        } 
        //only the owner should be able to burn
        if owner_id != token.owner_id {
            env::panic_str("Unauthorized");
        };
        // remove from tokens_per_owner and owner_tokens_per_series
        self.internal_remove_token_from_owner(&owner_id, &token_id);
        //remove tokens from tokens_by_id map
        self.tokens_by_id.remove(&token_id);

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

    pub fn batch_burn(&mut self, series_id: SeriesId,limit: Option<u64> ){
        let owner_id = env::predecessor_account_id();
        let tokens_for_owner_set = self.tokens_per_owner.get(&owner_id);
        
        let tokens_to_burn = if let Some(tokens_for_owner_set) = tokens_for_owner_set {
            let tokens = tokens_for_owner_set
                .iter()
                .map(|token_id| self.nft_token(token_id.clone()).unwrap())
                .filter(|token| token.series_id == series_id)
                .take(limit.unwrap_or(50) as usize)    
                .collect();
            tokens
        } else {
            vec![]
        };

        for token in tokens_to_burn {
            self.nft_burn(token.token_id)
        }
    }
}
