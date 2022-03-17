
import { getPayer } from '../utils';
import BN from 'bn.js';
import { Connection, NodeWallet, programs, actions } from '@metaplex/js';
import { Keypair, PublicKey, TransactionInstruction, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
import { MintLayout, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, NATIVE_MINT, Token } from '@solana/spl-token';
import { InitVault, Vault, VaultProgram, SafetyDepositBox, VaultState } from '@metaplex-foundation/mpl-token-vault';


const connection = new Connection('https://api.devnet.solana.com');

const vaultMintAuthority = '7vqigo8ioQM1W1TtLZESgPWMw6VrfyvFdDjyhc4aXTkx';

const vaultPubKey = 'Ciys8fbcSQSbQqMm91SmnLozdvw3ABBsEgGWHTvW69jb';

const tokenStore = '2jxk6u7QyhwtDajwmCHxZnvBLJydT6cynM9jE6tf2Qcq';

async function sendToken() {

  const vault = await programs.vault.Vault.load(connection, vaultPubKey);
  const payer = await getPayer();
  
  let response = await actions.sendToken(
    {
      connection: connection,
      wallet: new NodeWallet(payer),
      source: new PublicKey("EP8QgjMVsaZkKHeqE47rXJdU9aUyNi7bJNo9A1QPnGnx"),
      destination: new PublicKey("HEPfmxFKcTRTsxoWCatDQeKViDih3XrCD7eVs5t9iums"),
      mint: new PublicKey("6V3BzuZtQcaouEjXh72FTaco9xi3uvZFppv9wTtsCfCM"),
      amount: new BN(1)
    }
  )

  console.log("Tx: ", response.txId);
}


sendToken();