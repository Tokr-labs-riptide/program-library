use solana_program::{
    rent,
    account_info::{next_account_info, AccountInfo},
    entrypoint::ProgramResult,
    msg,
    program::{invoke, invoke_signed},
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

    let (mint_key, bump) = Pubkey::find_program_address(&["tokr".as_bytes()], &program_id);
    msg!("mint {} ", mint_key);

    // let rent = Rent {
    //     lamports_per_byte_year: Mint::LEN as u64, //todo figure out spl_token mint size
    //     ..Rent::default()
    // };

    // let ins = &system_instruction::create_account(
    //     payer.key, 
    //     &mint_key, 
    //     rent.minimum_balance(Mint::LEN),
    //     Mint::LEN as u64,
    //     program_id);

    // msg!("create account");
    // let result = invoke_signed(
    //     ins,
    //     &[payer.clone()],
    //     &[&["tokr".as_bytes(), &[bump]]]
    // );


    // let mint_key = Pubkey::create_with_seed(payer.key, SEED, program_id).unwrap();
    // msg!("mint {} ", mint_key);

    // let rent = Rent {
    //     lamports_per_byte_year: Mint::LEN as u64, //todo figure out spl_token mint size
    //     ..Rent::default()
    // };

    // let result = invoke(
    //     &system_instruction::create_account_with_seed(
    //         payer.key, 
    //         &mint_key, 
    //         payer.key, 
    //         SEED, 
    //         rent.minimum_balance(Mint::LEN),
    //         Mint::LEN as u64,
    //         program_id),
    //     &[payer.clone()]
    // );

    msg!("!!!");

    // let result = invoke(
    //     &initialize_mint(
    //         &spl_token::id(),
    //         mint_key, 
    //         payer.key, 
    //         Some(payer.key), 
    //         0
    //     )?,
    //     &[payer.clone()]
    // );

    Ok(())
}

