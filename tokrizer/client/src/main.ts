/**
 * Hello world
 */
import { PublicKey } from '@solana/web3.js';
import {
  establishConnection,
  establishPayer,
  checkProgram,
  addTokenToVault,
  mintNft,
  createVault,
  TokrizeArgs
} from './tokr';

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
  //   name: 'Hello Eric',
  //   symbol: 'rNFT',
  //   uri: 'https://scozleoijzwyhyinwfvvyu5rjmnvntbyqgoa2u4wfebkf4zp.arweave.net/kJ2Vkc_hObYPhDbFr_XFOxSxtWzDiBnA1TlikCovMvU/',
  //   mint_bump: NaN,
  //   mint_seed: ''
  // }),
  //   new PublicKey("7M9H2BHZRA6RMdmWPun875kmko7dHiPULi5SW3D9s1zG")
  // );

  await createVault();

  // await addTokenToVault(
  //   new PublicKey("Fa6anVWLPQZjx2RTz76Z3QiZKaC3cJK2nHJ2pH9VYdZp"), // vault address 
  //   new PublicKey("Afop3y2EFrLB4xKdwozibmF1hFP5qWBAHRqsE73YKB1t"), // token address
  // );

  console.log('Success');
}

main().then(
  () => process.exit(),
  err => {
    console.error(err);
    process.exit(-1);
  },
);
