import {Module as _Module, StandardActions} from '@pallad/modules';
import {Container, Definition, reference} from "@pallad/container";
import {References} from "./References";
import {createMigrator, Loader, Migrator, StateManager} from "@pallad/migrator-core";
import {loaderAnnotation} from "./loaderAnnotation";

export class Module extends _Module<{ container: Container }> {
    constructor(private options: Module.Options) {
        super('@pallad/migrator');
    }

    init() {
        this.registerAction(StandardActions.INITIALIZATION, ({container}) => {

            container.registerDefinition(
                Definition.useFactory(() => {
                    return this.options.stateManagerFactory();
                }, References.MIGRATOR_STATE)
            )

            container.registerDefinition(
                Definition.useFactory((loaders: Loader[],
                                       stateManager: StateManager) => {
                    return createMigrator({
                        loaders,
                        stateManager,
                        ...this.options
                    })
                }, {name: References.MIGRATOR})
                    .withArguments(
                        reference.multi.annotation(loaderAnnotation.PREDICATE),
                        reference(References.MIGRATOR_STATE)
                    )
            )

        })
    }
}

export namespace Module {
    export interface Options {
        stateManagerFactory: () => Promise<StateManager> | StateManager;
        observers?: Migrator.Options['observers']
    }
}
