import { sha256 } from '../utils/hash';

export interface IMerkleTreeNode {
    left: IMerkleTreeNode;
    right: IMerkleTreeNode;
    data: string
}

export class MerkleTreeNode implements IMerkleTreeNode {

    public left: IMerkleTreeNode;
    public right: IMerkleTreeNode;
    public data: string;

    constructor(left, right: IMerkleTreeNode, data: string) {

        if (!left && !right) {
            this.data = sha256(data);
        } else {
            this.data = sha256(left.data + right.data)
        }

        this.left = left || null;
        this.right = right || null;
    }
}