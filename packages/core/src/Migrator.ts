import {Migration} from "./Migration";
import {StateManager} from "./StateManager";
import {PlanEntry} from "./PlanEntry";
import * as is from 'predicates';
import {MigrationsList} from "./MigrationsList";
import {State} from "./State";
import {Status} from "./Status";
import {Observable, Observer, Subject} from 'rxjs';

function assertHasDownMigration(migration: Migration) {
    if (!is.hasProperty('down', migration)) {
        throw new Error(`Migration "${migration.name}" has no "down" method and cannot be executed`);
    }
}

export class Migrator {
    private isStateReady = false;

    constructor(
        private migrations: MigrationsList,
        private stateManager: StateManager,
        private options?: Migrator.Options,
    ) {
    }

    private async stateSetup() {
        if (!this.isStateReady) {
            this.isStateReady = true;
            await this.stateManager.setup();
        }
        return;
    }

    async getState(): Promise<State[]> {
        await this.stateSetup();
        const records = await this.stateManager.getState();
        const recordsMap = new Map<string, Status.Record>();

        for (const record of records) {
            recordsMap.set(record.name, record.status);
        }

        return this.migrations
            .getSorted()
            .map(x => {
                return {
                    migration: x,
                    status: recordsMap.get(x.name) || 'pending'
                };
            });
    }

    async stop(): Promise<void> {
        await this.stateManager.stop();
    }

    async getPlan(direction: Migrator.Direction, to?: string): Promise<PlanEntry[]> {
        const state = await this.getState();

        if (to) {
            const hasTargetMigration = state.findIndex(x => x.migration.name === to);
            if (!hasTargetMigration) {
                throw new Error(`There is no migration "${to}" defined`);
            }
        }

        const plan: PlanEntry[] = [];
        if (direction === 'up') {
            // collect all pending migrations from the beginning
            for (const entry of state) {
                if (to && entry.migration.name === to) {
                    return plan;
                }

                if (Status.isPending(entry.status)) {
                    plan.push({
                        migration: entry.migration,
                        direction
                    });
                }
            }
        } else {
            // collect all finished migrations from the end
            for (const entry of state.reverse()) {
                if (to && entry.migration.name === to) {
                    return plan;
                }

                if (Status.isFinished(entry.status)) {
                    assertHasDownMigration(entry.migration);
                    plan.push({
                        migration: entry.migration,
                        direction
                    });
                }
            }
        }
        return plan;
    }

    async runTo(direction: Migrator.Direction, to?: string): Promise<Observable<Migrator.Progress>> {
        const plan = await this.getPlan(direction, to);

        const isUp = direction === 'up';

        let lockCreated = false;
        const observable = new Observable<Migrator.Progress>(observer => {
            const unlock = async () => {
                if (!lockCreated) {
                    return;
                }
                try {
                    await this.stateManager.unlock();
                    observer.next({
                        type: 'unlock-success'
                    });
                } catch (e: any) {
                    observer.next({
                        type: 'unlock-failure',
                        error: e
                    });
                    throw e;
                }
            };

            (async () => {
                try {
                    await this.stateManager.lock();
                    lockCreated = true;
                    observer.next({
                        type: 'lock-success'
                    });
                } catch (e: any) {
                    observer.next({
                        type: 'lock-failure',
                        error: e
                    });
                    throw e;
                }
                for (const entry of plan) {
                    try {
                        observer.next({
                            type: 'migration-started',
                            planEntry: entry
                        });
                        const result = await entry.migration[direction]!();
                        if (Migration.isSkip(result)) {
                            if (isUp) {
                                await this.stateManager.saveRecord({
                                    name: entry.migration.name,
                                    date: new Date(),
                                    status: 'skipped'
                                });
                            }
                            observer.next({
                                type: 'migration-skipped',
                                planEntry: entry
                            });
                        } else {
                            if (isUp) {
                                await this.stateManager.saveRecord({
                                    name: entry.migration.name,
                                    date: new Date(),
                                    status: 'finished'
                                });
                            } else {
                                await this.stateManager.deleteRecord(entry.migration.name);
                            }
                            observer.next({
                                type: 'migration-finished',
                                planEntry: entry
                            });
                        }
                    } catch (e: any) {
                        observer.next({
                            type: 'migration-failed',
                            planEntry: entry,
                            error: e
                        });
                        throw e;
                        break;
                    }
                }
            })()
                .then(async () => {
                    await unlock();
                    observer.complete();
                })
                .catch(async e => {
                    try {
                        await unlock();
                    } catch (e: any) {
                        observer.error(e);
                        return;
                    }
                    observer.error(e);
                })
        });

        const subject = new Subject<Migrator.Progress>();
        if (this.options?.observers) {
            for (const subscriber of this.options.observers) {
                subject.subscribe(subscriber);
            }
        }
        return subject;
    }
}

export namespace Migrator {
    export interface Options {
        observers?: Array<Observer<Progress>>
    }

    export type Direction = 'up' | 'down';
    export type Progress = Progress.LockSuccess |
        Progress.LockFailure |
        Progress.UnlockSuccess |
        Progress.UnlockFailure |
        Progress.MigrationStarted |
        Progress.MigrationSkipped |
        Progress.MigrationFailed |
        Progress.MigrationFinished;

    export namespace Progress {
        export interface LockSuccess {
            readonly type: 'lock-success'
        }

        export interface LockFailure {
            readonly type: 'lock-failure';
            readonly error: Error,
        }

        export interface UnlockSuccess {
            readonly type: 'unlock-success';
        }

        export interface UnlockFailure {
            readonly type: 'unlock-failure';
            readonly error: Error;
        }

        export interface MigrationStarted {
            readonly type: 'migration-started';
            readonly planEntry: PlanEntry;
        }

        export interface MigrationSkipped {
            readonly type: 'migration-skipped';
            readonly planEntry: PlanEntry;
        }

        export interface MigrationFailed {
            readonly type: 'migration-failed';
            readonly planEntry: PlanEntry;
            readonly error: Error;
        }

        export interface MigrationFinished {
            readonly type: 'migration-finished';
            readonly planEntry: PlanEntry;
        }
    }
}
