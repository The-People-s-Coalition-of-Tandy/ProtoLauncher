# Tandy DigiCD Launcher

A digital music format that embeds MP3 audio data within PNG images, creating virtual "CDs" that can be played in a web browser. Built with vanilla JavaScript and styled with CSS.
<p align="center"><img src="https://launcher.pcotandy.org/assets/images/ui/hand.png"></p>

<a href="https://launcher.pcotandy.org">Try the DigiCD Player</a>


### The DigiCD Format
DigiCDs are PNG images that contain hidden MP3 data, allowing music to be stored and shared as images while maintaining full audio quality. When a DigiCD is loaded into the player, it:

1. Validates the PNG header
2. Extracts the embedded MP3 data
3. Creates an audio blob for playback

#### Encoding Process
1. **Image Preparation**
   - Takes source PNG image and MP3 file
   - Extracts raw image data into a buffer

2. **Data Embedding**
   - Converts MP3 file to binary data
   - Injects MP3 data into a custom chunk
   - Performs CRC32 checksum on the data
   - Writes the data to a new PNG file

#### Decoding Process
1. **Validation**
   - Checks PNG signature (‰PNG\r\n\x1A\n)
   - Verifies presence of DigiCD custom chunk
   - Validates CRC32 checksum

2. **Data Extraction**
   - Locates embedded MP3 data using custom chunk identifier
   - Creates Blob URL for audio playback

### Technologies
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Audio Processing**: Web Audio API
- **Image Processing**: Canvas API
- **File Handling**: Blob API, FileReader API
- **Metadata**: jsmediatags library
