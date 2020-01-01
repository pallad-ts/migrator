import {Module as _Module, StandardActions} from '@pallad/modules';
import {Container, Definition, reference} from "alpha-dic";
import {References} from "./References";
import {predicate} from "./LoaderAnnotation";
import {createMigrator, Loader, StateManager} from "@pallad/migrator-core/src";

export class Module extends _Module<{ container: Container }> {
    readonly stateManageDefinition: Definition = Definition.create(References.MIGRATOR_STATE);

    constructor() {
        super('pallad/migrator');
    }

    init() {
        this.registerAction(StandardActions.INITIALIZATION, context => {
            context.container.registerDefinition(this.stateManageDefinition);

            context.container.definitionWithFactory(References.MIGRATOR, (
                loaders: Loader[],
                stateManager: StateManager
            ) => {
                return createMigrator({
                    loaders,
                    stateManager
                })
            })
                .withArgs(
                    reference.multi.annotation(predicate),
                    reference(References.MIGRATOR_STATE)
                )
        })
    }

    static create() {
        return new Module();
    }
}