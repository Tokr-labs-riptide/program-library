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
pub struct Initialize {}
