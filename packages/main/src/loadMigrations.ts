import {Loader} from "./Loader";
import {MigrationsList} from "./MigrationsList";
import {Migration} from "./Migration";

export async function loadMigrations(loaders: Loader[]) {
    const list = new MigrationsList();

    for (const loader of loaders) {
        const migrations = await loader();

        if (Array.isArray(migrations)) {
            for (const migration of migrations) {
                if (!Migration.is(migration)) {
                    throw new Error('One of loaded migrations does not look like migrations');
                }

                list.add(migration);
            }
        }
    }
    return list;
}