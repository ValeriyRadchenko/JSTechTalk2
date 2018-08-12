import { sha256x2 } from '../utils/hash';
import { Block } from '../entities/block';

let nonce = 0;
let block = null;
let complexity = 1;
let target: any = '';
let stop = false;

const messageHandler = async message => {
    if (message === 'stop') {
        stop = true;

        process.send({ nonce, hash: null }, () => {
            process.exit(0);
        });
    }

    block = message.block;
    complexity = message.complexity;

    const { nonceFrom, nonceTo } = message;

    nonce = nonceFrom;

    target = Buffer.alloc(64, '0');
    target[complexity - 1] = target[complexity - 1] + 1;
    target = target.toString();

    calculate(nonceTo);
};

process.on('message', messageHandler);

function calculate(nonceTo = Number.MAX_SAFE_INTEGER) {
    let hash = null;

    while (nonce < nonceTo) {
        if (stop) {
            return;
        }

        const data = prepareData(nonce);
        hash = sha256x2(data);

        nonce += 1;

        if (target > hash || (nonce !== 0 && (nonce % 1000 === 0))) {
            break;
        }
    }

    if (target <= hash && nonce < nonceTo) {
        setImmediate(() => {
           calculate(nonceTo);
        });
        return;
    }

    process.send({ nonce, hash });
}

function prepareData(nonce: number) {
    return JSON.stringify([
        block.previousBlockHash,
        Block.hashTransactions(block.transactions),
        complexity,
        nonce
    ]);
}
