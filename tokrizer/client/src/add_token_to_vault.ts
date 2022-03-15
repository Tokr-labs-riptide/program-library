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
import { getPayer, getRpcUrl} from './utils';
import { AccountLayout, Token, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { BN } from '@project-serum/anchor';
import { InitVault, Vault, VaultProgram, SafetyDepositBox } from '@metaplex-foundation/mpl-token-vault';

export class AddTokenArgs {
  instruction = 1;
  amount: number;
  constructor(fields: {amount: number} | undefined = undefined) {
    if (fields) {
      this.amount = fields.amount;
    }
  }
}

const AddTokenSchema = new Map([
  [AddTokenArgs, {
    kind: 'struct', 
    fields: [
      ['instruction', 'u8'],
      ['amount', 'u64'],
    ]}],
]);

/**
 * Accounts required by the _AddTokenToInactiveVault_ instruction
 *
 * @property [_writable_] safetyDepositAccount Uninitialized safety deposit box account address (will be created and allocated by this endpoint) Address should be pda with seed of [PREFIX, vault_address, token_mint_address]
 * @property [_writable_] tokenAccount Initialized Token account
 * @property [_writable_] store Initialized Token store account with authority of this program, this will get set on the safety deposit box
 * @property [_writable_] vault Initialized inactive fractionalized token vault
 * @property [**signer**] vaultAuthority Authority on the vault
 * @property [**signer**] payer Payer
 * @property [**signer**] transferAuthority Transfer Authority to move desired token amount from token account to safety deposit
 * @property [] systemAccount System account sysvar
 * @category Instructions
 * @category AddTokenToInactiveVault
 * @category generated
 */
export type AddTokenToInactiveVaultInstructionAccounts = {
  safetyDepositAccount: PublicKey;
  tokenAccount: PublicKey;
  store: PublicKey;
  vault: PublicKey;
  vaultAuthority: PublicKey;
  payer: PublicKey;
  transferAuthority: PublicKey;
  systemAccount: PublicKey;
};

const addTokenToInactiveVaultInstructionDiscriminator = 1;

/**
 * Creates a _AddTokenToInactiveVault_ instruction.
 *
 * @param accounts that will be accessed while the instruction is processed
 * @param args to provide as instruction data to the program
 *
 * @category Instructions
 * @category AddTokenToInactiveVault
 * @category generated
 */
export function createAddTokenToInactiveVaultInstruction(
  accounts: AddTokenToInactiveVaultInstructionAccounts,
) {
  const {
    safetyDepositAccount,
    tokenAccount,
    store,
    vault,
    vaultAuthority,
    payer,
    transferAuthority,
    systemAccount,
  } = accounts;

  const data = Buffer.from(borsh.serialize(
    AddTokenSchema,
    new AddTokenArgs({amount:1})
  ));
  const keys: AccountMeta[] = [
    {
      pubkey: safetyDepositAccount,
      isWritable: true,
      isSigner: false,
    },
    {
      pubkey: tokenAccount,
      isWritable: true,
      isSigner: false,
    },
    {
      pubkey: store,
      isWritable: true,
      isSigner: false,
    },
    {
      pubkey: vault,
      isWritable: true,
      isSigner: false,
    },
    {
      pubkey: vaultAuthority,
      isWritable: false,
      isSigner: true,
    },
    {
      pubkey: payer,
      isWritable: false,
      isSigner: true,
    },
    {
      pubkey: transferAuthority,
      isWritable: false,
      isSigner: true,
    },
    {
      pubkey: TOKEN_PROGRAM_ID,
      isWritable: false,
      isSigner: false,
    },
    {
      pubkey: SYSVAR_RENT_PUBKEY,
      isWritable: false,
      isSigner: false,
    },
    {
      pubkey: systemAccount,
      isWritable: false,
      isSigner: false,
    },
  ];

  const ix = new TransactionInstruction({
    programId: new PublicKey('vau1zxA2LbssAUEF7Gpw91zMM1LvXrvpzJtmZ58rPsn'),
    keys,
    data,
  });
  return ix;
}

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
          }
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
  new PublicKey("3jZjTFU8YCktnrCmWE45VhmU3b3VpuojjaFJwwJBZQa9"),
  new PublicKey("Ht5PidjhjQDnzWbe3LZ3MLRcjGYMeARxqht4tzwUUGUb"),
).then(
    () => process.exit(),
    err => {
      console.error(err);
      process.exit(-1);
    },
  );
  