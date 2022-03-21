import { PublicKey } from '@solana/web3.js';
import { getPayer, getRpcUrl} from '../utils';
import { Connection, NodeWallet, programs, actions } from '@metaplex/js';




async function getVaultInfo(vaultAddress) {
    const rpcUrl = await getRpcUrl();
    let connection = new Connection(rpcUrl, 'confirmed');
    const vault = await programs.vault.Vault.load(connection, vaultAddress);
    
    console.log(vault.data.authority);

}

getVaultInfo(new PublicKey("AvLtCwsoqXe2jr2rQ1wwvXF8LD6g9PcR8Qz8ygy5ARmF"))