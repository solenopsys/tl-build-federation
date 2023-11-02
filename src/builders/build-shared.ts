import {BundleController} from "../toots/bundle-controller";
import {BuilderInterface, PackageInfo, SharedInfo} from "../types";
import {extractParamsFromNodeModule} from "../toots/extractors";
import {bundleShared} from "../bundles/buinde-shared";
import {externalConvert} from "../toots/external-converter";


export class SharedBuilder implements BuilderInterface<SharedInfo[]> {

    constructor(private externals: string[]) {}

    build(): Promise<SharedInfo[]> {

        const {mappedPaths,packageInfos} = externalConvert(this.externals);

        const bc = new BundleController("./tsconfig.json", "./dist/shared/", mappedPaths)

        return bundleShared(bc, packageInfos, this.externals);
    }

}