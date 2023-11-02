import {SharedInfo} from "../types";

export function sharedInfosToImportMapJson(sharedInfos: SharedInfo[]): {
    imports: {
        [name: string]: string
    }
} {
    const imports: {
        [name: string]: string
    } = {}
    for (const sharedInfo of sharedInfos) {
        imports[sharedInfo.packageName] = "/shared/" + sharedInfo.outFileName
    }
    return {
        imports
    }
}