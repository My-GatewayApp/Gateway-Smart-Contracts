/* unit tests */
use crate::approval::NonFungibleTokenCore;
#[cfg(test)]
use crate::Contract;
use crate::TokenMetadata;
use near_sdk::json_types::{U128, U64};
use near_sdk::test_utils::{accounts, VMContextBuilder};
use near_sdk::testing_env;
use near_sdk::{env, AccountId};

use std::collections::HashMap;

const MINT_STORAGE_COST: u128 = 100_000_000_000_000_000_000_000;
const MIN_REQUIRED_APPROVAL_YOCTO: u128 = 170000000000000000000;

fn get_context(predecessor: AccountId) -> VMContextBuilder {
    let mut builder = VMContextBuilder::new();
    builder.predecessor_account_id(predecessor);
    builder
}
fn sample_token_metadata() -> TokenMetadata {
    TokenMetadata {
        title: Some("Blue Badge".into()),
        description: Some("first level badge in the gateway system".into()),
        media: None,
        media_hash: None,
        copies: Some(1u64),
        issued_at: None,
        expires_at: None,
        starts_at: None,
        updated_at: None,
        extra: None,
        reference: None,
        reference_hash: None,
    }
}

#[test]
#[should_panic(expected = "The contract is not initialized")]
fn test_default() {
    let context = get_context(accounts(1));
    testing_env!(context.build());
    let _contract = Contract::default();
}

#[test]
fn test_new_account_contract() {
    let mut context = get_context(accounts(0));
    testing_env!(context.build());
    let contract = Contract::new_default_meta(accounts(0).into());
    testing_env!(context.is_view(true).build());
    let contract_nft_tokens = contract.nft_tokens(Some(U128(0)), None);
    assert_eq!(contract_nft_tokens.len(), 0);
}

#[test]
fn test_create_badge_collection() {
    let mut context = get_context(accounts(0));
    testing_env!(context.build());
    let mut contract = Contract::new_default_meta(accounts(0).into());

    testing_env!(context.predecessor_account_id(accounts(0)).build());
    let series_id = 0;
    let token_metadata: TokenMetadata = sample_token_metadata();

    contract.create_badge_collection(series_id, token_metadata, None, None);
    let created_series = contract.get_series_details(series_id).unwrap();
    // println!("{:?}", );
    assert_eq!(created_series.series_id, series_id);
    assert_eq!(created_series.owner_id, accounts(0))
}

#[test]
#[should_panic(expected = "only approved creators can add a type")]
fn test_create_badge_with_wrong_acct_collection() {
    let mut context = get_context(accounts(0));
    testing_env!(context.build());
    let mut contract = Contract::new_default_meta(accounts(0).into());
    let series_id = 0;
    let token_metadata: TokenMetadata = sample_token_metadata();
    testing_env!(context.predecessor_account_id(accounts(1)).build());
    contract.create_badge_collection(series_id, token_metadata, None, None);

}
#[test]
fn test_mint_badge() {
    let mut context = get_context(accounts(0));
    testing_env!(context.build());
    let mut contract = Contract::new_default_meta(accounts(0).into());

    testing_env!(context.predecessor_account_id(accounts(0)).build());
    let series_id = 0;
    let token_metadata: TokenMetadata = sample_token_metadata();

    contract.create_badge_collection(series_id, token_metadata, None, None);

    contract.mint_badge(series_id.into(), accounts(1));

    assert_eq!(contract.nft_total_supply(), 1.into());
    assert_eq!(contract.nft_supply_for_owner(accounts(1)), 1.into());

    let nft = contract.nft_tokens_for_owner(accounts(1), None, None);
    assert_eq!(nft[0].owner_id, accounts(1))
}

#[test]
fn test_burn_badge() {}
