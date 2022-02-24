use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint,
    entrypoint::ProgramResult,
    msg,
    program_error::ProgramError,
    pubkey::Pubkey,
};

// Declare and export the program's entrypoint
entrypoint!(process_instruction);

// Program entrypoint's implementation
pub fn process_instruction(
    program_id: &Pubkey, // Public key of the account the hello world program was loaded into
    accounts: &[AccountInfo], // The account to say hello to
    _instruction_data: &[u8], // Ignored, all helloworld instructions are hellos
) -> ProgramResult {

    msg!("TOKR nft-minter Rust program entrypoint");
    // Iterating accounts is safer than indexing
    let accounts_iter = &mut accounts.iter();

    let account = next_account_info(accounts_iter)?;
    msg!("Account! {}, program! {} ", account.owner, program_id);

    Ok(())
}
