### To Build and deploy
```
cd rust
cargo build-bpf
solana program deploy target/deploy/nftminter.so  --url localhost
```