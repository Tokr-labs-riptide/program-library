/**
 * A script to mint an NFT with metadata using the metaplex and system programs
 */
import {
    Connection,
    PublicKey,
    Keypair,
    TransactionInstruction,
    SystemProgram,
    AccountMeta,
    SYSVAR_RENT_PUBKEY,
    Transaction,
    sendAndConfirmTransaction
} from '@solana/web3.js';
import * as borsh from 'borsh';
import * as metaplex from "@metaplex/js";
import {createAddTokenToInactiveVaultInstruction, AddTokenToInactiveVaultInstructionArgs} from './instructions/AddTokenToInactiveVault'
import { getPayer, getRpcUrl} from './utils';
import { AccountLayout, Token, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { BN } from '@project-serum/anchor';
import { InitVault, Vault, VaultProgram, SafetyDepositBox } from '@metaplex-foundation/mpl-token-vault';


export async function addToVault(tokenMintAddress: PublicKey, vaultAddress: PublicKey): Promise<void> {

    // get connection
    const rpcUrl = await getRpcUrl();
    console.log('Attempting to connect to rpcUrl:', rpcUrl);
    let connection = new Connection(rpcUrl, 'confirmed');
    const version = await connection.getVersion();
    console.log('Connection to cluster established:', rpcUrl, version);

    let payer = await getPayer();
    console.log("Using payer:", payer.publicKey.toBase58());
    const metaplexWallet = new metaplex.NodeWallet(payer);

    const vaultAuthority = await Vault.getPDA(vaultAddress);

    const tokenAta = await findAssociatedTokenAddress(payer.publicKey, tokenMintAddress);
    const safetyDepositBox = await SafetyDepositBox.getPDA(vaultAddress, tokenMintAddress);


    const instructions: TransactionInstruction[] = [];

    const tokenStoreAccount = Keypair.generate();


    // create new Token Acccount
    const accountRent = await connection.getMinimumBalanceForRentExemption(AccountLayout.span);
    console.log("Rent for tokenStore: ", accountRent);
    instructions.push(SystemProgram.createAccount({
      fromPubkey: payer.publicKey,
      newAccountPubkey: tokenStoreAccount.publicKey,
      lamports: accountRent,
      space: AccountLayout.span,
      programId: TOKEN_PROGRAM_ID,
    }));

    instructions.push(Token.createInitAccountInstruction(
      TOKEN_PROGRAM_ID,
      tokenMintAddress,
      tokenStoreAccount.publicKey,
      payer.publicKey,
    ));


    // create approval txs
    const transferAuthority = Keypair.generate() // todo use PDA
    
    instructions.push(Token.createApproveInstruction(
      TOKEN_PROGRAM_ID,
      tokenAta,
      transferAuthority.publicKey,
      payer.publicKey,
      [],
      1,
    ));
    instructions.push(Token.createRevokeInstruction(TOKEN_PROGRAM_ID, tokenAta, payer.publicKey, []));
    
    console.log("Here")
    // add token to vault:
    instructions.push(
      createAddTokenToInactiveVaultInstruction(
        {
            safetyDepositAccount: safetyDepositBox,
            tokenAccount: tokenMintAddress,
            store: tokenStoreAccount.publicKey,
            vault: vaultAddress,
            vaultAuthority: payer.publicKey,
            payer: payer.publicKey,
            transferAuthority: transferAuthority.publicKey,
            systemAccount: SystemProgram.programId
          },
          {amountArgs: { amount: 1 }}
        ));

    let transaction = new Transaction();
    instructions.forEach(x => transaction.add(x));
    const tx = await sendAndConfirmTransaction(
          connection,
          transaction,
          [payer, tokenStoreAccount, transferAuthority]
    );
       
    console.log("TX ", tx)
    const vaultObject = await metaplex.programs.vault.Vault.load(connection, vaultAddress);

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


addToVault(
  new PublicKey("5XfvXXr7vmcubdRSdus5Qoc7dqLYPN6zB2TXprTAX31p"), //token
  new PublicKey("76Lt8cVYBSKdwbU8NPcXvdE3Vv57wq2eye6wGCK1HBrd"),  //vault
).then(
    () => process.exit(),
    err => {
      console.error(err);
      process.exit(-1);
    },
  );
  