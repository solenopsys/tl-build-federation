import {
    buildForFederation,
    FederationOptions,
    NormalizedFederationConfig,
    withNativeFederation
}
    from "@softarc/native-federation/src/build.js";

import {registerEsbuildAdapter} from "./tool.js";


const wr = "C:/dev/sources/MAIN/temp5/frontends"
const pr = "C:/dev/sources/MAIN/temp5/frontends"


registerEsbuildAdapter(wr, pr)


const externals = [
    "@angular/router",
    "@angular/compiler",
    "@angular/forms",
    "@angular/common",
    "@angular/common/http",
    "@angular/platform-browser",
    "@angular/platform-browser-dynamic",
    "@angular/core",
    "rxjs",
    "rxjs/operators",
    "canvas-txt"
]

const externalShared = {};

for (const external of externals) {
    externalShared[external] = {
        singleton: true,
        strictVersion: true,
        requiredVersion: '>=12.0.0'
    }
}

externalShared["@ngxs/store"] =
    {
        singleton: true,
        strictVersion: true,
        requiredVersion: '>=1.0.0'
    };
externalShared["zone.js"] = {
    singleton: true,
    strictVersion: true,
    requiredVersion: '>=0.0.0'
};

process.chdir("C:/dev/sources/MAIN/temp5/frontends")
//"@solenopsys/mf-diagram", "@solenopsys/mf-layout", "@solenopsys/mf-microfonds",
const fedConfig: NormalizedFederationConfig = withNativeFederation({
    name: 'test',
    exposes: {},
    shared: externalShared,
    sharedMappings: [ "@solenopsys/mf-people"],
    skip: []
});

const fedOptions: FederationOptions = {
    workspaceRoot: wr,
    outputPath: "./dist",
    federationConfig: "C:/dev/sources/MAIN/temp5/frontends/federation.config.js",
    tsConfig: "C:/dev/sources/MAIN/temp5/tools/vite-micro-federation/src/lib-compiler/tsconfig.json",

}

buildForFederation(
    fedConfig,
    fedOptions,
    externals
).then(r => {
    console.log("DONE", r)
});

