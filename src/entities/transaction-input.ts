export interface ITransactionInput {
    transactionId: string;
    outputIndex: number;
    publicKey: string;
    signature: string;
}

export class TransactionInput implements ITransactionInput{
    public outputIndex: number;
    public signature: string;
    public publicKey: string;
    public transactionId: string;

    constructor(transactionId: string, outputIndex: number, publicKey: string, signature: string) {
        this.transactionId = transactionId;
        this.outputIndex = outputIndex;
        this.signature = signature;
        this.publicKey = publicKey;
    }
}