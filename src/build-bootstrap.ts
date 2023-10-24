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
    let srcEntry = srcPath + "/" + entryJson;
    let distEntry = outputPath + "/" + entryJson;
    fs.cpSync(srcEntry, distEntry, {force: true})
    fs.cpSync("./" + indexHtml, outputIndexHtml, {force: true})
    fs.cpSync("./assets", outputPath + "/assets", {recursive: true, force: true})
    fs.cpSync(srcPath+"/assets", outputPath + "/assets", {recursive: true, force: true})

    return htmlInject(outputIndexHtml);
}

function htmlInject(outputIndexHtml: string){
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

function buildEsbuild(outputPath: string,indexTs :string): Promise<any> {
    return esbuild.build({
        entryPoints: ['.' + indexTs],
        bundle: true,
        outfile: outputPath + '/' + indexJs,
        platform: 'node',
        tsconfig: 'tsconfig.json',
    })
}

async function build(){
  const indexTs = buildBootstrap();
    await buildEsbuild(outputPath,indexTs);
}


build();