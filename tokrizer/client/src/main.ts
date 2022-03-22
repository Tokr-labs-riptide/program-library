/**
 * Tokrizer Main Program
 */
import { BN } from '@project-serum/anchor';
import { Keypair, PublicKey } from '@solana/web3.js';

import { program } from 'commander';
import * as tokr from './tokr';
import { TokrizeArgs } from './tokrData';

programCommand('mint')
  .action(async (options, cmd) => {
    console.log("Minting NFT");

    await initialize()

    await tokr.mintNft(new TokrizeArgs({
        // name: 'smaABC',
        // symbol: 'worlda',
        // uri: 'www.gaasd.com'
        name: 'This is an NFT',
        symbol: 'rNFT',
        uri: 'https://fazymvttg4pmy7ebypj67iadpiro3z6wxxzfwmmu7modia2ttwha.arweave.net/KDOGVnM3Hsx8gcPT76ADeiLt59a98lsxlPscNANTnY4/',
        mint_bump: NaN,
        mint_seed: ''
      }),
        new PublicKey("3K7Sc4zrKsTGUwuMb2NiFQJM4wq9LDonG1iJURDBodrC")
    );

    console.log('Success');
  })

programCommand('initVault')
  .action(async (options, cmd) => {
    console.log("Creating Vault");

    await initialize();

    await tokr.createVault();

    console.log('Success');
  })

programCommand('vaultNft')
  .action(async (options, cmd) => {
    console.log("Add Token to Vault");

    await initialize();

    await tokr.addTokenToVault(
      new PublicKey("fYiJMqhvD1dDZs6i78z8XrrzvZjGUuUJivjpohrD619"), // vault address 
      new PublicKey("yHbHyrK27eLCiXBY2b5KMAUSJvK9HajZU1fSBxDtRQg"), // token address
    );

    console.log('Success');
  })

programCommand('fractionalize')
  .action(async (options, cmd) => {
    console.log("Fractionalize Vault");

    await initialize();

    await tokr.mintFractionalShares(
      new PublicKey("fYiJMqhvD1dDZs6i78z8XrrzvZjGUuUJivjpohrD619"), // vault address 
      new PublicKey("721LrCcbvyTd7xvtBwfy5Fv5fLxeHKrA25NU8utw9vAD"), // vault mint authority
      100,
    );

    console.log('Success');
  })  

programCommand('send')
  .action(async (options, cmd) => {
    console.log("Send Fractional rNFT Share");

    await initialize();

    await tokr.sendShare(
      new PublicKey("AvLtCwsoqXe2jr2rQ1wwvXF8LD6g9PcR8Qz8ygy5ARmF"), // vault address 
      new PublicKey("HEPfmxFKcTRTsxoWCatDQeKViDih3XrCD7eVs5t9iums"), // destination
      new PublicKey("7djvEfzQvQhttBpSrYaJJTjZCfVaiDcCTmSEufvkgGoc"), // token address
      new BN(1),
    );

    console.log('Success');
  })

function programCommand(name: string) {
  return program
    .command(name)
    .option(
      '-e, --env <string>',
      'Solana cluster env name',
      'devnet', //mainnet-beta, testnet, devnet
    )
}

async function initialize() {
    //Establish connection to the cluster
    await tokr.establishConnection();

    // Determine who pays for the fees
    await tokr.establishPayer();

    // Check if the program has been deployed
    await tokr.checkProgram();
}

program.parse(process.argv);

// main().then(
//   () => process.exit(),
//   err => {
//     console.error(err);
//     process.exit(-1);
//   },
// );
