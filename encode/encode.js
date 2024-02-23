async function decodeFile() {
    const mp3Input = document.getElementById('mp3Input');
    const mp3 = mp3Input.files[0];

    const pngBuffer = await fetchAndReadPngAsArrayBuffer('./cd.png');
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
      const blob = await response.blob();
      
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function(e) {
          // Convert the blob to a Uint8Array
          const png = new Uint8Array(e.target.result);
          resolve(png);
        };
        reader.onerror = function(e) {
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

            digiCD.set(buffer.slice(pos - 8, pos+4), pos + 4 + musicBuffer.length);

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
    await decodeFile();
});


// const debugButton = document.getElementById('debugButton');
// debugButton.addEventListener('click', async function () {
//     const pngInput = document.getElementById('pngInput');
//     const png = pngInput.files[0];
//     const pngBuffer = await readFile(png);
//     await debugChunks(pngBuffer, pngBuffer.length);
// });