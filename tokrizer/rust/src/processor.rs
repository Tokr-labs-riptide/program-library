use solana_program::{
    rent,
    instruction::{AccountMeta},
    account_info::{next_account_info, AccountInfo},
    entrypoint::ProgramResult,
    msg,
    program::{invoke, invoke_signed},
    program_error::ProgramError,
    program_pack::{IsInitialized, Pack},
    sysvar::{rent::Rent, Sysvar},
    pubkey::{Pubkey},
    system_instruction
};
use spl_token::{
    self,
    instruction::{initialize_mint, mint_to},
    state::Mint
};
use borsh::{BorshDeserialize, BorshSerialize};
use std::str::FromStr;
use mpl_token_metadata::{
    instruction::{create_metadata_accounts_v2},
    state::Creator
};

use mpl_token_vault::{
    state::{VaultState, MAX_EXTERNAL_ACCOUNT_SIZE, MAX_VAULT_SIZE},
    instruction::{create_update_external_price_account_instruction, create_init_vault_instruction},
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
        TokrizerInstruction::MintTokrNft(args) => {
            msg!("Mine NFT Instruction! Name: {}, Symbol: {}, Uri: {}", args.name, args.symbol, args.uri);
            tokrize(program_id, accounts, args.name, args.symbol, args.uri, args.mint_bump, args.mint_seed);
        }
        TokrizerInstruction::Fractionalize(args) => {
            msg!("Fractionalize NFT Instruction! NumberOfShares: {}", args.number_of_shares);
            fractionalize(program_id, accounts, args.number_of_shares);
        }
        TokrizerInstruction::CreateVault(args) => {
            msg!("Create Vault Instruction!");
            create_vault(program_id, accounts, args.vault_seed, args.vault_bump);
        }
    }

    Ok(())
}


