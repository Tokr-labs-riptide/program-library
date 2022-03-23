use borsh::{BorshDeserialize, BorshSerialize};
use mpl_token_metadata::{instruction::create_metadata_accounts_v2, state::Creator};
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint::ProgramResult,
    instruction::{AccountMeta, Instruction},
    msg,
    program::{invoke, invoke_signed},
    program_pack::Pack,
    pubkey::Pubkey,
    system_instruction,
    sysvar::{self},
};
use spl_token::{
    self,
    instruction::{approve, initialize_account, initialize_mint, mint_to},
    state::{Account, Mint},
};

use mpl_token_vault::{
    instruction::{
        create_activate_vault_instruction, create_init_vault_instruction,
        create_mint_shares_instruction, create_update_external_price_account_instruction,
        create_withdraw_shares_instruction, AmountArgs, VaultInstruction,
    },
    state::{Vault, VaultState, MAX_EXTERNAL_ACCOUNT_SIZE, MAX_VAULT_SIZE},
};

use spl_associated_token_account::{create_associated_token_account};

use crate::instruction::TokrizerInstruction;

pub fn process(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    let instruction = TokrizerInstruction::try_from_slice(instruction_data)?;

    match instruction {
        TokrizerInstruction::MintTokrNft(args) => {
            msg!(
                "Mine NFT Instruction! Name: {}, Symbol: {}, Uri: {}",
                args.name,
                args.symbol,
                args.uri
            );
            mint_nft(
                program_id,
                accounts,
                args.name,
                args.symbol,
                args.uri,
                args.mint_bump,
                args.mint_seed,
            )
        }
        TokrizerInstruction::CreateVault(args) => {
            msg!("Create Vault Instruction!");
            create_vault(program_id, accounts, args.vault_seed, args.vault_bump)
        }
        TokrizerInstruction::AddNftToVault => {
            msg!("Add NFT To Vault Instruction!");
            add_nft_to_vault(program_id, accounts)
        }
        TokrizerInstruction::Fractionalize(args) => {
            msg!(
                "Fractionalize NFT Instruction! NumberOfShares: {}",
                args.number_of_shares
            );
            fractionalize(program_id, accounts, args.number_of_shares)
        }
        TokrizerInstruction::SendShare(args) => {
            msg!("Send Fraction {} Shares of rNFT", args.number_of_shares);
            send_share(program_id, accounts, args.number_of_shares)
        }
    }
}

pub fn mint_nft(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    name: String,
    symbol: String,
    uri: String,
    mint_bump: u8,
    mint_seed: String,
) -> ProgramResult {

    let accounts_iter = &mut accounts.iter();

    let payer = next_account_info(accounts_iter)?;

    let destination = next_account_info(accounts_iter)?;

    let creator = next_account_info(accounts_iter)?;

    let mint_input = next_account_info(accounts_iter)?;

    let _metadata_acct = next_account_info(accounts_iter)?;

    let token_ata_input = next_account_info(accounts_iter)?;

    let token_program = next_account_info(accounts_iter)?;

    let metadata_program = next_account_info(accounts_iter)?;

    let system_program = next_account_info(accounts_iter)?;

    let rent_key = next_account_info(accounts_iter)?;

    // todo check if mint input is correct
    //msg!("mint_pda: {}, bump:{} ", mint_input.key, mint_bump);

    // todo check if metadata input is correct
    let (metadata_key, metadata_bump) = Pubkey::find_program_address(
        &[
            b"metadata",
            metadata_program.key.as_ref(),
            mint_input.key.as_ref(),
        ],
        &metadata_program.key,
    );

    // let rent = Rent {
    //     lamports_per_byte_year: Mint::LEN as u64,
    //     ..Rent::default()
    // };
    // let min_bal = rent.minimum_balance(Mint::LEN);
    // //msg!(("minimum rent {}", min_bal);

    let _result = invoke_signed(
        &system_instruction::create_account(
            payer.key,
            mint_input.key,
            1461600 as u64, // wtf why does minimum balance give not enough
            Mint::LEN as u64,
            &spl_token::id(),
        ),
        accounts,
        &[&[
            mint_seed.as_bytes(),
            payer.key.as_ref(),
            destination.key.as_ref(),
            &[mint_bump],
        ]],
    );

    let _result = invoke_signed(
        &initialize_mint(
            &spl_token::id(),
            mint_input.key,
            payer.key,
            Some(program_id),
            0,
        )?,
        accounts,
        &[&[
            mint_seed.as_bytes(),
            payer.key.as_ref(),
            destination.key.as_ref(),
            &[mint_bump],
        ]],
    );

    let _result = invoke(
        &create_associated_token_account(payer.key, destination.key, mint_input.key),
        &[
            payer.clone(),
            token_ata_input.clone(),
            destination.clone(),
            mint_input.clone(),
            system_program.clone(),
            token_program.clone(),
            rent_key.clone(),
        ],
    );

    let creator = Creator {
        address: *creator.key,
        verified: true,
        share: 100 as u8,
    };

    let _result = invoke_signed(
        &create_metadata_accounts_v2(
            *metadata_program.key,
            metadata_key,
            *mint_input.key,
            *payer.key,
            *payer.key,
            *payer.key,
            name,
            symbol,
            uri,
            Some([creator].to_vec()),
            0,
            false,
            false,
            None,
            None,
        ),
        accounts,
        &[&[
            b"metadata",
            metadata_program.key.as_ref(),
            mint_input.key.as_ref(),
            &[metadata_bump],
        ]],
    );

    let _result = invoke(
        &mint_to(
            &spl_token::id(),
            mint_input.key,
            token_ata_input.key,
            payer.key,
            &[&payer.key],
            1 as u64,
        )?,
        accounts,
    );

    Ok(())
}

