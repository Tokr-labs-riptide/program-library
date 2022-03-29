# Tokrizer
A solana program to faciliate minting and fractionalizing rNFTs utilizing [Metaplex](https://docs.metaplex.com/).

## Overview
To support the 2 main use cases, this program has 5 instructions:
1) Mint rNFT
2) Create Vault
3) Add Token To Vault
4) Use Vault Fractionalize
5) Send Fractional Share


### NFT Minting
The [Metaplex Metadata program](https://github.com/metaplex-foundation/metaplex-program-library/tree/master/token-metadata) is used to mint an rNFT with metadata related to the real estate parcel. There is only 1 instruction call of the Tokrizer program needed for this.

#### 1 - Mint rNFT
The steps of the Mint rNFT instruction:
- Create and initialize a SPL-Token Mint
- Create an associated token account for the destination wallet
- Create the metadata account with a Name, Symbol and URI to a metadata file that conforms to the [Metaplex standard](https://docs.metaplex.com/token-metadata/specification).
- Mint the new Token to the destination wallet

### NFT Vaulting and Fractionalizing
The [Metaplex Vault program](https://github.com/metaplex-foundation/metaplex-program-library/tree/master/token-vault) is used to "fractionalize" an rNFT.
Fractionalizing works by adding the rNFT to a Metaplex vault which acts as a sort of escrow account. The vault is then "Activated", sealing the rNFT inside and 
minting a specified amount of fractional shares. These shares can them be transfered to others to represent fractional ownership of the original rNFT. All shares
must be transfered back to the vault before the vault can be "Combined" and the original NFT withdrawn. 
This is done with 4 instruction calls.

#### 2 - Create Vault
- Create and initialize External Pricing account as an oracle for the fractional shares.
- Create Fractional Mint for minting the fractional shares.
- Create the Fractional Treasury Associated Token Account to hold the shares after they are minted but before they are sent to recipients.
- Create the Redeem Treasury to hold SOL needed to buy back fractional shares.
- Finally Create the Vault.

#### 3 - Add Token To Vault
- (On the client side) Create transfer authority to move the NFT to the vault.
- Create Safety deposit box to hold the NFT.
- Delegate authority to move the NFT to the transfer authority.
- Call the Add Token To Vault Metaplex instruction.

#### 4 - Fractionalize
- Call the Activate Vault metaplex instruction, which authomatically mints Fractional Shares

#### 5 - Send Share
- Create a associated token account of the Fractional Share for the destination wallet (if it does not exist)
- Withdraw the share from the Fractional Treasury, transfering it to the destination.

## Code Structure
- Client side code for calling the Tokrizer program is [here](https://github.com/TOKR-labs/program-library/blob/main/tokrizer/client/src/tokr.ts)
- The on-chain code for the Tokrizer is [here](https://github.com/TOKR-labs/program-library/tree/main/tokrizer/rust/src)
- There is a folder of scripts that can do everything that the Tokrizer program does, but in the front end only by calling the Metaplex programs. [Here](https://github.com/TOKR-labs/program-library/tree/main/tokrizer/client/src/scripts).


## To Build and deploy
```
cd rust
cargo build-bpf
solana program deploy target/deploy/tokrizer.so  --url localhost
```