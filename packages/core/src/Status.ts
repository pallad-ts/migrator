export type Status = typeof Status.SKIPPED | typeof Status.FINISHED | typeof Status.PENDING;

export namespace Status {
    export const SKIPPED = 'skipped';
    export const PENDING = 'pending';
    export const FINISHED = 'finished';

    export type Record = Exclude<Status, 'pending'>;

    export function isSkipped(status: Status): status is typeof SKIPPED {
        return status === SKIPPED;
    }

    export function isPending(status: Status): status is typeof PENDING {
        return status === PENDING;
    }

    export function isFinished(status: Status): status is typeof FINISHED {
        return status === FINISHED;
    }
}
