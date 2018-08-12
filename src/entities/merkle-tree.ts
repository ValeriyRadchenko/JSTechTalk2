import { IMerkleTreeNode, MerkleTreeNode } from './merkle-tree-node';

export interface IMerkleTree {
    rootNode: IMerkleTreeNode;
}

export class MerkleTree implements IMerkleTree {
    public rootNode: IMerkleTreeNode;

    constructor(data: string[]) {
        let nodes = [];

        if (data.length % 2 !== 0) {
            data.push(data[data.length - 1]);
        }

        for (const dataItem of data) {
            const node = new MerkleTreeNode(null, null, dataItem);
            nodes.push(node);
        }

        for (let i = 0; i < data.length / 2; i++) {
            const level = [];

            for (let n = 0; n < nodes.length; n += 2) {
                const node = new MerkleTreeNode(nodes[n], nodes[n+1], null);
                level.push(node);
            }

            nodes = level;
        }

        this.rootNode = nodes[0];
    }
}
