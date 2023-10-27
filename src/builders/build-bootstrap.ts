import http from "http";
import * as https from "https";
import * as esbuild from "esbuild";
import jsdom from "jsdom";

import fs from "fs";
import {BuildResult} from "esbuild";

const {JSDOM} = jsdom;

const indexHtml = "index.html";
const counterHtml = "counter.html";
const entryJson = "entry.json";
const indexJs = "index.js";
const baseName = "bootstraps";
const distDir = "./dist/" + baseName + "/"


const ipfsUrl = "https://zero.node.solenopsys.org"
const pinningServiceURL = "http://pinning.solenopsys.org"

type Entry = { layout: { module: string }, routes: { [path: string]: { module: string } } };

export class BootstrapBuild implements Builder {
    outputPath:string
    srcPath:string
    srcEntry:string
    distEntry:string
    indexTs:string

    constructor(private moduleName: string) {
        this.outputPath = distDir + moduleName
        this.srcPath = "./" + baseName + "/" + moduleName
        this.srcEntry = this.srcPath + "/" + entryJson;
        this.distEntry = this.outputPath + "/" + entryJson;

    }
    build(): Promise<any> {
        return this.buildBootstrap();
    }

    async buildBootstrap():Promise<any> {
        this.indexTs = this.copyFiles();
        await this.buildEsbuild(this.outputPath, this.indexTs);
        await this.genModulesJson();
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

     htmlInject(outputIndexHtml: string) {
        const indexHtmlBytes = fs.readFileSync(outputIndexHtml, 'utf8');

        let counterFile = this.srcPath + "/" + counterHtml;

        const dom = new JSDOM(indexHtmlBytes);
        const document = dom.window.document;
        const newScriptPath = "/" + indexJs;


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


     fetchData(url: string): Promise<any> {
        return new Promise<string>((resolve, reject) => {


            const isHttps = url.startsWith('https');
            const request = (isHttps ? https : http).get(url, (response) => {
                let data = '';

                // Handle data chunks as they come in
                response.on('data', (chunk) => {
                    data += chunk;
                });

                // Handle the end of the response
                response.on('end', () => {
                    resolve(data);
                });
            });

            // Handle errors
            request.on('error', (error) => {
                reject(error);
            });
        });
    }


    async  genModulesJson() {
        const modulesNames = this.loadEntryModules()
        const modulesUrl = pinningServiceURL + '/select/names?value=microfrontend'
        const modulesLinks: { [key: string]: { name: string, type: string, version: string } } = JSON.parse(await this.fetchData(modulesUrl))
        const modulesMapping: { [key: string]: string } = {};
        for (const cid in modulesLinks) {
            console.log("CID", cid)
            for (const moduleName of modulesNames) {
                if (moduleName == modulesLinks[cid].name) {
                    const cidURL = ipfsUrl + "/ipns/" + cid + "/"
                    const importMapUrl = cidURL + "importmap.json";
                    const importMap = JSON.parse(await this.fetchData(importMapUrl)).imports;
                    modulesMapping[moduleName] = cidURL + importMap[moduleName];
                }
            }
        }


        const fs = require('fs');
        const dir = this.outputPath;
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir);
        }

        fs.writeFileSync(this.outputPath + "/modules.json", JSON.stringify(modulesMapping), 'utf8');
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

        let outputIndexHtml = this.outputPath + "/" + indexHtml;


        fs.cpSync(this.srcEntry, this.distEntry, {force: true})
        fs.cpSync("./" + indexHtml, outputIndexHtml, {force: true})
        fs.cpSync("./assets", this.outputPath + "/assets", {recursive: true, force: true})
        fs.cpSync(this.srcPath + "/assets", this.outputPath + "/assets", {recursive: true, force: true})

        return this.htmlInject(outputIndexHtml);
    }

}
