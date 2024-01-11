import {Domain, formatCodeFactory, ErrorDescriptor} from '@pallad/errors';

const code = formatCodeFactory("MIG_%c");

export const errorsDomain = new Domain();
export const ERRORS = errorsDomain.addErrorsDescriptorsMap({
    LOCK_ALREADY_CREATED: ErrorDescriptor.useDefaultMessage(code(1), 'Lock already created'),
    RECORD_DUPLICATE: ErrorDescriptor.useDefaultMessage(code(2), 'Record duplicate')
});
