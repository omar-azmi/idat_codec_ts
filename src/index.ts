import { concatBytes, Crc32, decode_str, encode_str, env_le, sliceSkip } from "kitchensink_ts"
import { deflate, inflate } from "zlib.es"

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

const encodeU4B = (value: number): Uint8Array => {
	const bytes = new Uint8Array(Uint32Array.of(value).buffer)
	return env_le ? bytes.reverse() : bytes
}

const decodeU4B = (buf: Uint8Array, offset: number): number => {
	const int_buf = buf.slice(offset, offset + 4)
	if (env_le) int_buf.reverse()
	return new Uint32Array(int_buf.buffer)[0]
}

export const encodeBitmap = (
	pixels_buf: Uint8Array | number[],
	width: number,
	height: number,
	bitdepth: BitDepth,
	channels: Channels = 1,
): Uint8Array => {
	console.assert(pixels_buf.length * 8 / (bitdepth < 8 ? 8 : bitdepth) == width * height)
	console.assert(width === (width | 0))
	console.assert(height === (height | 0))
	const
		filtered_buf = bitdepth < 8 ?
			filterBitmapSubByte(pixels_buf, width, height, bitdepth) :
			filterBitmap(pixels_buf, width, height, bitdepth, channels),
		idat_zlib = deflate(filtered_buf)
	return idat_zlib
}

export const decodeBitmap = (
	idat_zlib: Uint8Array | number[],
	width: number,
	height: number,
	bitdepth: BitDepth,
	channels: Channels = 1,
): Uint8Array => {
	const filtered_buf = inflate(idat_zlib instanceof Uint8Array ? idat_zlib : Uint8Array.from(idat_zlib))
	console.assert(filtered_buf.length == (Math.ceil(width * bitdepth / 8) + 1) * height)
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
	max_val = max_val ?? max_value_at_bitdepth[bitdepth]
	const
		px_in_a_byte = 8 / bitdepth, // pixels in a single output filtered byte
		bitmap_bytewidth = Math.ceil(width * 1 / px_in_a_byte),
		padding_bitwidth = bitmap_bytewidth * px_in_a_byte - width,
		padding_arr = Array(padding_bitwidth).fill(0),
		bytemap_rows: Array<number[]> = sliceSkip(Array.from(pixels_buf), width),
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
		bytemap_rows: Array<number[]> = Array(height).fill(undefined).map(v => Array(width + padding_bitwidth).fill(0)),
		bitmap_rows: Array<number[]> = sliceSkip(Array.from(filtered_buf), bitmap_bytewidth + 1) // an aditional 1-byte length is added to the stepping width to account for each row's header filter byte
	for (let y = 0; y < height; y++) {
		const
			byr = bytemap_rows[y],
			bir = bitmap_rows[y],
			w = bir.length
		for (let i = 1; i < w; i++) {
			/** we begin with `i = 1` to ignore the signature byte of the filter */
			for (let p = 0; p < px_in_a_byte; p++) {
				/** the expression `(v & (((1 << n) - 1) << m)) >> m` extracts `n` bits from the right, with `m` the right-offset bits. <br>
				 * in other words, we are bitwise slicing as `v.slice(m, m + n)` from the right, or `v.slice(v.length - m - n, v.length - m)` from the left. <br>
				 * the `v & ((1 << n) - 1)` portion of the expression extracts the `n` rightmost bits of value `v`. check out [this question](https://stackoverflow.com/q/2798191)
				*/
				let offset = 8 - (p + 1) * bitdepth
				byr[(i - 1) * px_in_a_byte + p] = (bir[i] & (((1 << bitdepth) - 1) << offset)) >> offset
			}
		}
		byr.splice(width) // remove 8-bit-alignment padding bytes, so that now, `bir.length === width`. number of elements removed = `padding_bitwidth`
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

export const makePng = (idat_zlib_buf: Uint8Array, width: number, height: number, bitdepth: number): Uint8Array => concatBytes(makeMagic(), makeIHDR(width, height, bitdepth), makeIDAT(idat_zlib_buf), makeIEND())

const makeMagic = (): Uint8Array => Uint8Array.of(0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A)

const makeIHDR = (width: number, height: number, bitdepth: number): Uint8Array => {
	const
		len = encodeU4B(13),
		info_bytes = concatBytes(
			encode_str("IHDR"),
			encodeU4B(width),
			encodeU4B(height),
			[bitdepth, 0, 0, 0, 0]
		),
		crc = encodeU4B(Crc32(info_bytes)) // length bytes are not included in crc calculation
	return concatBytes(len, info_bytes, crc)
}

/** add IDAT header and a CRC32 footer to zlib_deflated buffer of pixels */
const makeIDAT = (idat_zlib_buf: Uint8Array): Uint8Array => {
	const
		len = encodeU4B(idat_zlib_buf.length),
		sig = encode_str("IDAT"),
		crc = encodeU4B(Crc32(idat_zlib_buf, Crc32(sig)))
	return concatBytes(len, sig, idat_zlib_buf, crc)
}

const makeIEND = (): Uint8Array => concatBytes(
	encodeU4B(0),
	encode_str("IEND"),
	encodeU4B(Crc32(encode_str("IEND")))
)

type PngData = {
	width: number
	height: number
	bitdepth: number
	zdata?: Uint8Array // zlib compressed IDAT chunk's data portion
	data?: Uint8Array // uncompressed and undfiltered raw pixel data
}

/** stipe IDAT (zlib compressed) chunk, width, height, and bitdepth from a png buffer */
export const stripPngData = (png_buf: Uint8Array, fix_incorrect_fields: boolean = true): PngData & { zdata: Uint8Array } => {
	let offset = 8
	offset = findChunkOffset(png_buf, offset, "IHDR")
	let
		width = decodeU4B(png_buf, offset + 4 + 4 + 0),
		height = decodeU4B(png_buf, offset + 4 + 4 + 4),
		bitdepth = png_buf[offset + 4 + 4 + 4 + 1]
	offset = findChunkOffset(png_buf, offset, "IDAT")
	const
		zdata_len = decodeU4B(png_buf, offset),
		zdata = png_buf.slice(offset + 4 + 4, offset + 4 + 4 + zdata_len)
	if (fix_incorrect_fields) {
		if (bitdepth < 1) bitdepth = 1
	}
	return { width, height, bitdepth, zdata }
}

/** find the next chunk corresponding to provided `chunk_type`. if no `chunk_type` is given, then the next chunk's offset will be returned */
const findChunkOffset = (png_buf: Uint8Array, offset: number, chunk_type?: "IHDR" | "IDAT" | "IEND"): number => {
	const
		data_len = decodeU4B(png_buf, offset),
		next_offset = offset + 4 + 4 + data_len + 4
	if (chunk_type === undefined) return next_offset
	if (decode_str(png_buf, offset + 4, 4)[0] === chunk_type) return offset
	return findChunkOffset(png_buf, next_offset, chunk_type)
}

// Object.assign(globalThis, { encodeBitmap, decodeBitmap, filterBitmapSubByte, unfilterBitmapSubByte, deflate, inflate })
