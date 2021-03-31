import {StateManager as _StateManager, ERRORS} from "@pallad/migrator-core";
import {Knex} from 'knex';

export class StateManager extends _StateManager {
    constructor(private knex: Knex, private table: string) {
        super();
    }

    async deleteRecord(migrationName: string): Promise<void> {
        await this.knex(this.table)
            .delete()
            .where({name: migrationName});
    }

    private get lockTableName() {
        return this.table + '_lock';
    }

    async setup() {
        await this.knex.transaction(async trx => {
            await trx.raw(`
                CREATE TABLE IF NOT EXISTS ${this.knex.ref(this.table)}  
                (
                    "name" varchar(255) PRIMARY KEY,
                    "date" timestamptz,
                    "status" varchar(255)
                )
            `, {
                tableName: this.table
            });
            await trx.raw(`
                CREATE TABLE IF NOT EXISTS ${this.knex.ref(this.lockTableName)}
                (
                    "is_locked" int PRIMARY KEY UNIQUE
                )
            `);
        });
    }

    async getState(): Promise<_StateManager.Record[]> {
        return this.knex(this.table)
            .select();
    }

    async lock(): Promise<void> {
        try {
            await this.knex(this.lockTableName)
                .insert({
                    is_locked: 1
                });
        } catch (e) {
            if (e.code === '23505') {
                throw ERRORS.LOCK_ALREADY_CREATED();
            }
            throw e;
        }
    }

    async saveRecord(record: _StateManager.Record): Promise<void> {
        try {
            await this.knex(this.table)
                .insert(record);
        } catch (e) {
            if (e.code === '23505') {
                throw ERRORS.RECORD_DUPLICATE(`Migrator record "${record.name}" already created`);
            }
            throw e;
        }
    }

    async unlock(): Promise<void> {
        await this.knex(this.lockTableName).truncate();
    }

    async stop() {
        await this.knex.destroy();
    }

    static create(options: { knex: Knex, table: string }) {
        return new StateManager(options.knex, options.table);
    }
}