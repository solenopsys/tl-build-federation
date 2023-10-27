import process from "process";
import {CacheSyncBuilder} from "./builders/cache-sync";
import {MicroFrontendBuilder} from "./builders/build-micro-frontend";
import {BootstrapBuild} from "./builders/build-bootstrap";


const jobName = process.argv[2]
if (!jobName) {
    console.error("job name is required")
    process.exit(1)
}

const moduleName = process.argv[3];
if (!moduleName) {
    console.log("Missing argument: build name")
    process.exit(1)
}


const builders: { [key: string]: Builder } = {
    "bootstrap": new BootstrapBuild(moduleName),
    "cache-sync": new CacheSyncBuilder(),
    "microfrontend": new MicroFrontendBuilder(moduleName),
}

const builder = builders[jobName]

if (!builder) {
    console.error("job not found")
    process.exit(1)
}

builder.build()