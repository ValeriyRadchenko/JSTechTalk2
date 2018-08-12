import { Blockchain } from './blockchain';
import { Transaction } from './transaction';
import { ITransactionOutput } from './transaction-output';
import { Block } from './block';

const levelUp = require('levelup');
const levelDown = require('leveldown');

const DB_PATH = 'utxo-db';

export class UTXOSet {
    private blockchain: Blockchain;
    private db: any;

    constructor(blockchain: Blockchain) {
        this.blockchain = blockchain;
        this.db = levelUp(levelDown(DB_PATH));
    }

    private clearDB() {
        return new Promise(async resolve => {
            await await this.db.close();
            levelDown.destroy(DB_PATH, () => {
                this.db = levelUp(levelDown(DB_PATH));
                resolve();
            });
        });
    }

    public findSpendableOutputs(publicKeyHash: string, amount: number):
        Promise<{ accumulator: number, unspentOutputs: any }> {
        return new Promise((resolve, reject) => {
            const unspentOutputs = {};
            let accumulator = 0;

            const readStream = this.db.createReadStream();

            readStream.once('error', reject);
            readStream.once('end', () => {
                resolve({ accumulator, unspentOutputs });
            });
            readStream.once('close', () => {
                resolve({ accumulator, unspentOutputs });
            });

            readStream.on('data', data => {
                const key = data.key.toString();
                const outputs = JSON.parse(data.value);

                for (let outIndex = 0; outIndex < outputs.length; outIndex++) {
                    const output = outputs[outIndex];

                    if (Transaction.checkPubKey(output, publicKeyHash) && accumulator < amount) {
                        accumulator += output.value;
                        if (!unspentOutputs[key]) {
                            unspentOutputs[key] = [];
                        }

                        unspentOutputs[key].push(outIndex);

                        if (accumulator >= amount) {
                            readStream.destroy();
                        }
                    }
                }
            })

        });
    }

    public findUnspentTransactionsOutputs(publicKeyHash: string): Promise<ITransactionOutput[]> {
        return new Promise((resolve, reject) => {
            const unspentTransactionsOutputs: ITransactionOutput[] = [];

            const readStream = this.db.createReadStream();

            readStream.once('error', reject);
            readStream.once('end', () => {
                resolve(unspentTransactionsOutputs);
            });
            readStream.once('close', () => {
                resolve(unspentTransactionsOutputs);
            });

            readStream.on('data', data => {
                const outputs = JSON.parse(data.value);

                for (const output of outputs) {
                    if (Transaction.checkPubKey(output, publicKeyHash)) {
                        unspentTransactionsOutputs.push(output);
                    }
                }
            });
        });
    }

    public async reindex() {
        await this.clearDB();

        const unspentTransactionsOutputs = await this.blockchain.findUnspentTransactionsOutputs();

        for (const id in unspentTransactionsOutputs) {
            if (unspentTransactionsOutputs.hasOwnProperty(id)) {
                const outputs = unspentTransactionsOutputs[id];
                await this.db.put(id, JSON.stringify(outputs));
            }
        }
    }

    public countTransactions() {
        return new Promise((resolve, reject) => {
            let counter = 0;

            const stream = this.db.createKeyStream();

            stream.once('error', reject);

            stream.once('end', () => {
                resolve(counter);
            });

            stream.on('data', () => {
                counter++;
            });
        });
    }

    public async update(block: Block) {
        for (const transaction of block.transactions) {
            if (!Transaction.isCoinbase(transaction)) {

                for (const input of transaction.inputs) {
                    const updatedOutputs = [];
                    const outputsJSON = await this.db.get(input.transactionId);
                    const outputs = JSON.parse(outputsJSON);

                    for (let outIndex = 0; outIndex < outputs.length; outIndex++) {
                        const output = outputs[outIndex];

                        if (input.outputIndex !== outIndex) {
                            updatedOutputs.push(output);
                        }
                    }

                    if (!updatedOutputs.length) {
                        await this.db.del(input.transactionId);
                    } else {
                        await this.db.put(input.transactionId, JSON.stringify(updatedOutputs));
                    }

                }

            }

            let previousOutputs = [];

            try {
                const previousOutputsJSON = await this.db.get(transaction.id);
                previousOutputs = JSON.parse(previousOutputsJSON);
            } catch (error) {
            }

            await this.db.put(transaction.id, JSON.stringify([...previousOutputs, ...transaction.outputs]));
        }
    }
}