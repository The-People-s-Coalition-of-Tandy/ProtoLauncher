async function decodeFile() {
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];

    if (!file) {
        alert('Please choose a PNG file.');
        return;
    }

    const buffer = await readFile(file);
    checkHeader(buffer);
    await checkChunks(buffer, buffer.length);
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
    //   validatePNG(compareBuffers(buffer.slice(0, 8), header), 'header');
}

function getBigEndian(buffer, offset) {
    let val = 0;
    for (let i = 0; i < 4; i++) {
        val = (val << 8) | buffer[offset + i];
    }
    return val;
}

async function decodeMp3(buffer, len) {
    // Your decoding logic here
    // For simplicity, this example alerts the user with a base64 representation of the data
    //   alert(btoa(String.fromCharCode.apply(null, buffer.slice(0, len))));
    // Convert the Uint8Array to a Blob
    const blob = new Blob([buffer.slice(0, len)], {
        type: 'audio/mp3'
    });

    // Create an Object URL from the Blob
    const objectURL = URL.createObjectURL(blob);

    // Create an <audio> element
    const audioElement = document.createElement('audio');
    audioElement.controls = true;

    // Set the audio source to the Object URL
    audioElement.src = objectURL;

    // Append the <audio> element to the document
    const mainDiv = document.querySelector("main");
    mainDiv.appendChild(audioElement);
    audioElement.play();

    const previewImage = document.getElementById('previewImage');
    const albumCover = document.querySelector("#albumCover");

    audioElement.onended = () =>{
        previewImage.classList.remove('playing');
        albumCover.classList.remove('playing');
    }
    previewImage.classList.add('playing');
    albumCover.classList.add('playing');

    var jsmediatags = window.jsmediatags;
    console.log(jsmediatags)
    // From remote host
    jsmediatags.read(blob, {
        onSuccess: function (tag) {
            console.log(tag);
            var picture = tag.tags.picture; // create reference to track art
            var base64String = "";
            for (var i = 0; i < picture.data.length; i++) {
                base64String += String.fromCharCode(picture.data[i]);
            }
            var imageUri = "data:" + picture.format + ";base64," + window.btoa(base64String);
            const albumCover = document.querySelector("#albumCover");
            albumCover.src = imageUri;
            albumCover.style.display = 'block';
        },
        onError: function (error) {
            console.log(error);
        }
    });
}

async function checkChunks(buffer, size) {
    let pos = 8;

    while (pos < size) {
        const chunkLength = getBigEndian(buffer, pos);
        pos += 4;
        const chunkType = String.fromCharCode.apply(null, buffer.slice(pos, pos + 4));
        pos += 4;

        if (chunkType === 'juLi' || chunkType === 'tEXt' || chunkType === 'eXIf') {
            await decodeMp3(buffer.slice(pos, pos + chunkLength), chunkLength);
            break; // If you want to stop processing after decoding 'juLi' chunk
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

function previewImage() {
    const fileInput = document.getElementById('fileInput');
    const previewImage = document.getElementById('previewImage');

    const file = fileInput.files[0];

    if (file) {
        const reader = new FileReader();

        reader.onload = function (e) {
            previewImage.src = e.target.result;
            previewImage.style.display = 'block';
        };

        reader.readAsDataURL(file);
    }
}