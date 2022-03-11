/**
 * A script to mint an NFT with metadata using the metaplex and system programs
 */
import {
    Connection,
    PublicKey,
} from '@solana/web3.js';
import * as metaplex from "@metaplex/js";
import { getPayer, getRpcUrl} from './utils';
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { BN } from '@project-serum/anchor';


const tokenAddress = new PublicKey("BGwSxv5iVhFBkuhS2i9YxLRwPewfd8HvBW263DXdkRHH");
const numberOfShares = 100;

export async function addToVault(): Promise<void> {

    // get connection
    const rpcUrl = await getRpcUrl();
    console.log('Attempting to connect to rpcUrl:', rpcUrl);
    let connection = new Connection(rpcUrl, 'confirmed');
    const version = await connection.getVersion();
    console.log('Connection to cluster established:', rpcUrl, version);

    let payer = await getPayer();
    console.log("Using payer:", payer.publicKey.toBase58());
    const metaplexWallet = new metaplex.NodeWallet(payer);


    // Create exernal price account
    const {txId: txId1, externalPriceAccount, priceMint} = await metaplex.actions.createExternalPriceAccount({connection: connection, wallet: metaplexWallet});

    console.log(`Confirming tx ${txId1}`)
    await connection.confirmTransaction(txId1);

    // Create Vault
    console.log("External price account tx: ", txId1);
    console.log("ExternalPriceAccount key: ", externalPriceAccount.toBase58());

    const {txId: txId2, vault, fractionMint, redeemTreasury, fractionTreasury} = await metaplex.actions.createVault({
        connection: connection, 
        wallet: metaplexWallet,
        priceMint: priceMint,
        externalPriceAccount: externalPriceAccount
      });
    console.log("Create Vault tx: ", txId2);
    console.log(`Vault: ${vault},    FactionMint: ${fractionMint},     RedeemTreasury: ${redeemTreasury},    fractionTreasury: ${fractionTreasury}`);


    console.log(`Confirming tx ${txId2}`)
    await connection.confirmTransaction(txId2);
    
    // Add token to vault
    const tokenAccount = await findAssociatedTokenAddress(payer.publicKey, tokenAddress);

    console.log("Add token to vault, token account:", tokenAccount)
    const result = await metaplex.actions.addTokensToVault({
        connection: connection, 
        wallet: metaplexWallet, 
        vault: vault, 
        nfts: [{tokenAccount: tokenAccount, tokenMint: tokenAddress, amount: new BN(1)}] 
      });
    console.log("Safety deposit boxes", result.safetyDepositTokenStores);
      
       
    const vaultObject = await metaplex.programs.vault.Vault.load(connection, vault);

    console.log(vaultObject);  
}

async function findAssociatedTokenAddress(
    walletAddress: PublicKey,
    tokenMintAddress: PublicKey
  ): Promise<PublicKey> {
    return (await PublicKey.findProgramAddress(
        [
            walletAddress.toBuffer(),
            TOKEN_PROGRAM_ID.toBuffer(),
            tokenMintAddress.toBuffer(),
        ],
        ASSOCIATED_TOKEN_PROGRAM_ID
    ))[0];
  }

addToVault().then(
    () => process.exit(),
    err => {
      console.error(err);
      process.exit(-1);
    },
  );
  