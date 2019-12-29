import {Migration} from "./Migration";
import {StateManager} from "./StateManager";
import {PlanEntry} from "./PlanEntry";
import Observable = require("zen-observable");
import * as is from 'predicates';
import {MigrationsList} from "./MigrationsList";
import {State} from "./State";

function assertHasDownMigration(migration: Migration) {
    if (!is.hasProperty('down', migration)) {
        throw new Error(`Migration "${migration.name}" has no "down" method and cannot be executed`);
    }
}

export class Migrator {
    constructor(private migrations: MigrationsList,
                private stateManager: StateManager) {
    }

    async getState(): Promise<State[]> {
        const records = await this.stateManager.getState();
        const recordsMap = new Map<string, State.Status.Record>();

        for (const record of records) {
            recordsMap.set(record.name, record.status);
        }

        return this.migrations
            .sorted
            .map(x => {
                return {
                    migration: x,
                    status: recordsMap.get(x.name) || 'pending'
                };
            });
    }

    async getPlan(direction: Migrator.Direction, to?: string): Promise<Array<PlanEntry>> {
        const state = await this.getState();

        if (to) {
            const hasTargetMigration = state.findIndex(x => x.migration.name === to);
            if (!hasTargetMigration) {
                throw new Error(`There is no migration "${to}" defined`);
            }
        }

        const plan: Array<PlanEntry> = [];
        if (direction === 'up') {
            // collect all pending migrations from the beginning
            for (const entry of state) {
                if (to && entry.migration.name === to) {
                    return plan;
                }

                if (State.Status.isPending(entry.status)) {
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

                if (State.Status.isFinished(entry.status)) {
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

        return new Observable(observer => {
            const unlock = async () => {
                try {
                    await this.stateManager.unlock();
                    observer.next(Migrator.Progress.unlockSuccess());
                } catch (e) {
                    observer.next(Migrator.Progress.unlockFailure(e));
                }
            };

            (async () => {
                try {
                    await this.stateManager.lock();
                    observer.next(Migrator.Progress.lockSuccess());
                } catch (e) {
                    observer.next(Migrator.Progress.lockFailure(e));
                    return;
                }
                for (const entry of plan) {
                    try {
                        observer.next(Migrator.Progress.migrationStarted(entry));
                        const result = await entry.migration[direction]!();
                        if (Migration.isSkip(result)) {
                            if (isUp) {
                                await this.stateManager.saveRecord({
                                    name: entry.migration.name,
                                    date: new Date(),
                                    status: 'skipped'
                                });
                            }
                            observer.next(Migrator.Progress.migrationSkipped(entry));
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
                            observer.next(Migrator.Progress.migrationFinished(entry));
                        }
                    } catch (e) {
                        observer.next(Migrator.Progress.migrationFailed(entry, e));
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
                    } catch (e) {
                        observer.error(e);
                        return;
                    }
                    observer.error(e);
                })
        })
    }
}

export namespace Migrator {
    export type Direction = 'up' | 'down';
    export type Progress = ReturnType<typeof Progress.lockSuccess> |
        ReturnType<typeof Progress.lockFailure> |
        ReturnType<typeof Progress.unlockSuccess> |
        ReturnType<typeof Progress.unlockFailure> |
        ReturnType<typeof Progress.migrationStarted> |
        ReturnType<typeof Progress.migrationSkipped> |
        ReturnType<typeof Progress.migrationFailed> |
        ReturnType<typeof Progress.migrationFinished>;

    export namespace Progress {

        export function lockSuccess() {
            return {
                type: 'lock-success'
            };
        }

        export function lockFailure(error: Error) {
            return {
                type: 'lock-failure',
                error
            };
        }

        export function unlockSuccess() {
            return {
                type: 'unlock-success'
            };
        }

        export function unlockFailure(error: Error) {
            return {
                type: 'unlock-failure',
                error
            };
        }

        export function migrationStarted(planEntry: PlanEntry) {
            return {
                type: 'migration-started',
                planEntry
            };
        }

        export function migrationSkipped(planEntry: PlanEntry) {
            return {
                type: 'migration-skipped',
                planEntry
            };
        }

        export function migrationFailed(planEntry: PlanEntry, error: Error) {
            return {
                type: 'migration-failed',
                planEntry,
                error
            };
        }

        export function migrationFinished(planEntry: PlanEntry) {
            return {
                type: 'migration-finished',
                planEntry
            };
        }
    }
}