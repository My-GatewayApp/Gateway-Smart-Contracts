use near_sdk::borsh::{self, BorshDeserialize, BorshSerialize};
use near_sdk::collections::{LazyOption, LookupMap, LookupSet, UnorderedMap, UnorderedSet};
use near_sdk::json_types::{Base64VecU8, U128};
use near_sdk::serde::{Deserialize, Serialize};
use near_sdk::{
    env, near_bindgen, require, AccountId, Balance, BorshStorageKey, CryptoHash, PanicOnDefault,
    Promise, PromiseOrValue,
};
use std::collections::HashMap;

pub use crate::approval::*;
pub use crate::burn::*;
pub use crate::events::*;
use crate::internal::*;
pub use crate::metadata::*;
pub use crate::nft_core::*;
pub use crate::owner::*;
pub use crate::royalty::*;
pub use crate::series::*;

mod approval;
mod burn;
mod enumeration;
mod events;
mod internal;
mod metadata;
mod nft_core;
mod owner;
mod royalty;
mod series;
/// This spec can be treated like a version of the standard.
pub const NFT_METADATA_SPEC: &str = "1.0.0";
/// This is the name of the NFT standard we're using
pub const NFT_STANDARD_NAME: &str = "nep171";

// Represents the series type. All tokens will derive this data.
#[derive(BorshDeserialize, BorshSerialize)]
pub struct Series {
    // Metadata including title, num copies etc.. that all tokens will derive from
    metadata: TokenMetadata,
    // Royalty used for all tokens in the collection
    royalty: Option<HashMap<AccountId, u32>>,
    // Set of tokens in the collection
    tokens: UnorderedSet<TokenId>,
    // What is the price of each token in this series? If this is specified, when minting,
    // Users will need to attach enough $NEAR to cover the price.
    price: Option<Balance>,
    // Owner of the collection
    owner_id: AccountId,
    series_type: SeriesType,
}

pub type SeriesId = u64;

#[derive(BorshSerialize, BorshDeserialize)]
pub enum SeriesType {
    UNLIMITED = 1, //1
    LIMITED = 2,   //2
}

impl SeriesType {
    pub fn to_code(&self) -> u8 {
        match self {
            SeriesType::UNLIMITED => 1,
            SeriesType::LIMITED => 2,
        }
    }

    pub fn from(val: u8) -> SeriesType {
        match val {
            1 => (SeriesType::UNLIMITED),
            2 => (SeriesType::LIMITED),
            _ => panic!("Invalid Series Type"),
        }
    }
}

#[near_bindgen]
#[derive(BorshDeserialize, BorshSerialize, PanicOnDefault)]
pub struct Contract {
    //contract owner
    pub owner_id: AccountId,

    //contract owner public key
    pub owner_public_key: String,

    //approved minters
    pub approved_minters: LookupSet<AccountId>,

    //approved users that can create series
    pub approved_creators: LookupSet<AccountId>,

    //Map the collection ID (stored in Token obj) to the collection data
    pub series_by_id: UnorderedMap<SeriesId, Series>,

    //keeps track of the token struct for a given token ID
    pub tokens_by_id: UnorderedMap<TokenId, Token>,

    //keeps track of all the token IDs for a given account
    pub tokens_per_owner: LookupMap<AccountId, UnorderedSet<TokenId>>,

    //keeps track of the number of tokens an owner owns
    //for every series
    pub owner_tokens_per_series: UnorderedMap<AccountId, UnorderedMap<SeriesId, u64>>,

    //keeps track of the metadata for the contract
    pub metadata: LazyOption<NFTContractMetadata>,

    // map of nonces used to prevent replay attack;
    pub nonces: LookupMap<AccountId, u64>,
}

/// Helper structure for keys of the persistent collections.
#[derive(BorshSerialize, BorshStorageKey)]
pub enum StorageKey {
    ApprovedMinters,
    ApprovedCreators,
    SeriesById,
    SeriesByIdInner { account_id_hash: CryptoHash },
    TokensPerOwner,
    TokenPerOwnerInner { account_id_hash: CryptoHash },
    OwnerTokensPerSeries,
    OwnerTokensPerSeriesInner { account_id_hash: CryptoHash },
    TokensById,
    NFTContractMetadata,
    Nonces,
}

#[near_bindgen]
impl Contract {
    /*
        initialization function (can only be called once).
        this initializes the contract with default metadata so the
        user doesn't have to manually type metadata.
    */
    #[init]
    pub fn new_default_meta(owner_id: AccountId, owner_public_key: String) -> Self {
        //calls the other function "new: with some default metadata and the owner_id passed in

        // let msg = format!("owner pub key: {:?}", owner_public_key);
        // env::log_str(&msg);

        Self::new(
            owner_id,
            owner_public_key,
            NFTContractMetadata {
                spec: "nft-1.0.0".to_string(),
                name: "Gateway APP NFTs".to_string(),
                symbol: "GATEWAY".to_string(),
                icon: None,
                base_uri: None,
                reference: None,
                reference_hash: None,
            },
        )
    }

    /*
        initialization function (can only be called once).
        this initializes the contract with metadata that was passed in and
        the owner_id.
    */
    #[init]
    pub fn new(
        owner_id: AccountId,
        owner_public_key: String,
        metadata: NFTContractMetadata,
    ) -> Self {
        // Create the approved minters set and insert the owner
        let mut approved_minters =
            LookupSet::new(StorageKey::ApprovedMinters.try_to_vec().unwrap());
        approved_minters.insert(&owner_id);

        // Create the approved creators set and insert the owner
        let mut approved_creators =
            LookupSet::new(StorageKey::ApprovedCreators.try_to_vec().unwrap());
        approved_creators.insert(&owner_id);

        // Create a variable of type Self with all the fields initialized.
        let this = Self {
            approved_minters,
            approved_creators,
            series_by_id: UnorderedMap::new(StorageKey::SeriesById.try_to_vec().unwrap()),
            //Storage keys are simply the prefixes used for the collections. This helps avoid data collision
            tokens_per_owner: LookupMap::new(StorageKey::TokensPerOwner.try_to_vec().unwrap()),
            owner_tokens_per_series: UnorderedMap::new(
                StorageKey::OwnerTokensPerSeries.try_to_vec().unwrap(),
            ),
            tokens_by_id: UnorderedMap::new(StorageKey::TokensById.try_to_vec().unwrap()),
            //set the &owner_id field equal to the passed in owner_id.
            owner_id,
            owner_public_key,
            metadata: LazyOption::new(
                StorageKey::NFTContractMetadata.try_to_vec().unwrap(),
                Some(&metadata),
            ),
            nonces: LookupMap::new(StorageKey::Nonces.try_to_vec().unwrap()),
        };

        //return the Contract object
        this
    }
}

#[cfg(test)]
mod tests;
