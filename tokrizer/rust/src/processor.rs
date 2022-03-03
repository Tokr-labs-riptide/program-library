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
    instruction::initialize_mint,
    state::Mint
    
    
};
use borsh::{BorshDeserialize, BorshSerialize};

use crate::{instruction::TokrizerInstruction};

pub fn process(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    msg!("Starting up program! {} ", program_id);
    let instruction = TokrizerInstruction::try_from_slice(instruction_data)?;

    match instruction {
        TokrizerInstruction::MintNftWithMetaData(args) => {
            msg!("Create NFT with Name: {}, Symbol: {}, Uri: {}", args.name, args.symbol, args.uri);
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
    msg!("payer: {} ", payer.key);

    let mint_input = next_account_info(accounts_iter)?;
    msg!("mint_input: {} ", mint_input.key);

    let token_program = next_account_info(accounts_iter)?;
    msg!("token_program: {} ", token_program.key);

    let (mint_key, bump) = Pubkey::find_program_address(&[payer.key.as_ref(), name.as_bytes(), uri.as_bytes()], &program_id);
    msg!("mint pda: {} ", mint_key);

    // let rent = Rent {
    //     lamports_per_byte_year: Mint::LEN as u64,
    //     ..Rent::default()
    // };
    // let min_bal = rent.minimum_balance(Mint::LEN);
    // msg!("minimum rent {}", min_bal);


    msg!("create account");
    let result = invoke_signed(
        &system_instruction::create_account(
            payer.key, 
            &mint_key, 
            1461600 as u64, // wtf why does minimum balance give not enough
            Mint::LEN as u64,
            &spl_token::id()),
        accounts,
        &[&[payer.key.as_ref(), name.as_bytes(), uri.as_bytes(), &[bump]]]
    );

    msg!("init mint");
    let result = invoke_signed(
        &initialize_mint(
            &spl_token::id(),
            &mint_key, 
            program_id, 
            Some(program_id), 
            0
        )?,
        accounts,
        &[&[payer.key.as_ref(), name.as_bytes(), uri.as_bytes(), &[bump]]]
    );

    msg!("!!!");

    Ok(())
}
