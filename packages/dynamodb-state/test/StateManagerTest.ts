import {StateManager} from "@src/StateManager";
import {StateManager as _StateManager} from '@pallad/migrator-core';
import * as AWS from 'aws-sdk';
import {Either} from "monet";

describe('StateManager', () => {
    const TABLE = 'pallad_migrator_test';
    const TABLE2 = 'pallad_migrator_test2';
    const TABLE3 = 'pallad_migrator_test3';

    let manager: StateManager;
    let dynamo: AWS.DynamoDB;

    beforeAll(async () => {
        if (process.env.AWS_PROFILE) {
            dynamo = new AWS.DynamoDB({
                region: 'eu-central-1',
            });
        } else {
            dynamo = new AWS.DynamoDB({
                region: 'eu-central-1',
                credentials: new AWS.SharedIniFileCredentials({profile: 'pallad-migrator'})
            });
        }
        manager = new StateManager({
            table: TABLE
        }, dynamo);
        await manager.setup();
    });

    afterEach(async () => {
        const results = await dynamo.scan({
            TableName: TABLE
        }).promise();

        for (const result of results.Items!) {
            await dynamo.deleteItem({
                TableName: TABLE,
                Key: {
                    name: {
                        S: result.name.S
                    }
                }
            }).promise();
        }
    })

    describe('locking', () => {
        it('success', async () => {
            await manager.lock();

            const result = await dynamo.getItem({
                TableName: TABLE,
                Key: {
                    name: {
                        S: '__lock'
                    }
                }
            }).promise();
            expect(result.Item)
                .toBeDefined();
        });

        it('failure', async () => {
            await manager.lock();
            return expect(manager.lock())
                .rejects
                .toThrow('Lock already created');
        })

        it('race condition', async () => {
            const result = await Promise.all([
                Either.fromPromise(manager.lock()),
                Either.fromPromise(manager.lock())
            ]);

            expect(result.filter(x => x.isLeft()))
                .toHaveLength(1);

            expect(result.filter(x => x.isRight()))
                .toHaveLength(1);
        });
    });

    it('Unlocking', async () => {
        await manager.lock();
        await manager.unlock();
        const result = await Either.fromPromise(manager.unlock());
        expect(result.isRight())
            .toBe(true);
    });


    it('Real life scenario', async () => {
        const records: _StateManager.Record[] = [];
        for (let i = 0; i < 100; i++) {
            records.push({
                name: 'name' + i,
                status: 'finished',
                date: new Date(1000 + i)
            });
        }

        for (const record of records) {
            await manager.saveRecord(record);
        }

        await manager.lock();
        const state = await manager.getState();

        expect(state)
            .toEqual(records);

        await manager.unlock();
    });

    describe('setup', () => {
        beforeEach(() => {
            manager = new StateManager({table: TABLE2}, dynamo);
        });

        afterEach(async () => {
            await dynamo.deleteTable({
                TableName: TABLE2
            })
                .promise();
        });

        it('creates table if does not exists and awaits for it to be ready', async () => {
            await manager.setup();

            const tableInfo = await dynamo.describeTable({
                TableName: TABLE2
            }).promise();

            expect(tableInfo.Table!.TableStatus)
                .toEqual('ACTIVE');
        });
    });

    describe('managing records', () => {
        const RECORD: _StateManager.Record = {name: 'name1', date: new Date(), status: 'finished'};

        it('simple', async () => {
            await manager.saveRecord(RECORD);
            expect(await manager.getState())
                .toEqual([RECORD]);
            await manager.deleteRecord(RECORD.name);
            expect(await manager.getState())
                .toHaveLength(0);
        });

        it('throws an error when attempt to create the same record', async () => {
            await manager.saveRecord(RECORD);
            await expect(manager.saveRecord(RECORD))
                .rejects
                .toThrowError(`Migrator record "${RECORD.name}" already created`)
        });
    })
});