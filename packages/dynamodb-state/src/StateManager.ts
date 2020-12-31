import {StateManager as _StateManager} from "@pallad/migrator-core";
import * as AWS from 'aws-sdk';
import {Maybe} from "monet";

const LOCK_KEY_NAME = '__lock';

export class StateManager extends _StateManager {
    private dynamoDB: AWS.DynamoDB;
    private config: StateManager.Config;

    static DEFAULT_CONFIG = {
        awaitDelay: 5000,
        awaitAttempts: 30
    };

    constructor(config: string | StateManager.Config.Input, dynamoDB?: AWS.DynamoDB) {
        super();
        this.config = typeof config === 'string' ? {
            ...StateManager.DEFAULT_CONFIG,
            table: config as string
        } : {
            ...StateManager.DEFAULT_CONFIG,
            ...config
        };
        this.dynamoDB = dynamoDB ?? new AWS.DynamoDB();
    }

    async deleteRecord(migrationName: string): Promise<void> {
        await this.dynamoDB.deleteItem({
            Key: {
                name: {
                    S: LOCK_KEY_NAME
                }
            },
            TableName: this.config.table
        }).promise();
    }

    async getState(): Promise<_StateManager.Record[]> {
        const result = await this.dynamoDB.scan({
            TableName: this.config.table,
            ConsistentRead: true,
            ScanFilter: {
                name: {
                    ComparisonOperator: 'NE',
                    AttributeValueList: [{
                        S: LOCK_KEY_NAME
                    }]
                }
            }
        }).promise();

        return result.Items!.map(x => {
            return {
                name: x.name.S!,
                date: new Date(+x.date.N!),
                status: x.status.S!
            }
        });
    }

    async lock(): Promise<void> {
        await this.dynamoDB.putItem({
            TableName: this.config.table,
            Item: {
                name: {
                    S: LOCK_KEY_NAME
                }
            },
            Expected: {
                name: {
                    Exists: false
                }
            }
        }).promise()
    }

    async saveRecord(record: _StateManager.Record): Promise<void> {
        await this.dynamoDB.putItem({
            TableName: this.config.table,
            Item: {
                name: {
                    S: record.name
                },
                date: {
                    N: record.date.getTime() + ''
                },
                status: {
                    S: record.status
                }
            }
        }).promise();
    }

    async setup() {
        const tableInfo = await this.getTableInfo();
        if (tableInfo.isSome()) {
            if (!this.isTableActive(tableInfo.some())) {
                await this.awaitForTableToBeReady();
            }
            return;
        }
        await this.dynamoDB.createTable({
            TableName: this.config.table,
            AttributeDefinitions: [],
            KeySchema: [
                {
                    AttributeName: "name",
                    KeyType: "HASH"
                }
            ]
        }).promise();
    }

    private isTableActive(table: AWS.DynamoDB.Types.TableDescription) {
        return table.TableStatus === 'ACTIVE';
    }

    async awaitForTableToBeReady() {
        let attemptsLeft = this.config.awaitAttempts;
        while (attemptsLeft > 0) {
            const info = await this.getTableInfo();
            if (info.isNone()) {
                throw new Error(`Table "${this.config.table}" does not exist`);
            }

            if (this.isTableActive(info.some())) {
                return;
            }

            await new Promise(resolve => setTimeout(resolve, this.config.awaitDelay));
        }

        throw new Error(`Table creation timeout: ${this.config.awaitDelay * this.config.awaitAttempts}ms`);
    }

    private async getTableInfo(): Promise<Maybe<AWS.DynamoDB.Types.TableDescription>> {
        const result = await this.dynamoDB.describeTable({
            TableName: this.config.table
        }).promise();

        return Maybe.fromFalsy(result.Table);
    }

    async stop() {

    }

    async unlock(): Promise<void> {
        await this.dynamoDB.deleteItem({
            TableName: this.config.table,
            Key: {
                name: {
                    S: LOCK_KEY_NAME
                }
            }
        }).promise();
    }
}

export namespace StateManager {
    export interface Config {
        table: string;

        /**
         * Number of attempts to check if table is ready to use
         */
        awaitAttempts: number;

        /**
         * Delay between attempts
         */
        awaitDelay: number;
    }

    export namespace Config {
        export type Input = Pick<Config, 'table'> & Partial<Pick<Config, 'awaitAttempts' | 'awaitDelay'>>;
    }
}