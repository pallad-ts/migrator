import {Command} from "@oclif/command";
import {getMigrator} from "../getMigrator";
import {formatStatus} from "../formatStatus";

export default class Status extends Command {
    async run() {
        const migrator = await getMigrator();
        const state = await migrator.getState();
        for (const entry of state) {
            this.log(`${entry.migration.name} - ${formatStatus(entry.status)}`);
        }
    }
}