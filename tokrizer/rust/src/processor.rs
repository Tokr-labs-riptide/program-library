use borsh::{BorshDeserialize, BorshSerialize};
use mpl_token_metadata::{instruction::create_metadata_accounts_v2, state::{Creator, PREFIX as META_PREFIX}};
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint::ProgramResult,
    program_error::ProgramError,
    instruction::{AccountMeta, Instruction},
    msg,
    program::{invoke, invoke_signed},
    program_pack::Pack,
    pubkey::Pubkey,
    system_instruction,
    rent::Rent,
    sysvar::{Sysvar, self},
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

    let mint = next_account_info(accounts_iter)?;

    let metadata_account = next_account_info(accounts_iter)?;

    let token_account = next_account_info(accounts_iter)?;

    let token_program = next_account_info(accounts_iter)?;

    let metadata_program = next_account_info(accounts_iter)?;

    let system_program = next_account_info(accounts_iter)?;

    let rent_program = next_account_info(accounts_iter)?;

    // todo check if metadata input is correct
    let (mint_pda_key, mind_pda_bump) = Pubkey::find_program_address(
        &[
            mint_seed.as_bytes(),
            payer.key.as_ref(),
            destination.key.as_ref(),
        ],
        program_id
    );
    msg!("MINT KEY: {}, BUMP: {}", mint_pda_key, mind_pda_bump);
    if mint_pda_key != *mint.key {
        msg!("Generated Mint PDA key mismatch");
        return Err(ProgramError::IllegalOwner);
    }

    if mint_bump != mind_pda_bump {
        msg!("Mint PDA bump mismatch");
        return Err(ProgramError::IllegalOwner);
    }

    let mint_signer_seeds = &[
        mint_seed.as_bytes(),
        payer.key.as_ref(),
        destination.key.as_ref(),
        &[mint_bump],
    ];

    // todo check if metadata input is correct
    let (metadata_pda_key, metadata_bump) = Pubkey::find_program_address(
        &[
            META_PREFIX.as_bytes(),
            metadata_program.key.as_ref(),
            mint.key.as_ref(),
        ],
        &metadata_program.key,
    );

    if *metadata_account.key != metadata_pda_key {
        return Err(ProgramError::IllegalOwner);
    }

    let metadata_signer_seeds = &[
        META_PREFIX.as_bytes(),
        metadata_program.key.as_ref(),
        mint.key.as_ref(),
        &[metadata_bump],
    ];

    // Create Mint Account
    let rent = &Rent::from_account_info(rent_program)?;
    invoke_signed(
        &system_instruction::create_account(
            payer.key,
            mint.key,
            rent.minimum_balance(Mint::LEN),
            Mint::LEN as u64,
            &spl_token::id(),
        ),
        accounts,
        &[mint_signer_seeds],
    )?;

    // Init Mint Account
    invoke_signed(
        &initialize_mint(
            &spl_token::id(),
            mint.key,
            payer.key,
            Some(program_id),
            0,
        )?,
        accounts,
        &[mint_signer_seeds],
    )?;

    // Create Associated Token Account for new Mint and Destination
    invoke(
        &create_associated_token_account(payer.key, destination.key, mint.key),
        &[
            payer.clone(),
            token_account.clone(),
            destination.clone(),
            mint.clone(),
            system_program.clone(),
            token_program.clone(),
            rent_program.clone(),
        ],
    )?;

    // Create Metaplex Metadata Account for new Mint
    let creator = Creator {
        address: *creator.key,
        verified: true,
        share: 100 as u8,
    };
    invoke_signed(
        &create_metadata_accounts_v2(
            *metadata_program.key,
            *metadata_account.key,
            *mint.key,
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
        &[metadata_signer_seeds],
    )?;

    // Mint the NFT
    invoke(
        &mint_to(
            &spl_token::id(),
            mint.key,
            token_account.key,
            destination.key,
            &[&payer.key],
            1 as u64,
        )?,
        accounts,
    )?;

    Ok(())
}

