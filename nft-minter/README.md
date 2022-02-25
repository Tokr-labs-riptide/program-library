### Build and deploy
```
anchor build
anchor deploy --provider.cluster localnet --provider.wallet ~/.config/solana/devnet.json
anchor test --provider.cluster localnet --provider.wallet ~/.config/solana/devnet.json --skip-deploy

```