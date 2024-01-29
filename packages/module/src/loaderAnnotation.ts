export function loaderAnnotation() {
    return {
        name: NAME
    }
}

const NAME = '_@pallad/migrator/loader';
export namespace loaderAnnotation {
    export const PREDICATE = (x: unknown): x is { name: typeof NAME } => {
        // eslint-disable-next-line no-null/no-null
        return typeof x === 'object' && x !== null && 'name' in x && x.name === NAME
    }
}
