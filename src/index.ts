import process from "process";
import {MicroFrontendBuilder} from "./builders/build-microfrontend";
import {BootstrapBuilder} from "./builders/build-bootstrap";
import {BuilderInterface} from "./types";



const jobName = process.argv[2]
if (!jobName) {
    console.error("job name is required")
    process.exit(1)
}

const moduleName = process.argv[3];
if ("cache-sync"!=jobName && !moduleName) {
    console.log("Missing argument: build name")
    process.exit(1)
}


let builder: BuilderInterface<any> | undefined;

switch (jobName) {
    case "bootstrap":
        builder = new BootstrapBuilder(moduleName);
        break;
    case "microfrontend":
        builder = new MicroFrontendBuilder(moduleName);
        break;
    default:
        console.error("job not found");
        process.exit(1);
}

builder.build().then(() => {
    console.log("Build finished")
    process.exit(0)
});
