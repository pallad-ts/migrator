import {Migration} from "./Migration";

export interface State {
    migration: Migration;
    status: State.Status;
}

export namespace State {
    export type Status = 'skipped' | 'finished' | 'pending';

    export namespace Status {
        export type Record = Exclude<Status, 'pending'>;

        export function isSkipped(status: Status): status is 'skipped' {
            return status === 'skipped';
        }

        export function isPending(status: Status): status is 'pending' {
            return status === 'pending';
        }

        export function isFinished(status: Status): status is 'finished' {
            return status === 'finished';
        }
    }
}