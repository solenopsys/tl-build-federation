import {
    BuildAdapter,
    BuildAdapterOptions,
    EntryPoint,
    MappedPath,
    PackageInfo,
    SharedInfo
} from "./model";
import {createAngularBuildAdapter} from "./angular-esbuild-adapter";
import path from "path";
import fs from "fs";
import * as os from "os";

export class BuildController {
    adapter: BuildAdapter;

    constructor(private tsConfig: string, private cachePath: string, private mappedPaths: MappedPath[]) {
        const options = {
            workspaceRoot: process.cwd(),
            optimization: {},
            browsers: [],
            sourceMap: {},
        }

        this.adapter = createAngularBuildAdapter(options);
    }

    async bundle(options: BuildAdapterOptions) {
        return await this.adapter(options);
    }

    async buildMain(externals: string[],modulePath:string ) {
        let mainPath = "./dist/modules/"+modulePath;
        fs.mkdirSync(mainPath, {recursive: true})
        const entryPoints= [
            {
                fileName: "modules/"+modulePath+"/src/index.ts",
                outName: mainPath+"/index.js"
            }
        ]
        return this.bundle({
            entryPoints,
            tsConfigPath: this.tsConfig,
            external: externals,
            outdir: mainPath,
            mappedPaths: this.mappedPaths,
            kind: 'exposed',
            hash: false,
        });
    }

    async bundleShared(
        packageInfos: PackageInfo[],
        externals: string[],
    ): Promise<Array<SharedInfo>> {
        fs.mkdirSync(this.cachePath, {recursive: true});



        const allEntryPoints = packageInfos.map((pi) => {
            const encName = pi.packageName.replace(/[^A-Za-z0-9]/g, '_');
            if(!pi.version) throw new Error("No version found for "+pi.packageName)
            const encVersion = pi.version.replace(/[^A-Za-z0-9]/g, '_');
            const outName = `${encName}-${encVersion}.js`;
            return {fileName: pi.entryPoint, outName};
        });

        const entryPoints = allEntryPoints.filter(
            (ep) => !fs.existsSync(path.join(this.cachePath, ep.outName))
        );

        try {
            await this.bundle({
                entryPoints,
                tsConfigPath: this.tsConfig,
                external: externals,
                outdir: this.cachePath,
                mappedPaths: this.mappedPaths,
                kind: 'shared-package',
                hash: false,
            });
        } catch (e) {
            console.error(e.message);
        }


        return packageInfos.map((pi) => {
            const outName=path.basename(allEntryPoints.find((ep) => ep.fileName === pi.entryPoint)?.outName || "")
            return {
                packageName: pi.packageName,
                 outFileName: outName,
                // requiredVersion: shared.requiredVersion,
                // singleton: shared.singleton,
                // strictVersion: shared.strictVersion,
                // version: pi.version
            } as SharedInfo;
        });
    }
}







