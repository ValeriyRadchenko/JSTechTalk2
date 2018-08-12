import { ITransaction } from '../entities/transaction';
import { MerkleTree } from '../entities/merkle-tree';

export interface IBlock {
    transactions: ITransaction[];
    previousBlockHash: string;
    hash: string;
    nonce: number;
}

export class Block implements IBlock {
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
    }
}