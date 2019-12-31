import {Status} from "./Status";

export abstract class StateManager {
    abstract setup(): Promise<void>;

    abstract getState(): Promise<StateManager.Record[]>;

    abstract lock(): Promise<void>;

    abstract unlock(): Promise<void>;

    abstract saveRecord(record: StateManager.Record): Promise<void>;

    abstract deleteRecord(migrationName: string): Promise<void>;
}

export namespace StateManager {
    export type Status = 'success' | 'skipped';

    export interface Record {
        name: string;
        date: Date;
        status: Status.Record;
    }
}