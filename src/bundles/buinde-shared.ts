import fs from "fs";
import path from "path";
import {PackageInfo, SharedInfo} from "../types";
import {BundleController} from "../toots/bundle-controller";


export async function bundleShared(
    bc: BundleController,
    packageInfos: PackageInfo[],
    externals: string[],
): Promise<Array<SharedInfo>> {
    fs.mkdirSync(bc.cachePath, {recursive: true});


    const allEntryPoints = packageInfos.map((pi) => {
        const encName = pi.packageName.replace(/[^A-Za-z0-9]/g, '_');
        if (!pi.version) throw new Error("No version found for " + pi.packageName)
        const encVersion = pi.version.replace(/[^A-Za-z0-9]/g, '_');
        const outName = `${encName}-${encVersion}.js`;
        return {fileName: pi.entryPoint, outName};
    });

    const entryPoints = allEntryPoints.filter(
        (ep) => !fs.existsSync(path.join(bc.cachePath, ep.outName))
    );

    try {
        await bc.bundle({
            entryPoints,
            tsConfigPath: bc.tsConfig,
            external: externals,
            outdir: bc.cachePath,
            mappedPaths: bc.mappedPaths,
            kind: 'shared-package',
            hash: false,
        });
    } catch (e) {
        console.error(e.message);
    }


    return packageInfos.map((pi) => {
        const outName = path.basename(allEntryPoints.find((ep) => ep.fileName === pi.entryPoint)?.outName || "")
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