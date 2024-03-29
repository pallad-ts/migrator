import {Command} from "@oclif/core";
import {getMigrator} from "../getMigrator";
import {formatStatus} from "../formatStatus";

// eslint-disable-next-line import/no-default-export
export default class Status extends Command {
    async run() {
        const migrator = await getMigrator();
        const state = await migrator.getState();
        for (const entry of state) {
            this.log(`${entry.migration.name} - ${formatStatus(entry.status)}`);
        }

        await migrator.stop();
    }
}
