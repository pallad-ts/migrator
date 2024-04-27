import * as is from 'predicates';
import packageJsonFinder = require('find-package-json');
import * as fs from 'fs';
import {Migrator} from "@pallad/migrator-core";
import {pathToFileURL} from "node:url";

export async function getMigrator(): Promise<Migrator> {
    const migratorFunction = await getMigratorFunction();

    const migrator = await migratorFunction();
    if (!(migrator instanceof Migrator)) {
        throw new Error('Returned object is not a Migrator instance');
    }

    return migrator;
}

export async function getMigratorFunction(): Promise<() => unknown> {
    if (process.env.MIGRATOR_CONFIG) {
        return loadFromPath(process.env.MIGRATOR_CONFIG);
    }

    const packageInfo = packageJsonFinder().next();
    if (packageInfo.value) {
        const info = packageInfo.value;
        if ('migrator' in info) {
            is.assert(is.prop('migrator', String), '"migrator" option in package.json must be a string')(info);

            const realPath = fs.realpathSync(info.migrator);
            return loadFromPath(realPath);
        }
    }

    const fileCandidates = [
        './migratorConfig.ts',
        './migratorConfig.js'
    ];

    for (const file of fileCandidates) {
        if (fs.existsSync(file)) {
            const realPath = fs.realpathSync(file);
            return loadFromPath(realPath);
        }
    }

    throw new Error('Could not find migrator config');
}


async function loadFromPath(path: string) {
    const module = await loadModule(path);
    return getFuncFromModule(module, path);
}

// this is highly inspired from https://github.com/cosmiconfig/cosmiconfig/blob/main/src/loaders.ts
async function loadModule(modulePath: string): Promise<unknown> {
    const realModulePath = fs.realpathSync(modulePath);
    try {
        const fileUrl = pathToFileURL(realModulePath);
        return await import(fileUrl.href);
    } catch (error) {
        try {
            return require(realModulePath);
        } catch (requireError: unknown) {
            if (
                (requireError instanceof Error && (requireError as any).code === "ERR_REQUIRE_ESM") ||
                (requireError instanceof SyntaxError &&
                    requireError.toString().includes("Cannot use import statement outside a module"))
            ) {
                throw error;
            }

            throw requireError;
        }
    }
}

function getFuncFromModule(module: unknown, path: string): () => unknown {
    if (is.func(module)) {
        return module as () => unknown
    }

    // eslint-disable-next-line no-null/no-null
    if (typeof module === 'object' && module !== null) {
        if (!('default' in module)) {
            throw new Error(`There is no default export or module is not a function at path: ${path} `);
        }

        if (!is.func(module.default)) {
            throw new Error(`Default export in "${path}" is not a function`);
        }

        return module.default as () => unknown;
    }

    throw new Error(`Module at path "${path}" is not a function`);
}