pub fn create_vault(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    vault_seed: String,
    vault_bump: u8,
) -> ProgramResult {

    let accounts_iter = &mut accounts.iter();

    let payer = next_account_info(accounts_iter)?;

    let vault_authority = next_account_info(accounts_iter)?;

    let vault = next_account_info(accounts_iter)?;

    let vault_mint_authority = next_account_info(accounts_iter)?;

    let external_pricing_acct = next_account_info(accounts_iter)?;

    let fraction_mint = next_account_info(accounts_iter)?;

    let redeem_treasury = next_account_info(accounts_iter)?;

    let fraction_treasury = next_account_info(accounts_iter)?;

    let token_vault_program = next_account_info(accounts_iter)?;

    let token_program = next_account_info(accounts_iter)?;

    let system_program = next_account_info(accounts_iter)?;

    let rent_program = next_account_info(accounts_iter)?;

    let _ata_program = next_account_info(accounts_iter)?;

    let native_mint_program = next_account_info(accounts_iter)?;

    let vault_signing_seeds = &[
        payer.key.as_ref(),
        token_vault_program.key.as_ref(),
        vault_seed.as_ref(),
        &[vault_bump],
    ];

    let (_external_pricing_pda, ebump) = Pubkey::find_program_address(
        &[b"external", vault.key.as_ref(), payer.key.as_ref()],
        &program_id,
    );
    let external_pricing_signing_seeds = &[
        b"external",
        vault.key.as_ref(),
        payer.key.as_ref(),
        &[ebump],
    ];

    let (_fraction_mint_pda, fbump) = Pubkey::find_program_address(
        &[b"fraction", vault.key.as_ref(), payer.key.as_ref()],
        &program_id,
    );
    let fraction_mint_signing_seeds = &[
        b"fraction",
        vault.key.as_ref(),
        payer.key.as_ref(),
        &[fbump],
    ];

    // Create External Pricing Account
    let rent = &Rent::from_account_info(rent_program)?;
    invoke_signed(
        &system_instruction::create_account(
            payer.key,
            external_pricing_acct.key,
            rent.minimum_balance(MAX_EXTERNAL_ACCOUNT_SIZE),
            MAX_EXTERNAL_ACCOUNT_SIZE as u64,
            token_vault_program.key,
        ),
        accounts,
        &[external_pricing_signing_seeds],
    )?;

    // Initialize External Pricing Account
    invoke_signed(
        &create_update_external_price_account_instruction(
            *token_vault_program.key,
            *external_pricing_acct.key,
            0 as u64, // todo Price, set this number if we want to give tokens a price
            spl_token::native_mint::ID,
            true,
        ),
        accounts,
        &[external_pricing_signing_seeds],
    )?;

    // Create Fractional Mint
    invoke_signed(
        &system_instruction::create_account(
            payer.key,
            fraction_mint.key,
            rent.minimum_balance(Mint::LEN),
            Mint::LEN as u64,
            &spl_token::id(),
        ),
        accounts,
        &[fraction_mint_signing_seeds],
    )?;

    // Initialize Fractional Mint
    invoke_signed(
        &initialize_mint(
            &spl_token::id(),
            fraction_mint.key,
            vault_mint_authority.key,
            Some(vault_mint_authority.key),
            0,
        )?,
        accounts,
        &[fraction_mint_signing_seeds],
    )?;

    // Create Associated Token Account for Fractional Mint and Vault (aka the Fractional Treasury)
    invoke(
        &create_associated_token_account(
            payer.key, 
            vault_mint_authority.key, 
            fraction_mint.key
        ),
        &[
            payer.clone(),
            fraction_treasury.clone(),
            vault_mint_authority.clone(),
            fraction_mint.clone(),
            system_program.clone(),
            token_program.clone(),
            rent_program.clone(),
        ],
    )?;

    // Create Associated Token Account for Native Sol and Vault (aka the Redeem Treasury)
    invoke(
        &create_associated_token_account(
            payer.key,
            vault_mint_authority.key,
            &spl_token::native_mint::ID,
        ),
        &[
            payer.clone(),
            redeem_treasury.clone(),
            vault_mint_authority.clone(),
            native_mint_program.clone(),
            system_program.clone(),
            token_program.clone(),
            rent_program.clone(),
        ],
    )?;

    // Create Vault Account
    invoke_signed(
        &system_instruction::create_account(
            payer.key,
            vault.key,
            rent.minimum_balance(MAX_VAULT_SIZE),
            MAX_VAULT_SIZE as u64,
            token_vault_program.key,
        ),
        accounts,
        &[vault_signing_seeds],
    )?;

    // Initialize Vault Account
    invoke_signed(
        &create_init_vault_instruction(
            *token_vault_program.key,
            *fraction_mint.key,
            *redeem_treasury.key,
            *fraction_treasury.key,
            *vault.key,
            *vault_authority.key,
            *external_pricing_acct.key,
            false,
        ),
        accounts,
        &[vault_signing_seeds],
    )?;

    Ok(())
}

