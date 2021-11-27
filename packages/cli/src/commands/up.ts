import {Command, flags} from "@oclif/command";
import {getMigrator} from "../getMigrator";
import {outputMigrationProcess} from "../outputMigratorProcess";
import {outputPlan} from "../outputPlan";

// eslint-disable-next-line import/no-default-export
export default class Up extends Command {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    static args = [
        {name: 'to'}
    ];

    // eslint-disable-next-line @typescript-eslint/naming-convention
    static flags = {
        planOnly: flags.boolean({char: 'p'}),
    };

    async run() {
        const {args, flags} = this.parse(Up);
        const migrator = await getMigrator();

        if (flags.planOnly) {
            outputPlan(this, await migrator.getPlan('up', args.to));
        } else {
            await outputMigrationProcess(this, await migrator.runTo('up', args.to))
            await migrator.stop();
        }
    }
}
