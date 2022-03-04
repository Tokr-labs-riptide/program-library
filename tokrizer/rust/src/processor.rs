use solana_program::{
    rent,
    instruction::{AccountMeta},
    account_info::{next_account_info, AccountInfo},
    entrypoint::ProgramResult,
    msg,
    program::{invoke, invoke_signed, invoke_signed_unchecked},
    program_error::ProgramError,
    program_pack::{IsInitialized, Pack},
    sysvar::{rent::Rent, Sysvar},
    pubkey::Pubkey,
    system_instruction
};
use spl_token::{
    self,
    instruction::{initialize_mint},
    state::Mint
};
use borsh::{BorshDeserialize, BorshSerialize};

use mpl_token_metadata::{
    instruction::{create_metadata_accounts_v2},
};

use spl_associated_token_account::{
    create_associated_token_account, get_associated_token_address
};

use crate::{instruction::TokrizerInstruction};

pub fn process(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    //msg!(("Starting up program! {} ", program_id);
    let instruction = TokrizerInstruction::try_from_slice(instruction_data)?;

    match instruction {
        TokrizerInstruction::CreateMint(args) => {
            //msg!(("Create NFT with Name: {}, Symbol: {}, Uri: {}", args.name, args.symbol, args.uri);
            tokrize(program_id, accounts, args.name, args.symbol, args.uri);
        }
    }

    Ok(())
}


pub fn tokrize(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    name: String,
    symbol: String,
    uri: String
) -> ProgramResult {
    // Iterating accounts is safer than indexing
    let accounts_iter = &mut accounts.iter();

    let payer = next_account_info(accounts_iter)?;
    //msg!(("payer: {} ", payer.key);

    let mint_input = next_account_info(accounts_iter)?;
    //msg!(("mint_input: {} ", mint_input.key);

    let metadata_acct = next_account_info(accounts_iter)?;
    //msg!(("metadata_acct: {} ", metadata_acct.key);

    let token_program = next_account_info(accounts_iter)?;
    //msg!(("token_program: {} ", token_program.key);

    let metadata_program = next_account_info(accounts_iter)?;
    //msg!(("metadata_program: {} ", metadata_program.key);

    let system_program = next_account_info(accounts_iter)?;
    //msg!(("system_program: {} ", system_program.key);

    let rent_key = next_account_info(accounts_iter)?;
    //msg!(("rent_key: {} ", rent_key.key);

    let token_ata_input = next_account_info(accounts_iter)?;
    //msg!(("token_ata_input: {} ", token_ata_input.key);

    // todo check if mint input is correct
    let (mint_key, mint_bump) = Pubkey::find_program_address(&[payer.key.as_ref(), name.as_bytes(), uri.as_bytes()], &program_id);
    //msg!(("mint_pda: {} ", mint_key);

    // todo check if metadata input is correct
    let (metadata_key, metadata_bump) = Pubkey::find_program_address(&[b"metadata", metadata_program.key.as_ref(), mint_key.as_ref()], &metadata_program.key);
    //msg!(("metadata_pda: {} ", metadata_key);

    // let rent = Rent {
    //     lamports_per_byte_year: Mint::LEN as u64,
    //     ..Rent::default()
    // };
    // let min_bal = rent.minimum_balance(Mint::LEN);
    // //msg!(("minimum rent {}", min_bal);


    //msg!(("create mint account");
    let result = invoke_signed(
        &system_instruction::create_account(
            payer.key, 
            &mint_key, 
            1461600 as u64, // wtf why does minimum balance give not enough
            Mint::LEN as u64,
            &spl_token::id()),
        accounts,
        &[&[payer.key.as_ref(), name.as_bytes(), uri.as_bytes(), &[mint_bump]]]
    );

    //msg!(("init mint");
    let result = invoke_signed(
        &initialize_mint(
            &spl_token::id(),
            &mint_key, 
            payer.key, 
            Some(program_id), 
            0
        )?,
        accounts,
        &[&[payer.key.as_ref(), name.as_bytes(), uri.as_bytes(), &[mint_bump]]]
    );

    let result = invoke(
        &create_associated_token_account(
            payer.key,
            payer.key,   // todo replace with dest
            &mint_key, 
        ),
        &[
            payer.clone(), 
            token_ata_input.clone(), 
            payer.clone(),  // todo replace with dest
            mint_input.clone(), 
            system_program.clone(), 
            token_program.clone(), 
            rent_key.clone()
        ],
        // accounts,
    );

    //msg!(("create metadata account");
    let result = invoke_signed(
        &create_metadata_accounts_v2(
            mpl_token_metadata::ID,
            metadata_key,
            mint_key, 
            *payer.key, 
            *payer.key,
            *payer.key,  //todo how to set program as update authority
            name,
            symbol,
            uri,
            None, //todo set creators
            0,
            false,
            false,
            None, //todo set collection???
            None
        ),
        accounts,
        &[&[b"metadata", metadata_program.key.as_ref(), mint_key.as_ref(), &[metadata_bump]]]
    );


    //msg!(("!!!");

    Ok(())
}
