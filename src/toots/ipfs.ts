import * as https from "https";
import http from "http";


export const ipfsUrl = "https://zero.node.solenopsys.org"


export async function loadFileFromIpfs(cid: string, outputPath: string):Promise<boolean> {

    const url = ipfsUrl + "/ipfs/" + cid

    const fs = require('fs');


    const content = await fetchData(url)
    fs.writeFileSync(outputPath, content, 'utf8');
    return true;
}

export async function fetchImportMap(cidURL: string) {
    const importMapUrl = cidURL + "importmap.json";
    return JSON.parse(await this.fetchData(importMapUrl)).imports;
}


export function fetchData(url: string): Promise<string> {
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