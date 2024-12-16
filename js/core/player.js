// Constants
const PNG_HEADER = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
const DIGCD_CHUNK_TYPE = 'juLi';
const SILENT_AUDIO = "data:audio/mpeg;base64,SUQzBAAAAAABEVRYWFgAAAAtAAADY29tbWVudABCaWdTb3VuZEJhbmsuY29tIC8gTGFTb25vdGhlcXVlLm9yZwBURU5DAAAAHQAAA1N3aXRjaCBQbHVzIMKpIE5DSCBTb2Z0d2FyZQBUSVQyAAAABgAAAzIyMzUAVFNTRQAAAA8AAANMYXZmNTcuODMuMTAwAAAAAAAAAAAAAAD/80DEAAAAA0gAAAAATEFNRTMuMTAwVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQsRbAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQMSkAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV";

// DOM Elements
const elements = {
    fileInput: document.getElementById('fileInput'),
    previewImage: document.getElementById('previewImage'),
    albumCover: document.getElementById('albumCover'),
    audioPlayer: document.getElementById('audioPlayer'),
    playButton: document.getElementById('playButton'),
    uploadLabel: document.getElementById('uploadLabel')
};

// File Reading Utilities
async function readFileAsBuffer(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = event => resolve(new Uint8Array(event.target.result));
        reader.onerror = error => reject(error);
        reader.readAsArrayBuffer(file);
    });
}

function getBigEndian(buffer, offset) {
    return buffer.slice(offset, offset + 4).reduce((val, byte) => (val << 8) | byte, 0);
}

// PNG Processing
function validatePNGHeader(buffer) {
    const header = buffer.slice(0, 8);
    return header.every((byte, i) => byte === PNG_HEADER[i]);
}

async function extractMP3FromPNG(buffer) {
    let position = 8; // Skip PNG header

    while (position < buffer.length) {
        const chunkLength = getBigEndian(buffer, position);
        position += 4;
        
        const chunkType = String.fromCharCode(...buffer.slice(position, position + 4));
        position += 4;

        if (chunkType === DIGCD_CHUNK_TYPE) {
            return buffer.slice(position, position + chunkLength);
        }

        position += chunkLength + 4; // Skip chunk data and CRC
    }

    throw new Error('No DigiCD audio data found in this file');
}

// Audio Processing
async function processAudioData(audioData) {
    const blob = new Blob([audioData], { type: 'audio/mp3' });
    const audioUrl = URL.createObjectURL(blob);
    
    elements.audioPlayer.src = audioUrl;
    await extractAlbumArt(blob);
    
    return audioUrl;
}

async function extractAlbumArt(audioBlob) {
    return new Promise((resolve) => {
        window.jsmediatags.read(audioBlob, {
            onSuccess: (tag) => {
                const picture = tag.tags.picture;
                if (picture) {
                    const base64String = picture.data.reduce((str, byte) => str + String.fromCharCode(byte), '');
                    const imageUri = `data:${picture.format};base64,${window.btoa(base64String)}`;
                    elements.albumCover.src = imageUri;
                    elements.albumCover.style.display = 'block';
                }
                resolve();
            },
            onError: () => resolve() // Silently fail if no album art
        });
    });
}

// UI Handlers
function updateUIForPlayback(isPlaying) {
    elements.previewImage.classList.toggle('playing', isPlaying);
    elements.albumCover.classList.toggle('playing', isPlaying);
}

async function handleFilePreview() {
    const file = elements.fileInput.files[0];
    if (!file) {
        elements.playButton.classList.remove('visible');
        return;
    }

    try {
        // First show the CD preview
        const reader = new FileReader();
        reader.onload = (e) => {
            elements.previewImage.src = e.target.result;
            elements.previewImage.style.display = 'block';
            elements.audioPlayer.pause();
            updateUIForPlayback(false);
        };
        reader.readAsDataURL(file);

        // Then validate if it's a DigiCD
        const buffer = await readFileAsBuffer(file);
        if (validatePNGHeader(buffer)) {
            // Check for DigiCD chunk
            let position = 8; // Skip PNG header
            let isValidDigiCD = false;

            while (position < buffer.length) {
                const chunkLength = getBigEndian(buffer, position);
                position += 4;
                const chunkType = String.fromCharCode(...buffer.slice(position, position + 4));
                
                if (chunkType === DIGCD_CHUNK_TYPE) {
                    isValidDigiCD = true;
                    break;
                }
                
                position += 4 + chunkLength + 4; // Skip chunk type, data, and CRC
            }

            if (isValidDigiCD) {
                // Show play button with animation
                elements.uploadLabel.classList.remove('visible');
                elements.playButton.classList.add('visible');

            } else {
                elements.playButton.classList.remove('visible');
                alert('This PNG file is not a valid DigiCD');
            }
        } else {
            elements.playButton.classList.remove('visible');
            alert('Please insert a valid PNG file');
        }
    } catch (error) {
        console.error('Error previewing file:', error);
        elements.playButton.classList.remove('visible');
        alert('Error reading file');
    }
}

// Main Player Functions
async function playDigiCD() {
    try {
        const file = elements.fileInput.files[0];
        if (!file) {
            throw new Error('Please insert a DigiCD first');
        }

        elements.playButton.disabled = true;
        const buffer = await readFileAsBuffer(file);
        if (!validatePNGHeader(buffer)) {
            throw new Error('Invalid DigiCD format');
        }

        const audioData = await extractMP3FromPNG(buffer);
        await processAudioData(audioData);
        
        updateUIForPlayback(true);
        await elements.audioPlayer.play();

        elements.playButton.classList.remove('visible');
        elements.uploadLabel.classList.add('visible');
        
        console.log(`
        ################################
        # People's Coalition of Tandy  #
        #        DigiCD Format         #
        ################################
        `);
    } catch (error) {
        console.error('Playback error:', error);
        alert(error.message);
    } finally {
        elements.playButton.disabled = !elements.fileInput.files.length;
    }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    elements.fileInput.addEventListener('change', handleFilePreview);
    elements.playButton.addEventListener('click', playDigiCD);
    elements.audioPlayer.addEventListener('ended', () => updateUIForPlayback(false));
    
    // Initialize audio context with silent audio to enable immediate playback
    elements.audioPlayer.src = SILENT_AUDIO;
});

// Export player function for global access
window.playerrr = playDigiCD;