class ImageUploadGUI {
  constructor() {
    console.log('Initializing ImageUploadGUI...');
    
    this.defaultImages = [
      '/assets/sp-v3-1.jpg',
      '/assets/sp-v3-2.jpg',
      '/assets/sp-v3-3.jpg',
      '/assets/sp-v3-4.jpg',
      '/assets/sp-v3-5.jpg',
      '/assets/sp-v3-6.jpg',
      '/assets/sp-v3-1.jpg',
      '/assets/sp-v3-2.jpg',
      '/assets/sp-v3-3.jpg',
      '/assets/sp-v3-4.jpg'
    ];
    
    // Sync with global imageUrls if it exists
    if (window.imageUrls && window.imageUrls.length > 0) {
      this.currentImages = [...window.imageUrls];
      console.log('Synced with existing imageUrls:', this.currentImages.length);
    } else {
      this.currentImages = [...this.defaultImages];
    }
    
    this.maxImages = 10;
    
    console.log('Current images loaded:', this.currentImages.length);
    
    this.initElements();
    this.initEventListeners();
    this.renderPreviews();
  }
  
  initElements() {
    this.guiToggle = document.getElementById('guiToggle');
    this.guiContent = document.getElementById('guiContent');
    this.dropZone = document.getElementById('dropZone');
    this.fileInput = document.getElementById('fileInput');
    this.browseBtn = document.getElementById('browseBtn');
    this.imagePreviews = document.getElementById('imagePreviews');
    this.resetBtn = document.getElementById('resetBtn');
    this.shuffleBtn = document.getElementById('shuffleBtn');
    
    // Check if all elements were found
    const elements = {
      guiToggle: this.guiToggle,
      guiContent: this.guiContent,
      dropZone: this.dropZone,
      fileInput: this.fileInput,
      browseBtn: this.browseBtn,
      imagePreviews: this.imagePreviews,
      resetBtn: this.resetBtn,
      shuffleBtn: this.shuffleBtn
    };
    
    Object.entries(elements).forEach(([name, element]) => {
      if (!element) {
        console.error(`Element not found: ${name}`);
      } else {
        console.log(`Element found: ${name}`);
      }
    });
  }
  
