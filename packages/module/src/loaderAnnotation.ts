export function loaderAnnotation() {
    return {
        name: NAME
    }
}

const NAME = '_@pallad/migrator/loader';
export namespace loaderAnnotation {
    export const PREDICATE = (x: any) => x && x.name === NAME
}