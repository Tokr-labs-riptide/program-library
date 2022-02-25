import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { NftMinter } from "../target/types/nft_minter";

describe("nft-minter", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.Provider.env());

  const program = anchor.workspace.NftMinter as Program<NftMinter>;

  it("Is initialized!", async () => {
    // Add your test here.
    const tx = await program.rpc.initialize({});
    console.log("Your transaction signature", tx);
  });
});

// program id: HSGG76jpcWUrmN1YmiwFEdYddihuZhAYcCfqamj3HcC1