  initEventListeners() {
    // Toggle GUI
    this.guiToggle.addEventListener('click', () => {
      this.guiContent.classList.toggle('collapsed');
    });
    
    // File input
    this.fileInput.addEventListener('change', (e) => {
      this.handleFiles(e.target.files);
    });
    
    // Browse button
    this.browseBtn.addEventListener('click', (e) => {
      e.preventDefault();
      this.fileInput.click();
    });
    
    // Drop zone
    this.dropZone.addEventListener('click', () => {
      this.fileInput.click();
    });
    
    // Drag and drop
    this.dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.dropZone.classList.add('drag-over');
    });
    
    this.dropZone.addEventListener('dragleave', (e) => {
      e.preventDefault();
      this.dropZone.classList.remove('drag-over');
    });
    
    this.dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      this.dropZone.classList.remove('drag-over');
      this.handleFiles(e.dataTransfer.files);
    });
    
    // Control buttons
    this.resetBtn.addEventListener('click', () => {
      this.resetToDefault();
    });
    
    this.shuffleBtn.addEventListener('click', () => {
      this.shuffleImages();
    });
  }
  
  handleFiles(files) {
    const fileArray = Array.from(files);
    const imageFiles = fileArray.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length === 0) {
      alert('Please select image files only.');
      return;
    }
    
    console.log(`Loading ${imageFiles.length} new images...`);
    
    // If user uploads 10 or more images, replace all current images
    if (imageFiles.length >= this.maxImages) {
      // Reset current images array to prepare for complete replacement
      this.currentImages = new Array(this.maxImages);
      
      // Process only first 10 images
      imageFiles.slice(0, this.maxImages).forEach((file, index) => {
        this.addImageFromFile(file, index);
      });
    } else {
      // If less than 10 images, replace from the beginning but keep some defaults
      imageFiles.forEach((file, index) => {
        this.addImageFromFile(file, index);
      });
    }
  }
  
  addImageFromFile(file, index = 0) {
    const reader = new FileReader();
    reader.onload = (e) => {
      // Replace images starting from the beginning
      const targetIndex = index % this.maxImages;
      this.currentImages[targetIndex] = e.target.result;
      
      console.log(`Image loaded at index ${targetIndex}:`, file.name);
      
      // Check if all slots are filled, if not - keep some defaults
      const emptySlots = this.currentImages.filter(img => img === null || img === undefined).length;
      console.log(`Empty slots remaining: ${emptySlots}`);
      
      // Fill empty slots with default images if needed
      if (emptySlots > 0) {
        for (let i = 0; i < this.currentImages.length; i++) {
          if (this.currentImages[i] === null || this.currentImages[i] === undefined) {
            const defaultIndex = i % this.defaultImages.length;
            this.currentImages[i] = this.defaultImages[defaultIndex];
          }
        }
      }
      
      this.renderPreviews();
      this.updateAnimation();
    };
    reader.readAsDataURL(file);
  }
  
  removeImage(index) {
    if (this.currentImages.length > 1) {
      this.currentImages.splice(index, 1);
      
      // If we have less than max images, add a default one
      if (this.currentImages.length < this.maxImages) {
        const defaultIndex = this.currentImages.length % this.defaultImages.length;
        this.currentImages.push(this.defaultImages[defaultIndex]);
      }
      
      this.renderPreviews();
      this.updateAnimation();
    }
  }
  
  renderPreviews() {
    console.log('Rendering previews, current images:', this.currentImages.length);
    this.imagePreviews.innerHTML = '';
    
    this.currentImages.forEach((imageSrc, index) => {
      const previewItem = document.createElement('div');
      previewItem.className = 'preview-item';
      
      const img = document.createElement('img');
      img.src = imageSrc;
      img.alt = `Image ${index + 1}`;
      
      // Add error handling for images
      img.onerror = () => {
        console.error('Failed to load image:', imageSrc.substring(0, 50) + '...');
      };
      
      img.onload = () => {
        console.log('Preview image loaded successfully:', index);
      };
      
      const removeBtn = document.createElement('button');
      removeBtn.className = 'remove-btn';
      removeBtn.innerHTML = '×';
      removeBtn.title = 'Remove image';
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.removeImage(index);
      });
      
      previewItem.appendChild(img);
      previewItem.appendChild(removeBtn);
      this.imagePreviews.appendChild(previewItem);
    });
  }
  
  resetToDefault() {
    this.currentImages = [...this.defaultImages];
    this.renderPreviews();
    this.updateAnimation();
  }
  
  shuffleImages() {
    // Fisher-Yates shuffle algorithm
    for (let i = this.currentImages.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.currentImages[i], this.currentImages[j]] = [this.currentImages[j], this.currentImages[i]];
    }
    this.renderPreviews();
    this.updateAnimation();
  }
  
  updateAnimation() {
    console.log('Updating animation with images:', this.currentImages.length);
    
    // Update the global imageUrls array if it exists
    if (window.imageUrls) {
      window.imageUrls.length = 0;
      window.imageUrls.push(...this.currentImages);
      console.log('Updated global imageUrls:', window.imageUrls.length);
    }
    
    // Trigger animation update if HorizontalImageTrail instance exists
    if (window.horizontalImageTrail) {
      window.horizontalImageTrail.updateImagesFromGUI(this.currentImages);
      console.log('Updated HorizontalImageTrail');
    }
    
    // Dispatch custom event for other components to listen
    window.dispatchEvent(new CustomEvent('imagesUpdated', { 
      detail: { images: this.currentImages } 
    }));
  }
  
  getCurrentImages() {
    return this.currentImages;
  }

  // Method to sync GUI with current animation images
  syncWithAnimation() {
    if (window.imageUrls && window.imageUrls.length > 0) {
      this.currentImages = [...window.imageUrls];
      console.log('Synced GUI with animation images:', this.currentImages.length);
      this.renderPreviews();
    }
  }
}

// Initialize GUI when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.imageUploadGUI = new ImageUploadGUI();
  
  // Sync after a short delay to ensure animation is loaded
  setTimeout(() => {
    if (window.imageUploadGUI) {
      window.imageUploadGUI.syncWithAnimation();
    }
  }, 500);
}); 