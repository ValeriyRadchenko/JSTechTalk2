import { base58Decode } from '../utils/hash';

export interface ITransactionOutput {
    value: number;
    publicKeyHash: string;
}

export class TransactionOutput implements ITransactionOutput{
    public publicKeyHash: string;
    public value: number;

    constructor(value: number, address: string) {
        this.value = value;
        this.lock(address);
    }

    public lock(address: string) {
        const decoded = base58Decode(address);
        this.publicKeyHash = decoded.slice(2, -8);
    }
}