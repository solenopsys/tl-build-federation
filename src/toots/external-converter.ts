import {PackageInfo} from "../types";
import {extractParamsFromNodeModule} from "./extractors";


export function externalConvert(externals: string[]) {


    const mappedPaths = []
    const packageInfos: PackageInfo[] = []

    for (const packageName of externals) {
        const {version, file} = extractParamsFromNodeModule(packageName);
        packageInfos.push({
            packageName,
            version,
            entryPoint: file,
            esm: true
        })

        mappedPaths.push({
            key: packageName,
            path: file
        });
    }

    return {packageInfos, mappedPaths}
}