import {Status} from "@pallad/migrator-core";
import chalk = require('chalk');

export function formatStatus(status: Status) {
    if (Status.isFinished(status)) {
        return chalk.green('finished');
    }

    if (Status.isPending(status)) {
        return chalk.blue('pending');
    }

    if (Status.isSkipped(status)) {
        return chalk.yellow('skipped');
    }
}