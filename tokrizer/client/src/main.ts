/**
 * Hello world
 */
 import {PublicKey} from '@solana/web3.js';
import {
  establishConnection,
  establishPayer,
  checkProgram,
  mintNft,
  TokrizeArgs,
  createVault,
  addTokenToVault
} from './tokr';
import { InitVault, Vault, VaultProgram, SafetyDepositBox } from '@metaplex-foundation/mpl-token-vault';


async function main() {
  console.log("Let's say hello to a Solana account...");
  
  //Establish connection to the cluster
  await establishConnection();

  // Determine who pays for the fees
  await establishPayer();

  // Check if the program has been deployed
  await checkProgram();

  // await mintNft(new TokrizeArgs({
  //   // name: 'smaABC',
  //   // symbol: 'worlda',
  //   // uri: 'www.gaasd.com'
  //   name: 'This is an NFT',
  //   symbol: 'rNFT',
  //   uri: 'https://fazymvttg4pmy7ebypj67iadpiro3z6wxxzfwmmu7modia2ttwha.arweave.net/KDOGVnM3Hsx8gcPT76ADeiLt59a98lsxlPscNANTnY4/',
  //   mint_bump: NaN,
  //   mint_seed: ''
  // }),
  // new PublicKey("6hE24sGPa24GvFrUf2Wi8TcaEvXVBSRcWDRB8XxoHdEn")
  // );

  // await createVault();
  // let tokenAddress = new PublicKey("5XfvXXr7vmcubdRSdus5Qoc7dqLYPN6zB2TXprTAX31p")
  // let vaultAddress = new PublicKey("7bt2xPtX9RZFzwHKt2xRAf2ANPvAE7cti77bVSaGKgEm")
  // const vaultAuthority = await Vault.getPDA(vaultAddress);
  // const safetyDepositBox = await SafetyDepositBox.getPDA(vaultAddress, tokenAddress);
  // console.log("Vault Authority ", vaultAuthority.toBase58())
  // console.log("safetyDepositBox ", safetyDepositBox.toBase58())
  await addTokenToVault(
    new PublicKey("3JFnHtFBUrfktYSTc6Xpzkw5sZtzuVFpdf4DC5D5AWKj"), // vault address 
    new PublicKey("EGrjqWEKnwgLyVumbxAE62qzdBRTnoqnTzkkBCrvTrKv"), // token address
  );

  console.log('Success');
}

main().then(
  () => process.exit(),
  err => {
    console.error(err);
    process.exit(-1);
  },
);
