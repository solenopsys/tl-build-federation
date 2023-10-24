import {BuildAdapter, logger, MappedPath, setBuildAdapter} from "@softarc/native-federation/src/build.js";
import {existsSync, readFileSync,readdirSync, renameSync, unlinkSync, writeFileSync} from "fs";
// @ts-ignore
import * as esbuild from "esbuild";
import {dirname} from "path";
const  federationConfig = "configurations/federation/base.cjs";


import {PluginItem, transformAsync} from "@babel/core";
import {getSupportedBrowsers} from "@angular-devkit/build-angular/src/utils/supported-browsers.js";
import {createCompilerPlugin} from "@angular-devkit/build-angular/src/tools/esbuild/angular/compiler-plugin.js";
import {BuildKind} from "@softarc/native-federation/src/lib/core/build-adapter.js";
import {transformSupportedBrowsersToTargets} from "@angular-devkit/build-angular/src/tools/esbuild/utils";

import {
    buildForFederation,
    FederationOptions,
    NormalizedFederationConfig
} from "@softarc/native-federation/src/build.js";
import * as process from "process";




export function loadEsmModule<T>(modulePath: string | URL): Promise<T> {
    return new Function('modulePath', `return import(modulePath);`)(
        modulePath
    ) as Promise<T>;
}

export function registerEsbuildAdapter(wsRoot: string, projectDid: string) {

    const esBuildAdapter: BuildAdapter = async (options) => {


        const {
            entryPoint,
            tsConfigPath,
            external,
            outfile,
            mappedPaths,
            kind,
            watch,
            dev
        } = options;

        await buildItem(entryPoint, tsConfigPath, external, outfile, mappedPaths, kind, projectDid, wsRoot);
    };

    setBuildAdapter(
        esBuildAdapter
    )
}


export async function link(outfile: string) {
    const code = readFileSync(outfile, 'utf-8');

    try {
        const linkerEsm = await loadEsmModule<{
            default: PluginItem
        }>(
            '@angular/compiler-cli/linker/babel'
        );

        const linker = linkerEsm.default;

        const result = await transformAsync(code, {
            filename: outfile,
            compact: true,
            configFile: false,
            babelrc: false,
            minified: true,
            browserslistConfigFile: false,
            plugins: [linker],
        });

        writeFileSync(outfile, result.code, 'utf-8');
    } catch (e) {
        logger.error('error linking');

        if (existsSync(`${outfile}.error`)) {
            unlinkSync(`${outfile}.error`);
        }
        renameSync(outfile, `${outfile}.error`);

        throw e;
    }
}


export async function buildItem(
    entryPoint: string,
    tsConfigPath: string,
    external: string[],
    outfile: string,
    mappedPaths: MappedPath[],
    kind: BuildKind,
    workingDir: string, wsRoot: string) {
    const logger = {}

    await runEsbuild(
        "scss",
        entryPoint,
        external,
        outfile,
        tsConfigPath,
        mappedPaths,
        workingDir,
        "warning",
        logger,
        wsRoot
    );

    if (kind === 'shared-package' && existsSync(outfile)) {
        console.log("Start likage shared-package ",outfile)
        await link(outfile);
        console.log("End likage ",outfile)
    }
}


export async function runEsbuild(
    inlineStyleLanguage: string,
    entryPoint: string,
    external: string[],
    outfile: string,
    tsConfigPath: string,
    mappedPaths: MappedPath[],
    absWorkingDir: string | undefined = undefined,
    logLevel: esbuild.LogLevel = 'warning',
    logger: any,
    wsRoot: string) {
    const dev = false
    const projectRoot = dirname(tsConfigPath);
    const browsers = getSupportedBrowsers(projectRoot, logger);
    const target = transformSupportedBrowsersToTargets(browsers);



    const config: esbuild.BuildOptions = {
        entryPoints: [entryPoint],
        absWorkingDir,
        external,
        outfile,
        logLevel,
        bundle: true,
        sourcemap: dev,
        minify: !dev,
        platform: 'browser',
        format: 'esm',
        target: ['esnext'],
        plugins: [
            createCompilerPlugin(
                {
                    jit: false,
                    sourcemap: dev,
                    tsconfig: tsConfigPath,
                    advancedOptimizations: !dev,
                    thirdPartySourcemaps: false,
                },
                {
                    optimization: !dev,
                    sourcemap: dev ? 'inline' : false,
                    workspaceRoot: wsRoot,
                    inlineStyleLanguage: inlineStyleLanguage,
                    target: target,
                    outputNames: {
                        bundles: "okBundles", // todo fix it
                        media: "okMedia" // todo fix it
                    }
                }
            ),


        ],
        define: {
            ngDevMode: dev ? 'true' : 'false',
            ngJitMode: 'false',
        },
    };


    await esbuild.build(config);

}




export function buildModule(fedConfig: NormalizedFederationConfig, externals: string[],outputPath:string){
    const workspaceRoot = process.cwd();
    registerEsbuildAdapter(workspaceRoot, workspaceRoot)




    const fedOptions: FederationOptions = {
        workspaceRoot: workspaceRoot,
        outputPath: outputPath,
        federationConfig: federationConfig,
        tsConfig: "tsconfig.json",
    }

  return   buildForFederation(
        fedConfig,
        fedOptions,
        externals
    )

}

const programArgument=process.argv[2];

if (!programArgument) {
    console.log("Missing argument: module name")
    process.exit(1)
}


const path = require('path');

// Get the current directory's path
const currentDir = process.cwd();

// Construct the full path to the helper.js module
const configPath ="file://"+ path.join(currentDir, federationConfig);

function findIndexFileByPrefix(distPath :string, prefix :string): string{

    try {
        const files = readdirSync(distPath);
        for (const file of files) {
            if (file.startsWith(prefix) && file.endsWith('.js')) {
                return file;
            }
        }
        return null; // Index file not found with the given prefix
    } catch (error) {
        return null;
    }
}

export async function  buildMicrofrontend(){
    const mod = await import(configPath)

    const {federationConfig, externals, name} = mod.load(  programArgument);
    const subDist = name.replace("@", "")

    const outputPath = "./dist/modules/" + subDist
    const res = await buildModule(federationConfig, externals,outputPath)

    const prefix=name.replace("@","_").replace("/","_").replace("-","_")
    
    const  indexFile = findIndexFileByPrefix(outputPath,prefix  )
    const resultCode:number = indexFile===null?1:0

    process.exit(resultCode);
}