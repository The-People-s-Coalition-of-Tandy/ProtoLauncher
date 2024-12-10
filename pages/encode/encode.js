async function encodeFile() {
    const mp3Input = document.getElementById('mp3Input');
    const mp3 = mp3Input.files[0];

    const CDCoverInput = document.getElementById('CDCover');
    const CDCover = CDCoverInput.files[0];
    console.log(CDCover);
    let pngBuffer;

    if (CDCover) {
        pngBuffer = await processImage(CDCover)
    } else {
        pngBuffer = await fetchAndReadPngAsArrayBuffer('./cd.png');
    }
    const mp3Buffer = await readFile(mp3);

    // checkHeader(buffer);
    const final = await checkChunks(pngBuffer, pngBuffer.length, mp3Buffer);
    console.log(final);

    const blob = new Blob([final], {
        type: 'image/png'
    });

    // Download the new PNG file
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'new.png';
    a.click();

    // previewImage();
    const cdBurner = document.getElementById('cd-burner');
    document.addEventListener('DOMContentLoaded', () => {
        const cdBurnerImg = document.querySelector('.cd-burner img');
        cdBurnerImg.addEventListener('animationend', () => {
            cdBurnerImg.style.transform = 'translateY(50%) rotate(720deg)';

            cdBurnerImg.style.animation = 'none';
        });
    });
    const cd = document.createElement('img');
    cd.src = url;
    cdBurner.appendChild(cd);
}

async function fetchAndReadPngAsArrayBuffer(url) {
    try {
        const response = await fetch(url);
        console.log(response);
        const blob = await response.blob();
        console.log(blob);
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = function (e) {
                // Convert the blob to a Uint8Array
                const png = new Uint8Array(e.target.result);
                resolve(png);
            };
            reader.onerror = function (e) {
                reject(new Error("Failed to read the blob as an ArrayBuffer"));
            };
            reader.readAsArrayBuffer(blob);
        });
    } catch (error) {
        console.error("Failed to fetch or read the PNG file:", error);
        throw error; // Re-throw the error if you want to handle it outside
    }
}

async function readFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (event) => {
            resolve(new Uint8Array(event.target.result));
        };

        reader.onerror = (error) => {
            reject(error);
        };

        reader.readAsArrayBuffer(file);
    });
}

function checkHeader(buffer) {
    const header = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
    validatePNG(compareBuffers(buffer.slice(0, 8), header), 'header');
}

function getBigEndian(buffer, offset) {
    let val = 0;
    for (let i = 0; i < 4; i++) {
        val = (val << 8) | buffer[offset + i];
    }
    return val;
}

// CRC table for CRC-32 (used in the PNG specification)
const crc32_table = new Array(256).fill(0).map((_, byte) => {
    let crc = byte;
    for (let j = 0; j < 8; j++) {
        crc = (crc & 1) ? (0xEDB88320 ^ (crc >>> 1)) : (crc >>> 1);
    }
    return crc >>> 0;
});

