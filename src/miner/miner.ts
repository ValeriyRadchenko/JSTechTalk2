import { ChildProcess, fork } from 'child_process';
import * as path from 'path';
import * as os from 'os';

const { Worker } = require('worker_threads');

export class Miner {
    private processPool: ChildProcess[] = [];
    private workerPool: any[] = [];

    private timeMap = new Map<number, { time: number, nonce: number }>();
    private total = 0;
    private steps = 0;
    private mined = false;

    constructor(private type: string) {
    }

    public createProcessPool(poolLength = os.cpus().length) {
        for (let i = 0; i < poolLength; i++) {
            const childProcess = fork(path.resolve(__dirname, 'process'));
            this.processPool.push(childProcess);
        }
    }

    public createWorkerPool(poolLength = os.cpus().length) {
        for (let i = 0; i < poolLength; i++) {
            const worker = new Worker(path.resolve(__dirname, 'worker.js'));
            this.workerPool.push(worker);
        }
    }

    public async mine(block, complexity) {
        switch (this.type) {
            case 'process':
                return this.mineWithProcesses(block, complexity);
            case 'worker':
                return this.mineWithWorker(block, complexity);
        }
    }

    private mineWithWorker(block, complexity): Promise<{ hash: string, nonce: number }> {
        return new Promise(resolve => {
            const workerCount = this.workerPool.length;
            const nonceStep = Math.floor(Number.MAX_SAFE_INTEGER / workerCount);

            let nonceFrom = 0;
            let nonceTo = 0;

            for (let i = 0; i < workerCount; i++) {
                const freeWorker = this.workerPool[i];

                nonceFrom = nonceStep * i;
                nonceTo = nonceStep * (i + 1);

                this.steps = workerCount;
                this.mined = false;

                freeWorker.once('message', message => {
                    this.handleMessage(freeWorker, message)
                        .then(result => {
                            for (const child of this.workerPool) {
                                if (child.threadId === freeWorker.threadId) {
                                    child.terminate();
                                    continue;
                                }

                                child.postMessage('stop');
                            }


                            return result;
                        })
                        .then(resolve);
                });

                this.timeMap.set(freeWorker.threadId, { time: Date.now(), nonce: nonceFrom });

                freeWorker.postMessage({
                    block,
                    complexity,
                    nonceFrom,
                    nonceTo
                });
            }
        });
    }

    private mineWithProcesses(block, complexity): Promise<{ hash: string, nonce: number }> {
        return new Promise(resolve => {
            const processCount = this.processPool.length;
            const nonceStep = Math.floor(Number.MAX_SAFE_INTEGER / processCount);

            let nonceFrom = 0;
            let nonceTo = 0;

            for (let i = 0; i < processCount; i++) {
                const freeProcess = this.processPool[i];

                nonceFrom = nonceStep * i;
                nonceTo = nonceStep * (i + 1);

                this.steps = processCount;
                this.mined = false;

                freeProcess.once('message', message => {
                    this.handleMessage(freeProcess, message)
                        .then(result => {
                            for (const child of this.processPool) {
                                if (child.pid === freeProcess.pid) {
                                    (<any>child).kill(9);
                                    continue;
                                }

                                child.send('stop');
                            }

                            return result;
                        })
                        .then(resolve);
                });

                this.timeMap.set(freeProcess.pid, { time: Date.now(), nonce: nonceFrom });

                freeProcess.send({
                    block,
                    complexity,
                    nonceFrom,
                    nonceTo
                });
            }
        });
    }

    private handleMessage(entity, message) {
        return new Promise(resolve => {
            if (message) {

                const timeEnd = Date.now();
                const timeStart = this.timeMap.get(this.getEntityId(entity)).time;

                const diff = timeEnd - timeStart;

                const hashPerSecond = (message.nonce - this.timeMap.get(this.getEntityId(entity)).nonce) / (diff / 1000);
                this.total += hashPerSecond;

                this.steps--;

                if (this.steps === 0) {
                    console.log('Hash rate:', Math.round(this.total / 1000), 'KH/s');
                }

                if (message.hash && !this.mined) {
                    this.mined = true;
                    resolve(message);
                } else if (this.type === 'worker') {
                    entity.terminate();
                }
            }
        });
    }

    private getEntityId(entity) {
        if (this.type === 'worker') {
            return entity.threadId;
        }

        return entity.pid;
    }
}