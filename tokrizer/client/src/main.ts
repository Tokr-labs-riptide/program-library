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
        name: 'This is an NFT',
        symbol: 'rNFT',
        uri: 'https://fazymvttg4pmy7ebypj67iadpiro3z6wxxzfwmmu7modia2ttwha.arweave.net/KDOGVnM3Hsx8gcPT76ADeiLt59a98lsxlPscNANTnY4/'
      }),
        new PublicKey("HEPfmxFKcTRTsxoWCatDQeKViDih3XrCD7eVs5t9iums")
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
      new PublicKey("CiC2Jk36rFcaGzvgwGceKVRD9efANa576rVAZCeN2EvT"), // vault address 
      new PublicKey("AhrDskTtZZoMsiGDKpfD1Z6WsqimcfC9eQGSPuCJwYAk"), // token address
    );

    console.log('Success');
  })

programCommand('fractionalize')
  .action(async (options, cmd) => {
    console.log("Fractionalize Vault");

    await initialize();

    await tokr.mintFractionalShares(
      new PublicKey("CiC2Jk36rFcaGzvgwGceKVRD9efANa576rVAZCeN2EvT"), // vault address 
      150,
    );

    console.log('Success');
  })  

programCommand('send')
  .action(async (options, cmd) => {
    console.log("Send Fractional rNFT Share");

    await initialize();

    await tokr.sendShare(
      new PublicKey("CiC2Jk36rFcaGzvgwGceKVRD9efANa576rVAZCeN2EvT"), // vault address 
      new PublicKey("HEPfmxFKcTRTsxoWCatDQeKViDih3XrCD7eVs5t9iums"), // destination
      new PublicKey("AhrDskTtZZoMsiGDKpfD1Z6WsqimcfC9eQGSPuCJwYAk"), // token address
      3,
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
