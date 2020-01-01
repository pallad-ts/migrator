import * as is from 'predicates';
import packageJsonFinder = require('find-package-json');
import * as fs from 'fs';
import {Migrator} from "@pallad/migrator-core";

export function getMigrator() {
    return getMigratorFunction()();
}

export function getMigratorFunction(): () => Promise<Migrator> | Migrator {
    if (process.env.MIGRATOR_CONFIG) {
        return loadFromPath(process.env.MIGRATOR_CONFIG);
    }

    const packageInfo = packageJsonFinder().next();
    if (packageInfo.value) {
        const info = packageInfo.value;
        if ('migrator' in info) {
            is.assert(is.prop('migrator', String), '"migrator" option in package.json must be a string')(info);

            return loadFromPath(info.migrator);
        }
    }

    const fileCandidates = [
        './migratorConfig.ts',
        './migratorConfig.js'
    ];

    for (const file of fileCandidates) {
        if (fs.existsSync(file)) {
            return loadFromPath(file);
        }
    }

    throw new Error('Could not find migrator config');
}

function loadFromPath(path: string) {
    return getFuncFromModule(require(path), path);
}

function getFuncFromModule(module: any, path: string) {
    if (is.func(module)) {
        return module;
    }

    if (!is.hasProperty('default', module)) {
        throw new Error(`There is no default export or module is not a function at path: ${path} `);
    }

    if (!is.func(module.default)) {
        throw new Error(`Default export in "${path}" is not a function`);
    }

    return module.default;
}