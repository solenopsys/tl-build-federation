const {exec} = require("child_process");


const util = require('util');
const execAsync = util.promisify(exec);

function extractor(resultWrapper) {
    return (error, stdout, stderr) => {
        if (error) {
            console.error(`Error executing pnpm list: ${error.message}`);
            resultWrapper.reject(error); // Reject the promise on error
            return;
        }

        if (stderr) {
            console.error(`pnpm list command encountered an error: ${stderr}`);
            resultWrapper.reject(stderr); // Reject the promise on error
            return;
        }

        try {
            const packageInfo = JSON.parse(stdout);

            if (packageInfo[0] && packageInfo[0].dependencies) {
                resultWrapper.resolve(packageInfo[0].dependencies); // Resolve the promise with the result
            } else {
                console.error('No "dependencies" property found in the JSON output.');
                resultWrapper.reject('No "dependencies" property found in the JSON output.');
            }
        } catch (parseError) {
            console.error(`Error parsing JSON output: ${parseError.message}`);
            resultWrapper.reject(parseError); // Reject the promise on error
        }
    };
}


async function getDeps() {
    const extractDeps = new Promise((resolve, reject) => {
        const resultWrapper = {resolve, reject};
        const callback = extractor(resultWrapper);

        // Execute the pnpm list command and wait for it to complete
        execAsync('pnpm list --json ', callback);
    });
    const res = await extractDeps

    mp = {}
    for (const external of externals) {
        const obj = res[external]
        if (obj !== undefined) {
            let name = obj.from.replace("@", "_").replace("/", "_").replaceAll("-", "_") + "-" + obj.version.replaceAll(".", "_");
            mp[external] = name + ".js"
        }
    }
    return mp;
}

async function genCacheFile() {
    let deps = await getDeps();
    console.log(deps)
// save to file
    const fs = require('fs');
    const dir = ".xs"
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
    }

    let jsonString = JSON.stringify(deps, null, 2)
    fs.writeFile(dir + "/cache.json", jsonString, function (err) {
        if (err) {
            console.log(err);
        }
    });
}


genCacheFile().then(
    () => console.log("ok")
).catch((err) => {
    console.log("error")
});


