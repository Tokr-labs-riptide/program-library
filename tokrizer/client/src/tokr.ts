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
import { MintLayout, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { Borsh } from '@metaplex-foundation/mpl-core';
import fs from 'mz/fs';
import path from 'path';
import * as borsh from 'borsh';
import {getPayer, getRpcUrl, createKeypairFromFile} from './utils';

const TOKEN_METADATA_PROGRAM_ID = new PublicKey(
  "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
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

export class MintArgsOld extends Borsh.Data<{
  name: string;
  symbol: string;
  uri: string;
}> {
  static readonly SCHEMA = this.struct([
    ['instruction', 'u8'],
    ['name', 'string'],
    ['symbol', 'string'],
    ['uri', 'string']
  ]);

  instruction = 0;
  name: string;
  symbol: string;
  uri: string;
}

export class TokrizeArgs {
  instruction = 0;
  name: string;
  symbol: string;
  uri: string;
  constructor(fields: {name: string, symbol: string, uri: string} | undefined = undefined) {
    if (fields) {
      this.name = fields.name;
      this.symbol = fields.symbol;
      this.uri = fields.uri;
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
      ['uri', 'string']
    ]}],
]);


export async function runContract(args: TokrizeArgs): Promise<void> {
  console.log('Payer: ', payer.publicKey.toBase58());

  const data = Buffer.from(borsh.serialize(
    TokrizeSchema,
    args
  ));

  const mintAccount = (await PublicKey.findProgramAddress([payer.publicKey.toBuffer(), Buffer.from(args.name, "utf-8"), Buffer.from(args.uri, "utf-8")], programId))[0];

  console.log("mint", mintAccount.toBase58());

  const metadataAccount = (await PublicKey.findProgramAddress([Buffer.from('metadata'), TOKEN_METADATA_PROGRAM_ID.toBuffer(), mintAccount.toBuffer()], TOKEN_METADATA_PROGRAM_ID))[0];

  // todo replace with dest
  const tokenAta = (await PublicKey.findProgramAddress([payer.publicKey.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mintAccount.toBuffer()], ASSOCIATED_TOKEN_PROGRAM_ID))[0]

  const instruction = new TransactionInstruction(
    {
      keys: [
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