pub fn tokrize(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    name: String,
    symbol: String,
    uri: String,
    mint_bump: u8,
    mint_seed: String
) -> ProgramResult {
    // Iterating accounts is safer than indexing
    let accounts_iter = &mut accounts.iter();

    let payer = next_account_info(accounts_iter)?;
    //msg!(("payer: {} ", payer.key);

    let destination = next_account_info(accounts_iter)?;
    //msg!(("payer: {} ", payer.key);

    let creator = next_account_info(accounts_iter)?;
    //msg!(("payer: {} ", payer.key);

    let mint_input = next_account_info(accounts_iter)?;
    //msg!(("mint_input: {} ", mint_input.key);

    let metadata_acct = next_account_info(accounts_iter)?;
    //msg!(("metadata_acct: {} ", metadata_acct.key);

    let token_ata_input = next_account_info(accounts_iter)?;
    //msg!(("token_ata_input: {} ", token_ata_input.key);

    let token_program = next_account_info(accounts_iter)?;
    //msg!(("token_program: {} ", token_program.key);

    let metadata_program = next_account_info(accounts_iter)?;
    //msg!(("metadata_program: {} ", metadata_program.key);

    let system_program = next_account_info(accounts_iter)?;
    //msg!(("system_program: {} ", system_program.key);

    let rent_key = next_account_info(accounts_iter)?;
    //msg!(("rent_key: {} ", rent_key.key);

    // todo check if mint input is correct
    // let (mint_key, mint_bump) = Pubkey::find_program_address(&[payer.key.as_ref(), uri.as_bytes(), program_id.as_ref()], &program_id);
    msg!("mint_pda: {}, bump:{} ", mint_input.key, mint_bump);

    // todo check if metadata input is correct
    let (metadata_key, metadata_bump) = Pubkey::find_program_address(&[b"metadata", metadata_program.key.as_ref(), mint_input.key.as_ref()], &metadata_program.key);
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
            mint_input.key, 
            1461600 as u64, // wtf why does minimum balance give not enough
            Mint::LEN as u64,
            &spl_token::id()),
        accounts,
        &[&[mint_seed.as_bytes(), payer.key.as_ref(), program_id.as_ref(), &[mint_bump]]]
    );

    let result = invoke_signed(
        &initialize_mint(
            &spl_token::id(),
            mint_input.key, 
            payer.key, 
            Some(program_id), 
            0
        )?,
        accounts,
        &[&[mint_seed.as_bytes(), payer.key.as_ref(), program_id.as_ref(), &[mint_bump]]]
    );

    let result = invoke(
        &create_associated_token_account(
            payer.key,
            destination.key,
            mint_input.key, 
        ),
        &[
            payer.clone(), 
            token_ata_input.clone(), 
            destination.clone(),
            mint_input.clone(), 
            system_program.clone(), 
            token_program.clone(), 
            rent_key.clone()
        ],
        // accounts,
    );
    
    let creator = Creator {
        address: *creator.key,
        verified: true,
        share: 100 as u8
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
            None
        ),
        accounts,
        &[&[b"metadata", metadata_program.key.as_ref(), mint_input.key.as_ref(), &[metadata_bump]]]
    );

    let _result = invoke(
        &mint_to(
            &spl_token::id(),
            mint_input.key,
            token_ata_input.key,
            payer.key,
            &[&payer.key],
            1 as u64
        )?,
        accounts
    );


    //msg!(("!!!");

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
    
    let vault_authority = next_account_info(accounts_iter)?;

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

    let (_external_pricing_pda, ebump) = Pubkey::find_program_address(&[b"external", vault.key.as_ref(), payer.key.as_ref()], &program_id);

    let (_fraction_mint_pda, fbump) = Pubkey::find_program_address(&[b"fraction", vault.key.as_ref(), payer.key.as_ref()], &program_id);


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
            token_vault_program.key
        ),
        accounts,
        &[&[b"external", vault.key.as_ref(), payer.key.as_ref(), &[ebump]]]
    );

    let _result = invoke_signed(
        &create_update_external_price_account_instruction(
            *token_vault_program.key,
            *external_pricing_acct.key, 
            0 as u64, // todo price?
            spl_token::native_mint::ID,
            true
        ),
        accounts,
        &[&[b"external", vault.key.as_ref(), payer.key.as_ref(), &[ebump]]]
    );

    let _result = invoke_signed(
        &system_instruction::create_account(
            payer.key, 
            fraction_mint.key, 
            1461600 as u64, // wtf why does minimum balance give not enough
            Mint::LEN as u64,
            &spl_token::id()),
        accounts,
        &[&[b"fraction", vault.key.as_ref(), payer.key.as_ref(), &[fbump]]]
    );

    let _result = invoke_signed(
        &initialize_mint(
            &spl_token::id(),
            fraction_mint.key, 
            vault_authority.key, 
            Some(vault_authority.key), 
            0
        )?,
        accounts,
        &[&[b"fraction", vault.key.as_ref(), payer.key.as_ref(), &[fbump]]]
    );

    let _result = invoke(
        &create_associated_token_account(
            payer.key,
            vault_authority.key,
            &spl_token::native_mint::ID, 
        ),
        &[
            payer.clone(), 
            redeem_treasury_ata.clone(), 
            vault_authority.clone(),
            native_mint_program.clone(), 
            system_program.clone(), 
            token_program.clone(), 
            rent_program.clone()
        ]
    );

    let _result = invoke(
        &create_associated_token_account(
            payer.key,
            vault_authority.key,
            fraction_mint.key, 
        ),
        &[
            payer.clone(), 
            fraction_treasury_ata.clone(), 
            vault_authority.clone(),
            fraction_mint.clone(), 
            system_program.clone(), 
            token_program.clone(), 
            rent_program.clone()
        ]
    );

    let _result = invoke_signed(
        &system_instruction::create_account(
            payer.key, 
            vault.key, 
            //rent.minimum_balance(MAX_VAULT_SIZE),// why does this not work?
            2317680 as u64,
            MAX_VAULT_SIZE as u64,
            token_vault_program.key
        ),
        accounts,
        &[&[payer.key.as_ref(), token_vault_program.key.as_ref(), vault_seed.as_ref(), &[vault_bump]]]
    );


    let _result = invoke_signed(
        &create_init_vault_instruction(
            *token_vault_program.key,
            *fraction_mint.key,
            *redeem_treasury_ata.key,
            *fraction_treasury_ata.key,
            *vault.key, 
            *payer.key,  //todo make this the DAO?
            *external_pricing_acct.key,
            true
        ),
        accounts,
        &[&[payer.key.as_ref(), token_vault_program.key.as_ref(), vault_seed.as_ref(), &[vault_bump]]]
    );

    Ok(())
}


pub fn fractionalize(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    number_of_shares: u64
) -> ProgramResult {

    Ok(())
}