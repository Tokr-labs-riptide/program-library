/**
 * Hello world
 */

import {
  establishConnection,
  establishPayer,
  checkProgram,
  runContract,
  TokrizeArgs
} from './tokr';

async function main() {
  console.log("Let's say hello to a Solana account...");

  // Establish connection to the cluster
  await establishConnection();

  // Determine who pays for the fees
  await establishPayer();

  // Check if the program has been deployed
  await checkProgram();

  await runContract(new TokrizeArgs({
    // name: 'smaABC',
    // symbol: 'worlda',
    // uri: 'www.gaasd.com'
    name: 'itsmaAB',
    symbol: 'worlda',
    uri: 'aaaaaaaa',
    mint_bump: NaN,
    mint_seed: ''
  }));

  console.log('Success');
}

main().then(
  () => process.exit(),
  err => {
    console.error(err);
    process.exit(-1);
  },
);
