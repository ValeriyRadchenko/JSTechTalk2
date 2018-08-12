import { Block } from './block';
import { ITransaction, Transaction } from './transaction';
import { ITransactionInput, TransactionInput } from './transaction-input';
import { ITransactionOutput, TransactionOutput } from './transaction-output';
import { Wallets } from './wallets';
import { hashPublicKey } from '../utils/hash';
import { UTXOSet } from './utxo-set';

const levelUp = require('levelup');
const levelDown = require('leveldown');

const SUBSIDY = 10;

export interface IUnspentTransactionsOutputs {
    [id: string]: ITransactionOutput[];
}

export class Blockchain {
    public tip: string;
    public db: any;
    public address: string;

    constructor() {
        this.db = levelUp(levelDown('blockchain-db'));
    }

    private newGenesisBlock(coinbase: ITransaction) {
        return new Block([coinbase], '');
    }

    private async getPreviousTransactions(transaction: Transaction) {
        const previousTransactions = {};

        for (const input of transaction.inputs) {
            const previousTransaction = await this.findTransactionById(input.transactionId);
            if (!previousTransaction) {
                throw new Error('Transaction is not found');
            }

            previousTransactions[previousTransaction.id] = previousTransaction;
        }

        return previousTransactions;
    }

    public async create(address: string) {
        this.address = address;

        let isExists = false;
        try {
            await this.db.get('l');
            isExists = true;
        } catch (error) {
            const coinbase = this.newCoinbaseTransaction(this.address);
            const genesis = this.newGenesisBlock(coinbase);
            this.db.put(genesis.hash, JSON.stringify(genesis));
            this.db.put('l', genesis.hash);

            this.tip = genesis.hash;
        }

        if (isExists) {
            throw new Error('Blockchain already exists');
        }

        return this;
    }

    public async open(address: string) {
        this.address = address;

        try {
            const lastHash = await this.db.get('l');
            this.tip = lastHash;

        } catch (error) {
            throw new Error('No existing blockchain found. Please create one');
        }

        return this;
    }

    public async findUnspentTransactionsOutputs() {
        const unspentTransactionsOutputs: IUnspentTransactionsOutputs = {};
        const spentTransactions = {};

        const iterator = this.createIterator();

        while (true) {
            const result = await iterator.next();

            if (result.done) {
                break;
            }

            const block = result.value;

            for (const transaction of block.transactions) {
                const transactionId = transaction.id;

                for (let outIndex = 0; outIndex < transaction.outputs.length; outIndex++) {
                    const output = transaction.outputs[outIndex];

                    if (spentTransactions[transactionId]) {
                        if (spentTransactions[transactionId].indexOf(outIndex) > -1) {
                            continue;
                        }
                    }

                    if (!unspentTransactionsOutputs[transactionId]) {
                        unspentTransactionsOutputs[transactionId] = [];
                    }

                    unspentTransactionsOutputs[transactionId].push(output);

                    if (!Transaction.isCoinbase(transaction)) {
                        for (const input of transaction.inputs) {
                            if (!spentTransactions[input.transactionId]) {
                                spentTransactions[input.transactionId] = [];
                            }

                            spentTransactions[input.transactionId].push(input.outputIndex);
                        }
                    }
                }
            }
        }

        return unspentTransactionsOutputs;
    }

    public async findTransactionById(id: string) {
        const iterator = this.createIterator();

        while (true) {
            const result = await iterator.next();

            if (result.done) {
                break;
            }

            const block = result.value;

            for (const transaction of block.transactions) {
                if (transaction.id === id) {
                    return transaction;
                }
            }
        }

        return null;
    }

    public async signTransaction(transaction: Transaction, privateKey: any) {
        return transaction.sign(privateKey, await this.getPreviousTransactions(transaction));
    }

    public async verifyTransaction(transaction: Transaction) {
        if (Transaction.isCoinbase(transaction)) {
            return true;
        }

        return transaction.verify(await this.getPreviousTransactions(transaction));
    }

    public newCoinbaseTransaction(to, data = '') {
        if (!data) {
            data = `Reward to ${to}`;
        }

        const input = new TransactionInput('', -1, null, data);
        const output = new TransactionOutput(SUBSIDY, to);

        const transaction = new Transaction([input], [output]);
        transaction.generateId();

        return transaction;
    }

    public async newTransaction(from: string, to: string, amount: number, utxoSet: UTXOSet) {
        const inputs: ITransactionInput[] = [];
        const outputs: ITransactionOutput[] = [];

        const wallet = new Wallets().getWallet(from);
        const publicKeyHash = hashPublicKey(wallet.publicKey);

        const { accumulator, unspentOutputs } = await utxoSet.findSpendableOutputs(publicKeyHash, amount);

        if (accumulator < amount) {
            throw new Error('Not enough funds');
        }

        for (const transactionId in unspentOutputs) {
            if (unspentOutputs.hasOwnProperty(transactionId)) {
                const outIndexes = unspentOutputs[transactionId];

                for (const outIndex of outIndexes) {
                    const input = new TransactionInput(transactionId, outIndex, wallet.publicKey, null);
                    inputs.push(input);
                }
            }
        }

        outputs.push(new TransactionOutput(amount, to));
        if (accumulator > amount) {
            outputs.push(new TransactionOutput(accumulator - amount, from));
        }


        const newTransaction = new Transaction(inputs, outputs);
        newTransaction.generateId();
        await this.signTransaction(newTransaction, wallet.privateKey);

        return newTransaction;
    }

    public async mineBlock(transactions: Transaction[]) {
        for (const transaction of transactions) {
            const result = await this.verifyTransaction(transaction);
            if (!result) {
                throw new Error('Invalid transaction');
            }
        }

        const lastHash = await this.db.get('l');
        const newBlock = new Block(transactions, lastHash.toString());

        await this.db.put(newBlock.hash, JSON.stringify(newBlock));
        await this.db.put('l', newBlock.hash);

        this.tip = newBlock.hash;

        return newBlock;
    }

    public createIterator() {
        const db = this.db;
        let tip = this.tip;
        let current: any;

        return {
            next: async function (): Promise<{ done: boolean, value?: any }> {
                if (current === undefined) {
                    current = JSON.parse(await db.get(tip));
                }

                if (current === null) {
                    return {
                        done: true
                    }
                }

                const result = {
                    done: false,
                    value: current
                };

                if (current.previousBlockHash) {
                    current = JSON.parse(await db.get(current.previousBlockHash));
                } else {
                    current = null;
                }

                return result;

            }
        }

    }
}