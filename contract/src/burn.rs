use crate::*;

/// CUSTOM - owner can burn a locked token for a given user, reducing the enumerable->nft_supply_for_type
#[near_bindgen]
impl Contract {
    pub fn nft_burn(&mut self, token_id: TokenId) {
        let owner_id = env::predecessor_account_id();
        let token = self.tokens_by_id.get(&token_id).expect("No token");

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
}
