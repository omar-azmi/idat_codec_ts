export { deflate, inflate } from "./deps.js";
/** number of bits occupied by a single pixel, and must be less than or equal to `8` (a byte). <br>
 * see {@link BitDepth} for a complete description
*/
export declare type BitDepthSubByte = 1 | 2 | 4 | 8;
/** number of bits occupied by a single pixel, and must be greater than `8` (a byte). <br>
 * see {@link BitDepth} for a complete description
*/
export declare type BitDepthExoByte = 16 | 24 | 32;
/** number of bits occupied by a single pixel. <br>
 * typical usage:
 * - `1`: "L", for a black and white pixel bitmap
 * - `2`: unknown purpose
 * - `4`: unknown purpose
 * - `8`: "L", for grayscale
 * - `16`: "LA", for grayscale with alpha/transparency
 * - `24`: "RGB", for colored image
 * - `32`: "RGBA", for colored image and transparency
*/
export declare type BitDepth = BitDepthSubByte | BitDepthExoByte;
/** number of channels per pixel <br>
 * typical usage:
 * - `1`: for grayscale
 * - `2`: for grayscale with alpha
 * - `3`: for colored image
 * - `4`: for colored image with alpha
*/
export declare type Channels = 1 | 2 | 3 | 4;
export declare const encodeBitmap: (pixels_buf: Uint8Array | number[], width: number, height: number, bitdepth: BitDepth, channels?: Channels) => Uint8Array;
export declare const decodeBitmap: (idat_zlib: Uint8Array | number[], width: number, height: number, bitdepth: BitDepth, channels?: Channels) => Uint8Array;
/** apply filter0 to bitmap buffer `buf` of bitdepth less than 8-bit,
 * which requires padding for preparing byte-aligned/byte-sized data to get consumed by zlib compression.
 * @param max_val any numeric value greater than `max_val` will get mapped to the highest value available at the given bitdepth. see {@link max_value_at_bitdepth}
*/
export declare const filterBitmapSubByte: (pixels_buf: Uint8Array | number[], width: number, height: number, bitdepth: BitDepthSubByte, max_val?: number) => Uint8Array;
/** parse filter0 filtered buffer `filtered_buf` into bitmap pixels buffer `pixels_buf`, for bitdepth less than 8-bit. */
export declare const unfilterBitmapSubByte: (filtered_buf: Uint8Array | number[], width: number, height: number, bitdepth?: BitDepthSubByte) => Uint8Array;
export declare const makePng: (idat_zlib_buf: Uint8Array, width: number, height: number, bitdepth: number) => Uint8Array;
declare type PngData = {
    width: number;
    height: number;
    bitdepth: number;
    zdata?: Uint8Array;
    data?: Uint8Array;
};
/** stipe IDAT (zlib compressed) chunk, width, height, and bitdepth from a png buffer */
export declare const stripPngData: (png_buf: Uint8Array, fix_incorrect_fields?: boolean) => PngData & {
    zdata: Uint8Array;
};
