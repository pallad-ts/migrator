import {Migration} from "@pallad/migrator-core";
import {basename, extname} from 'path';

export function createMigrationFromModule(path: string) {
    const module = require(path);

    return new Migration.Simple(
        basename(path, extname(path)),
        module.up,
        module.down
    );
}