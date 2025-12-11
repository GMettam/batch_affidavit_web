// Application State
let appState = {
    uploadedFiles: [],
    processedAffidavits: [],
    totalFiles: 0,
    successCount: 0,
    errorCount: 0
};

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeUploadZone();
    initializeButtons();
});

// ==================== FILE UPLOAD ====================

function initializeUploadZone() {
    const uploadZone = document.getElementById('uploadZone');
    const fileInput = document.getElementById('fileInput');

    // Click to upload
    uploadZone.addEventListener('click', () => fileInput.click());

    // File input change
    fileInput.addEventListener('change', handleFileSelect);

    // Drag and drop
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
        
        const files = Array.from(e.dataTransfer.files).filter(f => 
            f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
        );
        
        if (files.length > 0) {
            processFiles(files);
        } else {
            alert('Please upload PDF files only.');
        }
    });
}

function handleFileSelect(e) {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
        processFiles(files);
    }
}

async function processFiles(files) {
    // Reset state
    appState.uploadedFiles = files;
    appState.totalFiles = files.length;
    appState.successCount = 0;
    appState.errorCount = 0;
    appState.processedAffidavits = [];

    // Show progress section
    const progressSection = document.getElementById('progressSection');
    progressSection.style.display = 'block';
    updateProgress(0, files.length);

    // Clear and populate file list
    const fileList = document.getElementById('fileList');
    fileList.innerHTML = '';

    // Process each file
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileItem = createFileItem(file);
        fileList.appendChild(fileItem);

        try {
            await processGPCAndGenerateAffidavit(file, fileItem);
            appState.successCount++;
        } catch (error) {
            console.error('Error processing file:', error);
            updateFileStatus(fileItem, 'error', `Error: ${error.message}`);
            appState.errorCount++;
        }

        updateProgress(i + 1, files.length);
    }

    // Show download section
    showDownloadSection();
}

function createFileItem(file) {
    const fileItem = document.createElement('div');
    fileItem.className = 'file-item';
    fileItem.innerHTML = `
        <div class="file-icon">PDF</div>
        <div class="file-info">
            <div class="file-name">${escapeHtml(file.name)}</div>
            <div class="file-status processing">
                <span class="spinner"></span>
                Extracting data and generating affidavit...
            </div>
        </div>
    `;
    return fileItem;
}

function updateFileStatus(fileItem, statusClass, message) {
    const statusElement = fileItem.querySelector('.file-status');
    statusElement.className = `file-status ${statusClass}`;
    statusElement.innerHTML = message;
}

function updateProgress(current, total) {
    const percentage = (current / total) * 100;
    document.getElementById('progressFill').style.width = `${percentage}%`;
    document.getElementById('progressText').textContent = 
        `Processing ${current} of ${total} files...`;
}

// ==================== GPC PROCESSING ====================

async function processGPCAndGenerateAffidavit(file, fileItem) {
    // Step 1: Extract data from GPC
    updateFileStatus(fileItem, 'processing', 
        '<span class="spinner"></span> Step 1/2: Extracting case data...');
    
    const extractedData = await extractGPCData(file);
    
    // Step 2: Generate affidavit
    updateFileStatus(fileItem, 'processing', 
        '<span class="spinner"></span> Step 2/2: Generating affidavit...');
    
    const affidavitBlob = await generateAffidavit(extractedData);
    
    // Create download URL
    const url = URL.createObjectURL(affidavitBlob);
    const fileName = `Affidavit_${extractedData.caseNumber.replace(/\//g, '-')}.docx`;
    
    // Store for later download
    appState.processedAffidavits.push({
        fileName: fileName,
        caseNumber: extractedData.caseNumber,
        claimant: extractedData.claimant,
        defendants: extractedData.defendants,
        url: url,
        blob: affidavitBlob
    });
    
    updateFileStatus(fileItem, 'completed', '✓ Affidavit generated successfully');
}

async function extractGPCData(file) {
    const formData = new FormData();
    formData.append('pdf', file);

    const response = await fetch('/.netlify/functions/extract-gpc-data', {
        method: 'POST',
        body: formData
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to extract data from GPC');
    }

    const data = await response.json();
    
    if (data.error) {
        throw new Error(data.error);
    }

    return data;
}

async function generateAffidavit(caseData) {
    const response = await fetch('/.netlify/functions/generate-affidavit', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(caseData)
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to generate affidavit');
    }

    return await response.blob();
}

// ==================== DOWNLOAD SECTION ====================

function showDownloadSection() {
    // Update stats
    document.getElementById('totalFiles').textContent = appState.totalFiles;
    document.getElementById('successCount').textContent = appState.successCount;
    document.getElementById('errorCount').textContent = appState.errorCount;

    // Show download section
    const downloadSection = document.getElementById('downloadSection');
    downloadSection.classList.add('visible');
    downloadSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

    // Populate download list
    renderDownloadList();
}

function renderDownloadList() {
    const downloadList = document.getElementById('downloadList');
    downloadList.innerHTML = '';

    if (appState.processedAffidavits.length === 0) {
        downloadList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📭</div>
                <div class="empty-text">No affidavits generated</div>
            </div>
        `;
        return;
    }

    appState.processedAffidavits.forEach(affidavit => {
        const defendantNames = affidavit.defendants
            .map(d => d.name)
            .join(', ');

        const item = document.createElement('div');
        item.className = 'download-item';
        item.innerHTML = `
            <div class="download-icon">📄</div>
            <div class="download-info">
                <div class="download-name">${escapeHtml(affidavit.fileName)}</div>
                <div class="download-case">
                    Case ${escapeHtml(affidavit.caseNumber)} • 
                    ${escapeHtml(affidavit.claimant)} v ${escapeHtml(defendantNames)}
                </div>
            </div>
            <button class="btn btn-primary" onclick="downloadSingleAffidavit('${affidavit.fileName}')">
                📥 Download
            </button>
        `;
        downloadList.appendChild(item);
    });
}

function downloadSingleAffidavit(fileName) {
    const affidavit = appState.processedAffidavits.find(a => a.fileName === fileName);
    if (!affidavit) return;

    const a = document.createElement('a');
    a.href = affidavit.url;
    a.download = affidavit.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

// ==================== BUTTON HANDLERS ====================

function initializeButtons() {
    document.getElementById('downloadAllBtn').addEventListener('click', downloadAllAffidavits);
    document.getElementById('startOverBtn').addEventListener('click', startOver);
}

function downloadAllAffidavits() {
    if (appState.processedAffidavits.length === 0) return;

    // Download each file with a small delay
    appState.processedAffidavits.forEach((affidavit, index) => {
        setTimeout(() => {
            downloadSingleAffidavit(affidavit.fileName);
        }, index * 500); // 500ms delay between downloads
    });
}

function startOver() {
    if (confirm('Start over? This will clear all generated affidavits.')) {
        // Revoke all blob URLs
        appState.processedAffidavits.forEach(affidavit => {
            URL.revokeObjectURL(affidavit.url);
        });

        // Reset state
        appState = {
            uploadedFiles: [],
            processedAffidavits: [],
            totalFiles: 0,
            successCount: 0,
            errorCount: 0
        };

        // Reset UI
        document.getElementById('fileList').innerHTML = '';
        document.getElementById('progressSection').style.display = 'none';
        document.getElementById('downloadSection').classList.remove('visible');
        document.getElementById('fileInput').value = '';

        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

// ==================== UTILITY FUNCTIONS ====================

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Generate unique ID
function generateId() {
    return 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}
