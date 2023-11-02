import fs from "fs";
import {BundleController} from "../toots/bundle-controller";
import {Result} from "../types";

export async function bundleMain(bc: BundleController, externals: string[], modulePath: string):Promise< Result[]> {
    let mainPath = "./dist/modules/" + modulePath;
    fs.mkdirSync(mainPath, {recursive: true})
    const entryPoints = [
        {
            fileName: "modules/" + modulePath + "/src/index.ts",
            outName: mainPath + "/index.js"
        }
    ]
    return bc.bundle({
        entryPoints,
        tsConfigPath: bc.tsConfig,
        external: externals,
        outdir: mainPath,
        mappedPaths: bc.mappedPaths,
        kind: 'exposed',
        hash: false,
    });
}