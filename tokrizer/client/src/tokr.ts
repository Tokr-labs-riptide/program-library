/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import {
  Keypair,
  Connection,
  PublicKey,
  LAMPORTS_PER_SOL,
  SYSVAR_RENT_PUBKEY,
  SystemProgram,
  TransactionInstruction,
  Transaction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import { MintLayout, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, NATIVE_MINT } from '@solana/spl-token';
import fs from 'mz/fs';
import path from 'path';
import * as borsh from 'borsh';
import {getPayer, getRpcUrl, createKeypairFromFile} from './utils';

import { InitVault, Vault, VaultProgram, SafetyDepositBox } from '@metaplex-foundation/mpl-token-vault';


const TOKEN_METADATA_PROGRAM_ID = new PublicKey(
  "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s" // devent
  // "ACvZk7eoncqw4AywLBk7DzpjRWXjwTL2tkfzYLZ4FhiG"  // localhost
);

const TOKEN_VAULT_PROGRAM_ID = new PublicKey(
  "vau1zxA2LbssAUEF7Gpw91zMM1LvXrvpzJtmZ58rPsn" // devent
  // "ACvZk7eoncqw4AywLBk7DzpjRWXjwTL2tkfzYLZ4FhiG"  // localhost
);



/**
 * Connection to the network
 */
let connection: Connection;

/**
 * Keypair associated to the fees' payer
 */
let payer: Keypair;

/**
 * Hello world's program id
 */
let programId: PublicKey;

/**
 * Path to program files
 */
const PROGRAM_PATH = path.resolve(__dirname, '../../rust/target/deploy');

/**
 * Path to program shared object file which should be deployed on chain.
 * This file is created when running either:
 *   - `npm run build:program-c`
 *   - `npm run build:program-rust`
 */
const PROGRAM_SO_PATH = path.join(PROGRAM_PATH, 'nftminter.so');

/**
 * Path to the keypair of the deployed program.
 * This file is created when running `solana program deploy dist/program/helloworld.so`
 */
const PROGRAM_KEYPAIR_PATH = path.join(PROGRAM_PATH, 'nftminter-keypair.json');

/**
 * Establish a connection to the cluster
 */
export async function establishConnection(): Promise<void> {
  const rpcUrl = await getRpcUrl();
  console.log('Attempting to connect to rpcUrl:', rpcUrl);
  connection = new Connection(rpcUrl, 'confirmed');
  const version = await connection.getVersion();
  console.log('Connection to cluster established:', rpcUrl, version);
}

/**
 * Establish an account to pay for everything
 */
export async function establishPayer(): Promise<void> {
  let fees = 0;
  if (!payer) {
    const {feeCalculator} = await connection.getRecentBlockhash();

    // Calculate the cost to fund the greeter account
    fees += await connection.getMinimumBalanceForRentExemption(MintLayout.span);

    // Calculate the cost of sending transactions
    fees += feeCalculator.lamportsPerSignature * 100; // wag

    payer = await getPayer();
  }

  let lamports = await connection.getBalance(payer.publicKey);
  if (lamports < fees) {

    console.log("not enough money for fees, request airgrop")
    // If current balance is not enough to pay for fees, request an airdrop
    const sig = await connection.requestAirdrop(
      payer.publicKey,
      fees - lamports,
    );
    await connection.confirmTransaction(sig);
    lamports = await connection.getBalance(payer.publicKey);
  }

  console.log(
    'Using account',
    payer.publicKey.toBase58(),
    'containing',
    lamports / LAMPORTS_PER_SOL,
    'SOL to pay for fees',
  );
}

/**
 * Check if the hello world BPF program has been deployed
 */
export async function checkProgram(): Promise<void> {
  // Read program id from keypair file
  try {
    const programKeypair = await createKeypairFromFile(PROGRAM_KEYPAIR_PATH);
    programId = programKeypair.publicKey;
  } catch (err) {
    const errMsg = (err as Error).message;
    throw new Error(
      `Failed to read program keypair at '${PROGRAM_KEYPAIR_PATH}' due to error: ${errMsg}. Program may need to be deployed with \`solana program deploy dist/program/helloworld.so\``,
    );
  }

  // Check if the program has been deployed
  const programInfo = await connection.getAccountInfo(programId);
  if (programInfo === null) {
    if (fs.existsSync(PROGRAM_SO_PATH)) {
      throw new Error(
        'Program needs to be deployed with `solana program deploy dist/program/helloworld.so`',
      );
    } else {
      throw new Error('Program needs to be built and deployed');
    }
  } else if (!programInfo.executable) {
    throw new Error(`Program is not executable`);
  }
  console.log(`Using program ${programId.toBase58()}`);
}

export class TokrizeArgs {
  instruction = 0;
  name: string;
  symbol: string;
  uri: string;
  mint_bump: number;
  mint_seed: string;
  constructor(fields: {name: string, symbol: string, uri: string, mint_bump: number, mint_seed: string} | undefined = undefined) {
    if (fields) {
      this.name = fields.name;
      this.symbol = fields.symbol;
      this.uri = fields.uri;
      this.mint_bump = fields.mint_bump;
      this.mint_seed = fields.mint_seed;
    }
  }
}

const TokrizeSchema = new Map([
  [TokrizeArgs, {
    kind: 'struct', 
    fields: [
      ['instruction', 'u8'],
      ['name', 'string'],
      ['symbol', 'string'],
      ['uri', 'string'],
      ['mint_bump', 'u8'],
      ['mint_seed', 'string']
    ]}],
]);


export class VaultArgs {
  instruction = 1;
  vault_bump: number;
  vault_seed: string;
  constructor(fields: {vault_bump: number, vault_seed: string} | undefined = undefined) {
    if (fields) {
      this.vault_bump = fields.vault_bump;
      this.vault_seed = fields.vault_seed;
    }
  }
}

const VaultSchema = new Map([
  [VaultArgs, {
    kind: 'struct', 
    fields: [
      ['instruction', 'u8'],
      ['vault_bump', 'u8'],
      ['vault_seed', 'string']
    ]}],
]);

export class AddTokenArgs {
  instruction = 2;
  vault_bump: number;
  vault_seed: string;
  constructor(fields: {vault_bump: number, vault_seed: string} | undefined = undefined) {
    if (fields) {
      this.vault_bump = fields.vault_bump;
      this.vault_seed = fields.vault_seed;
    }
  }
}

const AddTokenSchema = new Map([
  [AddTokenArgs, {
    kind: 'struct', 
    fields: [
      ['instruction', 'u8'],
      ['vault_bump', 'u8'],
      ['vault_seed', 'string']
    ]}],
]);

export async function addTokenToVault(vaultAddress: PublicKey, tokenAddress: PublicKey): Promise<void> {
  console.log('Payer: ', payer.publicKey.toBase58());


  const vaultAuthority1 = (await PublicKey.findProgramAddress([Buffer.from("vault"), TOKEN_VAULT_PROGRAM_ID.toBuffer(), vaultAddress.toBuffer()], TOKEN_VAULT_PROGRAM_ID))[0]
  const vaultAuthority = await Vault.getPDA(vaultAddress);
  const safetyDepositBox = await SafetyDepositBox.getPDA(vaultAddress, tokenAddress);
  const transferAuthority = Keypair.generate() // todo use PDA
  // const [transferAuthorityKey, transferAuthorityBump] = (await PublicKey.findProgramAddress([vaultAddress.toBuffer(), tokenAddress.toBuffer(), TOKEN_VAULT_PROGRAM_ID.toBuffer()], programId));


  const tokenAta = await getTokenWallet(payer.publicKey, tokenAddress); // todo replace with treasury
  const vaultAuthorityAta = await getTokenWallet(vaultAuthority, tokenAddress); // todo replace with treasury
  const tokenStore = Keypair.generate() // todo use PDA

  console.log("tokenAta: ", tokenAta.toBase58());
  console.log("vault: ", vaultAddress.toBase58());
  console.log("vaultAuthority: ", vaultAuthority.toBase58());
  console.log("vaultAuthority1: ", vaultAuthority1.toBase58());
  console.log("vaultAuthorityAta: ", vaultAuthorityAta.toBase58());
  console.log("safetyDepositBox: ", safetyDepositBox.toBase58());
  console.log("transferAuthority: ", transferAuthority.publicKey.toBase58());

  const data = Buffer.from(borsh.serialize(
    AddTokenSchema,
    new AddTokenArgs({vault_bump:254, vault_seed:"0qn4mac9qn2eqqt5alwb"})
  ));

  const kp = Keypair.generate();
  console.log("new kp, public: ", kp.publicKey.toBase58());
  console.log("new kp, private: ", kp.secretKey);

  const instruction = new TransactionInstruction(
    {
      keys: [ 
        {pubkey: tokenAddress, isSigner: false, isWritable: true}, 
        {pubkey: payer.publicKey, isSigner: true, isWritable: true}, 
        {pubkey: tokenAta, isSigner: false, isWritable: true},
        {pubkey: transferAuthority.publicKey, isSigner: true, isWritable: true},
        {pubkey: vaultAddress, isSigner: false, isWritable: true},
        {pubkey: vaultAuthority, isSigner: false, isWritable: true},
        {pubkey: tokenStore.publicKey, isSigner: true, isWritable: true},
        {pubkey: safetyDepositBox, isSigner: false, isWritable: true},
        {pubkey: TOKEN_VAULT_PROGRAM_ID, isSigner: false, isWritable: false},
        {pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false},
        {pubkey: SystemProgram.programId, isSigner: false, isWritable: false},
        {pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false},
        {pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false},
      ],
      programId,
      data: data
    }
  );

  let transaction = new Transaction().add(instruction)
  transaction.feePayer = payer.publicKey
  const tx = await sendAndConfirmTransaction(
    connection,
    transaction,
    [transferAuthority, tokenStore, payer],
  );

  console.log("Transaction id:", tx);
}


export async function createVault(): Promise<void> {

  let vaultSeed = (Math.random() + 1).toString(36).substring(2) + (Math.random() + 1).toString(36).substring(2);

  const [vaultKey, vaultBump] = (await PublicKey.findProgramAddress([payer.publicKey.toBuffer(), TOKEN_VAULT_PROGRAM_ID.toBuffer(), Buffer.from(vaultSeed)], programId))

  console.log("Vault Seed: ", vaultSeed);
  console.log("Vault Bump: ", vaultBump);

  const data = Buffer.from(borsh.serialize(
    VaultSchema,
    new VaultArgs({vault_bump: vaultBump, vault_seed: vaultSeed})
  ));

  console.log("MAX RENT:" + await connection.getMinimumBalanceForRentExemption(Vault.MAX_VAULT_SIZE));

  // const vaultAuthority = (await PublicKey.findProgramAddress([Buffer.from("vault"), TOKEN_VAULT_PROGRAM_ID.toBuffer(), vaultKey.toBuffer()], programId))[0]
  
  const vaultAuthority = await Vault.getPDA(vaultKey);

  const externalPricingAccountKey = (await PublicKey.findProgramAddress([Buffer.from("external"), vaultKey.toBuffer(), payer.publicKey.toBuffer()], programId))[0]

  const fractionMintkey = (await PublicKey.findProgramAddress([Buffer.from("fraction"), vaultKey.toBuffer(), payer.publicKey.toBuffer()], programId))[0]

  const redeemTreasuryKey = (await PublicKey.findProgramAddress([vaultAuthority.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), NATIVE_MINT.toBuffer()], ASSOCIATED_TOKEN_PROGRAM_ID))[0]

  const fractionTreasuryKey = (await PublicKey.findProgramAddress([vaultAuthority.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), fractionMintkey.toBuffer()], ASSOCIATED_TOKEN_PROGRAM_ID))[0]

  console.log("vaultKey:", vaultKey.toBase58());
  console.log("vaultAuthority:", vaultAuthority.toBase58());
  console.log("externalPricingAccountKey:", externalPricingAccountKey.toBase58());
  console.log("fractionMintkey:", fractionMintkey.toBase58());
  console.log("redeemTreasuryKey:", redeemTreasuryKey.toBase58());
  console.log("fractionTreasuryKey:", fractionTreasuryKey.toBase58());


  const instruction = new TransactionInstruction(
    {
      keys: [
        {pubkey: payer.publicKey, isSigner: true, isWritable: true}, 
        {pubkey: vaultKey, isSigner: false, isWritable: true}, 
        {pubkey: vaultAuthority, isSigner: false, isWritable: true}, 
        {pubkey: externalPricingAccountKey, isSigner: false, isWritable: true}, 
        {pubkey: fractionMintkey, isSigner: false, isWritable: true}, 
        {pubkey: redeemTreasuryKey, isSigner: false, isWritable: true}, 
        {pubkey: fractionTreasuryKey, isSigner: false, isWritable: true}, 
        {pubkey: TOKEN_VAULT_PROGRAM_ID, isSigner: false, isWritable: false},
        {pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false},
        {pubkey: SystemProgram.programId, isSigner: false, isWritable: false},
        {pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false},
        {pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false},
        {pubkey: NATIVE_MINT, isSigner: false, isWritable: false},
      ],
      programId,
      data: data
    }
  );

  const tx = await sendAndConfirmTransaction(
    connection,
    new Transaction().add(instruction),
    [payer],
  );

  console.log("Transaction id:", tx);
}

