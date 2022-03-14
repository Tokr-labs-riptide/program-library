#![cfg(all(target_arch = "bpf", not(feature = "no-entrypoint")))]

use solana_program::{
    msg,
    account_info::AccountInfo, entrypoint, entrypoint::ProgramResult, pubkey::Pubkey,
};

use crate::{processor};

entrypoint!(process_instruction);
fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    if let Err(error) = processor::process(program_id, accounts, instruction_data) {
        msg!("Error! {}", error);
        return Err(error);
    }

    Ok(())
}
