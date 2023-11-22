import fs from "fs";
import path from "path";

export function extractFromPackageJson(fileName: string): { version: string, module: string, exports?: { [name: string]: string } } {
    const packageJson = JSON.parse(fs.readFileSync(fileName, 'utf8'));
    return {version: packageJson.version, module: packageJson.module, exports: packageJson.exports};
}

export function extractParamsFromNodeModule(packageName: string): { version: string, file: string } {
    let nodeModule = "./node_modules/";
    let packageJson = "/package.json";
    let splitStrings = packageName.split("/");
    const subPackage = splitStrings.length >= 3

    const nodeDir =  nodeModule + (subPackage?splitStrings[0]+"/"+splitStrings[1]:packageName)
    let pathToPackageJson = nodeDir + packageJson;
    if (fs.existsSync(pathToPackageJson)) {
        let extract = extractFromPackageJson(pathToPackageJson);


        if (!extract.version) {
            let parentPackageName = splitStrings[0];
            const nodeDir = nodeModule + parentPackageName
            let pathToPackageJsonParent = nodeDir + packageJson;
            let extractTop = extractFromPackageJson(pathToPackageJsonParent);
            extract.version = extractTop.version;
        }
        console.log("INFO")
        console.log(nodeDir, extract.module)
        let file= path.join(nodeDir, extract.module) ;
        if (subPackage){
            if( extract.exports){
                let subDirectory =  splitStrings.slice(2).join("/") ;
                const fn = extract.exports["./"+subDirectory]["default"]
                file=path.join(nodeDir, fn) ;
            }else{
                let subDir = nodeModule+packageName;
                let extracts = extractFromPackageJson(subDir+packageJson);
                file=path.join(subDir, extracts.module) ;
            }
        }
        return {
            version: extract.version,
            file: file
        }
    } else {
        throw new Error("Package not found: " + pathToPackageJson)
    }
}

export function extractSharedFromPackageJson(fileName: string): string[] {
    const packageJson = JSON.parse(fs.readFileSync(fileName, 'utf8'));
    if (packageJson.shared) {
        return packageJson.shared
    }
    return []
}