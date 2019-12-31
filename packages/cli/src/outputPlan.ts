import {PlanEntry} from "@pallad/migrator-core";
import {Command} from "@oclif/command";
import * as chalk from "chalk";

export function outputPlan(cmd: Command, plan: PlanEntry[]) {
    if (plan.length === 0) {
        cmd.log(chalk.blue('No migrations'));
    } else {
        for (const entry of plan) {
            cmd.log(`${entry.migration.name} - ${entry.direction}`);
        }
    }
}