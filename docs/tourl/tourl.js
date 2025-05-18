document.addEventListener('DOMContentLoaded', function() {
    const dropArea = document.getElementById('dropArea');
    const fileInput = document.getElementById('fileInput');
    const uploadBtn = document.getElementById('uploadBtn');
    const resultContainer = document.getElementById('resultContainer');
    const resultLink = document.getElementById('resultLink');
    const copyBtn = document.getElementById('copyBtn');
    const loading = document.getElementById('loading');

    // Handle drag and drop
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, unhighlight, false);
    });

    function highlight() {
        dropArea.style.backgroundColor = 'rgba(168, 230, 207, 0.5)';
    }

    function unhighlight() {
        dropArea.style.backgroundColor = '';
    }

    dropArea.addEventListener('drop', handleDrop, false);
    dropArea.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', handleFiles);

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        handleFiles({ target: { files } });
    }

    function handleFiles(e) {
        const files = e.target.files;
        if (files.length) {
            const fileMsg = dropArea.querySelector('.file-msg');
            fileMsg.textContent = files[0].name;
        }
    }

    // Upload function
    uploadBtn.addEventListener('click', async function() {
        const file = fileInput.files[0];
        if (!file) {
            alert('Please select a file first!');
            return;
        }

        const service = document.querySelector('input[name="service"]:checked').value;
        loading.classList.remove('hidden');
        resultContainer.classList.add('hidden');

        try {
            const formData = new FormData();
            formData.append('file', file);

            let endpoint = '';
            switch(service) {
                case 'catbox':
                    endpoint = 'https://catbox.moe/user/api.php';
                    break;
                case 'pomf':
                    endpoint = 'https://pomf.lain.la/upload.php';
                    break;
                case 'fileio':
                    endpoint = 'https://file.io/?expires=1d';
                    break;
                case 'nyxs':
                    endpoint = 'https://uploader.nyxs.pw/upload';
                    break;
                case 'supa':
                    endpoint = 'https://i.supa.codes/api/upload';
                    break;
                case 'tmpfiles':
                    endpoint = 'https://tmpfiles.org/api/v1/upload';
                    break;
                case 'uguu':
                    endpoint = 'https://uguu.se/upload.php';
                    break;
                case 'freeimage':
                    endpoint = 'https://freeimage.host/api/1/upload';
                    break;
            }

            const response = await fetch(endpoint, {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            let link = '';
            switch(service) {
                case 'catbox':
                    link = data;
                    break;
                case 'pomf':
                    link = data.files[0].url;
                    break;
                case 'fileio':
                    link = data.link;
                    break;
                case 'nyxs':
                    link = data.url;
                    break;
                case 'supa':
                    link = data.link;
                    break;
                case 'tmpfiles':
                    link = data.data.url.replace('s.org/', 's.org/dl/');
                    break;
                case 'uguu':
                    link = data.files[0].url;
                    break;
                case 'freeimage':
                    link = data.image.url;
                    break;
            }

            resultLink.textContent = link;
            resultLink.innerHTML += `<br><small>Uploaded to ${service}</small>`;
            resultContainer.classList.remove('hidden');
        } catch (error) {
            console.error('Upload error:', error);
            resultLink.textContent = 'Error uploading file. Please try again.';
            resultContainer.classList.remove('hidden');
        } finally {
            loading.classList.add('hidden');
        }
    });

    // Copy link function
    copyBtn.addEventListener('click', function() {
        const text = resultLink.textContent.split('\n')[0];
        navigator.clipboard.writeText(text).then(() => {
            const originalText = copyBtn.textContent;
            copyBtn.textContent = 'Copied!';
            setTimeout(() => {
                copyBtn.textContent = originalText;
            }, 2000);
        });
    });
});