export async function mintNft(args: TokrizeArgs, destination: PublicKey): Promise<void> {
  console.log('Payer: ', payer.publicKey.toBase58());

  let mintSeed = (Math.random() + 1).toString(36).substring(2) + (Math.random() + 1).toString(36).substring(2);
  console.log("random", mintSeed);
  args.mint_seed = mintSeed;
  let pda = (await PublicKey.findProgramAddress([Buffer.from(mintSeed), payer.publicKey.toBuffer(), programId.toBuffer()], programId));
  const mintAccount = pda[0]
  args.mint_bump = pda[1]

  
  console.log("mint", mintAccount.toBase58());
  console.log("bump", args.mint_bump);

  const data = Buffer.from(borsh.serialize(
    TokrizeSchema,
    args
  ));

  const metadataAccount = (await PublicKey.findProgramAddress([Buffer.from('metadata'), TOKEN_METADATA_PROGRAM_ID.toBuffer(), mintAccount.toBuffer()], TOKEN_METADATA_PROGRAM_ID))[0];

  const tokenAta = (await PublicKey.findProgramAddress([destination.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mintAccount.toBuffer()], ASSOCIATED_TOKEN_PROGRAM_ID))[0]

  
  const instruction = new TransactionInstruction(
    {
      keys: [
        {pubkey: payer.publicKey, isSigner: true, isWritable: true}, 
        {pubkey: destination, isSigner: false, isWritable: true}, 
        {pubkey: payer.publicKey, isSigner: true, isWritable: true}, 
        {pubkey: mintAccount, isSigner: false, isWritable: true}, 
        {pubkey: metadataAccount, isSigner: false, isWritable: true}, 
        {pubkey: tokenAta, isSigner: false, isWritable: true},
        {pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false},
        {pubkey: TOKEN_METADATA_PROGRAM_ID, isSigner: false, isWritable: false},
        {pubkey: SystemProgram.programId, isSigner: false, isWritable: false},
        {pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false},
        {pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false},
      ],
      programId,
      data: data
    }
  );

  const tx = await sendAndConfirmTransaction(
    connection,
    new Transaction().add(instruction),
    [payer],
  );

  console.log("Transaction id:", tx);
}

export const getTokenWallet = async function (
  wallet: PublicKey,
  mint: PublicKey,
) {
  return (
      await PublicKey.findProgramAddress(
          [wallet.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
          ASSOCIATED_TOKEN_PROGRAM_ID,
      )
  )[0];
};