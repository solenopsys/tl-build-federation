import http from "http";
import * as https from "https";

const fs = require('fs');
const esbuild = require('esbuild');
const jsdom = require("jsdom");
const {JSDOM} = jsdom;

const indexHtml = "index.html";
const counterHtml = "counter.html";
const entryJson = "entry.json";
const indexJs = "index.js";
const baseName = "bootstraps";
const distDir = "./dist/" + baseName + "/"

const subDist = process.argv[2];
const outputPath = distDir + subDist
const srcPath = "./" + baseName + "/" + subDist
const srcEntry = srcPath + "/" + entryJson;
const distEntry = outputPath + "/" + entryJson;
const ipfsUrl="https://zero.node.solenopsys.org"
const pinningServiceURL="http://pinning.solenopsys.org"

export function buildBootstrap() {

    if (!fs.existsSync(srcPath)) {
        console.error("bootstrap source folder not found", srcPath)
        process.exit(1)
    }


    if (!fs.existsSync(outputPath)) {
        fs.mkdirSync(outputPath, {recursive: true});
    }

    console.log("outputPath", outputPath)

    let outputIndexHtml = outputPath + "/" + indexHtml;


    fs.cpSync(srcEntry, distEntry, {force: true})
    fs.cpSync("./" + indexHtml, outputIndexHtml, {force: true})
    fs.cpSync("./assets", outputPath + "/assets", {recursive: true, force: true})
    fs.cpSync(srcPath + "/assets", outputPath + "/assets", {recursive: true, force: true})

    return htmlInject(outputIndexHtml);
}

function htmlInject(outputIndexHtml: string) {
    const indexHtmlBytes = fs.readFileSync(outputIndexHtml, 'utf8');

    let counterFile = srcPath + "/" + counterHtml;

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

function buildEsbuild(outputPath: string, indexTs: string): Promise<any> {
    return esbuild.build({
        entryPoints: ['.' + indexTs],
        bundle: true,
        outfile: outputPath + '/' + indexJs,
        platform: 'node',
        tsconfig: 'tsconfig.json',
    })
}


function fetchData(url: string): Promise<any> {
    return new Promise<string>((resolve, reject) => {


        const isHttps = url.startsWith('https');
        const request = (isHttps?https:http).get(url, (response) => {
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


async function genModulesJson() {
    const modulesNames = loadEntryModules()
    const modulesUrl = pinningServiceURL+ '/select/names?value=microfrontend'
    const modulesLinks: { [key: string]: { name: string, type: string, version: string } } = JSON.parse(await fetchData(modulesUrl))
    const modulesMapping: { [key: string]: string } = {};
    for (const cid in modulesLinks) {
        console.log("CID", cid)
        for (const moduleName of modulesNames) {
            if (moduleName == modulesLinks[cid].name) {
                const cidURL=ipfsUrl+ "/ipns/" + cid +"/"
                const importMapUrl =cidURL+"importmap.json";
                const importMap = JSON.parse(await fetchData(importMapUrl)).imports;
                modulesMapping[moduleName] =cidURL+ importMap[moduleName];
            }
        }
    }


    const fs = require('fs');
    const dir = outputPath;
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
    }

    fs.writeFileSync(outputPath + "/modules.json", JSON.stringify(modulesMapping), 'utf8');
}

async function build() {
    const indexTs = buildBootstrap();
    await buildEsbuild(outputPath, indexTs);
    await genModulesJson();
}

type Entry = { layout: { module: string }, routes: { [path: string]: { module: string } } };

function loadEntryModules() {
    const struct: Entry = JSON.parse(fs.readFileSync(srcEntry, 'utf8'));
    const modules: string[] = [];
    console.log("struct", struct)
    modules.push(struct.layout.module);
    for (const key in struct.routes) {
        modules.push(struct.routes[key].module);
    }
    return modules;
}


build();