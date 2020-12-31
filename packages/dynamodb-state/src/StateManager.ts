import {ERRORS, StateManager as _StateManager} from "@pallad/migrator-core";
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
                    S: migrationName
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

        return result.Items!.map((x: any) => {
            return {
                name: x.name.S!,
                date: new Date(+x.date.N!),
                status: x.status.S!
            }
        })
            .sort((a, b) => a.date.getTime() - b.date.getTime());
    }

    async lock(): Promise<void> {
        try {
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
            }).promise();
        } catch (e) {
            if (e.code === 'ConditionalCheckFailedException') {
                throw ERRORS.LOCK_ALREADY_CREATED();
            }
            throw e;
        }
    }

    async saveRecord(record: _StateManager.Record): Promise<void> {
        try {
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
                },
                Expected: {
                    name: {
                        Exists: false
                    }
                }
            }).promise();
        } catch (e) {
            if (e.code === 'ConditionalCheckFailedException') {
                throw ERRORS.RECORD_DUPLICATE(`Migrator record "${record.name}" already created`);
            }
            throw e;
        }
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
            AttributeDefinitions: [
                {
                    AttributeName: "name",
                    AttributeType: "S"
                }
            ],
            BillingMode: "PAY_PER_REQUEST",
            KeySchema: [
                {
                    AttributeName: "name",
                    KeyType: "HASH"
                }
            ]
        }).promise();
        await this.awaitForTableToBeReady();
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
            attemptsLeft--;
        }

        throw new Error(`Table creation timeout: ${this.config.awaitDelay * this.config.awaitAttempts}ms`);
    }

    private async getTableInfo(): Promise<Maybe<AWS.DynamoDB.Types.TableDescription>> {
        try {
            const result = await this.dynamoDB.describeTable({
                TableName: this.config.table
            }).promise();
            return Maybe.fromFalsy(result.Table);
        } catch (e) {
            if (e.code === 'ResourceNotFoundException') {
                return Maybe.None();
            }
            throw e;
        }
    }

    stop() {
        return Promise.resolve(undefined);
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