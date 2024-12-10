/**
 * SimpleEncoder - A class for encoding and decoding data within PNG images using LSB steganography
 * This implementation uses the least significant bit of the red channel to store data
 */
class SimpleEncoder {
    static CHUNK_SIZE = 1024;
    static BITS_PER_BYTE = 8;
    static RGBA_CHANNELS = 4;

    /**
     * Encodes binary data into a PNG image's pixels
     * @param {Uint8Array} pngBuffer - The original PNG image buffer
     * @param {Uint8Array} dataBuffer - The data to encode
     * @returns {Promise<Uint8Array>} The encoded PNG image buffer
     */
    async encode(pngBuffer, dataBuffer) {
        const { canvas, ctx } = await this.#createCanvas(pngBuffer);
        const pixels = this.#getPixelData(canvas, ctx);
        
        this.#embedData(pixels, dataBuffer);
        
        return await this.#createOutputBuffer(canvas, ctx, pixels);
    }

    /**
     * Decodes binary data from a PNG image's pixels
     * @param {Uint8Array} pngBuffer - The encoded PNG image buffer
     * @param {number} dataSize - The size of data to extract
     * @returns {Promise<Uint8Array>} The decoded data buffer
     */
    async decode(pngBuffer, dataSize) {
        const { canvas, ctx } = await this.#createCanvas(pngBuffer);
        const pixels = this.#getPixelData(canvas, ctx);
        
        return this.#extractData(pixels, dataSize);
    }

    /**
     * Creates a canvas and loads the image
     * @private
     */
    async #createCanvas(pngBuffer) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = await createImageBitmap(new Blob([pngBuffer]));
        
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        return { canvas, ctx };
    }

    /**
     * Gets pixel data from canvas
     * @private
     */
    #getPixelData(canvas, ctx) {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        return imageData.data;
    }

    /**
     * Embeds data into pixel array
     * @private
     */
    #embedData(pixels, dataBuffer) {
        let dataIndex = 0;
        for (let i = 0; i < pixels.length; i += SimpleEncoder.RGBA_CHANNELS) {
            if (pixels[i + 3] === 0) continue; // Skip transparent pixels

            if (dataIndex < dataBuffer.length * SimpleEncoder.BITS_PER_BYTE) {
                const byte = dataBuffer[Math.floor(dataIndex / SimpleEncoder.BITS_PER_BYTE)];
                const bit = (byte >> (7 - (dataIndex % SimpleEncoder.BITS_PER_BYTE))) & 1;
                pixels[i] = (pixels[i] & 0xFE) | bit;
                dataIndex++;
            } else {
                break;
            }
        }
    }

    /**
     * Creates the final encoded PNG buffer
     * @private
     */
    async #createOutputBuffer(canvas, ctx, pixels) {
        const imageData = new ImageData(pixels, canvas.width, canvas.height);
        ctx.putImageData(imageData, 0, 0);
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
        return new Uint8Array(await blob.arrayBuffer());
    }

    /**
     * Extracts data from pixel array
     * @private
     */
    #extractData(pixels, dataSize) {
        const decodedData = new Uint8Array(Math.ceil(dataSize));
        let dataIndex = 0;

        for (let i = 0; i < pixels.length; i += SimpleEncoder.RGBA_CHANNELS) {
            if (pixels[i + 3] === 0) continue;

            const bit = pixels[i] & 1;
            const byteIndex = Math.floor(dataIndex / SimpleEncoder.BITS_PER_BYTE);
            decodedData[byteIndex] = (decodedData[byteIndex] << 1) | bit;
            dataIndex++;

            if (dataIndex >= dataSize * SimpleEncoder.BITS_PER_BYTE) break;
        }

        this.#handlePartialByte(decodedData, dataIndex);
        return decodedData;
    }

    /**
     * Handles alignment of partial bytes in decoded data
     * @private
     */
    #handlePartialByte(decodedData, dataIndex) {
        const extraBits = dataIndex % SimpleEncoder.BITS_PER_BYTE;
        if (extraBits !== 0) {
            decodedData[decodedData.length - 1] >>= (SimpleEncoder.BITS_PER_BYTE - extraBits);
        }
    }
}

export { SimpleEncoder };

async function decodeAndPlayFile() {
    const pngInput = document.getElementById('CDCover');
    const pngFile = pngInput.files[0];
    const dataSize = 1024 * 64; // Adjust to match the data size you encoded

    const pngBuffer = await readFile(pngFile);
    const encoder = new SimpleEncoder();
    const decodedData = await encoder.decode(pngBuffer, dataSize);

    // Create an audio blob and play it
    const audioBlob = new Blob([decodedData], { type: 'audio/mpeg' });
    const audioUrl = URL.createObjectURL(audioBlob);

    // Create and play audio element
    const audio = new Audio(audioUrl);
    audio.controls = true;
    document.body.appendChild(audio);
    audio.play();
}

// Helper function to read a file as an ArrayBuffer
async function readFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => resolve(new Uint8Array(event.target.result));
        reader.onerror = (error) => reject(error);
        reader.readAsArrayBuffer(file);
    });
}
