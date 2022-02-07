import {Loader} from "./Loader";
import {StateManager} from "./StateManager";
import {Migrator} from "./Migrator";
import {loadMigrations} from "./loadMigrations";

export async function createMigrator({stateManager, loaders, ...options}: MigratorOptions) {
    const migrations = await loadMigrations(loaders);
    return new Migrator(migrations, stateManager, options);
}

export interface MigratorOptions extends Migrator.Options {
    loaders: Loader[];
    stateManager: StateManager;
}
