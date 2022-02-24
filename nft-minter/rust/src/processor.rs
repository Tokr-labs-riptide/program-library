use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint::ProgramResult,
    msg,
    program::{invoke, invoke_signed},
    program_error::ProgramError,
    program_pack::{IsInitialized, Pack},
    pubkey::Pubkey,
    sysvar::{rent::Rent, Sysvar},
};
use borsh::{BorshDeserialize, BorshSerialize};

use crate::{instruction::NftMinterInstruction};

pub fn process(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    let instruction = NftMinterInstruction::try_from_slice(instruction_data)?;

    match instruction {
        NftMinterInstruction::MintNftWithMetaData(args) => {
            msg!("Args: {}", args.test)
        }
    }

    // Iterating accounts is safer than indexing
    let accounts_iter = &mut accounts.iter();

    let account = next_account_info(accounts_iter)?;
    msg!("Account! {}, program! {} ", account.owner, program_id);

    Ok(())
}

