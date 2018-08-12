const ECDSA = require('elliptic').ec;
const bigInt = require('big-integer');
import { createHash } from 'crypto';

const BASE_58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

export function hashPublicKey(publicKey: string) {
    return ripemd(sha256(publicKey));
}

export function sha256(payload: string | Buffer) {
    return createHash('sha256')
        .update(payload)
        .digest('hex');
}

export function sha256x2(payload: string | Buffer) {
    const firstHash = createHash('sha256')
        .update(payload)
        .digest();

    return createHash('sha256')
        .update(firstHash)
        .digest('hex');
}

export function getKeyPair() {
    return new ECDSA('p256').genKeyPair();
}

export function signWithPrivateKey(key: any, payload: string) {
    const payloadByteArray = [...Buffer.from(payload)];
    return Buffer.from(key.sign(payloadByteArray).toDER()).toString('hex');
}

export function verifyWithPublicKey(publicKey: string, payload: string, signature: string) {
    const key = keyFromPublic(publicKey);
    return key.verify([...Buffer.from(payload)], signature);
}

export function keyFromPublic(publicKey: string) {
    return new ECDSA('p256').keyFromPublic(publicKey, 'hex');
}

export function keyFromPrivate(privateKey: string) {
    return new ECDSA('p256').keyFromPrivate(privateKey, 'hex');
}

export function ripemd(payload: string) {
    return createHash('RIPEMD160')
        .update(payload)
        .digest('hex');
}

export function base58Encode(payload: string) {
    let result = '';

    let x = bigInt(payload, 16);
    let base = bigInt(BASE_58_ALPHABET.length);
    let zero = bigInt();

    while (x.compare(zero) !== 0) {
        const divmodResult = x.divmod(base);
        x = divmodResult.quotient;
        const mod = divmodResult.remainder;
        result += BASE_58_ALPHABET[mod.value];
    }

    result = result.split('').reverse().join('');
    result = BASE_58_ALPHABET[0] + result;

    return result;
}

export function base58Decode(address: string, length = 50) {
    const base58String = address.slice(1, address.length);
    let result = bigInt(0);

    for (let i = 0; i < base58String.length; i++) {
        const char = base58String[i];
        const index = BASE_58_ALPHABET.indexOf(char);

        result = result.multiply(58);
        result = result.add(index);
    }

    result = result.toString(16);

    let zeroString = '';

    if (length > result.length) {
        for (let i = 0; i < length - result.length; i++) {
            zeroString += '0';
        }
    }

    return zeroString + result;
}

