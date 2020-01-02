import {Command, flags} from "@oclif/command";
import {getMigrator} from "../getMigrator";
import {outputMigrationProcess} from "../outputMigratorProcess";
import {outputPlan} from "../outputPlan";

export default class Down extends Command {
    static args = [
        {
            name: 'to',
            required: true
        }
    ];

    static flags = {
        planOnly: flags.boolean({char: 'p'})
    };

    async run() {
        const {args, flags} = this.parse(Down);
        const migrator = await getMigrator();

        if (flags.planOnly) {
            outputPlan(this, await migrator.getPlan('down', args.to));
        } else {
            outputMigrationProcess(this, await migrator.runTo('down', args.to));
        }

        await migrator.stop();
    }
}