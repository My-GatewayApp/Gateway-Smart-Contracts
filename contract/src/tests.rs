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
        copies: Some(5u64),
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
    let series_id = 1;
    let token_metadata: TokenMetadata = sample_token_metadata();

    contract.create_badge_collection( token_metadata, None, None);
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
    let series_id = 1;
    let token_metadata: TokenMetadata = sample_token_metadata();
    testing_env!(context.predecessor_account_id(accounts(1)).build());
    contract.create_badge_collection( token_metadata, None, None);
}
#[test]
fn test_mint_badge() {
    let mut context = get_context(accounts(0));
    testing_env!(context.build());
    let mut contract = Contract::new_default_meta(accounts(0).into());

    testing_env!(context.predecessor_account_id(accounts(0)).build());
    let series_id = 1;
    let token_metadata: TokenMetadata = sample_token_metadata();

    contract.create_badge_collection( token_metadata, None, None);

    contract.mint_badge(series_id.into(), accounts(1));

    assert_eq!(contract.nft_total_supply(), 1.into());
    assert_eq!(contract.nft_supply_for_owner(accounts(1)), 1.into());

    let nft = contract.nft_tokens_for_owner(accounts(1), None, None);
    assert_eq!(nft[0].owner_id, accounts(1));
    let badge_0_supply_for_owner = contract.badge_supply_for_owner(series_id, accounts(1));
    assert_eq!(badge_0_supply_for_owner.0, 1u128);

    let owner_badges_in_collection =
        contract.nft_tokens_for_badges(series_id, accounts(1), None, None);
    assert_eq!(owner_badges_in_collection.len(), 1);
}

#[test]
#[should_panic(expected = "Unauthorized")]
fn test_burn_badge_with_wrong_owner() {
    let mut context = get_context(accounts(0));
    testing_env!(context.build());
    let mut contract = Contract::new_default_meta(accounts(0).into());

    testing_env!(context.predecessor_account_id(accounts(0)).build());
    let series_id = 1;
    let token_metadata: TokenMetadata = sample_token_metadata();

    contract.create_badge_collection( token_metadata, None, None);

    contract.mint_badge(series_id.into(), accounts(1));

    assert_eq!(contract.nft_total_supply(), 1.into());
    assert_eq!(contract.nft_supply_for_owner(accounts(1)), 1.into());

    testing_env!(context.predecessor_account_id(accounts(0)).build());
    let tokens = contract.nft_tokens_for_owner(accounts(1), None, None);
    let token = &tokens[0];

    contract.nft_burn(token.token_id.clone());
}

#[test]
fn test_burn() {
    let mut context = get_context(accounts(0));
    testing_env!(context.build());
    let mut contract = Contract::new_default_meta(accounts(0).into());

    testing_env!(context.predecessor_account_id(accounts(0)).build());
    let series_id = 1;
    let token_metadata: TokenMetadata = sample_token_metadata();

    contract.create_badge_collection( token_metadata, None, None);

    contract.mint_badge(series_id.into(), accounts(1));

    assert_eq!(contract.nft_total_supply(), 1.into());
    assert_eq!(contract.nft_supply_for_owner(accounts(1)), 1.into());

    let tokens = contract.nft_tokens_for_owner(accounts(1), None, None);
    let token = &tokens[0];
    assert_eq!(token.owner_id, accounts(1));
    let badge_0_supply_for_owner = contract.badge_supply_for_owner(series_id, accounts(1));
    assert_eq!(badge_0_supply_for_owner.0, 1u128);

    let owner_badges_in_collection =
        contract.nft_tokens_for_badges(series_id, accounts(1), None, None);
    assert_eq!(owner_badges_in_collection.len(), 1);

    testing_env!(context.predecessor_account_id(accounts(1)).build());
    contract.nft_burn(token.token_id.clone());

    let nft = contract.nft_tokens_for_owner(accounts(1), None, None);
    assert_eq!(nft.len(), 0);
}
#[test]
fn test_batch_burn() {
    let mut context = get_context(accounts(0));
    testing_env!(context.build());
    let mut contract = Contract::new_default_meta(accounts(0).into());

    testing_env!(context.predecessor_account_id(accounts(0)).build());
    let series_id = 1;
    let token_metadata: TokenMetadata = sample_token_metadata();

    contract.create_badge_collection( token_metadata, None, None);

    contract.mint_badge(series_id.into(), accounts(1));
    contract.mint_badge(series_id.into(), accounts(1));
    contract.mint_badge(series_id.into(), accounts(1));

    assert_eq!(contract.nft_total_supply(), 3.into());
    assert_eq!(contract.nft_supply_for_owner(accounts(1)), 3.into());

    let tokens = contract.nft_tokens_for_owner(accounts(1), None, None);
    let token = &tokens[0];
    assert_eq!(token.owner_id, accounts(1));
    let badge_0_supply_for_owner = contract.badge_supply_for_owner(series_id, accounts(1));
    assert_eq!(badge_0_supply_for_owner.0, 3u128);

    let owner_badges_in_collection =
        contract.nft_tokens_for_badges(series_id, accounts(1), None, None);
    assert_eq!(owner_badges_in_collection.len(), 3);

    testing_env!(context.predecessor_account_id(accounts(1)).build());
    contract.series_batch_burn(series_id, None);

    let nft = contract.nft_tokens_for_owner(accounts(1), None, None);
    assert_eq!(nft.len(), 0);
}
