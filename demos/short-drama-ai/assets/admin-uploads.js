// Keep prototype uploads in this browser so saved templates can be reopened.
const adminTemplateMedia = { database: null, urls: new Map() };

function templateMediaDatabase() {
  if (!adminTemplateMedia.database) {
    adminTemplateMedia.database = new Promise((resolve, reject) => {
      const request = indexedDB.open('hongguo-admin-template-files', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('files');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(Error('文件保存失败，请重新选择文件'));
      request.onblocked = () => reject(Error('文件存储暂不可用，请刷新后重试'));
    }).catch(error => { adminTemplateMedia.database = null; throw error; });
  }
  return adminTemplateMedia.database;
}

async function saveTemplateFile(file) {
  const database = await templateMediaDatabase();
  const key = 'local-template:' + id('FILE');
  await new Promise((resolve, reject) => {
    const transaction = database.transaction('files', 'readwrite');
    transaction.objectStore('files').put(file, key);
    transaction.oncomplete = resolve;
    transaction.onabort = transaction.onerror = () => reject(Error('文件保存失败，请重新选择文件'));
  });
  return key;
}

function templateFileUrl(value) {
  if (!value.startsWith('local-template:')) return Promise.resolve(value);
  if (!adminTemplateMedia.urls.has(value)) {
    const pending = templateMediaDatabase().then(database => new Promise((resolve, reject) => {
      const request = database.transaction('files').objectStore('files').get(value);
      request.onsuccess = () => request.result ? resolve(URL.createObjectURL(request.result)) : reject(Error('文件暂不可用，请重新上传'));
      request.onerror = () => reject(Error('文件读取失败，请重新上传'));
    })).catch(error => { adminTemplateMedia.urls.delete(value); throw error; });
    adminTemplateMedia.urls.set(value, pending);
  }
  return adminTemplateMedia.urls.get(value);
}

function templateMediaImage(value, attributes = '') {
  return `<img ${String(value || '').startsWith('local-template:') ? 'data-template-file="' + esc(value) + '"' : 'src="' + esc(value || '') + '"'} ${attributes}>`;
}

function initAdminTemplateUploads() {
  const hydrate = () => document.querySelectorAll('[data-template-file]:not([data-file-state])').forEach(element => {
    element.dataset.fileState = 'loading';
    templateFileUrl(element.dataset.templateFile).then(url => {
      element.src = url;
      element.dataset.fileState = 'ready';
    }).catch(error => {
      element.dataset.fileState = 'error';
      element.title = error.message;
    });
  });
  const observer = new MutationObserver(hydrate);
  ['main', 'modal'].forEach(key => observer.observe(document.getElementById(key), { childList: true, subtree: true }));
}

function bindTemplateUploads(record) {
  const form = $('#editForm');
  const saveButton = $('#saveForm');
  const selectedType = () => form.querySelector('[name="type"]:checked')?.value || '图片';
  let previousType = selectedType(), pending = 0;
  const controls = {};
  ['cover', 'asset'].forEach(key => {
    const input = form.querySelector(`[name="${key}"]`);
    const original = input.closest('label');
    const container = document.createElement('div');
    const title = key === 'cover' ? '封面上传' : '模板素材上传';
    container.className = 'field template-upload';
    container.dataset.templateUpload = key;
    container.innerHTML = `<span>${title} *</span><div class="template-upload-box"><div class="template-upload-preview" data-upload-preview hidden></div><button type="button" data-upload-button>${key === 'cover' ? '上传封面' : '上传素材'}</button><span class="template-upload-name" data-upload-name></span><small data-upload-hint></small><span class="template-upload-error" role="status" data-upload-error></span></div><input type="file" hidden aria-label="${title}" data-upload-file><input type="hidden" name="${key}Name">`;
    input.type = 'hidden';
    container.append(input);
    original.replaceWith(container);
    const fileInput = container.querySelector('[data-upload-file]');
    const nameInput = container.querySelector(`[name="${key}Name"]`);
    const button = container.querySelector('[data-upload-button]');
    const preview = container.querySelector('[data-upload-preview]');
    const error = container.querySelector('[data-upload-error]');
    nameInput.value = record[key + 'Name'] || '';
    const draw = () => {
      const video = key === 'asset' && selectedType() === '视频';
      fileInput.accept = video ? 'video/mp4,video/webm,video/quicktime' : 'image/jpeg,image/png,image/webp';
      container.querySelector('[data-upload-hint]').textContent = video ? '支持 MP4、MOV、WebM 视频' : '支持 JPG、PNG、WebP 图片';
      container.querySelector('[data-upload-name]').textContent = input.value ? nameInput.value || input.value.split(/[\\/]/).pop() : '未选择文件';
      const showPreview = !!input.value && (key === 'cover' || input.value.startsWith('local-template:'));
      preview.hidden = !showPreview;
      preview.innerHTML = !showPreview ? '' : video
        ? `<video controls preload="metadata" data-template-file="${esc(input.value)}" aria-label="模板素材预览"></video>`
        : templateMediaImage(input.value, `alt="${title}预览"`);
    };
    button.onclick = () => { fileInput.value = ''; fileInput.click(); };
    fileInput.onchange = async () => {
      const file = fileInput.files[0];
      if (!file || !requirePerm('models.edit')) return;
      error.textContent = '';
      const type = selectedType(), video = key === 'asset' && type === '视频';
      const allowed = video ? ['video/mp4', 'video/webm', 'video/quicktime'] : ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowed.includes(file.type) || !file.size) {
        error.textContent = video ? '请选择有效的 MP4、MOV 或 WebM 视频' : '请选择有效的 JPG、PNG 或 WebP 图片';
        return;
      }
      pending++;
      saveButton.disabled = true;
      button.disabled = true;
      button.textContent = '上传中…';
      try {
        const fileKey = await saveTemplateFile(file);
        if (!form.isConnected || (key === 'asset' && selectedType() !== type)) return;
        input.value = fileKey;
        nameInput.value = file.name;
        $('#formError').textContent = '';
        draw();
      } catch (failure) { error.textContent = failure.message; }
      finally {
        pending--;
        saveButton.disabled = pending > 0;
        button.disabled = false;
        button.textContent = key === 'cover' ? '上传封面' : '上传素材';
      }
    };
    controls[key] = { input, nameInput, draw, error, fileInput };
    draw();
  });
  form.querySelectorAll('[name="type"]').forEach(radio => radio.addEventListener('change', () => {
    const type = selectedType();
    if (type !== previousType) {
      const asset = controls.asset;
      asset.input.value = asset.nameInput.value = asset.fileInput.value = '';
      asset.error.textContent = '';
      previousType = type;
      asset.draw();
    }
  }));
}
