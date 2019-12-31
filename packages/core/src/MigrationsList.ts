import {Migration} from "./Migration";

export class MigrationsList {
    private migrations: Migration[] = [];
    private migrationsSet: Set<string> = new Set();

    add(migration: Migration): this {
        if (this.migrationsSet.has(migration.name)) {
            return this;
        }
        this.migrations.push(migration);
        this.migrationsSet.add(migration.name);
        return this;
    }

    getSorted(): Migration[] {
        return this.migrations.sort((a, b) => {
            return a.name.localeCompare(b.name);
        });
    }
}