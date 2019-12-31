import * as path from 'path';
import {loader} from "@src/loader";

describe('loader', () => {
    it('typescript', async () => {
        const loaded = await loader({
            directories: [
                path.join(__dirname, './fixtures/case_ts')
            ],
            extensions: ['ts', 'js']
        })();

        expect(loaded)
            .toEqual([
                {name: '02_migration', up: expect.any(Function), down: expect.any(Function)},
                {name: '04_migration2', up: expect.any(Function), down: undefined}
            ]);
    });

    it('javascript', async () => {
        const loaded = await loader({
            directories: [
                path.join(__dirname, './fixtures/case_js')
            ],
            extensions: ['js']
        })();

        expect(loaded)
            .toEqual([
                {name: '01_migration', up: expect.any(Function), down: expect.any(Function)},
                {name: '03_migration2', up: expect.any(Function), down: undefined}
            ]);
    });

    it('mixed', async () => {

        const loaded = await loader({
            directories: [
                path.join(__dirname, './fixtures/case_js'),
                path.join(__dirname, './fixtures/case_ts'),
            ],
            extensions: ['js', 'ts']
        })();

        expect(loaded)
            .toEqual([
                {name: '01_migration', up: expect.any(Function), down: expect.any(Function)},
                {name: '03_migration2', up: expect.any(Function), down: undefined},
                {name: '02_migration', up: expect.any(Function), down: expect.any(Function)},
                {name: '04_migration2', up: expect.any(Function), down: undefined}
            ]);
    });
});