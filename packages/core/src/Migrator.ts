import {Migration} from "./Migration";
import {StateManager} from "./StateManager";
import {PlanEntry} from "./PlanEntry";
import Observable = require("zen-observable");
import * as is from 'predicates';
import {MigrationsList} from "./MigrationsList";
import {State} from "./State";
import {Status} from "./Status";

function assertHasDownMigration(migration: Migration) {
    if (!is.hasProperty('down', migration)) {
        throw new Error(`Migration "${migration.name}" has no "down" method and cannot be executed`);
    }
}

export class Migrator {
    private isStateReady = false;

    constructor(private migrations: MigrationsList,
                private stateManager: StateManager) {
    }

    private async _stateSetup() {
        if (!this.isStateReady) {
            this.isStateReady = true;
            await this.stateManager.setup();
        }
        return;
    }

    async getState(): Promise<State[]> {
        await this._stateSetup();
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
        return new Observable(observer => {
            const unlock = async () => {
                if (!lockCreated) {
                    return;
                }
                try {
                    await this.stateManager.unlock();
                    observer.next(new Migrator.Progress.UnlockSuccess());
                } catch (e) {
                    observer.next(new Migrator.Progress.UnlockFailure(e));
                    throw e;
                }
            };

            (async () => {
                try {
                    await this.stateManager.lock();
                    lockCreated = true;
                    observer.next(new Migrator.Progress.LockSuccess());
                } catch (e) {
                    observer.next(new Migrator.Progress.LockFailure(e));
                    throw e;
                }
                for (const entry of plan) {
                    try {
                        observer.next(new Migrator.Progress.MigrationStarted(entry));
                        const result = await entry.migration[direction]!();
                        if (Migration.isSkip(result)) {
                            if (isUp) {
                                await this.stateManager.saveRecord({
                                    name: entry.migration.name,
                                    date: new Date(),
                                    status: 'skipped'
                                });
                            }
                            observer.next(new Migrator.Progress.MigrationSkipped(entry));
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
                            observer.next(new Migrator.Progress.MigrationFinished(entry));
                        }
                    } catch (e) {
                        observer.next(new Migrator.Progress.MigrationFailed(entry, e));
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
    export type Progress = Progress.LockSuccess |
        Progress.LockFailure |
        Progress.UnlockSuccess |
        Progress.UnlockFailure |
        Progress.MigrationStarted |
        Progress.MigrationSkipped |
        Progress.MigrationFailed |
        Progress.MigrationFinished;

    export namespace Progress {
        export class LockSuccess {

        }

        export class LockFailure {
            constructor(readonly error: Error) {
            }
        }

        export class UnlockSuccess {

        }

        export class UnlockFailure {
            constructor(readonly error: Error) {
            }
        }

        export class MigrationStarted {
            constructor(readonly planEntry: PlanEntry) {
            }
        }

        export class MigrationSkipped {
            constructor(readonly planEntry: PlanEntry) {
            }
        }

        export class MigrationFailed {
            constructor(readonly planEntry: PlanEntry, readonly error: Error) {
            }
        }

        export class MigrationFinished {
            constructor(readonly planEntry: PlanEntry) {
            }
        }
    }
}