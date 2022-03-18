pub mod processor;
pub mod instruction;

#[cfg(not(feature = "no-entrypoint"))]
pub mod entrypoint;

solana_program::declare_id!("Tokr9wmF3VjWEqQAafPfFNhSTava68UJszr5wxnSuwK");