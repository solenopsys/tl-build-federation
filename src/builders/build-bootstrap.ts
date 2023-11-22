import * as esbuild from "esbuild";
import jsdom from "jsdom";
import fs from "fs";
import {BuilderInterface, PACKAGE_JSON, SharedInfo} from "../types";
import {extractSharedFromPackageJson} from "../toots/extractors";
import {SharedBuilder} from "./build-shared";
import {sharedInfosToImportMapJson} from "../toots/convertors";

const {JSDOM} = jsdom;
const indexHtml = "index.html";
const counterHtml = "counter.html";
const entryJson = "entry.json";
const indexJs = "index.js";
const baseName = "bootstraps";
const distDir = "./dist/" + baseName + "/"


type Entry = {
    layout: {
        module: string
    },
    routes: {
        [path: string]: {
            module: string
        }
    }
};

export class BootstrapBuilder implements BuilderInterface<any> {
    outputPath: string
    srcPath: string
    srcEntry: string
    distEntry: string
    indexTs: string

    constructor(private moduleName: string) {
        const modPath=moduleName.replace("@", "")
        this.outputPath = distDir + modPath
        this.srcPath = "./" + baseName + "/" + modPath
        this.srcEntry = this.srcPath + "/" + entryJson;
        this.distEntry = this.outputPath + "/" + entryJson;

    }

    async build(): Promise<any> {
        if (fs.existsSync(this.outputPath)) {
            fs.rmdirSync(this.outputPath,{recursive: true})
        }
        const externals = extractSharedFromPackageJson("./" + PACKAGE_JSON)
        const sb = new SharedBuilder(externals)
        const sharedInfos = await sb.build()
        let outputIndexHtmlFile = this.copyFiles();
        this.indexTs = this.htmlInject(outputIndexHtmlFile, sharedInfos);

        await this.buildEsbuild(this.outputPath, this.indexTs);
    }

    loadEntryModules() {
        const struct: Entry = JSON.parse(fs.readFileSync(this.srcEntry, 'utf8'));
        const modules: string[] = [];
        console.log("struct", struct)
        modules.push(struct.layout.module);
        for (const key in struct.routes) {
            modules.push(struct.routes[key].module);
        }
        return modules;
    }

    htmlInject(outputIndexHtml: string, sharedInfos: SharedInfo[]) {

        const importMapObj: {
            imports: {
                [name: string]: string
            }
        } = sharedInfosToImportMapJson(sharedInfos);

       const sharedString =JSON.stringify(importMapObj, null, 2);

        const indexHtmlBytes = fs.readFileSync(outputIndexHtml, 'utf8');

        let counterFile = this.srcPath + "/" + counterHtml;

        const dom = new JSDOM(indexHtmlBytes);
        const document = dom.window.document;
        const newScriptPath = "/" + indexJs;

        const sourceMapScript = document.querySelector('script[type="importmap"]');
        sourceMapScript.textContent = sharedString;


        const script = document.querySelector('script[src]')
        let srcIndex = script.getAttribute('src');
        if (script) {
            // Modify the src attribute
            script.setAttribute('src', newScriptPath);
        }


        if (fs.existsSync(counterFile)) {
            const counter = fs.readFileSync(counterFile, 'utf8');
            const counterDom = new JSDOM(counter);
            const counterDocument = counterDom.window.document;
            const counterScripts = counterDocument.querySelectorAll('script')

            for (const counterScript of counterScripts) {
                console.log("Insert script", counterScript)
                document.head.appendChild(counterScript);
            }
        }

        fs.writeFileSync(outputIndexHtml, dom.serialize(), 'utf8');
        return srcIndex;
    }

    buildEsbuild(outputPath: string, indexTs: string): Promise<any> {
        return esbuild.build({
            entryPoints: ['.' + indexTs],
            bundle: true,
            outfile: outputPath + '/' + indexJs,
            platform: 'node',
            tsconfig: 'tsconfig.json',
        })
    }




    copyFiles(): string {

        if (!fs.existsSync(this.srcPath)) {
            console.error("bootstrap source folder not found", this.srcPath)
            process.exit(1)
        }


        if (!fs.existsSync(this.outputPath)) {
            fs.mkdirSync(this.outputPath, {recursive: true});
        }

        console.log("outputPath", this.outputPath)

        let outputIndexHtmlFile = this.outputPath + "/" + indexHtml;


        fs.cpSync(this.srcEntry, this.distEntry, {force: true})
        fs.cpSync("./" + indexHtml, outputIndexHtmlFile, {force: true})
        fs.cpSync("./assets", this.outputPath + "/assets", {recursive: true, force: true})
        fs.cpSync(this.srcPath + "/assets", this.outputPath + "/assets", {recursive: true, force: true})

        return outputIndexHtmlFile;
    }

}
