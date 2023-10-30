import {PackageInfo, SharedInfo} from "./microfrontend/types";
import {BuildController} from "./microfrontend/build-controller";
import {extractParamsFromNodeModule, extractSharedFromPackageJson} from "./microfrontend/extractors";

export class MicroFrontendBuilder implements BuilderInterface {

    private modulePath: string;
    constructor( moduleName: string) {
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
        let sharedInfos = await bc.bundleShared(packageInfos, externals);

        const sharedPath = "./dist/shared/"
        const results = await bc.buildMain(
            externals,
            module
        )

        return sharedInfos
    }


    build(): Promise<any> {
        const PACKAGE_JSON = "package.json"
        const modulePathDir = "./modules/" +this.modulePath;
        const modulePackageJsonPath = modulePathDir + "/"+PACKAGE_JSON
        const sharedMain = extractSharedFromPackageJson("./"+PACKAGE_JSON)
        const sharedProject = extractSharedFromPackageJson(modulePackageJsonPath)
        const externals = [...sharedMain, ...sharedProject]

        console.log("SHARED", externals)
        return this.runBuilder(this.modulePath, externals)
    }

}