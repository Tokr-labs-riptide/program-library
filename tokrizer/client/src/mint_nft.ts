/**
 * A script to mint an NFT with metadata using the metaplex and system programs
 */
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
import { MintLayout, Token, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { DataV2, CreateMetadataV2Args } from '@metaplex-foundation/mpl-token-metadata';
import { METADATA_SCHEMA } from './metaplex_schema';
import * as borsh from 'borsh';
import { getPayer, getRpcUrl, createKeypairFromFile } from './utils';


const TOKEN_METADATA_PROGRAM_ID = new PublicKey(
    "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
);


export async function createMint(): Promise<void> {

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

    // console.log(ints)
    // console.log(ints.data)

    transaction.add(
        Token.createInitMintInstruction(
            TOKEN_PROGRAM_ID,
            mint.publicKey,
            0,
            payer.publicKey,
            payer.publicKey,
        ),
    );



    const destination = new PublicKey("");

    const ATAAddress = await getTokenWallet(
        destination,
        mint.publicKey,
    );


    console.log("ATA address:", ATAAddress.toBase58())

    transaction.add(
        createAssociatedTokenAccountInstruction(
            ATAAddress,
            payer.publicKey,
            destination,
            mint.publicKey,
        ),
    );


    // Create metadata
    const metadataAccount = await getMetadata(mint.publicKey);
    console.log("Metadata account:", metadataAccount);

    const data = new DataV2({
        symbol: "Gravity",
        name: "TOKR-g1",
        uri: "https://ipfs.io/ipfs/QmVQ8aqvv66xcvTSf7j85BUpEtPPKNmFAn7yXtpTfy7gGF?filename=alexkevtry3.json",
        sellerFeeBasisPoints: 0,
        creators: null,   //todo fill this out
        collection: null,
        uses: null,
    });

    let txnData = Buffer.from(
        borsh.serialize(
            new Map([
                DataV2.SCHEMA,
                ...METADATA_SCHEMA,
                ...CreateMetadataV2Args.SCHEMA,
            ]),
            new CreateMetadataV2Args({ data, isMutable: false }),
        ),
    );

    transaction.add(
        createMetadataInstruction(
            metadataAccount,
            mint.publicKey,
            payer.publicKey,
            payer.publicKey,
            payer.publicKey,
            txnData,
        ),
    );

    transaction.add(
        Token.createMintToInstruction(
            TOKEN_PROGRAM_ID,
            mint.publicKey,
            ATAAddress,
            payer.publicKey,
            [],
            1,
        ),
    );

    const tx = await sendAndConfirmTransaction(
        connection,
        transaction,
        [payer, mint]
    );

    console.log("Tx id:", tx)
}



export function createMetadataInstruction(
    metadataAccount: PublicKey,
    mint: PublicKey,
    mintAuthority: PublicKey,
    payer: PublicKey,
    updateAuthority: PublicKey,
    txnData: Buffer,
) {
    const keys = [
        {
            pubkey: metadataAccount,
            isSigner: false,
            isWritable: true,
        },
        {
            pubkey: mint,
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: mintAuthority,
            isSigner: true,
            isWritable: false,
        },
        {
            pubkey: payer,
            isSigner: true,
            isWritable: false,
        },
        {
            pubkey: updateAuthority,
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: SystemProgram.programId,
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: SYSVAR_RENT_PUBKEY,
            isSigner: false,
            isWritable: false,
        },
    ];
    return new TransactionInstruction({
        keys,
        programId: TOKEN_METADATA_PROGRAM_ID,
        data: txnData,
    });
}

export function createAssociatedTokenAccountInstruction(
    associatedTokenAddress: PublicKey,
    payer: PublicKey,
    walletAddress: PublicKey,
    splTokenMintAddress: PublicKey,
) {
    const keys = [
        {
            pubkey: payer,
            isSigner: true,
            isWritable: true,
        },
        {
            pubkey: associatedTokenAddress,
            isSigner: false,
            isWritable: true,
        },
        {
            pubkey: walletAddress,
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: splTokenMintAddress,
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: SystemProgram.programId,
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: TOKEN_PROGRAM_ID,
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: SYSVAR_RENT_PUBKEY,
            isSigner: false,
            isWritable: false,
        },
    ];
    return new TransactionInstruction({
        keys,
        programId: ASSOCIATED_TOKEN_PROGRAM_ID,
        data: Buffer.from([]),
    });
}



export const getMetadata = async (
    mint: PublicKey,
): Promise<PublicKey> => {
    return (
        await PublicKey.findProgramAddress(
            [
                Buffer.from('metadata'),
                TOKEN_METADATA_PROGRAM_ID.toBuffer(),
                mint.toBuffer(),
            ],
            TOKEN_METADATA_PROGRAM_ID,
        )
    )[0];
};

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


createMint().then(
    () => process.exit(),
    err => {
      console.error(err);
      process.exit(-1);
    },
  );
  