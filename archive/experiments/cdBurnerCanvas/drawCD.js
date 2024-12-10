document.getElementById('upload').addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (!file.type.startsWith('image/')) {
        console.log('Please upload an image file.');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const uploadedImage = new Image();
        uploadedImage.onload = function() {
            blendImages(uploadedImage);
        };
        uploadedImage.src = e.target.result;
    };
    reader.readAsDataURL(file);
});

function blendImages(uploadedImage) {
    const canvas1 = document.getElementById('canvas1');
    const ctx1 = canvas1.getContext('2d');
    const canvas2 = document.getElementById('canvas2');
    const ctx2 = canvas2.getContext('2d');

    const cdCoverImage = new Image();
    cdCoverImage.onload = function() {
        canvas1.width = canvas2.width = cdCoverImage.width;
        canvas1.height = canvas2.height = cdCoverImage.height;

        // Set blend mode to 'hard-light' and draw the uploaded image
        ctx1.drawImage(uploadedImage, 0, 0, canvas1.width, canvas1.height);
        
        ctx1.globalCompositeOperation = 'hard-light';
        
        // Draw the CD cover
        ctx1.drawImage(cdCoverImage, 0, 0);
        
        // Use the original CD cover to create a mask on the second canvas
        ctx2.drawImage(cdCoverImage, 0, 0);
        ctx2.globalCompositeOperation = 'source-in';
        ctx2.drawImage(canvas1, 0, 0); // Draw the blended image onto the second canvas

        // Reset composite operations
        ctx1.globalCompositeOperation = 'source-over';
        ctx2.globalCompositeOperation = 'source-over';
    };
    cdCoverImage.src = 'cd.png';
}

function downloadImage() {
    const canvas = document.getElementById('canvas2');
    const image = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = 'blended-cd-cover.png';
    link.href = image;
    link.click();
}
