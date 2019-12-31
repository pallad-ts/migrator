import knex = require('knex');
import {StateManager} from "@src/StateManager";
import {StateManager as _StateManager} from "@pallad/migrator-core";

describe('StateManager', () => {
    const connection = knex({
        client: 'pg',
        connection: {
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        }
    });

    const RECORD_1: _StateManager.Record = {
        name: '01_migration',
        date: new Date(),
        status: 'finished'
    };

    const RECORD_2: _StateManager.Record = {
        name: '02_migration2',
        date: new Date(),
        status: 'skipped'
    };

    let stateManager: StateManager;

    const TABLE = 'migrations';
    const TABLE_LOCK = TABLE + '_lock';

    beforeEach(async () => {
        stateManager = new StateManager(connection, TABLE);
        await stateManager.setup();
    });

    afterEach(async () => {
        await connection.schema.dropTableIfExists(TABLE);
        await connection.schema.dropTableIfExists(TABLE_LOCK);
    });

    afterAll(() => {
        return connection.destroy();
    });

    describe('locking', () => {
        it('success', async () => {
            await stateManager.lock();

            expect(await connection.schema.hasTable(TABLE_LOCK))
                .toEqual(true);
        });

        it('failure', async () => {
            await stateManager.lock();
            return expect(stateManager.lock())
                .rejects
                .toThrow('Lock already created');
        });
    });

    describe('unlock', () => {
        it('success', async () => {
            await stateManager.lock();
            await stateManager.unlock();

            expect(await connection.schema.hasTable(TABLE_LOCK))
                .toEqual(false);
        });

        it('failure', () => {
            return expect(stateManager.unlock())
                .rejects
                .toThrow('No lock to remove');
        });
    });

    describe('adding records', () => {


        it('success', async () => {
            await stateManager.saveRecord(RECORD_1);
            const state1 = await stateManager.getState();
            await stateManager.saveRecord(RECORD_2);
            const state2 = await stateManager.getState();

            expect(state1)
                .toEqual([
                    RECORD_1
                ]);

            expect(state2)
                .toEqual([
                    RECORD_1,
                    RECORD_2
                ]);
        });

        it('failure', async () => {
            await stateManager.saveRecord(RECORD_1);

            return expect(stateManager.saveRecord(RECORD_1))
                .rejects
                .toThrow('')
        });
    });

    describe('deleting records', () => {
        it('success', async () => {
            await stateManager.saveRecord(RECORD_1);
            await stateManager.deleteRecord(RECORD_1.name);

            const state = await stateManager.getState();

            expect(state)
                .toEqual([]);
        });
    });
});