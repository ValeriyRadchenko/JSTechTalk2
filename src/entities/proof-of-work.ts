import { Block, IBlock } from './block';
import { sha256x2 } from '../utils/hash';

const COMPLEXITY = 3;

export class ProofOfWork {
    public target: string;
    public block: IBlock;

    constructor(block: IBlock) {
        this.target = this.setTarget();
        this.block = block;
    }

    private setTarget() {
        const newTarget = [];
        for (let i = 0; i < 64; i++) {
            if (i === COMPLEXITY) {
                newTarget.push(1);
                continue;
            }
            newTarget.push(0);
        }

        return newTarget.join('');
    }

    private prepareData(nonce: number) {
        const data = JSON.stringify([
            this.block.previousBlockHash,
            Block.hashTransactions(this.block.transactions),
            this.block.timestamp,
            COMPLEXITY,
            nonce
        ]);

        return data;
    }

    public calculate() {
        let nonce = 0;
        let hash = '';
        while (nonce < Number.MAX_SAFE_INTEGER) {
            const data = this.prepareData(nonce);
            hash = sha256x2(data);
            if (this.target > hash) {
                break;
            }
            nonce++;
        }

        return { nonce, hash };
    }

    public validate() {
        const data = this.prepareData(this.block.nonce);
        const hash = sha256x2(data);

        return this.target > hash;
    }
}