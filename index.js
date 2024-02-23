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
    // previewImage();
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
    // For simplicity, this example alerts the user with a base64 representation of the data
    //   alert(btoa(String.fromCharCode.apply(null, buffer.slice(0, len))));
    // Convert the Uint8Array to a Blob
    const blob = new Blob([buffer.slice(0, len)], {
        type: 'audio/mp3'
    });

    // Create an Object URL from the Blob
    const objectURL = URL.createObjectURL(blob);

    // Create an <audio> element
    const audioElement = document.querySelector("audio");
    
    // Set the audio source to the Object URL
    audioElement.src = objectURL;
    
    // Append the <audio> element to the document
    const mainDiv = document.querySelector("main");
    mainDiv.appendChild(audioElement);
    

    const previewImage = document.getElementById('previewImage');
    const albumCover = document.querySelector("#albumCover");
    
    audioElement.onended = () =>{
        previewImage.classList.remove('playing');
        albumCover.classList.remove('playing');
    }
    
    
    var jsmediatags = window.jsmediatags;
    // console.log(jsmediatags)
    // From remote host
    jsmediatags.read(blob, {
        onSuccess: function (tag) {
            // console.log(tag);
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
        
        if (chunkType === 'juLi') {
            console.log(chunkType + ' chunk found in mpenepn')
            console.log(buffer.slice(pos, pos + chunkLength));
            await decodeMp3(buffer.slice(pos, pos + chunkLength), chunkLength);
            break;
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
    const albumCover = document.querySelector("#albumCover");
    
    const file = fileInput.files[0];
    
    if (file) {
        const reader = new FileReader();
        
        reader.onload = function (e) {
            previewImage.src = e.target.result;
            const audioElement = document.querySelector("audio");
            audioElement.pause();
            previewImage.classList.remove('playing');
            albumCover.classList.remove('playing');
            previewImage.style.display = 'block';
        };
        
        reader.readAsDataURL(file);
    }
}

window.onload = function () {
    const fileInput = document.getElementById('fileInput');
    fileInput.files.length !== 0 && previewImage();

    const audioElement = document.querySelector("audio");
    audioElement.autoplay = true;
    
    // onClick of first interaction on page before I need the sounds
    // (This is a tiny MP3 file that is silent and extremely short - retrieved from https://bigsoundbank.com and then modified)
    audioElement.src = "data:audio/mpeg;base64,SUQzBAAAAAABEVRYWFgAAAAtAAADY29tbWVudABCaWdTb3VuZEJhbmsuY29tIC8gTGFTb25vdGhlcXVlLm9yZwBURU5DAAAAHQAAA1N3aXRjaCBQbHVzIMKpIE5DSCBTb2Z0d2FyZQBUSVQyAAAABgAAAzIyMzUAVFNTRQAAAA8AAANMYXZmNTcuODMuMTAwAAAAAAAAAAAAAAD/80DEAAAAA0gAAAAATEFNRTMuMTAwVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQsRbAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQMSkAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV";
    
}

// playButton.addEventListener('click', function(){
//     const audioElement = document.querySelector("audio");
//     audioElement.play(); //every array element is constructed using new Audio("yourlink");

//     window.setTimeout(function(){
//       audioElement.pause();

//     },1);
//   })

function playerrr() {
    const audioElement = document.querySelector("audio");
    decodeFile();
    setTimeout(() => {
        // audioElement.play();
        // previewImage();
    }, 500);
    // audioElement.play()
    const CDImage = document.getElementById('previewImage');
    const albumCover = document.querySelector("#albumCover");
    CDImage.classList.add('playing');
    albumCover.classList.add('playing');
}