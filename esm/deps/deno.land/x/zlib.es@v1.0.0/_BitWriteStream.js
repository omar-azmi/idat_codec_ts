export class BitWriteStream {
    constructor(buffer, bufferOffset = 0, bitsOffset = 0) {
        Object.defineProperty(this, "buffer", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "bufferIndex", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "nowBits", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "nowBitsIndex", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
        Object.defineProperty(this, "isEnd", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        });
        this.buffer = buffer;
        this.bufferIndex = bufferOffset;
        this.nowBits = buffer[bufferOffset];
        this.nowBitsIndex = bitsOffset;
    }
    write(bit) {
        if (this.isEnd)
            throw new Error("Lack of data length");
        bit <<= this.nowBitsIndex;
        this.nowBits += bit;
        this.nowBitsIndex++;
        if (this.nowBitsIndex >= 8) {
            this.buffer[this.bufferIndex] = this.nowBits;
            this.bufferIndex++;
            this.nowBits = 0;
            this.nowBitsIndex = 0;
            if (this.buffer.length <= this.bufferIndex) {
                this.isEnd = true;
            }
        }
    }
    writeRange(value, length) {
        let mask = 1;
        let bit = 0;
        for (let i = 0; i < length; i++) {
            bit = (value & mask) ? 1 : 0;
            this.write(bit);
            mask <<= 1;
        }
    }
    writeRangeCoded(value, length) {
        let mask = 1 << (length - 1);
        let bit = 0;
        for (let i = 0; i < length; i++) {
            bit = (value & mask) ? 1 : 0;
            this.write(bit);
            mask >>>= 1;
        }
    }
}
