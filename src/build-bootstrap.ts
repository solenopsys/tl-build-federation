const fs = require('fs');





export async function  buildBootstrap(){ 
    const subDist=process.argv[2];
    const outputPath = "./dist/bootstraps/" + subDist
    
    if (!fs.existsSync(outputPath)) {
        fs.mkdirSync(outputPath);
    }
}

console.log("START")

buildBootstrap()