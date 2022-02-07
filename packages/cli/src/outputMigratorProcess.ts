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
                if (value.type === 'lock-success') {
                    cmd.log('Successfully gained lock for migration');
                } else if (value.type === 'lock-failure') {
                    cmd.error('Could not lock migration. Another migration in progress', {exit: 1});
                } else if (value.type === 'unlock-success') {
                    cmd.log('Successfully removed lock');
                } else if (value.type === 'unlock-failure') {
                    cmd.error(`Could not unlock migration. Fatal error: ${value.error.message}`);
                } else if (value.type === 'migration-started') {
                    hadMigrations = true;
                    cmd.log('%s - %s: %s', value.planEntry.migration.name, value.planEntry.direction, chalk.cyan('started'));
                } else if (value.type === 'migration-finished') {
                    cmd.log('%s - %s: %s', value.planEntry.migration.name, value.planEntry.direction, formatStatus('finished'))
                } else if (value.type === 'migration-skipped') {
                    cmd.log('%s - %s: %s', value.planEntry.migration.name, value.planEntry.direction, formatStatus('skipped'))
                } else if (value.type === 'migration-failed') {
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
