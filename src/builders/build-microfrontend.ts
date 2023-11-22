import {BuilderInterface, PACKAGE_JSON, Result} from "../types";
import {extractSharedFromPackageJson} from "../toots/extractors";
import fs from "fs";
import {bundleMain} from "../bundles/bundle-main";
import {SharedBuilder} from "./build-shared";
import {BundleController} from "../toots/bundle-controller";
import {externalConvert} from "../toots/external-converter";
import {sharedInfosToImportMapJson} from "../toots/convertors";


export class MicroFrontendBuilder implements BuilderInterface<Result[]> {

    private modulePath: string;

    constructor(private moduleName: string) {
        this.modulePath = moduleName.replace("@", "")
    }

    async build(): Promise<Result[]> {

        const modulePathDir = "./modules/" + this.modulePath;
        const modulePackageJsonPath = modulePathDir + "/" + PACKAGE_JSON
        const sharedMain = extractSharedFromPackageJson("./" + PACKAGE_JSON)
        const sharedProject = extractSharedFromPackageJson(modulePackageJsonPath)
        const externals = [...sharedMain, ...sharedProject]

        let distDir = "./dist/modules/" + this.modulePath;


        if (fs.existsSync(distDir)) {
            console.log("REMOVE DIR", distDir)
            fs.rmdirSync(distDir, {recursive: true})
        }

        fs.mkdirSync(distDir, {recursive: true})
        const importMapPath = distDir + "/importmap.json"

        const sb = new SharedBuilder(externals)
        const sharedInfos = await sb.build()

        const importMapObj: {
            imports: {
                [name: string]: string
            }
        } = sharedInfosToImportMapJson(sharedInfos);

        importMapObj.imports[this.moduleName] = "/modules/" + this.modulePath + "/index.js"

        const {mappedPaths} = externalConvert(externals);

        fs.writeFileSync(importMapPath, JSON.stringify(importMapObj, null, 2));
        const bc = new BundleController("./tsconfig.json", "./dist/shared/", mappedPaths)


        return bundleMain(bc, externals, this.modulePath)
    }

}