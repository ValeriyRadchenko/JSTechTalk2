import { IWallet, Wallet } from './wallet';
import { writeFileSync, readFileSync } from 'fs';

const WALLET_FILE_PATH = 'wallet.dat';

export class Wallets {
    private wallets: { [address: string]: IWallet } = {};

    constructor() {
        this.load();
    }

    public createWallet() {
        const wallet = new Wallet();
        const address = wallet.getAddress();
        console.log('Your address is', address);

        this.wallets[address] = wallet;

        return address;
    }

    public getAddresses() {
        return Object.keys(this.wallets);
    }

    public getWallet(address: string) {
        return this.wallets[address] || null;
    }

    public save() {
        const privetKeys: string[] = Object.keys(this.wallets)
            .map((address: string) => this.wallets[address].privateKey.getPrivate().toString('hex'));

        writeFileSync(WALLET_FILE_PATH, privetKeys.join('\n'), { encoding: 'binary' });
    }

    public load() {
        try {
            const privateKeysData = readFileSync(WALLET_FILE_PATH, { encoding: 'binary' });
            const privateKeys = privateKeysData.split('\n');

            for (const privateKey of privateKeys) {
                const wallet = new Wallet(privateKey);
                this.wallets[wallet.getAddress()] = wallet;
            }

            return true;
        } catch (error) {
            return false;
        }
    }
}