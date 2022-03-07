/**
 * A script to mint an NFT with metadata using the metaplex and system programs
 */
import {
    Keypair,
    Connection,
    PublicKey,
    SYSVAR_RENT_PUBKEY,
    SystemProgram,
    TransactionInstruction,
    Transaction,
    sendAndConfirmTransaction,
} from '@solana/web3.js';
import { MintLayout, Token, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { DataV2, CreateMetadataV2Args } from '@metaplex-foundation/mpl-token-metadata';
import { METADATA_SCHEMA } from './metaplex_schema';
import * as borsh from 'borsh';
import { getPayer, getRpcUrl} from './utils';


const TOKEN_METADATA_PROGRAM_ID = new PublicKey(
    "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
);


export async function fractionalize(): Promise<void> {

    // get connection
    const rpcUrl = await getRpcUrl();
    console.log('Attempting to connect to rpcUrl:', rpcUrl);
    let connection = new Connection(rpcUrl, 'confirmed');
    const version = await connection.getVersion();
    console.log('Connection to cluster established:', rpcUrl, version);

    let payer = await getPayer();

    // Allocate memory for the account
    const mintRent = await connection.getMinimumBalanceForRentExemption(
        MintLayout.span,
    );

    // Generate a mint
    let mint = Keypair.generate();
    const instructions: TransactionInstruction[] = [];
    const signers: Keypair[] = [mint, payer];

    console.log("Rent lamports: ", mintRent);
    console.log("Payer: ", payer.publicKey.toBase58());
    console.log("Mint:", mint.publicKey.toBase58());
    console.log("token program: ", TOKEN_PROGRAM_ID.toBase58());

    // var fromAirDropSignature = await connection.requestAirdrop(
    //   mint.publicKey,
    //   LAMPORTS_PER_SOL
    // );
    // console.log("Airdrop!! {}", fromAirDropSignature);
    // const res = await connection.confirmTransaction(fromAirDropSignature);
    // console.log("Confirmed airdrop {}", res);


    const transaction = new Transaction();
    // wtf why does this not work
    transaction.add(SystemProgram.createAccount({
        fromPubkey: payer.publicKey,
        newAccountPubkey: mint.publicKey,
        lamports: mintRent,
        space: MintLayout.span,
        programId: TOKEN_PROGRAM_ID,
    }));



    const destination = new PublicKey("");

    const ATAAddress = await getTokenWallet(
        destination,
        mint.publicKey,
    );


    const tx = await sendAndConfirmTransaction(
        connection,
        transaction,
        [payer, mint]
    );

    console.log("Tx id:", tx)
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


fractionalize().then(
    () => process.exit(),
    err => {
      console.error(err);
      process.exit(-1);
    },
  );
  