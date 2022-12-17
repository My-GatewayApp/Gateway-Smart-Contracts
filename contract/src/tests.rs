/* unit tests */
#[cfg(test)]
use crate::Contract;
use crate::TokenMetadata;
use near_sdk::json_types::{Base64VecU8, U128};
use near_sdk::test_utils::{accounts, VMContextBuilder};
use near_sdk::testing_env;
use near_sdk::{env, AccountId};

// const MINT_STORAGE_COST: u128 = 100_000_000_000_000_000_000_000;
// const MIN_REQUIRED_APPROVAL_YOCTO: u128 = 170000000000000000000;

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
    let contract = Contract::new_default_meta(accounts(0).into(), "8QoJVEQAstCiSU4osfagAMZQqUpoYnvj1K8kgczhSE4e".to_string());
    testing_env!(context.is_view(true).build());
    let contract_nft_tokens = contract.nft_tokens(Some(U128(0)), None);
    assert_eq!(contract_nft_tokens.len(), 0);
}
#[test]            
#[should_panic(expected = "only approved creators can add a new badge collection")]
fn test_create_badge_with_wrong_acct_collection() {
    let mut context = get_context(accounts(0));
    testing_env!(context.build());
    let mut contract = Contract::new_default_meta(accounts(0).into(), "8QoJVEQAstCiSU4osfagAMZQqUpoYnvj1K8kgczhSE4e".to_string());

    let token_metadata: TokenMetadata = sample_token_metadata();
    testing_env!(context.predecessor_account_id(accounts(1)).build());
    contract.create_badge_collection(1, token_metadata, None, None);
}
#[test]
fn test_create_badge_collection() {
    let mut context = get_context(accounts(0));
    testing_env!(context.build());
    let mut contract = Contract::new_default_meta(accounts(0).into(), "8QoJVEQAstCiSU4osfagAMZQqUpoYnvj1K8kgczhSE4e".to_string());

    testing_env!(context.predecessor_account_id(accounts(0)).build());
    let series_id = 1;
    let token_metadata: TokenMetadata = sample_token_metadata();

    contract.create_badge_collection(1, token_metadata, None, None);
    let created_series = contract.get_series_details(series_id).unwrap();
    // println!("{:?}", );
    assert_eq!(created_series.series_id, series_id);
    assert_eq!(created_series.owner_id, accounts(0))
}


#[test]
fn test_mint_badge() {
    let mut context = get_context(accounts(0));
    testing_env!(context.build());
    let mut contract = Contract::new_default_meta(accounts(0).into(), "8QoJVEQAstCiSU4osfagAMZQqUpoYnvj1K8kgczhSE4e".to_string());

    testing_env!(context.predecessor_account_id(accounts(0)).build());
    let series_id = 1;
    let token_metadata: TokenMetadata = sample_token_metadata();

    contract.create_badge_collection(1, token_metadata, None, None);

    contract.badge_mint_test(series_id.into(), accounts(1));

    assert_eq!(contract.nft_total_supply(), 1.into());
    assert_eq!(contract.nft_supply_for_owner(accounts(1)), 1.into());

    let nft = contract.nft_tokens_for_owner(accounts(1), None, None);
    assert_eq!(nft[0].owner_id, accounts(1));
    let badge_0_supply_for_owner = contract.badge_token_supply_for_owner(series_id, accounts(1));
    assert_eq!(badge_0_supply_for_owner.0, 1u128);

    let owner_badges_in_collection =
        contract.owner_nft_tokens_for_badges(series_id, accounts(1), None, None);
    assert_eq!(owner_badges_in_collection.len(), 1);
}



#[test]
pub fn test_update_series_media() {
    let mut context = get_context(accounts(0));
    testing_env!(context.build());
    let mut contract = Contract::new_default_meta(accounts(0).into(), "8QoJVEQAstCiSU4osfagAMZQqUpoYnvj1K8kgczhSE4e".to_string());

    testing_env!(context.predecessor_account_id(accounts(0)).build());
    let series_id = 1;
    let token_metadata: TokenMetadata = sample_token_metadata();

    contract.create_badge_collection(1, token_metadata, None, None);
    let created_series = contract.get_series_details(series_id).unwrap();
    // println!("{:?}", );
    assert_eq!(created_series.series_id, series_id);
    assert_eq!(created_series.owner_id, accounts(0));
    let new_media_string = "https://images.com/1.png".to_string();
    //we'll usually use file hash and not url hash
    let new_media_hash = Base64VecU8::from(env::sha256(format!("{}", new_media_string).as_bytes()));

    contract.update_badge_collection_media(
        series_id.into(),
        Some(new_media_string.clone()),
        Some(new_media_hash.clone()),
    );
    let series = contract.get_series_details(series_id).unwrap();

    assert_eq!(series.metadata.media, Some(new_media_string));
    assert_eq!(series.metadata.media_hash, Some(new_media_hash.clone()));
}

#[test]
#[should_panic(expected = "Invalid badge type")]
fn test_fail_get_badge_series_by_type() {
    let mut context = get_context(accounts(0));
    testing_env!(context.build());
    let mut contract = Contract::new_default_meta(accounts(0).into(), "8QoJVEQAstCiSU4osfagAMZQqUpoYnvj1K8kgczhSE4e".to_string());

    testing_env!(context.predecessor_account_id(accounts(0)).build());

    let token_metadata: TokenMetadata = sample_token_metadata();

    let series_type = 3u8;
    contract.create_badge_collection(series_type, token_metadata, None, None);
}

#[test]
fn test_get_badge_series_by_type() {
    let mut context = get_context(accounts(0));
    testing_env!(context.build());
    let mut contract = Contract::new_default_meta(accounts(0).into(), "8QoJVEQAstCiSU4osfagAMZQqUpoYnvj1K8kgczhSE4e".to_string());

    testing_env!(context.predecessor_account_id(accounts(0)).build());

    let token_metadata: TokenMetadata = sample_token_metadata();

    contract.create_badge_collection(1u8, token_metadata.clone(), None, None);
    contract.create_badge_collection(2u8, token_metadata, None, None);

    let series_1 = contract.get_badge_series_by_type(1);
    let series_2 = contract.get_badge_series_by_type(2);

    assert_eq!(series_1.len(), 1);
    assert_eq!(series_2.len(), 1);
}
