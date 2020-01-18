import {ErrorsDomain, generators} from "alpha-errors";

export const ERRORS = ErrorsDomain.create({
    codeGenerator: generators.formatCode('MIG_%d')
})
    .createErrors(create => {
        return {
            LOCK_ALREADY_CREATED: create('Lock already created'),
            RECORD_DUPLICATE: create('Record duplicate')
        };
    });