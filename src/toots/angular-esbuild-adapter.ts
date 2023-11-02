import * as esbuild from 'esbuild';
import * as fs from 'fs';
import * as path from 'path';
import {createCompilerPlugin} from '@angular-devkit/build-angular/src/tools/esbuild/angular/compiler-plugin';
import {transformSupportedBrowsersToTargets} from '@angular-devkit/build-angular/src/tools/esbuild/utils';
import {createCompilerPluginOptions} from '@angular-devkit/build-angular/src/tools/esbuild/compiler-plugin-options';
import {findTailwindConfigurationFile} from '@angular-devkit/build-angular/src/utils/tailwind';
import {normalizeOptimization, normalizeSourceMaps} from '@angular-devkit/build-angular/src/utils';
import {createRequire} from 'node:module';
import {createSharedMappingsPlugin} from './shared-mappings-plugin';
import {PluginItem, transformAsync} from '@babel/core';
import {BuildAdapter, BuildKind, Result, EntryPoint, MappedPath, PluginOptions} from "../types";

export function createAngularBuildAdapter(
    pluginOptions: PluginOptions
): BuildAdapter {
    return async (options) => {
        const {
            entryPoints,
            tsConfigPath,
            external,
            outdir,
            mappedPaths,
            kind,
            watch,
            hash,
        } = options;

        const files = await runEsbuild(
            pluginOptions,
            entryPoints,
            external,
            outdir,
            tsConfigPath,
            mappedPaths,
            watch,
            hash
        );

        if (kind === 'shared-package') {
            const scriptFiles = files.filter(
                (f) => f.endsWith('.js') || f.endsWith('.mjs')
            );
            for (const file of scriptFiles) {
                link(file);
            }
        }

        return files.map((fileName) => ({fileName} as Result));
    };

    async function link(outfile: string) {
        console.log("LINKAGE", outfile)
        const dev =false;
        const code = fs.readFileSync(outfile, 'utf-8');

        try {
            const linkerEsm = await loadEsmModule<{
                default: PluginItem
            }>(
                '@angular/compiler-cli/linker/babel'
            );

            const linker = linkerEsm.default;

            const result = await transformAsync(code, {
                filename: outfile,
                compact: !dev,
                configFile: false,
                babelrc: false,
                minified: !dev,
                browserslistConfigFile: false,
                plugins: [linker],
            });

            fs.writeFileSync(outfile, result.code, 'utf-8');
        } catch (e) {
            console.error('error linking');

            if (fs.existsSync(`${outfile}.error`)) {
                fs.unlinkSync(`${outfile}.error`);
            }
            fs.renameSync(outfile, `${outfile}.error`);

            throw e;
        }
    }
}

async function runEsbuild(
    options: PluginOptions,
    entryPoints: EntryPoint[],
    external: string[],
    outdir: string,
    tsConfigPath: string,
    mappedPaths: MappedPath[],
    watch?: boolean,
    dev?: boolean,
    kind?: BuildKind,
    hash = false,
    plugins: esbuild.Plugin[] | null = null,
    absWorkingDir: string | undefined = undefined,
    logLevel: esbuild.LogLevel = 'warning'
) {
    const projectRoot = path.dirname(tsConfigPath);
    const target = transformSupportedBrowsersToTargets(options.browsers);

    const workspaceRoot = options.workspaceRoot;

    const optimizationOptions = normalizeOptimization(
        options.optimization
    );
    const sourcemapOptions = normalizeSourceMaps(options.sourceMap);
    const tailwindConfigurationPath = await findTailwindConfigurationFile(
        workspaceRoot,
        projectRoot
    );

    const fullProjectRoot = path.join(workspaceRoot, projectRoot);
    const resolver = createRequire(fullProjectRoot + '/');

    const tailwindConfiguration = tailwindConfigurationPath
        ? {
            file: tailwindConfigurationPath,
            package: resolver.resolve('tailwindcss'),
        }
        : undefined;

    const outputNames = {
        bundles: '[name]',
        media: 'media/[name]',
    };

    let fileReplacements: Record<string, string> | undefined;


    const pluginOptions = createCompilerPluginOptions(
        {
            workspaceRoot,
            optimizationOptions,
            sourcemapOptions,
            tsconfig: tsConfigPath,
            outputNames,
            //   fileReplacements,
            externalDependencies: external,
            //   preserveSymlinks: builderOptions.preserveSymlinks,
            //   stylePreprocessorOptions: builderOptions.stylePreprocessorOptions,
            advancedOptimizations: !dev,
            // inlineStyleLanguage: builderOptions.inlineStyleLanguage,
            jit: false,
            tailwindConfiguration,
        } as any,
        target,
        undefined
    );

    const config: esbuild.BuildOptions = {
        entryPoints: entryPoints.map((ep) => ({
            in: ep.fileName,
            out: path.parse(ep.outName).name,
        })),
        outdir,
        entryNames: hash ? '[name]-[hash]' : '[name]',
        write: false,
        absWorkingDir,
        external,
        logLevel,
        bundle: true,
        sourcemap: dev,
        minify: !dev,
        supported: {
            'async-await': false,
            'object-rest-spread': false,
        },
        platform: 'browser',
        format: 'esm',
        target: ['esnext'],
        //@ts-ignore
        plugins: plugins || [
            createCompilerPlugin(
                pluginOptions.pluginOptions,
                pluginOptions.styleOptions
            ),
            ...(mappedPaths && mappedPaths.length > 0
                ? [createSharedMappingsPlugin(mappedPaths)]
                : []),
        ],
        define: {
            ...(!dev ? {ngDevMode: 'false'} : {}),
            ngJitMode: 'false',
        },
    };

    const ctx = await esbuild.context(config);
    const result = await ctx.rebuild();


    return writeResult(result, outdir, false);
}

function writeResult(
    result: esbuild.BuildResult<esbuild.BuildOptions>,
    outdir: string,
    memOnly: boolean
) {
    const writtenFiles: string[] = [];

    for (const outFile of result.outputFiles) {
        const fileName = path.basename(outFile.path);
        const filePath = path.join(outdir, fileName);
        if (!memOnly) {
            fs.writeFileSync(filePath, outFile.text);
        }
        writtenFiles.push(filePath);
    }

    return writtenFiles;
}


export function loadEsmModule<T>(modulePath: string | URL): Promise<T> {
    return new Function('modulePath', `return import(modulePath);`)(
        modulePath
    ) as Promise<T>;
}
