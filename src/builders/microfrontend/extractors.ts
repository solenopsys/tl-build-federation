import fs from "fs";
import path from "path";

export function extractFromPackageJson(fileName: string): { version: string, module: string } {
    const packageJson = JSON.parse(fs.readFileSync(fileName, 'utf8'));
    return {version: packageJson.version, module: packageJson.module};
}

export function extractParamsFromNodeModule(packageName: string): { version: string, file: string } {
    let nodeModule = "./node_modules/";
    let packageJson = "/package.json";
    const nodeDir = nodeModule + packageName
    let pathToPackageJson = nodeDir + packageJson;
    if (fs.existsSync(pathToPackageJson)) {
        let extract = extractFromPackageJson(pathToPackageJson);

        if (!extract.version) {
            let parentPackageName = packageName.split("/")[0];
            const nodeDir = nodeModule + parentPackageName
            let pathToPackageJsonParent = nodeDir + packageJson;
            let extractTop = extractFromPackageJson(pathToPackageJsonParent);
            extract.version = extractTop.version;
        }
        return {
            version: extract.version,
            file: path.join(nodeDir, extract.module)
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