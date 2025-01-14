document.getElementById('processButton').addEventListener('click', () => {
    const files = document.getElementById('fileInput').files;
    const mode = document.getElementById('modeSelect').value;
    const fileList = document.getElementById('fileList');
    fileList.innerHTML = '';

    if (files.length === 0) {
        alert('Silakan unggah file terlebih dahulu.');
        return;
    }

    const globalContactName = prompt('Masukkan nama kontak global untuk semua file:');
    if (!globalContactName) {
        alert('Nama kontak tidak boleh kosong.');
        return;
    }

    Array.from(files).forEach(file => {
        const listItem = document.createElement('div');
        listItem.classList.add('file-item');
        const fileName = file.name;
        const [namePart, extension] = fileName.match(/(.+)(\.[^.]+$)/).slice(1); // Memisahkan nama file dan ekstensi
        let newFileName = '';

        try {
            // Proses nama file berdasarkan mode
            if (mode === 'normal') {
                newFileName = `${namePart}.vcf`;
            } else if (mode === 'inBrackets') {
                const match = namePart.match(/\((.*?)\)/);
                if (match) {
                    newFileName = `${match[1]}.vcf`;
                } else {
                    throw new Error('Tidak ada tanda kurung dalam nama file.');
                }
            } else if (mode === 'lastNCharacters') {
                const charCount = parseInt(mode.replace('last', ''), 10);
                if (namePart.length >= charCount) {
                    newFileName = `${namePart.slice(-charCount)}.vcf`;
                } else {
                    throw new Error('Jumlah karakter melebihi panjang nama file.');
                }
            } else if (mode === 'fileName') {
                // Mode baru: Menggunakan nama file awal
                newFileName = `${namePart}.vcf`;
            } else {
                throw new Error('Mode tidak dikenal.');
            }

            // Proses file menjadi VCF
            processTxtToVcf(file, newFileName, globalContactName);

            listItem.innerHTML = `<span>${fileName} → ${newFileName}</span>`;
            listItem.classList.add('success');
        } catch (error) {
            listItem.classList.add('error');
            listItem.innerHTML = `<span>${fileName}</span><span class="error-msg">${error.message}</span>`;
        }

        fileList.appendChild(listItem);
    });
});

function processTxtToVcf(file, newFileName, globalContactName) {
    const reader = new FileReader();
    reader.onload = () => {
        const txtContent = reader.result;
        let localCounter = 1; // Counter lokal untuk angka berurutan dalam satu file
        let currentCategory = 'Anggota'; // Kategori default
        const vcfContent = txtContent
            .split('\n')
            .filter(line => line.trim() !== '') // Hilangkan baris kosong
            .map(line => {
                const contact = line.trim();
                // Cek apakah baris ini adalah kata kunci klasifikasi atau angka
                const newCategory = classifyContact(contact);
                if (newCategory) {
                    currentCategory = newCategory; // Update kategori jika ditemukan kata kunci
                    localCounter = 1; // Reset counter ketika kategori berubah
                }

                // Jika baris berisi angka, buat VCF, jika tidak, lewati
                if (/^\d+$/.test(contact)) {
                    const contactName = `${globalContactName} ${localCounter}`;
                    // Jika kategori Anggota, tidak perlu menambahkan kategori di nama kontak
                    const fullContactName = currentCategory === 'Anggota' ? contactName : `${contactName} (${currentCategory})`; // Menambahkan kategori di nama kontak jika bukan Anggota

                    const contactVcard = `BEGIN:VCARD\nVERSION:3.0\nFN:${fullContactName}\nTEL:${contact}\nEND:VCARD\n`;
                    localCounter++; // Increment counter lokal untuk setiap kontak
                    return contactVcard;
                } else {
                    return ''; // Mengabaikan baris yang bukan angka
                }
            })
            .join('\n');

        const blob = new Blob([vcfContent], { type: 'text/vcard' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = newFileName;
        link.click();
    };
    reader.readAsText(file);
}

// Fungsi untuk mengklasifikasikan kontak
function classifyContact(contact) {
    // Admin: 管理号|管理|管理员|admin|Admin
    if (contact.match(/管理号|管理|管理员|admin|Admin/)) {
        return 'Admin';
    }
    // Navy: 水軍|小号|水军|navy|Navy
    else if (contact.match(/水軍|小号|水军|navy|Navy/)) {
        return 'Navy';
    }
    // Anggota: 数据|客户|底料|进群资源|资料|Anggota
    else if (contact.match(/数据|客户|底料|进群资源|资料|Anggota/)) {
        return 'Anggota';
    }
    // Jika tidak ada kecocokan, return null (tidak mengubah kategori)
    else {
        return null;
    }
}
