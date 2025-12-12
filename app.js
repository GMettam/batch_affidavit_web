let processedFiles = [];

document.addEventListener('DOMContentLoaded', () => {
    const uploadZone = document.getElementById('uploadZone');
    const fileInput = document.getElementById('fileInput');

    uploadZone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => handleFiles(Array.from(e.target.files)));

    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.classList.add('dragover');
    });

    uploadZone.addEventListener('dragleave', () => {
        uploadZone.classList.remove('dragover');
    });

    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.classList.remove('dragover');
        const files = Array.from(e.dataTransfer.files).filter(f => f.type === 'application/pdf');
        if (files.length > 0) handleFiles(files);
    });
});

async function handleFiles(files) {
    const fileList = document.getElementById('fileList');
    fileList.innerHTML = '';
    processedFiles = [];

    for (const file of files) {
        const item = createFileItem(file);
        fileList.appendChild(item);
        
        try {
            await processFile(file, item);
        } catch (error) {
            updateFileStatus(item, 'error', `Error: ${error.message}`);
        }
    }

    if (processedFiles.length > 0) {
        showResults();
    }
}

function createFileItem(file) {
    const div = document.createElement('div');
    div.className = 'file-item';
    div.innerHTML = `
        <div class="file-icon">PDF</div>
        <div class="file-info">
            <div class="file-name">${escapeHtml(file.name)}</div>
            <div class="file-status"><span class="spinner"></span> Processing...</div>
        </div>
    `;
    return div;
}

function updateFileStatus(item, status, message) {
    const statusEl = item.querySelector('.file-status');
    statusEl.className = `file-status ${status}`;
    statusEl.innerHTML = message;
}

async function processFile(file, item) {
    // Extract data from GPC
    updateFileStatus(item, '', '<span class="spinner"></span> Extracting data...');
    const data = await extractData(file);
    
    // Generate affidavit
    updateFileStatus(item, '', '<span class="spinner"></span> Generating affidavit...');
    const blob = await generateAffidavit(data);
    
    const fileName = `Affidavit_${data.caseNumber.replace(/\//g, '-')}.docx`;
    processedFiles.push({
        fileName,
        caseNumber: data.caseNumber,
        claimant: data.claimant,
        defendants: data.defendants,
        blob,
        url: URL.createObjectURL(blob)
    });
    
    updateFileStatus(item, 'success', '✓ Complete');
}

async function extractData(file) {
    const formData = new FormData();
    formData.append('pdf', file);

    const response = await fetch('/.netlify/functions/extract-gpc-data', {
        method: 'POST',
        body: formData
    });

    if (!response.ok) {
        throw new Error('Failed to extract data');
    }

    return await response.json();
}

async function generateAffidavit(data) {
    const response = await fetch('/.netlify/functions/generate-affidavit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });

    if (!response.ok) {
        throw new Error('Failed to generate affidavit');
    }

    return await response.blob();
}

function showResults() {
    const resultsCard = document.getElementById('resultsCard');
    const downloads = document.getElementById('downloads');
    
    downloads.innerHTML = processedFiles.map((file, i) => `
        <div class="download-item">
            <div class="download-info">
                <div style="font-weight: 500;">${escapeHtml(file.fileName)}</div>
                <div style="font-size: 14px; color: #666; margin-top: 5px;">
                    ${escapeHtml(file.caseNumber)} • ${escapeHtml(file.claimant)}
                </div>
            </div>
            <button class="btn btn-primary" onclick="download(${i})">Download</button>
        </div>
    `).join('');
    
    resultsCard.classList.remove('hidden');
}

function download(index) {
    const file = processedFiles[index];
    const a = document.createElement('a');
    a.href = file.url;
    a.download = file.fileName;
    a.click();
}

function startOver() {
    processedFiles.forEach(f => URL.revokeObjectURL(f.url));
    processedFiles = [];
    document.getElementById('fileList').innerHTML = '';
    document.getElementById('resultsCard').classList.add('hidden');
    document.getElementById('fileInput').value = '';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