function generate_crc32(data) {
    let crc = 0xFFFFFFFF;
    for (const byte of data) {
        crc = (crc >>> 8) ^ crc32_table[(crc ^ byte) & 0xFF];
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
}

function write_custom_chunk(imageBuffer, pos, musicBuffer) {
    let newBuffer = new Uint8Array(imageBuffer.length + musicBuffer.length + 12); // Preallocate buffer
    newBuffer.set(imageBuffer.slice(0, pos), 0);

    const chunkLength = musicBuffer.length;
    const chunkType = 'juLi';

    // let crc = generate_crc32(chunkType, 4);
    // crc = generate_crc32(musicBuffer, 12) ^ crc;
    const chunkTypeArray = new TextEncoder().encode(chunkType);
    let crc = generate_crc32(new Uint8Array([...chunkTypeArray, ...musicBuffer]));

    console.log(`${crc} - ${crc.toString(16)}`);

    // Write chunk
    newBuffer.set([
        (chunkLength >> 24) & 0xFF,
        (chunkLength >> 16) & 0xFF,
        (chunkLength >> 8) & 0xFF,
        chunkLength & 0xFF
    ], pos);

    pos += 4;

    newBuffer.set(chunkType.split('').map(c => c.charCodeAt(0)), pos);
    pos += 4;

    newBuffer.set(musicBuffer, pos);
    pos += musicBuffer.length;

    newBuffer.set([
        (crc >> 24) & 0xFF,
        (crc >> 16) & 0xFF,
        (crc >> 8) & 0xFF,
        crc & 0xFF
    ], pos);

    return newBuffer;
}
function write_standard_chunk(imageBuffer, pos, musicBuffer) {
    let newBuffer = new Uint8Array(imageBuffer.length + musicBuffer.length + 12);
    newBuffer.set(imageBuffer.slice(0, pos), 0);

    const chunkLength = musicBuffer.length;
    const chunkType = 'tEXt'; // Use the "tEXt" ancillary chunk for better compatibility

    const chunkTypeArray = new TextEncoder().encode(chunkType);
    let crc = generate_crc32(new Uint8Array([...chunkTypeArray, ...musicBuffer]));

    // Write chunk length
    newBuffer.set([
        (chunkLength >> 24) & 0xFF,
        (chunkLength >> 16) & 0xFF,
        (chunkLength >> 8) & 0xFF,
        chunkLength & 0xFF
    ], pos);
    pos += 4;

    // Write chunk type as "tEXt"
    newBuffer.set(chunkTypeArray, pos);
    pos += 4;

    // Write music data
    newBuffer.set(musicBuffer, pos);
    pos += musicBuffer.length;

    // Write CRC
    newBuffer.set([
        (crc >> 24) & 0xFF,
        (crc >> 16) & 0xFF,
        (crc >> 8) & 0xFF,
        crc & 0xFF
    ], pos);

    return newBuffer;
}


async function debugChunks(buffer, size) {
    let pos = 8;

    while (pos < size) {
        const chunkLength = getBigEndian(buffer, pos);
        pos += 4;
        const chunkType = String.fromCharCode.apply(null, buffer.slice(pos, pos + 4));
        pos += 4;

        // TODO: Read chunk data

        pos += chunkLength;

        // TODO: Check CRC
        const crc = getBigEndian(buffer, pos);
        pos += 4;

        console.log(`chunk: ${chunkType} - len: ${chunkLength} (${size - pos}) - crc: ${crc}`);
    }
}

async function checkChunks(buffer, size, musicBuffer) {
    let pos = 8;


    while (pos < size) {
        const chunkLength = getBigEndian(buffer, pos);
        pos += 4;
        const chunkType = String.fromCharCode.apply(null, buffer.slice(pos, pos + 4));
        pos += 4;

        if (chunkType === 'IEND') {
            let digiCD = write_custom_chunk(buffer, pos - 8, musicBuffer);

            digiCD.set(buffer.slice(pos - 8, pos + 4), pos + 4 + musicBuffer.length);

            return digiCD;
        }

        // TODO: Read chunk data

        pos += chunkLength;

        // TODO: Check CRC
        pos += 4;

        console.log(`chunk: ${chunkType} - len: ${chunkLength} (${size - pos})`);
    }
}

function validatePNG(val, msg) {
    if (!val) {
        console.error(`Invalid file: ${msg}`);
    } else {
        console.log(`Valid file: ${msg}`);
    }
}

// Usage: call encodeMP3InPNG() function in response to user action (e.g., button click)
const submitButton = document.getElementById('submitButton');
submitButton.addEventListener('click', async function () {
    await encodeFile();
});

async function processImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function (e) {
            const uploadedImage = new Image();
            uploadedImage.onload = async function () {
                const canvas = document.getElementById('canvas2');
                const ctx = canvas.getContext('2d');
                canvas.width = uploadedImage.width;
                canvas.height = uploadedImage.height;

                // Blend the images
                await blendImages(uploadedImage);
                const image = canvas.toDataURL('image/png');
                resolve(await fetchAndReadPngAsArrayBuffer(image));
            };
            uploadedImage.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}
// Ensure that blendImages correctly handles the blending and waits for all operations to complete
async function blendImages(uploadedImage) {
    const canvas1 = document.getElementById('canvas1');
    const ctx1 = canvas1.getContext('2d');
    const canvas2 = document.getElementById('canvas2');
    const ctx2 = canvas2.getContext('2d');

    return new Promise((resolve) => {
        const cdCoverImage = new Image();
        cdCoverImage.onload = function () {
            canvas1.width = canvas2.width = cdCoverImage.width;
            canvas1.height = canvas2.height = cdCoverImage.height;
            ctx1.drawImage(uploadedImage, 0, 0, canvas1.width, canvas1.height);
            ctx1.globalCompositeOperation = 'hard-light';
            ctx1.drawImage(cdCoverImage, 0, 0);
            
            ctx2.drawImage(cdCoverImage, 0, 0);
            ctx2.globalCompositeOperation = 'source-in';
            ctx2.drawImage(canvas1, 0, 0);
            ctx1.globalCompositeOperation = 'source-over';
            ctx2.globalCompositeOperation = 'source-over';
            resolve();
        };
        cdCoverImage.src = 'cd.png';
    });
}


function downloadImage() {
    const canvas = document.getElementById('canvas2');
    const image = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = 'blended-cd-cover.png';
    link.href = image;
    link.click();
}