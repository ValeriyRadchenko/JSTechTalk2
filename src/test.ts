import { MerkleTreeNode } from './entities/merkle-tree-node';
import { MerkleTree } from './entities/merkle-tree';
import { strictEqual } from 'assert';


void function () {
    const data = [
        'node1',
        'node2',
        'node3'
    ];

    const node1 = new MerkleTreeNode(null, null, data[0]);
    const node2 = new MerkleTreeNode(null, null, data[1]);
    const node3 = new MerkleTreeNode(null, null, data[2]);
    const node4 = new MerkleTreeNode(null, null, data[2]);

    const node5 = new MerkleTreeNode(node1, node2, null);
    const node6 = new MerkleTreeNode(node3, node4, null);

    const node7 = new MerkleTreeNode(node5, node6, null);

    console.log('Root hash', node7.data);

    const tree = new MerkleTree(data);

    console.log('Tree root node hash', tree.rootNode.data);
    
    console.log('\n', JSON.stringify(tree.rootNode, null, 2), '\n');

    strictEqual(node7.data, tree.rootNode.data);
}();