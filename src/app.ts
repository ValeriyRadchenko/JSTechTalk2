import * as app from 'commander';
import { Blockchain } from './entities/blockchain';
import { ProofOfWork } from './entities/proof-of-work';
import { Wallets } from './entities/wallets';
import { base58Decode } from './utils/hash';
import { UTXOSet } from './entities/utxo-set';
import { Miner } from './miner/miner';
import { Block } from './miner/block';

process.on('unhandledRejection', (reason, where) => {
    console.error('Error at:', where,);
    process.exit(1);
});

const blockchain = new Blockchain();

app.command('wallet')
    .action(() => {
        const wallets = new Wallets();
        wallets.createWallet();
        wallets.save();
    });

app.command('send <from> <to> <amount>')
    .action(async (from: string, to: string, amount: string) => {
        await blockchain.open(from);
        const utxoSet = new UTXOSet(blockchain);

        const coinbaseTranasaction = await blockchain.newCoinbaseTransaction(from);
        const transaction = await blockchain.newTransaction(from, to, +amount, utxoSet);

        const block = await blockchain.mineBlock([coinbaseTranasaction, transaction]);
        await utxoSet.update(block);

        console.log('Success');
    });

app.command('create <address>')
    .action(async (address: string) => {
        await blockchain.create(address);
        const utxoSet = new UTXOSet(blockchain);
        await utxoSet.reindex();

        console.log('Done');
    });

app.command('balance <address>')
    .action(async (address: string) => {

        await blockchain.open(address);
        const utxoSet = new UTXOSet(blockchain);
        let balance = 0;

        const publicKeyHash = base58Decode(address).slice(2, -8);
        const unspentTransactionsOutputs = await utxoSet.findUnspentTransactionsOutputs(publicKeyHash);

        for (const output of unspentTransactionsOutputs) {
            balance += output.value;
        }

        console.log(`Balance of ${address}: ${balance}`);
    });

app.command('chain')
    .action(async () => {
        await blockchain.open('');
        const iterator = blockchain.createIterator();

        while (true) {
            const result = await iterator.next();

            if (result.done) {
                break;
            }

            const block = result.value;
            console.log(JSON.stringify(block, null, 2));
            console.log('Valid:', new ProofOfWork(block).validate());
            console.log('');
        }
    });

app.command('reindex')
    .action(async () => {
        await blockchain.open('');
        const utxoSet = new UTXOSet(blockchain);
        await utxoSet.reindex();

        console.log('Transactions count:', await utxoSet.countTransactions());
    });

app.command('mine <complexity> <type> <pool>')
    .action(async (complexity: string, type: string, pool: number) => {
        await blockchain.open('');
        const miner = new Miner(type);

        switch (type) {
            case 'process':
                miner.createProcessPool(+pool);
                break;
            case 'worker':
                miner.createWorkerPool(+pool)
        }


        const coinbaseTranasaction = await blockchain.newCoinbaseTransaction('');
        const block = new Block([coinbaseTranasaction], null);

        const startTime = Date.now();
        const result = await miner.mine(block, +complexity);

        const mineTime = Date.now() - startTime;

        if (mineTime <= 1000) {
            console.log('Mine time:', mineTime, 'ms');
        } else {
            console.log('Mine time:', Math.round(mineTime / 1000), 'sec');
        }


        block.nonce = result.nonce;
        block.hash = result.hash;

        console.log('Hash:', result.hash);
    });

app.parse(process.argv);