pub fn add_nft_to_vault(program_id: &Pubkey, accounts: &[AccountInfo]) -> ProgramResult {

    let accounts_iter = &mut accounts.iter();

    let mint = next_account_info(accounts_iter)?;

    let payer = next_account_info(accounts_iter)?;

    let token_account = next_account_info(accounts_iter)?;

    let transfer_authority = next_account_info(accounts_iter)?;

    let vault_authority = next_account_info(accounts_iter)?;

    let vault = next_account_info(accounts_iter)?;

    let vault_mint_authority = next_account_info(accounts_iter)?;

    let token_store = next_account_info(accounts_iter)?;

    let safety_deposit_box = next_account_info(accounts_iter)?;

    let token_vault_program = next_account_info(accounts_iter)?;

    let token_program = next_account_info(accounts_iter)?;

    let system_program = next_account_info(accounts_iter)?;

    let rent_program = next_account_info(accounts_iter)?;

    let _ata_program = next_account_info(accounts_iter)?;

    let (_transfer_authority_pda, transfer_bump) = Pubkey::find_program_address(
        &[b"transfer", vault.key.as_ref(), mint.key.as_ref()],
        &program_id,
    );
    let transfer_authority_signer_seeds = &[
        b"transfer",
        vault.key.as_ref(),
        mint.key.as_ref(),
        &[transfer_bump],
    ];

    let (_store_pda, store_bump) = Pubkey::find_program_address(
        &[b"store", vault.key.as_ref(), mint.key.as_ref()],
        &program_id,
    );
    let token_store_signer_seeds = &[
        b"store",
        vault.key.as_ref(),
        mint.key.as_ref(),
        &[store_bump],
    ];

    let rent = &Rent::from_account_info(rent_program)?;

    // Create Token Store account (Where the NFT will be transfered)
    invoke_signed(
        &system_instruction::create_account(
            payer.key,
            token_store.key,
            rent.minimum_balance(Account::LEN),
            Account::LEN as u64,
            &spl_token::id(),
        ),
        accounts,
        &[token_store_signer_seeds],
    )?;

     // Initialize Token Store account
    let _result = invoke(
        &initialize_account(
            &spl_token::id(),
            token_store.key,
            mint.key,
            vault_mint_authority.key,
        )
        .unwrap(),
        accounts,
    );

    // Allow the temporary transfer authority to transfer the NFT 
    invoke(
        &approve(
            token_program.key,
            token_account.key,
            transfer_authority.key,
            payer.key,   // the owner of the nft
            &[], 
            1 as u64,
        )?,
        accounts,
    )?;

    // Add the token to the vault
    invoke_signed(
        &create_add_token_to_inactive_vault_instruction2(
            *token_vault_program.key,
            *safety_deposit_box.key,
            *token_account.key,
            *token_store.key,
            *vault.key,
            *vault_authority.key,
            *payer.key,
            *transfer_authority.key,
            1 as u64,
        ),
        &[
            payer.clone(),
            safety_deposit_box.clone(),
            token_account.clone(),
            token_store.clone(),
            vault.clone(),
            vault_authority.clone(),
            payer.clone(),
            transfer_authority.clone(),
            token_program.clone(),
            system_program.clone(),
            rent_program.clone(),
        ],
        &[
            transfer_authority_signer_seeds,
            token_store_signer_seeds
        ],
    )?;

    Ok(())
}

pub fn fractionalize(
    _program_id: &Pubkey,
    accounts: &[AccountInfo],
    number_of_shares: u64,
) -> ProgramResult {
    let accounts_iter = &mut accounts.iter();

    let _payer = next_account_info(accounts_iter)?;

    let vault_authority = next_account_info(accounts_iter)?;

    let vault_info = next_account_info(accounts_iter)?;

    let vault_mint_authority = next_account_info(accounts_iter)?;

    let fraction_mint = next_account_info(accounts_iter)?;

    let fraction_treasury = next_account_info(accounts_iter)?;

    let token_vault_program = next_account_info(accounts_iter)?;

    let vault = Vault::from_account_info(vault_info)?;


    if vault.state == VaultState::Inactive {
        // Activate the Vault if it is not already, this will mint shares
        invoke(
            &create_activate_vault_instruction(
                *token_vault_program.key,
                *vault_info.key,
                *fraction_mint.key,
                *fraction_treasury.key,
                *vault_mint_authority.key,
                *vault_authority.key,
                number_of_shares,
            ),
            accounts,
        )?;
    } else {
        // Mint Additional Fractional Shares for already active vault
        // if allow_further_share_creation = false, this will throw an error
        invoke(
            &create_mint_shares_instruction(
                *token_vault_program.key,
                *fraction_treasury.key,
                *fraction_mint.key,
                *vault_info.key,
                *vault_mint_authority.key,
                *vault_authority.key,
                number_of_shares,
            ),
            accounts,
        )?;
    }
    Ok(())
}

pub fn send_share(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    number_of_shares: u64,
) -> ProgramResult {
    let accounts_iter = &mut accounts.iter();

    let mint = &mut next_account_info(accounts_iter)?;

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
        &[b"transfer", vault.key.as_ref(), mint.key.as_ref()],
        &program_id,
    );

    // Check if the destination already has an ATA for this fractional share
    let token_acct = Account::unpack(&destination_ata.data.borrow());
    if !token_acct.is_ok() {
        // Create Associated Token Account for fractional share token
        invoke(
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
        )?;
    }

    // Withdraw Share from Fraction Treasury and send to Destination
    invoke_signed(
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
            mint.key.as_ref(),
            &[transfer_bump],
        ]],
    )?;

    Ok(())
}

// I had to write this because mpl_token_vault::instruction::create_add_token_to_inactive_vault_instruction
// does not work! PR: https://github.com/metaplex-foundation/metaplex-program-library/pull/310
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
