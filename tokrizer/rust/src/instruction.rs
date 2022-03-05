use borsh::{BorshDeserialize, BorshSerialize};


#[repr(C)]
#[derive(BorshSerialize, BorshDeserialize, PartialEq, Debug, Clone)]
pub struct MintArgs {
    pub name: String,
    pub symbol: String,
    pub uri: String,
    pub mint_bump: u8,
    pub mint_seed: String
}

#[repr(C)]
#[derive(BorshSerialize, BorshDeserialize, PartialEq, Debug, Clone)]
pub enum TokrizerInstruction {

    CreateMint(MintArgs),
    // MintNft(MintArgs)
}