pub fn create_vault(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    vault_seed: String,
    vault_bump: u8,
) -> ProgramResult {
    // Iterating accounts is safer than indexing
    let accounts_iter = &mut accounts.iter();

    let payer = next_account_info(accounts_iter)?;

    let vault = next_account_info(accounts_iter)?;

    let vault_mint_authority = next_account_info(accounts_iter)?;

    let external_pricing_acct = next_account_info(accounts_iter)?;

    let fraction_mint = next_account_info(accounts_iter)?;

    let redeem_treasury_ata = next_account_info(accounts_iter)?;

    let fraction_treasury_ata = next_account_info(accounts_iter)?;

    let token_vault_program = next_account_info(accounts_iter)?;

    let token_program = next_account_info(accounts_iter)?;

    let system_program = next_account_info(accounts_iter)?;

    let rent_program = next_account_info(accounts_iter)?;

    let _ata_program = next_account_info(accounts_iter)?;

    let native_mint_program = next_account_info(accounts_iter)?;

    let (_external_pricing_pda, ebump) = Pubkey::find_program_address(
        &[b"external", vault.key.as_ref(), payer.key.as_ref()],
        &program_id,
    );

    let (_fraction_mint_pda, fbump) = Pubkey::find_program_address(
        &[b"fraction", vault.key.as_ref(), payer.key.as_ref()],
        &program_id,
    );

    // let rent = Rent {
    //     lamports_per_byte_year: 82, // todo why does 42 not work grr
    //     ..Rent::default()
    // };

    let _result = invoke_signed(
        &system_instruction::create_account(
            payer.key,
            external_pricing_acct.key,
            // rent.minimum_balance(MAX_EXTERNAL_ACCOUNT_SIZE),
            1183200 as u64,
            MAX_EXTERNAL_ACCOUNT_SIZE as u64,
            token_vault_program.key,
        ),
        accounts,
        &[&[
            b"external",
            vault.key.as_ref(),
            payer.key.as_ref(),
            &[ebump],
        ]],
    );

    let _result = invoke_signed(
        &create_update_external_price_account_instruction(
            *token_vault_program.key,
            *external_pricing_acct.key,
            0 as u64, // todo price?
            spl_token::native_mint::ID,
            true,
        ),
        accounts,
        &[&[
            b"external",
            vault.key.as_ref(),
            payer.key.as_ref(),
            &[ebump],
        ]],
    );

    let _result = invoke_signed(
        &system_instruction::create_account(
            payer.key,
            fraction_mint.key,
            1461600 as u64, // wtf why does minimum balance give not enough
            Mint::LEN as u64,
            &spl_token::id(),
        ),
        accounts,
        &[&[
            b"fraction",
            vault.key.as_ref(),
            payer.key.as_ref(),
            &[fbump],
        ]],
    );

    let _result = invoke_signed(
        &initialize_mint(
            &spl_token::id(),
            fraction_mint.key,
            vault_mint_authority.key,
            Some(vault_mint_authority.key),
            0,
        )?,
        accounts,
        &[&[
            b"fraction",
            vault.key.as_ref(),
            payer.key.as_ref(),
            &[fbump],
        ]],
    );

    let _result = invoke(
        &create_associated_token_account(
            payer.key,
            vault_mint_authority.key,
            &spl_token::native_mint::ID,
        ),
        &[
            payer.clone(),
            redeem_treasury_ata.clone(),
            vault_mint_authority.clone(),
            native_mint_program.clone(),
            system_program.clone(),
            token_program.clone(),
            rent_program.clone(),
        ],
    );

    let _result = invoke(
        &create_associated_token_account(payer.key, vault_mint_authority.key, fraction_mint.key),
        &[
            payer.clone(),
            fraction_treasury_ata.clone(),
            vault_mint_authority.clone(),
            fraction_mint.clone(),
            system_program.clone(),
            token_program.clone(),
            rent_program.clone(),
        ],
    );

    let _result = invoke_signed(
        &system_instruction::create_account(
            payer.key,
            vault.key,
            //rent.minimum_balance(MAX_VAULT_SIZE),// why does this not work?
            2317680 as u64,
            MAX_VAULT_SIZE as u64,
            token_vault_program.key,
        ),
        accounts,
        &[&[
            payer.key.as_ref(),
            token_vault_program.key.as_ref(),
            vault_seed.as_ref(),
            &[vault_bump],
        ]],
    );

    let _result = invoke_signed(
        &create_init_vault_instruction(
            *token_vault_program.key,
            *fraction_mint.key,
            *redeem_treasury_ata.key,
            *fraction_treasury_ata.key,
            *vault.key,
            // *vault_authority.key,  //todo make this the DAO?
            *payer.key,
            *external_pricing_acct.key,
            true,
        ),
        accounts,
        &[&[
            payer.key.as_ref(),
            token_vault_program.key.as_ref(),
            vault_seed.as_ref(),
            &[vault_bump],
        ]],
    );

    Ok(())
}

