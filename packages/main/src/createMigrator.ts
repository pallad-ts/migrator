import {Loader} from "./Loader";
import {StateManager} from "./StateManager";
import {Migrator} from "./Migrator";
import {loadMigrations} from "./loadMigrations";

export async function createMigrator(options: MigratorOptions) {
    const migrations = await loadMigrations(options.loaders);
    return new Migrator(migrations, options.stateManager);
}

export interface MigratorOptions {
    loaders: Loader[];
    stateManager: StateManager;
}