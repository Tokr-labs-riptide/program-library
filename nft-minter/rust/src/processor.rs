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

use crate::{instruction::NftMinterInstruction};

pub fn process(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    msg!("Starting up program! {} ", program_id);
    let instruction = NftMinterInstruction::try_from_slice(instruction_data)?;

    match instruction {
        NftMinterInstruction::MintNftWithMetaData(args) => {
            msg!("Create NFT with Name: {}, Symbol: {}, Uri: {}", args.name, args.symbol, args.uri);
        }
    }

    // Iterating accounts is safer than indexing
    let accounts_iter = &mut accounts.iter();

    let payer = next_account_info(accounts_iter)?;
    msg!("payer {} ", payer.key);

    let mint_input = next_account_info(accounts_iter)?;
    msg!("mint_input {} ", mint_input.key);

    let token_program = next_account_info(accounts_iter)?;
    msg!("token_program {} ", token_program.key);

    let (mint_key, bump) = Pubkey::find_program_address(&[payer.key.as_ref(), b"test2"], &program_id);
    msg!("mint pda{} ", mint_key);

    let rent = Rent {
        lamports_per_byte_year: Mint::LEN as u64,
        ..Rent::default()
    };
    let min_bal = rent.minimum_balance(Mint::LEN);
    msg!("minimum rent {}", min_bal);
    let min_len = Mint::LEN as u64;
    msg!("minimum rent len {}", min_len);

    // msg!("create account5");
    // let result = invoke_signed(
    //     &system_instruction::create_account(
    //         payer.key, 
    //         &mint_key, 
    //         1461600 as u64, // wtf why does minimum balance give not enough
    //         min_len,
    //         &spl_token::id()),
    //     accounts,
    //     &[&[payer.key.as_ref(), b"test2", &[bump]]]
    // );

    // msg!("init mint3");
    // let result = invoke_signed(
    //     &initialize_mint(
    //         &spl_token::id(),
    //         &mint_key, 
    //         program_id, 
    //         Some(program_id), 
    //         0
    //     )?,
    //     accounts,
    //     &[&[payer.key.as_ref(), b"test2", &[bump]]]
    // );

    msg!("!!!");



    Ok(())
}
