import {
    BuildAdapter,
    buildForFederation,
    FederationOptions,
    logger,
    MappedPath,
    NormalizedFederationConfig,
    setBuildAdapter
} from "@softarc/native-federation/src/build.js";
import {EntryPoint} from "@softarc/native-federation/src/lib/core/build-adapter.d";

import fs, {existsSync, readdirSync, readFileSync, renameSync, unlinkSync, writeFileSync} from "fs";
// @ts-ignore
import * as esbuild from "esbuild";
import * as os from "os";
import path, {dirname} from "path";
import {PluginItem, transformAsync} from "@babel/core";
import {getSupportedBrowsers} from "@angular-devkit/build-angular/src/utils/supported-browsers.js";
import {createCompilerPlugin} from "@angular-devkit/build-angular/src/tools/esbuild/angular/compiler-plugin.js";
import {BuildKind} from "@softarc/native-federation/src/lib/core/build-adapter.js";
import {transformSupportedBrowsersToTargets} from "@angular-devkit/build-angular/src/tools/esbuild/utils";
import * as process from "process";
// Get the current directory's path
const currentDir = process.cwd();

// Construct the full path to the helper.js module


const FEDERATION_CONFIG = "configurations/federation/base.cjs";

export type SharedInfo = {
    singleton: boolean;
    strictVersion: boolean;
    requiredVersion: string;
    version?: string;
    packageName: string;
    outFileName: string;
    dev?: {
        entryPoint: string;
    };
};


export interface FederationInfo {
    name: string;
    shared: SharedInfo[];
}

async function  loadEsmModule<T>(modulePath: string | URL): Promise<T> {
    return new Function('modulePath', `return import(modulePath);`)(
        modulePath
    ) as Promise<T>;
}


export class MicroFrontendBuilder implements Builder { //todo

    constructor(private moduleName: string) {
    }




    registerEsbuildAdapter(wsRoot: string, projectDid: string) {

        const esBuildAdapter: BuildAdapter = async (options): Promise<BuildAdapter | any> => {


            const {
                entryPoints,
                tsConfigPath,
                external,
                outdir,
                mappedPaths,
                kind,
                watch,
                dev
            } = options;

            console.log("OPTIONS", options)

            const entry=projectDid+"/modules/"+this.moduleName+"/src/index.ts"

            await this.buildItem(entry, tsConfigPath, external, outdir, mappedPaths, kind, projectDid, wsRoot);
        };

        setBuildAdapter(
            esBuildAdapter
        )
    }


    async link(outfile: string) {
        const code = readFileSync(outfile, 'utf-8');

        try {
            const linkerEsm = await  loadEsmModule<{
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


    async buildItem(
        entryPoint: string ,
        tsConfigPath: string,
        external: string[],
        outdir: string,
        mappedPaths: MappedPath[],
        kind: BuildKind,
        workingDir: string, wsRoot: string) {
        const logger = {}

        console.log("ENTRY POINTS", tsConfigPath)

        await this.runEsbuild(
            "scss",
            entryPoint,
            external,
            outdir,
            tsConfigPath,
            mappedPaths,
            workingDir,
            "warning",
            logger,
            wsRoot
        );

        if (kind === 'shared-package' && existsSync(outdir)) {
            console.log("Start likage shared-package ", outdir)
            await this.link(outdir);
            console.log("End likage ", outdir)
        }
    }




    async runEsbuild(
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




    buildModule(fedConfig: NormalizedFederationConfig, externals: string[], outputPath: string) {
        const workspaceRoot = process.cwd();
        this.registerEsbuildAdapter(workspaceRoot, workspaceRoot)


        const fedOptions: FederationOptions = {
            workspaceRoot: workspaceRoot,
            outputPath: outputPath,
            federationConfig: FEDERATION_CONFIG,
            tsConfig: "tsconfig.json",
        }

        return buildForFederation(
            fedConfig,
            fedOptions,
            externals
        )

    }




    findIndexFileByPrefix(distPath: string, prefix: string): string {

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


    convertTempMicroFrontend(tempOutputPath: string, outputPath: string) {
        const fileName = tempOutputPath + "/" + "remoteEntry.json"
        const fedInfo: FederationInfo = JSON.parse(readFileSync(fileName, 'utf-8'));
        for (const shared of fedInfo.shared) {
            const name = shared.outFileName
            if (fedInfo.name !== name) {
                const sharedDir = "./dist/shared/";
                fs.mkdirSync(sharedDir,{recursive: true})
                fs.copyFileSync(tempOutputPath + "/" + name, sharedDir + name)
            } else {
                fs.copyFileSync(tempOutputPath + "/" + name, outputPath + "/index.js")
            }
        }
    }

    build(): Promise<any> {
        return this.buildMicroFrontend();
    }


    async buildMicroFrontend() {
        const configPath = "file://" + path.join(currentDir, FEDERATION_CONFIG);

        const mod = await import(configPath)

        const {federationConfig, externals, name} = mod.load(this.moduleName);
        const subDist = name.replace("@", "")

        const tempOutputPath = path.join(os.tmpdir(), subDist)
        const outputPath = "./dist/modules/" + subDist
        federationConfig.entryPoints=[
            {
                fileName: "./" + this.moduleName + "/index.ts",
                outputName: name,
            }
        ]
        const res = await this.buildModule(federationConfig, externals, outputPath)

        const prefix = name.replace("@", "_").replace("/", "_").replace("-", "_")

        const indexFile = this.findIndexFileByPrefix(tempOutputPath, prefix)

        if (indexFile !== null) {
            this.convertTempMicroFrontend(tempOutputPath, outputPath)
            process.exit(0);
        } else {
            process.exit(1);
        }
    }
}