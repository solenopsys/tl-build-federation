import {PackageInfo, SharedInfo} from "./microfrontend/types";
import {BuildController} from "./microfrontend/build-controller";
import {extractParamsFromNodeModule, extractSharedFromPackageJson} from "./microfrontend/extractors";
import fs from "fs";

function sharedInfosToImportMapJson(sharedInfos: SharedInfo[]):{imports:{[name:string]:string}} {
    const imports:{[name:string]:string} = {}
    for (const sharedInfo of sharedInfos) {
        imports[sharedInfo.packageName] ="/shared/"+ sharedInfo.outFileName
    }
    return {
        imports
    }
}

export class MicroFrontendBuilder implements BuilderInterface {

    private modulePath: string;
    constructor(private moduleName: string) {
        this.modulePath = moduleName.replace("@", "")
    }

    async  runBuilder(module: string, externals: string[]):Promise<SharedInfo[]> {

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

        const bc = new BuildController("./tsconfig.json", "./dist/shared/", mappedPaths)
        let sharedInfos:SharedInfo[] = await bc.bundleShared(packageInfos, externals);

        const results = await bc.buildMain(
            externals,
            module
        )



        console.log("Results", results)


        const importMapPath = "./dist/modules/"+this.modulePath+"/importmap.json"

        const  importMapObj:{imports:{[name:string]:string}} = sharedInfosToImportMapJson(sharedInfos);

        importMapObj.imports[this.moduleName]="/modules/"+this.modulePath+"/index.js"

        console.log("Result importMap", importMapObj)

        fs.writeFileSync(importMapPath, JSON.stringify(importMapObj, null, 2));

        return sharedInfos
    }


    build(): Promise<any> {
        const PACKAGE_JSON = "package.json"
        const modulePathDir = "./modules/" +this.modulePath;
        const modulePackageJsonPath = modulePathDir + "/"+PACKAGE_JSON
        const sharedMain = extractSharedFromPackageJson("./"+PACKAGE_JSON)
        const sharedProject = extractSharedFromPackageJson(modulePackageJsonPath)
        const externals = [...sharedMain, ...sharedProject]


        return this.runBuilder(this.modulePath, externals)
    }

}