// Array with image paths (15 unique images)
const imageUrls = [
    '/assets/img1.jpeg',
    '/assets/img2.jpeg',
    '/assets/img3.jpeg',
    '/assets/img4.jpeg',
    '/assets/img5.jpeg',
    '/assets/img6.jpeg',
    '/assets/img7.jpeg',
    '/assets/img8.jpeg',
    '/assets/img9.jpeg',
    '/assets/img10.jpeg',
    '/assets/img11.jpeg',
    '/assets/img12.jpeg',
    '/assets/img13.jpeg',
    '/assets/img14.jpeg',
    '/assets/img15.jpeg'
  ];
  
  class HorizontalImageTrail {
    constructor() {
      // Main elements (using data attributes for selectors)
      this.container = document.getElementById('horizontalTrail'); // [data-content="trail"]
      
      // Animation parameters
      this.totalImages = 15; // Total number of images
      this.imageWidth = 200; // Image width
      this.imageSpacing = 250; // Distance between images
      this.visibleImages = this.calculateVisibleImages(); // Automatic calculation of visible images
      this.images = [];
      this.currentOffset = 0; // Current trail offset
      
      // Cached elements (found by data attributes)
      this.heroContent = null; // [data-content="hero"]
      this.heroRect = null; // Hero-content dimensions
      this.tracksSection = null; // [data-content="tracks"]
      this.animationEndPoint = 0; // Cached animation end point
      
      this.init();
      this.setupScrollListener();
      this.handleResize();
    }
  
    // Helper method to find elements by data-content attribute
    getElementByDataContent(contentName) {
      return document.querySelector(`[data-content="${contentName}"]`);
    }
  
    // New method to get hero-content information
    getHeroContentInfo() {
      if (!this.heroContent) {
        this.heroContent = this.getElementByDataContent('hero');
      }
      
      if (this.heroContent) {
        this.heroRect = this.heroContent.getBoundingClientRect();
        return {
          right: this.heroRect.right,
          bottom: this.heroRect.bottom,
          width: this.heroRect.width,
          height: this.heroRect.height
        };
      }
      
      return null;
    }
  
    // Method to calculate animation end point
    calculateAnimationEndPoint() {
      if (!this.tracksSection) {
        this.tracksSection = this.getElementByDataContent('tracks');
      }
      
      if (this.tracksSection) {
        // Get the position of the tracks section start
        const tracksRect = this.tracksSection.getBoundingClientRect();
        const tracksTop = tracksRect.top + window.pageYOffset;
        // End animation later - when tracks section is fully visible
        // Add additional distance to see last images when tracks appears
        this.animationEndPoint = Math.max(0, tracksTop + window.innerHeight * 0.3);
      } else {
        // Fallback to full document height
        this.animationEndPoint = document.documentElement.scrollHeight - window.innerHeight;
      }
      
      return this.animationEndPoint;
    }
  
    // Method to calculate adaptive arc points
    calculateArcPoints() {
      const heroInfo = this.getHeroContentInfo();
      
      if (heroInfo) {
        // Left arc point is always in the left corner with minimal margin
        const leftX = 50;
        
        // Calculate Y positions so the arc is below hero-content
        const heroMargin = 200; // Margin from hero-content
        
        // Minimum Y position for left point - below hero-content
        const minLeftY = heroInfo.bottom + heroMargin;
        
        let leftY, rightY;
        
        // If hero-content is too low, adapt the arc
        if (minLeftY > window.innerHeight * 0.8) {
          // Hero-content takes a lot of vertical space - arc goes even lower
          leftY = minLeftY;
          rightY = Math.min(minLeftY - 100, window.innerHeight * 0.5); // Right point higher than left
        } else {
          // Normal arc, but not higher than hero-content
          leftY = Math.max(minLeftY, window.innerHeight * 0.8);
          rightY = window.innerHeight * 0.3;
        }
        
        return { leftY, rightY, leftX };
      } else {
        // Fallback to original values
        return {
          leftY: window.innerHeight * 0.8,
          rightY: window.innerHeight * 0.3,
          leftX: 50
        };
      }
    }
  
    calculateVisibleImages() {
      // Calculate how many images fit on screen
      const screenWidth = window.innerWidth;
      const leftPadding = 50; // Left margin
      const rightPadding = 100; // Right margin for comfort
      const availableWidth = screenWidth - leftPadding - rightPadding;
      
      // Number of images = available width / distance between images
      const calculatedImages = Math.floor(availableWidth / this.imageSpacing);
      
      // Limit minimum 3 images, maximum - total count
      return Math.max(3, Math.min(calculatedImages, this.totalImages));
    }
  
    init() {
      // Get adaptive arc points
      const arcPoints = this.calculateArcPoints();
      
      // Create all 15 images
      for (let i = 0; i < this.totalImages; i++) {
        const img = document.createElement('img');
        img.className = 'trail-image';
        
        // Take image from array (without repetitions)
        img.src = imageUrls[i];
        
        // Random rotation
        const rotation = (Math.random() - 0.5) * 20;
        
        // Initial position - images arranged in arc
        const x = arcPoints.leftX + (i * this.imageSpacing);
        
        // Create arc with adaptive points
        const totalWidth = (this.totalImages - 1) * this.imageSpacing; // Total trail width
        const progress = i / (this.totalImages - 1); // Progress from 0 to 1
        
        // Y positions: use adaptive values
        const leftY = arcPoints.leftY;   // Left position
        const rightY = arcPoints.rightY; // Right position
        
        // Linear interpolation between positions
        const linearY = leftY + (rightY - leftY) * progress;
        
        // Add arc (sinusoidal curve upward)
        const arcHeight = Math.abs(leftY - rightY) * 0.3; // Arc height proportional to Y difference
        const arcOffset = Math.sin(progress * Math.PI) * arcHeight;
        
        const y = linearY - arcOffset; // Arc goes up, so subtract
        
        img.style.left = `${x}px`;
        img.style.top = `${y}px`;
        img.style.transform = `translate(-50%, -50%) rotate(${rotation}deg)`;
        img.style.opacity = '1';
        
        this.container.appendChild(img);
        this.images.push({
          element: img,
          index: i,
          initialX: x,
          initialY: y,
          rotation: rotation,
          isVisible: true,
          arcPoints: arcPoints // Save arc points for each image
        });
      }
    }
  
    setupScrollListener() {
      let ticking = false;
      
      window.addEventListener('scroll', () => {
        if (!ticking) {
          requestAnimationFrame(() => {
            this.updateImagePositions();
            ticking = false;
          });
          ticking = true;
        }
      });
    }
  
    updateImagePositions() {
      // Get animation end point (cached value)
      const animationEndPoint = this.calculateAnimationEndPoint();
      
      // Get scroll progress (from 0 to 1) only until animation end point
      const scrollTop = window.pageYOffset;
      const scrollProgress = Math.min(scrollTop / animationEndPoint, 1);
      
      // Calculate maximum offset to show all images
      const baseMaxOffset = (this.totalImages - this.visibleImages) * this.imageSpacing;
      
      // Add offset so ALL images go beyond the left edge
      // Need to shift so even the first (rightmost) image goes beyond the left edge
      const screenWidth = window.innerWidth;
      const additionalOffset = screenWidth + this.imageSpacing; // Offset for all images to exit
      const totalMaxOffset = baseMaxOffset + additionalOffset;
      
      // Calculate current offset considering full range
      this.currentOffset = scrollProgress * totalMaxOffset;
      
      // Get current adaptive arc points once for all images
      const currentArcPoints = this.calculateArcPoints();
      
      // Update positions of all images
      this.images.forEach((imgData, index) => {
        const { element, initialX, initialY, rotation } = imgData;
        
        // Base position considering horizontal offset
        const baseX = initialX - this.currentOffset;
        
        // Calculate image movement progress along arc
        // When image reaches left screen edge, it starts moving down
        const imageProgress = (baseX + this.currentOffset) / (window.innerWidth + this.imageSpacing);
        const arcProgress = Math.max(0, Math.min(1, 1 - imageProgress)); // from 1 to 0
        
        // Calculate Y position based on current X position considering vertical offset during scroll
        
        const totalWidth = (this.totalImages - 1) * this.imageSpacing;
        const currentXInTrail = baseX - currentArcPoints.leftX; // Remove margin
        const screenProgress = Math.max(0, Math.min(1, currentXInTrail / totalWidth));
        
        // Add vertical arc offset during scroll (arc rises up)
        const verticalScrollOffset = scrollProgress * window.innerHeight * 0.5; // Raise arc by 50% of screen height
        
        const leftY = currentArcPoints.leftY - verticalScrollOffset;
        const rightY = currentArcPoints.rightY - verticalScrollOffset;
        const linearY = leftY + (rightY - leftY) * screenProgress;
        const arcHeight = Math.abs(leftY - rightY) * 0.3;
        const arcOffset = Math.sin(screenProgress * Math.PI) * arcHeight;
        const arcY = linearY - arcOffset;
        
        // Handle images beyond screen edges
        let finalX = baseX;
        let finalY = arcY;
        
        // Calculate rotation based on position - straighten images near left edge
        let currentRotation = rotation;
        const leftEdgeDistance = baseX + this.imageWidth / 2; // Distance from left edge
        const straightenZone = this.imageSpacing * 0.8; // Zone where images start to straighten
        
        if (leftEdgeDistance < straightenZone && leftEdgeDistance > -this.imageWidth) {
          // Image is approaching left edge - gradually reduce rotation to 0
          const straightenProgress = Math.max(0, Math.min(1, (straightenZone - leftEdgeDistance) / straightenZone));
          currentRotation = rotation * (1 - straightenProgress); // Gradually reduce to 0
        }
        
        if (baseX < -this.imageWidth / 2) {
          // Image beyond left edge - moves to bottom left corner
          const exitProgress = Math.abs(baseX + this.imageWidth / 2) / (this.imageSpacing * 2);
          finalX = baseX - (exitProgress * this.imageSpacing * 0.5); // Further left
          // Apply vertical offset to images beyond edge too
          const verticalScrollOffset = scrollProgress * window.innerHeight * 0.5;
          finalY = arcY + (exitProgress * window.innerHeight * 0.4); // Down to bottom edge
          
          // Images are completely straight (0 rotation) when beyond left edge
          currentRotation = 0;
          
          // Reduce scale as they exit
          const scale = Math.max(0.3, 1 - exitProgress * 0.7);
          element.style.transform = `translate(-50%, -50%) rotate(${currentRotation}deg) scale(${scale})`;
          element.style.opacity = Math.max(0.1, 1 - exitProgress * 0.8);
        } else if (baseX > window.innerWidth + this.imageWidth / 2) {
          // Image beyond right edge - moves to bottom right corner
          const exitProgress = (baseX - window.innerWidth - this.imageWidth / 2) / (this.imageSpacing * 2);
          finalX = baseX + (exitProgress * this.imageSpacing * 0.5); // Further right
          // Apply vertical offset to images beyond edge too
          const verticalScrollOffset = scrollProgress * window.innerHeight * 0.5;
          finalY = arcY + (exitProgress * window.innerHeight * 0.4); // Down to bottom edge
          
          // Reduce scale as they exit
          const scale = Math.max(0.3, 1 - exitProgress * 0.7);
          element.style.transform = `translate(-50%, -50%) rotate(${currentRotation}deg) scale(${scale})`;
          element.style.opacity = Math.max(0.1, 1 - exitProgress * 0.8);
        } else {
          // Normal arc movement
          
          // Remove opacity and scale fading - images remain visible
          // until they naturally go beyond screen edge
          element.style.transform = `translate(-50%, -50%) rotate(${currentRotation}deg)`;
          element.style.opacity = '1';
          
          // Add small vertical oscillation
          const wave = Math.sin((scrollProgress * Math.PI * 2) + (index * 0.5)) * 10;
          finalY = arcY + wave;
        }
        
        // Apply final positions
        element.style.left = `${finalX}px`;
        element.style.top = `${finalY}px`;
      });
    }
  
    handleResize() {
      window.addEventListener('resize', () => {
        // Recalculate number of visible images
        this.visibleImages = this.calculateVisibleImages();
        
        // Get new adaptive arc points
        const newArcPoints = this.calculateArcPoints();
        
        // Recalculate animation end point (tracks position might have changed)
        this.calculateAnimationEndPoint();
        
        // Update positions on window resize
        this.images.forEach((imgData, index) => {
          // Recalculate positions with new adaptive points
          const progress = index / (this.totalImages - 1);
          const leftY = newArcPoints.leftY;
          const rightY = newArcPoints.rightY;
          const linearY = leftY + (rightY - leftY) * progress;
          const arcHeight = Math.abs(leftY - rightY) * 0.3;
          const arcOffset = Math.sin(progress * Math.PI) * arcHeight;
          
          // Update X and Y positions
          imgData.initialX = newArcPoints.leftX + (index * this.imageSpacing);
          imgData.initialY = linearY - arcOffset;
          imgData.arcPoints = newArcPoints;
        });
        this.updateImagePositions();
      });
    }
  }
  
  // Ensure page starts from top on any load/refresh
  window.addEventListener('beforeunload', () => {
    window.scrollTo(0, 0);
  });
  
  // Initialize when DOM is loaded
  document.addEventListener('DOMContentLoaded', () => {
    // Always start from the top of the page on page load/refresh
    window.scrollTo(0, 0);
    
    new HorizontalImageTrail();
  });
  
  // Additional fallback for when page is fully loaded
  window.addEventListener('load', () => {
    window.scrollTo(0, 0);
  }); 