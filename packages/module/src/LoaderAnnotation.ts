export function LoaderAnnotation() {
    return {
        name: NAME
    }
}

const NAME = 'migrator-loader';
export const predicate = (x: any) => x && x.name === NAME;