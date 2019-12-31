import * as glob from 'glob';
import {Migration} from "@pallad/migrator-core";
import {createMigrationFromModule} from "./createMigrationFromModule";

export function loader(options: loader.Options.FromUser) {
    const opts: loader.Options = {
        directories: options.directories,
        extensions: options.extensions || ['js']
    };

    opts.extensions = opts.extensions.map(x => x.replace(/\./, '').trim());

    return function () {

        const extPattern = opts.extensions.length === 1 ? opts.extensions[0] : `{${opts.extensions.join(',')}}`;
        const pattern = `*.${extPattern}`;

        const migrations: Migration[] = [];

        for (const directory of opts.directories) {
            const result = glob.sync(pattern, {
                cwd: directory,
                nodir: true,
                realpath: true
            });

            for (const entry of result) {
                migrations.push(createMigrationFromModule(entry));
            }
        }
        return migrations;
    }
}

export namespace loader {
    export interface Options {
        directories: string[];
        extensions: string[];
    }

    export namespace Options {
        export type FromUser = Required<Pick<Options, 'directories'>> &
            Partial<Pick<Options, 'extensions'>>;
    }
}