import * as is from 'predicates';

export abstract class Migration {
    readonly name!: string;

    abstract up(): Promise<any> | any;

    abstract down?(): Promise<any> | any;
}

const isMigration = is.struct({
    up: Function,
    down: is.undefinedOr(Function),
    name: String
});

export namespace Migration {
    export const SKIP = '__skip';

    export function isSkip(result: any) {
        return result === SKIP;
    }

    export function is(value: any): value is Migration {
        return isMigration(value);
    }
}