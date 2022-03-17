
import { getPayer } from '../utils';
import BN from 'bn.js';
import { Connection, NodeWallet, programs, actions } from '@metaplex/js';
import { Keypair, PublicKey, TransactionInstruction, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
import { MintLayout, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, NATIVE_MINT, } from '@solana/spl-token';

import { InitVault, Vault, VaultProgram, SafetyDepositBox, VaultState } from '@metaplex-foundation/mpl-token-vault';

const connection = new Connection('https://api.devnet.solana.com');

const vaultMintAuthority = '7vqigo8ioQM1W1TtLZESgPWMw6VrfyvFdDjyhc4aXTkx';

const vaultPubKey = 'Ciys8fbcSQSbQqMm91SmnLozdvw3ABBsEgGWHTvW69jb';

const tokenStore = '2jxk6u7QyhwtDajwmCHxZnvBLJydT6cynM9jE6tf2Qcq';

async function mintFractionalShares(shareCount: BN) {

  const vault = await programs.vault.Vault.load(connection, vaultPubKey);
  const payer = await getPayer();

  console.log(vault.data.authority);
  console.log(vault.info.owner.toBase58());

  let transaction = new Transaction()

  if (vault.data.state == VaultState.Inactive) {
    console.log("Vault is inactive, activatiing");
    const txData1 = new programs.vault.ActivateVault({feePayer: payer.publicKey},
      {    
        vault: vault.pubkey,
        fractionMint: new PublicKey(vault.data.fractionMint),
        fractionMintAuthority: new PublicKey(vaultMintAuthority),
        fractionTreasury: new PublicKey(vault.data.fractionTreasury),
        vaultAuthority: new PublicKey(vault.data.authority),
        numberOfShares: shareCount
      }
    );
    txData1.instructions.forEach(x => transaction.add(x))
  }

  const safetyDepositBoxes = await vault.getSafetyDepositBoxes(connection);

  const txData2 = new programs.vault.MintFractionalShares({feePayer: payer.publicKey},
    {    
      vault: vault.pubkey,
      fractionMint: new PublicKey(vault.data.fractionMint),
      fractionMintAuthority: new PublicKey(vaultMintAuthority),
      fractionTreasury: new PublicKey(vault.data.fractionTreasury),
      store: new PublicKey(tokenStore),
      vaultAuthority: new PublicKey(vault.data.authority),
      numberOfShares: shareCount
    }
  );

  txData2.instructions.forEach(x => transaction.add(x))

  const tx = await sendAndConfirmTransaction(
    connection,
    transaction,
    [payer],
  );

  console.log("Tx: ", tx);
}


mintFractionalShares(new BN(100));