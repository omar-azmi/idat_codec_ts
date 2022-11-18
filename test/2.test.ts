import { readFileSync, writeFileSync } from "fs"
import { makePng, stripPngData } from "../dist/index.js"

const png_buf = new Uint8Array(readFileSync("./test/test_pic.png"))
const t0 = performance.now()
const loaded_pngdata = stripPngData(png_buf)
const t1 = performance.now()
const reconstructed_png_buf = makePng(loaded_pngdata.zdata, loaded_pngdata.width, loaded_pngdata.height, loaded_pngdata.bitdepth)
const t2 = performance.now()

let errors = 0
for (let i = 0; i < png_buf.length; i++) errors += png_buf[ i ] === reconstructed_png_buf[ i ] ? 0 : 1
console.assert(errors === 0, `number of mismatches: ${errors}`)

writeFileSync("./test/reconstructed_png.png", Buffer.from(reconstructed_png_buf))
console.log("loaded `ImageData`: ", loaded_pngdata)
console.log("test 2 concluded. time spent: ", t2 - t0, " ms")
console.log("png data extracted in: ", t1 - t0, " ms")
console.log("png reconstructed in: ", t2 - t1, " ms")
