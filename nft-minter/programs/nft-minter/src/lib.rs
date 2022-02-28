use anchor_lang::prelude::*;

declare_id!("HSGG76jpcWUrmN1YmiwFEdYddihuZhAYcCfqamj3HcC1");

#[program]
pub mod nft_minter {
    use super::*;
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Hello!");
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init, // 1. Hey Anchor, initialize an account with these details for me
        payer = payer, // 2. See that authority Signer (pubkey) down there? They're paying for this
        space = 8 // 3.A) all accounts need 8 bytes for the account discriminator prepended to the account
        + 32 // 3.B) authority: Pubkey needs 32 bytes
    )]
    pub payer: Account<'info>
}
