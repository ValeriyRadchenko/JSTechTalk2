# JSTechTalk #2
## Node.js Blockchain implementation

### Node.js version requirement
`Node.js version >= 10.7.0`

### Quick start

```
npm install
npm start -- wallet
npm start -- create <address>
```

### Create a new address
```
npm start -- wallet
```

### Create a blockchain
```
npm start -- create <address>
```

### Get a balance
```
npm start -- balance <address>
```

### Send coins
```
npm start -- send <from> <to> <amount>
```

### Print full chain and validate blocks
```
npm start -- chain
```

### Reindex an UTXO set
```
npm start -- reindex
```

### Mine a test block to measure a hash rate
```
npm start -- mine <complexity> <type> <pool>
```
* complexity: number - set a complexity for Proof of work (1-32)

*warning*: Use maximum 6

* type: Enum - process or worker

* pool: number - processes or workers count