#!/bin/sh

echo ">> Building contract"

# rustup target add wasm32-unknown-unknown
# cargo build --all --target wasm32-unknown-unknown --release
set -e && RUSTFLAGS='-C link-arg=-s' 
cargo build --target wasm32-unknown-unknown --release &&
mkdir -p ../out && cp target/wasm32-unknown-unknown/release/*.wasm ../out/gateway_nft_marketplace.wasm