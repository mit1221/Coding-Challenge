// load environment variables
require('dotenv').config();

// import required modules
const bitcoin = require("bitcoinjs-lib");
const bitcoinNetwork = bitcoin.networks.testnet;
const bcypher = require('blockcypher');
const { execSync } = require('child_process');

var bcapi = new bcypher('btc', 'test3', process.env.BLOCKCYPHER_KEY);

/**
 * Generate a new testnet adddress and associated private/public keys.
 */
const generateAddress = () => {
  bcapi.genAddr(null, function(err, body) {
    if (err) {
      console.log(err);
    } else {
      console.log(
      `Private Key: ${body.private}\n` +
      `Public Key: ${body.public}\n` +
      `Address: ${body.address}\n` +
      `WIF: ${body.wif}`);
    }
  });
}

/**
 * Adds 10000 Satoshi to the given testnet adddress. 
 * NOTE: Only works on Blockcypher testnet.
 * @param {string} address - Address of the testnet.
 */
const addFunds = address => {
  bcapi.faucet(address, 10000, function(err, body) {
    if (err) {
      console.log(err);
    } else {
      if (body.tx_ref != null) {
        console.log("Added some Satoshi to your address!");
      } else {
        console.log(body);
      }
    }
  });
}

/**
 * Get the balance of a bitcoin testnet.
 * @param {string} address - Address of the testnet.
 */
const getBalance = address => {
  bcapi.getAddrBal(address, null, function(err, body) {
    if (err) {
      console.log(err);
    } else {
      console.log(`The current balance in the testnet address ${address} is: ${satoshiToBTC(body.balance)} BTC`);
    }
  });
}

const satoshiToBTC = amount => {
  return amount / Math.pow(10, 8);
}

const BTCToSatoshi = amount => {  
  return amount * Math.pow(10, 8);
}

/**
 * Make a payment from one bitcoin testnet to another.
 * @param {string} privateKey - Private key of the testnet to make payment from
 * @param {string} fromAddress - Public address of the testnet to make payment from
 * @param {string} toAddress - Public address of the testnet to make payment to
 * @param {number} amount - Payment amount (in BTC)
 */
const makePayment = (privateKey, fromAddress, toAddress, amount) => {
  const keys = bitcoin.ECPair.fromPrivateKey(Buffer.from(privateKey, 'hex'), bitcoinNetwork);
    
  // partially-filled TX object
  var newtx = {
    inputs: [{ addresses: [ fromAddress ] }], 
    outputs: [{ addresses: [ toAddress ], value: BTCToSatoshi(amount)}]
  };
  
  // make a new transaction
  bcapi.newTX(newtx, function(err, tmptx) {    
    if (err) {
      console.log(err);
    } else {
      // signing each of the hex-encoded string required to finalize the transaction
      tmptx.pubkeys = [];
      tmptx.signatures = tmptx.tosign.map(function(tosign, n) {
        // adds the public key generated from the WIF to the tmptx object
        const { pubkey } = bitcoin.payments.p2pkh({ pubkey: keys.publicKey });
        tmptx.pubkeys.push(pubkey.toString('hex'));

        // runs a binary executable to compute the signature from tosign and the private key
        const signature = execSync(`./signer ${tosign} ${privateKey}`).toString();

        return signature;
      }); 
      
      // send back the signed transaction
      bcapi.sendTX(tmptx, function(err, body) {
        if (err) {
          console.log(err);
        } else {
          console.log(body);
        }
      });
    }
  });
}

// Export all methods
module.exports = {
  generateAddress,
  addFunds,
  getBalance, 
  makePayment
};