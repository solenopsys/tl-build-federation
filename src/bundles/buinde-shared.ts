import fs from "fs";
import path from "path";
import {EntryPoint, PackageInfo, SharedInfo} from "../types";
import {BundleController} from "../toots/bundle-controller";
import * as os from "os";
import {loadSharedLibs, loadSharedMap} from "../toots/pinning";
import {loadFileFromIpfs} from "../toots/ipfs";


function saveUploadFile(ep: EntryPoint[]) {
    const fs = require('fs');
    const dir = ".xs";
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
    }
    let file = dir + "/to-upload.json";

    let forUpload: {
        [packName: string]: string
    } = {};

    if(fs.existsSync(file)){
        let json = fs.readFileSync(file, 'utf8');
        forUpload = JSON.parse(json);
    }

    for (const e of ep) {
        forUpload[e.packageName] = e.outName
    }

    let jsonString = JSON.stringify(forUpload, null, 2);
    return fs.writeFileSync(file, jsonString, 'utf8');
}

async function tryDownloadFromRemote(entryPoints: EntryPoint[]): Promise<EntryPoint[]> {
    const toGenerate: EntryPoint[] = []

    if (entryPoints.length > 0) {
        const map = await loadSharedMap()

        for (const ep of entryPoints) {

            const existsInRemote = map[ep.outName]
            if (existsInRemote) {
                console.log("Download library", ep)
                await loadFileFromIpfs(existsInRemote,"./dist/shared/"+ ep.outName); //todo const
            } else {
                toGenerate.push(ep)
            }
        }
    }

    return toGenerate
}

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
        return {fileName: pi.entryPoint, outName, packageName: pi.packageName};
    });

    const entryPoints = allEntryPoints.filter(
        (ep) => !fs.existsSync(path.join(bc.cachePath, ep.outName))
    );

    const toGenerate = await tryDownloadFromRemote(entryPoints)

    saveUploadFile(toGenerate);


    try {
        await bc.bundle({
            entryPoints: toGenerate,
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