pub fn add_nft_to_vault(program_id: &Pubkey, accounts: &[AccountInfo]) -> ProgramResult {

    let accounts_iter = &mut accounts.iter();

    let token = next_account_info(accounts_iter)?;

    let payer = &mut next_account_info(accounts_iter)?;

    let token_ata = next_account_info(accounts_iter)?;

    let transfer_authority = next_account_info(accounts_iter)?;

    let vault = next_account_info(accounts_iter)?;

    let vault_authority = next_account_info(accounts_iter)?;

    let token_store = next_account_info(accounts_iter)?;

    let safety_deposit_box = next_account_info(accounts_iter)?;

    let token_vault_program = next_account_info(accounts_iter)?;

    let token_program = next_account_info(accounts_iter)?;

    let system_program = next_account_info(accounts_iter)?;

    let rent_program = next_account_info(accounts_iter)?;

    let _ata_program = next_account_info(accounts_iter)?;

    let (_transfer_authority_pda, transfer_bump) = Pubkey::find_program_address(
        &[b"transfer", vault.key.as_ref(), token.key.as_ref()],
        &program_id,
    );

    let (_store_pda, store_bump) = Pubkey::find_program_address(
        &[b"store", vault.key.as_ref(), token.key.as_ref()],
        &program_id,
    );

    let _result = invoke_signed(
        &system_instruction::create_account(
            payer.key,
            token_store.key,
            2039280 as u64, // wtf why does minimum balance give not enough
            Account::LEN as u64,
            &spl_token::id(),
        ),
        accounts,
        &[&[
            b"store",
            vault.key.as_ref(),
            token.key.as_ref(),
            &[store_bump],
        ]],
    );

    let _result = invoke(
        &initialize_account(
            &spl_token::id(),
            token_store.key,
            token.key,
            vault_authority.key,
        )
        .unwrap(),
        accounts,
    );

    let _result = invoke(
        &approve(
            token_program.key,
            token_ata.key,
            transfer_authority.key,
            payer.key,
            &[],
            1 as u64,
        )
        .unwrap(),
        accounts,
    );

    let _result = invoke_signed(
        &create_add_token_to_inactive_vault_instruction2(
            *token_vault_program.key,
            *safety_deposit_box.key,
            *token_ata.key,
            *token_store.key,
            *vault.key,
            *payer.key,
            *payer.key,
            *transfer_authority.key,
            1 as u64,
        ),
        &[
            payer.clone(),
            safety_deposit_box.clone(),
            token_ata.clone(),
            token_store.clone(),
            vault.clone(),
            payer.clone(),
            payer.clone(),
            transfer_authority.clone(),
            token_program.clone(),
            system_program.clone(),
            rent_program.clone(),
        ],
        &[
            &[
                b"transfer",
                vault.key.as_ref(),
                token.key.as_ref(),
                &[transfer_bump],
            ],
            &[
                b"store",
                vault.key.as_ref(),
                token.key.as_ref(),
                &[store_bump],
            ],
        ],
    );

    Ok(())
}

