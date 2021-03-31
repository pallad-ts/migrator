import {Command} from "@oclif/command";
import {Migrator} from "@pallad/migrator-core";
import chalk = require('chalk');
import {formatStatus} from "./formatStatus";

type Awaited<T> = T extends PromiseLike<infer U> ? Awaited<U> : T;

export function outputMigrationProcess(cmd: Command, observer: Awaited<ReturnType<typeof Migrator.prototype['runTo']>>) {
    let hadMigrations = false;

    return new Promise((resolve, reject) => {
        observer.subscribe({
            next(value: Migrator.Progress) {
                if (value instanceof Migrator.Progress.LockSuccess) {
                    cmd.log('Successfully gained lock for migration');
                } else if (value instanceof Migrator.Progress.LockFailure) {
                    cmd.error('Could not lock migration. Another migration in progress', {exit: 1});
                } else if (value instanceof Migrator.Progress.UnlockSuccess) {
                    cmd.log('Successfully removed lock');
                } else if (value instanceof Migrator.Progress.UnlockFailure) {
                    cmd.error(`Could not unlock migration. Fatal error: ${value.error.message}`);
                } else if (value instanceof Migrator.Progress.MigrationStarted) {
                    hadMigrations = true;
                    cmd.log('%s - %s: %s', value.planEntry.migration.name, value.planEntry.direction, chalk.cyan('started'));
                } else if (value instanceof Migrator.Progress.MigrationFinished) {
                    cmd.log('%s - %s: %s', value.planEntry.migration.name, value.planEntry.direction, formatStatus('finished'))
                } else if (value instanceof Migrator.Progress.MigrationSkipped) {
                    cmd.log('%s - %s: %s', value.planEntry.migration.name, value.planEntry.direction, formatStatus('skipped'))
                } else if (value instanceof Migrator.Progress.MigrationFailed) {
                    cmd.log('%s - %s: %s', value.planEntry.migration.name, value.planEntry.direction, chalk.red('failed'));
                    cmd.error(value.error);
                }
            },
            complete() {
                if (hadMigrations) {
                    cmd.log(chalk.magenta('Completed'));
                } else {
                    cmd.log(chalk.blue('No migrations to run'));
                }
                resolve(undefined);
            },
            error(e: Error) {
                cmd.error(e);
                reject(e);
            }
        })
    });
}