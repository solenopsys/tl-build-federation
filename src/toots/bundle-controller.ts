
import {createAngularBuildAdapter} from "./angular-esbuild-adapter";
import {BuildAdapter, BuildAdapterOptions, MappedPath} from "../types";

export class BundleController {
    adapter: BuildAdapter;

    constructor( public readonly tsConfig: string, public readonly  cachePath: string, public readonly  mappedPaths: MappedPath[]) {
        const options = {
            workspaceRoot: process.cwd(),
            optimization: {},
            browsers: [],
            sourceMap: {},
        }

        this.adapter = createAngularBuildAdapter(options);
    }

    public async  bundle(options: BuildAdapterOptions) {
        return await this.adapter(options);
    }
}







