import init, { RegionJob } from './find_region_wasm/find_region_wasm.js';

let initialisation = init();

onmessage = async (event) => {
    await initialisation;

    let job = new RegionJob(...event.data);

    while (!job.done) {
        const result = job.next_point();

        if (result != undefined) {
            postMessage(result);
        }
    }

    postMessage("Done!");
};
