import { zlibSync, unzipSync, unzlibSync } from "fflate"

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
export type BitDepth = 1 | 2 | 4 | 8 | 16 | 24 | 32

/** number of channels per pixel <br>
 * typical usage:
 * - `1`: for grayscale
 * - `2`: for grayscale with alpha
 * - `3`: for colored image
 * - `4`: for colored image with alpha
*/
export type Channels = 1 | 2 | 3 | 4

/** any numeric value greater than `max_value_at_bitdepth[bitdepth]` will get mapped to the highest value available at the given bitdepth */
const max_value_at_bitdepth: Record<BitDepth, number> = {
	1: 0, // `v > 0` gets mapped to `0b1` or `1`
	2: 2, // `v > 2` gets mapped to `0b11` or `3`
	4: 14, // `v > 14` gets mapped to `0b1111` or `15`
	8: 254, // `v > 254` gets mapped to `0b1111111` or `255`
}

export const encodeBitmap = (
	pixels_buf: Uint8Array | number[],
	width: number,
	height: number,
	bitdepth: BitDepth,
	channels: Channels = 1,
): Uint8Array => {
	console.assert(pixels_buf.length * 8 / bitdepth == width * height)
	console.assert(width === (width | 0))
	console.assert(height === (height | 0))
	const
		filtered_buf = bitdepth < 8 ?
			filterBitmapSubByte(pixels_buf, width, height, bitdepth) :
			filterBitmap(pixels_buf, width, height, bitdepth, channels),
		idat_zlib = zlibSync(filtered_buf)
	return idat_zlib
}

export const decodeBitmap = (
	idat_zlib: Uint8Array | number[],
	width: number,
	height: number,
	bitdepth: BitDepth,
	channels: Channels = 1,
): Uint8Array => {
	const filtered_buf = unzlibSync(idat_zlib instanceof Uint8Array ? idat_zlib : Uint8Array.from(idat_zlib))
	console.assert(filtered_buf.length * 8 / bitdepth == (Math.ceil(width * bitdepth / 8) + 1) * height)
	console.assert(width === (width | 0))
	console.assert(height === (height | 0))
	const
		pixel_buf = bitdepth < 8 ?
			unfilterBitmapSubByte(filtered_buf, width, height, bitdepth) :
			unfilterBitmap(filtered_buf, width, height, bitdepth, channels)
	return pixel_buf
}


/** apply filter0 to bitmap buffer `buf` of bitdepth less than 8-bit,
 * which requires padding for preparing byte-aligned/byte-sized data to get consumed by zlib compression.
 * @param max_val any numeric value greater than `max_val` will get mapped to the highest value available at the given bitdepth. see {@link max_value_at_bitdepth}
*/
export const filterBitmapSubByte = (
	pixels_buf: Uint8Array | number[],
	width: number,
	height: number,
	bitdepth: BitDepth,
	max_val?: number,
): Uint8Array => {
	max_val = max_val || max_value_at_bitdepth[bitdepth]
	const
		px_in_a_byte = 8 / bitdepth, // pixels in a single output filtered byte
		bitmap_bytewidth = Math.ceil(width * 1 / px_in_a_byte),
		padding_bitwidth = bitmap_bytewidth * px_in_a_byte - width,
		padding_arr = Array(padding_bitwidth).fill(0),
		bytemap_rows: Array<number[]> = splitArray(Array.from(pixels_buf), width),
		bitmap_rows: Array<number[]> = Array(height).fill(undefined).map(v => Array(bitmap_bytewidth).fill(0))
	for (let y = 0; y < height; y++) {
		const
			byr = bytemap_rows[y],
			bir = bitmap_rows[y],
			w = bir.length
		byr.push(...padding_arr) // add extra padding pixel bytes, so that the resulting bitmap_row is 8-bit aligned (byte-aligned)
		let px_val: number = 0
		for (let i = 0; i < w; i++) {
			for (let p = 0; p < px_in_a_byte; p++) {
				px_val = byr[i * px_in_a_byte + p]
				bir[i] += px_val > max_val ? max_val + 1 : px_val
				bir[i] <<= p < px_in_a_byte - 1 ? bitdepth : 0 // we do not left-shift bits in the last pixel (last value of `p`, when `p == 1/bitdepth`)
			}
			/*
			for (let b = 0; b < 8 - 1; b++) {
				bir[i] += byr[i * 8 + b] > max_val ? max_val + 1 : 0b0
				bir[i] <<= 1
			}
			bir[i] += byr[i * 8 + 8 - bitdepth] > max_val ? max_val + 1 : 0b0
			*/
		}
		bir.unshift(0) // insert `filter0` signature byte at the begining
	}
	return Uint8Array.from(([] as number[]).concat(...bitmap_rows))
}

/** parse filter0 filtered buffer `filtered_buf` into bitmap pixels buffer `pixels_buf`, for bitdepth less than 8-bit. */
export const unfilterBitmapSubByte = (
	filtered_buf: Uint8Array | number[],
	width: number,
	height: number,
	bitdepth: BitDepth = 1,
): Uint8Array => {
	const
		px_in_a_byte = 8 / bitdepth, // pixels in a single input filtered byte
		bitmap_bytewidth = Math.ceil(width * 1 / px_in_a_byte),
		padding_bitwidth = bitmap_bytewidth * px_in_a_byte - width,
		bytemap_rows: Array<number[]> = Array(height).fill(undefined).map(v => Array(width).fill(0)),
		bitmap_rows: Array<number[]> = splitArray(Array.from(filtered_buf), bitmap_bytewidth + 1) // an aditional 1-byte length is added to the stepping width to account for each row's header filter byte
	for (let y = 0; y < height; y++) {
		const
			byr = bytemap_rows[y],
			bir = bitmap_rows[y],
			w = bir.length
		for (let i = 0; i < w; i++) {
			for (let p = 0; p < px_in_a_byte; p++) {
				/** the expression `(v & (((1 << n) - 1) << m)) >> m` extracts `n` bits from the right, with `m` the right-offset bits. <br>
				 * in other words, we are bitwise slicing as `v.slice(m, m + n)` from the right, or `v.slice(v.length - m - n, v.length - m)` from the left. <br>
				 * the `v & ((1 << n) - 1)` portion of the expression extracts the `n` rightmost bits of value `v`. check out [this question](https://stackoverflow.com/q/2798191)
				*/
				byr[i * px_in_a_byte + p] = (bir[i] & (((1 << bitdepth) - 1) << p * bitdepth)) >> p * bitdepth
			}
		}
		byr.shift() // remove `filter` signature byte at the begining
		byr.splice(0, padding_bitwidth) // remove 8-bit-alignment padding bytes, so that now, `bir.length === width`
		console.assert(byr.length === width)
	}
	return Uint8Array.from(([] as number[]).concat(...bytemap_rows))
}

const filterBitmap = (
	buf: Uint8Array | number[],
	width: number,
	height: number,
	bitdepth: BitDepth,
	channels: number,
) => {
	return Uint8Array.of()
}

const unfilterBitmap = (
	buf: Uint8Array | number[],
	width: number,
	height: number,
	bitdepth: BitDepth,
	channels: number,
) => {
	return Uint8Array.of()
}

const splitArray = <T extends any>(arr: T[], step: number): Array<T[]> => {
	const
		rows = Math.ceil(arr.length / step),
		arrs: Array<T[]> = []
	for (let r = 0; r < rows; r++) arrs.push(arr.slice(r * step, r * (step + 1)))
	return arrs
}

Object.assign(globalThis, { encodeBitmap, decodeBitmap })