pub fn send_share(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    number_of_shares: u64,
) -> ProgramResult {
    let accounts_iter = &mut accounts.iter();

    let token = &mut next_account_info(accounts_iter)?;

    let payer = &mut next_account_info(accounts_iter)?;

    let destination = next_account_info(accounts_iter)?;

    let destination_ata = next_account_info(accounts_iter)?;

    let transfer_authority = next_account_info(accounts_iter)?;

    let vault = next_account_info(accounts_iter)?;

    let vault_authority = next_account_info(accounts_iter)?;

    let fraction_mint = next_account_info(accounts_iter)?;

    let fraction_treasury = next_account_info(accounts_iter)?;

    let token_vault_program = next_account_info(accounts_iter)?;

    let token_program = next_account_info(accounts_iter)?;

    let system_program = next_account_info(accounts_iter)?;

    let rent_program = next_account_info(accounts_iter)?;

    let (_transfer_authority_pda, transfer_bump) = Pubkey::find_program_address(
        &[b"transfer", vault.key.as_ref(), token.key.as_ref()],
        &program_id,
    );

    let token_acct = Account::unpack(&destination_ata.data.borrow());
    if !token_acct.is_ok() {
        let _result = invoke(
            &create_associated_token_account(payer.key, destination.key, fraction_mint.key),
            &[
                payer.clone(),
                destination_ata.clone(),
                destination.clone(),
                fraction_mint.clone(),
                system_program.clone(),
                token_program.clone(),
                rent_program.clone(),
            ],
        );
    }

    let _result = invoke_signed(
        &create_withdraw_shares_instruction(
            *token_vault_program.key,
            *destination_ata.key,
            *fraction_treasury.key,
            *vault.key,
            *transfer_authority.key,
            *vault_authority.key,
            number_of_shares,
        ),
        accounts,
        &[&[
            b"transfer",
            vault.key.as_ref(),
            token.key.as_ref(),
            &[transfer_bump],
        ]],
    );

    Ok(())
}

pub fn fractionalize(
    _program_id: &Pubkey,
    accounts: &[AccountInfo],
    number_of_shares: u64,
) -> ProgramResult {
    let accounts_iter = &mut accounts.iter();

    let payer = &mut next_account_info(accounts_iter)?;

    let vault_info = next_account_info(accounts_iter)?;

    let vault_mint_authority = next_account_info(accounts_iter)?;

    let fraction_mint = next_account_info(accounts_iter)?;

    let fraction_treasury = next_account_info(accounts_iter)?;

    let token_vault_program = next_account_info(accounts_iter)?;

    let vault = Vault::from_account_info(vault_info)?;

    if vault.state == VaultState::Inactive {
        let _result = invoke(
            &create_activate_vault_instruction(
                *token_vault_program.key,
                *vault_info.key,
                *fraction_mint.key,
                *fraction_treasury.key,
                *vault_mint_authority.key,
                *payer.key,
                number_of_shares,
            ),
            accounts,
        );
    }

    let _result = invoke(
        &create_mint_shares_instruction(
            *token_vault_program.key,
            *fraction_treasury.key,
            *fraction_mint.key,
            *vault_info.key,
            *vault_mint_authority.key,
            *payer.key,
            number_of_shares,
        ),
        accounts,
    );

    Ok(())
}


// I had to write this because mpl_token_vault::instruction::create_add_token_to_inactive_vault_instruction
// does not work!
#[allow(clippy::too_many_arguments)]
pub fn create_add_token_to_inactive_vault_instruction2(
    program_id: Pubkey,
    safety_deposit_box: Pubkey,
    token_account: Pubkey,
    store: Pubkey,
    vault: Pubkey,
    vault_authority: Pubkey,
    payer: Pubkey,
    transfer_authority: Pubkey,
    amount: u64,
) -> Instruction {
    Instruction {
        program_id,
        accounts: vec![
            AccountMeta::new(safety_deposit_box, false),
            AccountMeta::new(token_account, false),
            AccountMeta::new(store, false),
            AccountMeta::new(vault, false),
            AccountMeta::new(vault_authority, true),
            AccountMeta::new(payer, true),
            AccountMeta::new_readonly(transfer_authority, true),
            AccountMeta::new_readonly(spl_token::id(), false),
            AccountMeta::new_readonly(sysvar::rent::id(), false),
            AccountMeta::new_readonly(solana_program::system_program::id(), false),
        ],
        data: VaultInstruction::AddTokenToInactiveVault(AmountArgs { amount })
            .try_to_vec()
            .unwrap(),
    }
}
