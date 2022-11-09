/** concatenate a bunch of `Uint8Array` arrays */
export const concat = (...u8arrs: (Uint8Array | Array<number>)[]): Uint8Array => {
	const offsets: number[] = [0]
	for (const arr of u8arrs) offsets.push(offsets[offsets.length - 1] + arr.length)
	const outarr = new Uint8Array(offsets.pop()!)
	for (const arr of u8arrs) outarr.set(arr, offsets.shift())
	return outarr
}

export const abs_diff = (arr: TypedArray | Array<number>): number[] => {
	const d: number[] = []
	if (arr.length >= 2)
		for (let i = 1; i <= arr.length - 1; i++)
			d.push(Math.abs(arr[i] - arr[i - 1]))
	return d
}

export type Rect = { x: number, y: number, width: number, height: number }

/** get an equivalent rect where all dimensions are positive */
export const positiveRect = (r: Rect): Rect => {
	let { x, y, width, height } = r
	if (width < 0) {
		width *= -1 // width is now positive
		x -= width // x has been moved further to the left
	}
	if (height < 0) {
		height *= -1 // height is now positive
		y -= height // y has been moved further to the top
	}
	return { x, y, width, height }
}


export const splitArray = <T extends any>(arr: T[], step: number): Array<T[]> => {
	const
		rows = Math.ceil(arr.length / step),
		arrs: Array<T[]> = []
	for (let r = 0; r < rows; r++) arrs.push(arr.slice(r * step, (r + 1) * step))
	return arrs
}

export const splitTypedArray = <TA extends TypedArray>(arr: TA, step: number): Array<TA> => {
	const
		rows = Math.ceil(arr.length / step),
		arrs: TA[] = Array(rows)
	let r = 0
	while (r < rows) {
		arrs[r] = arr.subarray(r * step, r * (step + 1)) as TA
		r++
	}
	return arrs
}

/** dictates if the native endianess of your `TypedArray`s is little endian. */
export const getEnvironmentEndianess = (): boolean => (new Uint8Array(Uint32Array.of(1).buffer))[0] === 1 ? true : false

/** dictates if the native endianess of your `TypedArray`s is little endian. */
const env_le = getEnvironmentEndianess()

export const encodeU4B = (value: number): Uint8Array => {
	const bytes = new Uint8Array(Uint32Array.of(value).buffer)
	return env_le ? bytes.reverse() : bytes
}

export const decodeU4B = (buf: Uint8Array, offset: number): number => {
	const int_buf = buf.slice(offset, offset + 4)
	if (env_le) int_buf.reverse()
	return new Uint32Array(int_buf.buffer)[0]
}

let text_encoder: TextEncoder
let text_decoder: TextDecoder

export const encodeText = (txt: string) => {
	if (text_encoder === undefined) text_encoder = new TextEncoder()
	return text_encoder.encode(txt)
}

export const decodeText = (buf: Uint8Array, offset: number = 0, length?: number) => {
	if (text_decoder === undefined) text_decoder = new TextDecoder()
	return text_decoder.decode(buf.subarray(offset, length === undefined ? undefined : offset + length))
}

let crc32_table: Int32Array
const init_crc32_table = () => {
	crc32_table = new Int32Array(256)
	const polynomial = -306674912
	for (let i = 0; i < 256; i++) {
		// initialize the table with `polynomial` being the starting seed
		let r = i
		for (let bit = 8; bit > 0; --bit)
			r = ((r & 1) ? ((r >>> 1) ^ polynomial) : (r >>> 1))
		crc32_table[i] = r
	}
}

export const Crc32 = (bytes: Uint8Array | Array<number>, crc = 0xFFFFFFFF) => {
	if (crc32_table === undefined) init_crc32_table()
	for (let i = 0; i < bytes.length; ++i) crc = crc32_table[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8)
	return (crc ^ -1) >>> 0
}
