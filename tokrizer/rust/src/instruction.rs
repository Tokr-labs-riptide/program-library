use borsh::{BorshDeserialize, BorshSerialize};


#[repr(C)]
#[derive(BorshSerialize, BorshDeserialize, PartialEq, Debug, Clone)]
pub struct MintArgs {
    pub name: String,
    pub symbol: String,
    pub uri: String
}

#[repr(C)]
#[derive(BorshSerialize, BorshDeserialize, PartialEq, Debug, Clone)]
pub enum NftMinterInstruction {

    MintNftWithMetaData(MintArgs)
}
