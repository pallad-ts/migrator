import {Module as _Module, StandardActions} from '@pallad/modules';
import {Container, reference} from "alpha-dic";
import {References} from "./References";
import {createMigrator, Loader, Migrator, StateManager} from "@pallad/migrator-core";
import {loaderAnnotation} from "./loaderAnnotation";

export class Module extends _Module<{ container: Container }> {
    constructor(private options: Module.Options) {
        super('@pallad/migrator');
    }

    init() {
        this.registerAction(StandardActions.INITIALIZATION, context => {
            context.container.definitionWithFactory(References.MIGRATOR_STATE, () => {
                return this.options.stateManagerFactory();
            });

            context.container.definitionWithFactory(References.MIGRATOR, (
                loaders: Loader[],
                stateManager: StateManager
            ) => {
                return createMigrator({
                    loaders,
                    stateManager,
                    ...this.options
                })
            })
                .withArgs(
                    reference.multi.annotation(loaderAnnotation.PREDICATE),
                    reference(References.MIGRATOR_STATE)
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
