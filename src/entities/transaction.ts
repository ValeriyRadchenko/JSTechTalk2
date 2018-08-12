import { ITransactionOutput, TransactionOutput } from './transaction-output';
import { ITransactionInput, TransactionInput } from './transaction-input';
import { hashPublicKey, sha256x2, signWithPrivateKey, verifyWithPublicKey } from '../utils/hash';

export interface IPreviousTransactions {
    [transactionId: string]: ITransaction
}

export interface ITransaction {
    id: string;
    timestamp: number;
    inputs: ITransactionInput[];
    outputs: ITransactionOutput[];
}

export class Transaction implements ITransaction {
    public id: string;
    public timestamp: number;
    public inputs: ITransactionInput[];
    public outputs: ITransactionOutput[];

    public static checkSignature(input: ITransactionInput, publicKeyHash: string) {
        const lockHash = hashPublicKey(input.publicKey);
        return lockHash === publicKeyHash;
    }

    public static checkPubKey(output: ITransactionOutput, publicKeyHash: string) {
        return publicKeyHash === output.publicKeyHash;
    }

    public static isCoinbase(transaction: ITransaction) {
        return transaction.inputs.length === 1 &&
            !transaction.inputs[0].transactionId &&
            transaction.inputs[0].outputIndex === -1;
    }

    constructor(inputs: ITransactionInput[], outputs: ITransactionOutput[], id: string = null, timestamp = Date.now()) {
        this.inputs = inputs;
        this.outputs = outputs;
        this.id = id;
        this.timestamp = timestamp;
    }

    private getBlankCopy() {
        const inputs: ITransactionInput[] = [];
        const outputs: ITransactionOutput[] = [];

        for (const input of this.inputs) {
            inputs.push(new TransactionInput(
                input.transactionId,
                input.outputIndex,
                null,
                null
            ));
        }

        for (const output of this.outputs) {
            outputs.push(new TransactionOutput(
                output.value,
                output.publicKeyHash
            ));
        }

        return new Transaction(inputs, outputs, this.id, this.timestamp);
    }

    public generateId() {
        const hash = sha256x2(JSON.stringify(this));
        this.id = hash;
    }

    public sign(privateKey: any, previousTransactions: IPreviousTransactions) {
        if (Transaction.isCoinbase(this)) {
            return;
        }

        for (const input of this.inputs) {
            if (!previousTransactions[input.transactionId]) {
                throw new Error('Previous transaction is not correct');
            }
        }

        const transactionCopy = this.getBlankCopy();

        for (let i = 0; i < transactionCopy.inputs.length; i ++) {
            const inputCopy = transactionCopy.inputs[i];
            const previousTransaction = previousTransactions[inputCopy.transactionId];

            inputCopy.signature = null;
            inputCopy.publicKey = previousTransaction.outputs[inputCopy.outputIndex].publicKeyHash;
            transactionCopy.generateId();
            inputCopy.publicKey = null;

            this.inputs[i].signature = signWithPrivateKey(privateKey, transactionCopy.id);
        }
    }

    public verify(previousTransactions: IPreviousTransactions) {
        if (Transaction.isCoinbase(this)) {
            return true;
        }

        for (const input of this.inputs) {
            if (!previousTransactions[input.transactionId]) {
                throw new Error('Previous transaction is not correct');
            }
        }

        const transactionCopy = this.getBlankCopy();

        for (let i = 0; i < this.inputs.length; i ++) {
            const inputCopy = transactionCopy.inputs[i];
            const input = this.inputs[i];
            const previousTransaction = previousTransactions[inputCopy.transactionId];

            inputCopy.signature = null;
            inputCopy.publicKey = previousTransaction.outputs[inputCopy.outputIndex].publicKeyHash;
            transactionCopy.generateId();
            inputCopy.publicKey = null;

            if (!verifyWithPublicKey(input.publicKey, transactionCopy.id, input.signature)) {
                return false;
            }

        }

        return true;
    }
}