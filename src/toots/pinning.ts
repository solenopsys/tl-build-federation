import {fetchData} from "./ipfs";

const pinningServiceURL = "http://pinning.solenopsys.org"


export async function loadListMicroFrontends(): Promise<{
    [key: string]: {
        name: string,
        type: string,
        version: string
    }
}> {
    const modulesUrl = pinningServiceURL + '/select/names?value=microfrontend'
    return JSON.parse(await fetchData(modulesUrl))
}


export async function loadSharedLibs(): Promise<{
    [key: string]: {
        [key: string]: string,
    }
}> {
    const modulesUrl = pinningServiceURL + '/select/pins?name=front.static.library'
    return JSON.parse(await fetchData(modulesUrl))
}


export async function loadSharedMap(): Promise<{[libName:string]:string}>{
    const data= await loadSharedLibs();
    const libMaping:{[libName:string]:string}={}
    for (const key in data) {
        const obj = data[key];
        const libName= obj["front.static.library"];

        libMaping[libName]=key;
    }
    return libMaping;
}