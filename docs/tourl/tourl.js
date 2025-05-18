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

    // Improved upload function with service-specific handling
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
            let link = '';
            
            switch(service) {
                case 'catbox':
                    link = await uploadToCatbox(file);
                    break;
                case 'pomf':
                    link = await uploadToPomf(file);
                    break;
                case 'fileio':
                    link = await uploadToFileIO(file);
                    break;
                case 'nyxs':
                    link = await uploadToNyxs(file);
                    break;
                case 'supa':
                    link = await uploadToSupa(file);
                    break;
                case 'tmpfiles':
                    link = await uploadToTmpFiles(file);
                    break;
                case 'uguu':
                    link = await uploadToUguu(file);
                    break;
                case 'freeimage':
                    link = await uploadToFreeImage(file);
                    break;
                default:
                    throw new Error('Invalid service selected');
            }

            resultLink.innerHTML = `<a href="${link}" target="_blank">${link}</a><br><small>Uploaded to ${service}</small>`;
            resultContainer.classList.remove('hidden');
        } catch (error) {
            console.error('Upload error:', error);
            resultLink.textContent = `Error: ${error.message}`;
            resultContainer.classList.remove('hidden');
        } finally {
            loading.classList.add('hidden');
        }
    });

    // Service-specific upload functions
    async function uploadToCatbox(file) {
        const formData = new FormData();
        formData.append('reqtype', 'fileupload');
        formData.append('userhash', '');
        formData.append('fileToUpload', file);
        
        const response = await fetch('https://catbox.moe/user/api.php', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) throw new Error('Catbox upload failed');
        return await response.text();
    }

    async function uploadToPomf(file) {
        const formData = new FormData();
        formData.append('files[]', file);
        
        const response = await fetch('https://pomf.lain.la/upload.php', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        if (!data.success) throw new Error('Pomf upload failed');
        return data.files[0].url;
    }

    async function uploadToFileIO(file) {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch('https://file.io/?expires=1d', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        if (!data.success) throw new Error('File.io upload failed');
        return data.link;
    }

    async function uploadToNyxs(file) {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch('https://uploader.nyxs.pw/upload', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        if (!data.url) throw new Error('Nyxs upload failed');
        return data.url;
    }

    async function uploadToSupa(file) {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch('https://i.supa.codes/api/upload', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        if (!data.link) throw new Error('Supa upload failed');
        return data.link;
    }

    async function uploadToTmpFiles(file) {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch('https://tmpfiles.org/api/v1/upload', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        if (!data.data?.url) throw new Error('TmpFiles upload failed');
        return data.data.url.replace('s.org/', 's.org/dl/');
    }

    async function uploadToUguu(file) {
        const formData = new FormData();
        formData.append('files[]', file);
        
        const response = await fetch('https://uguu.se/upload.php', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        if (!data.files?.[0]?.url) throw new Error('Uguu upload failed');
        return data.files[0].url;
    }

    async function uploadToFreeImage(file) {
        const formData = new FormData();
        formData.append('source', file);
        formData.append('key', '6d207e02198a847aa98d0a2a901485a5'); // Public API key
        
        const response = await fetch('https://freeimage.host/api/1/upload', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        if (!data.image?.url) throw new Error('FreeImage upload failed');
        return data.image.url;
    }

    // Copy link function
    copyBtn.addEventListener('click', function() {
        const linkElement = resultLink.querySelector('a');
        if (linkElement) {
            navigator.clipboard.writeText(linkElement.href).then(() => {
                const originalText = copyBtn.textContent;
                copyBtn.textContent = 'Copied!';
                setTimeout(() => {
                    copyBtn.textContent = originalText;
                }, 2000);
            });
        }
    });
});