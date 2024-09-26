import dotenv from "dotenv";
import { env } from "node:process";
import { Address, TonClient, WalletContractV4, internal, TonClient4, fromNano } from "@ton/ton";
import { mnemonicNew, mnemonicToPrivateKey } from "@ton/crypto";
import { getHttpV4Endpoint } from '@orbs-network/ton-access';
import { insertSubWallet } from "../models/User";

// eslint-disable-next-line ts/no-require-imports
require('node:buffer')
dotenv.config()

const apiKey = env["API_KEY"]
const feeAddr = env["FEE_ADDRESS"]? env["FEE_ADDRESS"] : "UQDwZVedDa_mN0tzqpBtBdtOGlOvJnxD9J5QZgqbY8LujE1Y";
const feePercent = env["FEE_PERCENT"]? parseFloat(env["FEE_PERCENT"]) : 5;
const client = new TonClient({
  endpoint: 'https://toncenter.com/api/v2/jsonRPC',
  apiKey: apiKey
});

export async function createWallet() {
    try {
        // Generate new key
        const mnemonics = await mnemonicNew()
        const keyPair = await mnemonicToPrivateKey(mnemonics)
        // Create wallet contract
        const workchain = 0 // Usually you need a workchain 0
        const wallet = WalletContractV4.create({ workchain, publicKey: keyPair.publicKey })
        const mnemonic = mnemonics.join(" ")
        const address = wallet.address.toString()
        return { address,  mnemonic }
    } catch (error) {
        return null
    }
  
}

export async function testActivateWallet() {
    try {
        const testclient = new TonClient({
          endpoint: 'https://toncenter.com/api/v2/jsonRPC',
          apiKey: apiKey,
        });
        let mnemonics = "summer pepper sting orient bachelor brave food scrap tennis hotel tribe image various bean until involve bar margin rhythm budget master fortune diet index";
        let keyPair = await mnemonicToPrivateKey(mnemonics.split(' '));
        
        // Create wallet contract
        let workchain = 0; // Usually you need a workchain 0
        let wallet = WalletContractV4.create({ workchain, publicKey: keyPair.publicKey });
        
        console.log("WalletAddress:", wallet.address.toString());
        let contract = testclient.open(wallet);
        // Create a WalletContractV4 instance (you can also use WalletContractV3)
        const testworkchain = 0; // Usually, workchain 0 is used
        const testwallet = WalletContractV4.create({ workchain: testworkchain, publicKey: keyPair.publicKey, walletId: 2 });
        console.log("TEST wallet: ",testwallet.address.toString());
        const balance = await contract.getBalance();
        console.log("balance: ", fromNano(balance));
        const testContract = testclient.open(testwallet);
        const seqno1: number = await contract.getSeqno();
        const tx1 = await contract.sendTransfer({
            seqno: seqno1,
            secretKey: keyPair.secretKey,
            messages: [internal({
                bounce: false,
                value: '0.3',
                to: testwallet.address.toString(),
                body: 'return world',
            })]
        });
    } catch (error) {
        console.log(error);
    }
}

export async function createAndActivateSubwallet(mnemonic: string, length: number, id: number, startId: number) {
    try {
        const endpoint = await getHttpV4Endpoint();
        const tonClient = new TonClient4({ endpoint });
        const key = await mnemonicToPrivateKey(mnemonic.split(' '));
        const mainWallet = WalletContractV4.create({
            workchain: 0,
            publicKey: key.publicKey,
        });
        const mainContract = tonClient.open(mainWallet);

        const balance = await mainContract.getBalance();
        /// fee 5%
        const fee = mainContract.sendTransfer({
            seqno: await mainContract.getSeqno(),
            secretKey: key.secretKey,
            messages: [internal({
                bounce: false,
                value : (Number(fromNano(balance)) * feePercent / 100).toString(),
                to: feeAddr,
            })]
        });
        /// Activate wallet
        for (let index = 0; index < length; index++) {
            
            // Generate the wallet address
            const recieptWallet = WalletContractV4.create({
                workchain: 0,
                publicKey: key.publicKey,
                walletId: index + 1 + startId,
            });

            const user = await insertSubWallet(id, {address: recieptWallet.address.toString(), subwalletId: startId + index + 1});

            
            let seqno: number = await mainContract.getSeqno();
            const amount = (Math.floor(Number(fromNano(balance)) * (100 - feePercent) / 100  / length)).toString();
            const tx = await mainContract.sendTransfer({
                seqno,
                secretKey: key.secretKey,
                messages: [internal({
                    bounce: false,
                    value: amount,
                    to: recieptWallet.address.toString(),
                })]
            });
            
        }
    } catch (error) {
        
    }
}

export async function importWallet(mnemonic: string) {
    try {
        // Convert mnemonic to wallet key (private and public key)
        const keyPair = await mnemonicToPrivateKey(mnemonic.split(' '))

        // Define the wallet type and workchain ID
        const wallet = WalletContractV4.create({
            publicKey: keyPair.publicKey,
            workchain: 0, // default workchain
        })
        const address = wallet.address.toString()
        return { address }
    } catch (error) {
        return null
    }
  
}

export async function get_Balance(walletAddr: string) {

  try {
        
        const address = Address.parse(walletAddr)
        // Get balance
        const balance = await client.getBalance(address)
        return Number(fromNano(balance));
    } catch (error) {
        console.error('Error getting wallet balance:', error);
        return null
    }
}