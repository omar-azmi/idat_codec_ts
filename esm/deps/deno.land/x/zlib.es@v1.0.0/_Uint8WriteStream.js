export class Uint8WriteStream {
    constructor(extendedSize) {
        Object.defineProperty(this, "index", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
        Object.defineProperty(this, "buffer", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "length", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "_extendedSize", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.buffer = new Uint8Array(extendedSize);
        this.length = extendedSize;
        this._extendedSize = extendedSize;
    }
    write(value) {
        if (this.length <= this.index) {
            this.length += this._extendedSize;
            const newBuffer = new Uint8Array(this.length);
            const nowSize = this.buffer.length;
            for (let i = 0; i < nowSize; i++) {
                newBuffer[i] = this.buffer[i];
            }
            this.buffer = newBuffer;
        }
        this.buffer[this.index] = value;
        this.index++;
    }
}
