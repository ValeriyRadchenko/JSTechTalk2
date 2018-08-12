import { base58Encode, getKeyPair, hashPublicKey, keyFromPrivate, sha256x2 } from '../utils/hash';

const VERSION = '00';
const CHECKSUM_LENGTH = 8;

export interface IWallet {
    privateKey: any;
    publicKey: string;
}

export class Wallet implements IWallet {
    public privateKey: any;
    public publicKey: string;

    constructor(privateKey?: string) {
        if (!privateKey) {
            this.privateKey = this.newKeyPair();
        } else {
            this.privateKey = keyFromPrivate(privateKey);
        }

        this.publicKey = this.privateKey
            .getPublic('hex');
    }

    private newKeyPair() {
        return getKeyPair();
    }

    private checksum(payload: string | Buffer) {
        return sha256x2(payload).slice(0, CHECKSUM_LENGTH);
    }

    public getAddress() {
        const versionedPayload = VERSION + hashPublicKey(this.publicKey);
        const checksum = this.checksum(Buffer.from(versionedPayload, 'hex'));
        const payload = versionedPayload + checksum;

        return base58Encode(payload);
    }
}