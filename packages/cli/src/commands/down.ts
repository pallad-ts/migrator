import {Command, flags} from "@oclif/command";
import {getMigrator} from "../getMigrator";
import {outputMigrationProcess} from "../outputMigratorProcess";
import {outputPlan} from "../outputPlan";

// eslint-disable-next-line import/no-default-export
export default class Down extends Command {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    static args = [
        {
            name: 'to',
            required: true
        }
    ];

    // eslint-disable-next-line @typescript-eslint/naming-convention
    static flags = {
        planOnly: flags.boolean({char: 'p'})
    };

    async run() {
        const {args, flags} = this.parse(Down);
        const migrator = await getMigrator();

        if (flags.planOnly) {
            outputPlan(this, await migrator.getPlan('down', args.to));
        } else {
            await outputMigrationProcess(this, await migrator.runTo('down', args.to));
            await migrator.stop();
        }
    }
}
