import { ProofOfWork } from './proof-of-work';
import { ITransaction } from './transaction';
import { MerkleTree } from './merkle-tree';

export interface IBlock {
    timestamp: number;
    transactions: ITransaction[];
    previousBlockHash: string;
    hash: string;
    nonce: number;
}

export class Block implements IBlock {
    public timestamp: number;
    public transactions: ITransaction[];
    public previousBlockHash: string;
    public hash: string;
    public nonce: number;

    public static hashTransactions(transactions: ITransaction[]) {
        const transactionSerializedList = transactions
            .map(transaction => JSON.stringify(transaction));

        return new MerkleTree(transactionSerializedList)
            .rootNode
            .data;
    }

    constructor(transactions: ITransaction[], previousBlockHash: string) {
        this.transactions = transactions;
        this.previousBlockHash = previousBlockHash;
        this.timestamp = Date.now();
        const proofOfWork = new ProofOfWork(this);

        const { nonce, hash } = proofOfWork.calculate();

        this.nonce = nonce;
        this.hash = hash;
    }
}