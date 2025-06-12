(function() {
    // Animation constants
    const TRAJECTORY_CONSTANTS = {
        START_Y_PERCENT: 0.6,    // 60% from section top
        END_Y_PERCENT: 0.5,      // 50% from section top
        ARC_HEIGHT_FACTOR: 0.3,  // Arc height factor
        ANGLE_RANGE: 20,         // Total angle range
        ANGLE_OFFSET: 10,        // Angle offset
        EXIT_SCALE_MIN: 0.3,     // Minimum scale for exiting images
        EXIT_OPACITY_MIN: 0.1,   // Minimum opacity for exiting images
        EXIT_SCALE_FACTOR: 0.7,  // Scale reduction factor for exiting images
        EXIT_OPACITY_FACTOR: 0.8 // Opacity reduction factor for exiting images
    };

    class HorizontalImageTrail {
        constructor() {
            // Main elements
            this.container = document.querySelector('[data-content="trail"]');
            this.animationSection = document.querySelector('[data-content="animation"]');
            this.cmsCollection = document.querySelector('[data-content="cms-collection"]');
            this.cardTemplate = document.querySelector('[data-content="card-template"]');
            
            // Validate required elements
            if (!this.container || !this.animationSection || !this.cmsCollection || !this.cardTemplate) {
                console.error('Required elements not found. Make sure all data-content attributes are present.');
                return;
            }
            
            // Get CMS data
            this.cmsData = this.getCmsData();
            if (!this.cmsData.length) {
                console.error('No CMS data found. Make sure cms-collection has items with required data attributes.');
                return;
            }
            
            // Get dimensions from template
            const templateElement = this.cardTemplate.querySelector('[data-content="card-template-item"]');
            if (!templateElement) {
                console.error('Template item not found');
                return;
            }
            
            const computedStyle = getComputedStyle(templateElement);
            
            // Animation parameters
            this.totalImages = this.cmsData.length;
            this.imageWidth = parseInt(computedStyle.width) || 200;
            const marginRight = parseInt(computedStyle.marginRight) || 35;
            this.imageSpacing = this.imageWidth + marginRight; // Общий spacing = ширина + margin
            
            // Debug information
            console.log('Card dimensions:', {
                width: this.imageWidth,
                marginRight: marginRight,
                totalSpacing: this.imageSpacing
            });
            
            this.visibleImages = this.calculateVisibleImages();
            this.images = [];
            this.scrollProgress = 0;
            this.horizontalProgress = 0;
            
            // Trajectory parameters
            this.trajectory = null;
            this.trajectoryLength = 0;
            
            this.init();
            this.handleResize();
        }

        // Get data from CMS
        getCmsData() {
            if (!this.cmsCollection) return [];
            
            const items = this.cmsCollection.querySelectorAll('[data-content="cms-item"]');
            return Array.from(items).map(item => {
                const image = item.querySelector('[data-speaker="image"]');
                const name = item.querySelector('[data-speaker="name"]');
                const title = item.querySelector('[data-speaker="surname"]');
                
                if (!image || !name || !title) {
                    console.warn('CMS item missing required data attributes:', item);
                    return null;
                }
                
                return {
                    image: image.src,
                    name: name.textContent,
                    title: title.textContent
                };
            }).filter(Boolean); // Remove null items
        }

        // Create card from template
        createCardFromTemplate(data) {
            if (!this.cardTemplate) return null;
            
            const template = this.cardTemplate.querySelector('[data-content="card-template-item"]');
            if (!template) {
                console.error('Card template not found. Make sure [data-content="card-template-item"] exists in the template.');
                return null;
            }
            
            const card = template.cloneNode(true);
            
            // Fill card data
            const image = card.querySelector('[data-speaker="image"]');
            const name = card.querySelector('[data-speaker="name"]');
            const title = card.querySelector('[data-speaker="surname"]');
            
            if (!image || !name || !title) {
                console.error('Template missing required data attributes');
                return null;
            }
            
            image.src = data.image;
            name.textContent = data.name;
            title.textContent = data.title;

            // Add transform styles
            card.style.transformOrigin = 'center center';
            card.style.willChange = 'transform';
            card.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
            
            return card;
        }

        // Calculate trajectory points
        calculateTrajectory() {
            if (!this.animationSection) {
                console.warn('Animation section not found');
                return;
            }
            
            const sectionRect = this.animationSection.getBoundingClientRect();
            const sectionHeight = sectionRect.height;
            
            // Left point trajectory
            const startX = 0; // Fixed to left edge
            const startYInitial = sectionRect.top + (sectionHeight * TRAJECTORY_CONSTANTS.START_Y_PERCENT);
            const startYFinal = sectionRect.top + sectionHeight + 50; // 100% from section top
            
            // Right point trajectory
            const endX = window.innerWidth; // Fixed to right edge
            const endYInitial = sectionRect.top;
            const endYFinal = sectionRect.top + (sectionHeight * TRAJECTORY_CONSTANTS.END_Y_PERCENT);
            
            // Calculate current positions based on scroll progress
            const scrollProgress = Math.min(1, Math.max(0, -sectionRect.top / (sectionHeight * TRAJECTORY_CONSTANTS.END_Y_PERCENT)));
            
            const startY = startYInitial + (startYFinal - startYInitial) * scrollProgress;
            const endY = endYInitial + (endYFinal - endYInitial) * scrollProgress;
            
            // Calculate trajectory length
            const deltaX = endX - startX;
            const deltaY = endY - startY;
            this.trajectoryLength = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            
            this.trajectory = {
                start: { x: startX, y: startY },
                end: { x: endX, y: endY },
                deltaX: deltaX,
                deltaY: deltaY,
                sectionTop: sectionRect.top
            };
            
            return this.trajectory;
        }

        // Calculate how many images fit on trajectory
        calculateVisibleImages() {
            const containerWidth = this.container.offsetWidth;
            const visibleCount = Math.ceil(containerWidth / this.imageSpacing) + 1;
            
            // Debug information
            console.log('Container calculations:', {
                containerWidth: containerWidth,
                imageSpacing: this.imageSpacing,
                visibleCount: visibleCount
            });
            
            return visibleCount;
        }

        // Get position on trajectory based on progress (0 to 1)
        getPositionOnTrajectory(progress) {
            if (!this.trajectory) return { x: 0, y: 0 };
            
            // Linear interpolation along the line
            const linearX = this.trajectory.start.x + (this.trajectory.deltaX * progress);
            const linearY = this.trajectory.start.y + (this.trajectory.deltaY * progress);
            
            // Add arc curve (sine wave for smooth arc)
            const arcHeight = Math.abs(this.trajectory.deltaY) * TRAJECTORY_CONSTANTS.ARC_HEIGHT_FACTOR;
            const arcOffset = Math.sin(progress * Math.PI) * arcHeight;
            
            // Calculate angle based on progress
            const angle = (progress * TRAJECTORY_CONSTANTS.ANGLE_RANGE) - TRAJECTORY_CONSTANTS.ANGLE_OFFSET;
            
            return {
                x: linearX,
                y: linearY - arcOffset,
                angle: angle
            };
        }

        // Create all images
        createImages() {
            // Clear existing images
            this.container.innerHTML = '';
            this.images = [];

            // Calculate trajectory first
            this.calculateTrajectory();

            // Get data from CMS
            const cmsData = this.cmsData;
            if (!cmsData.length) return;

            // Calculate visible width and total width
            const visibleWidth = window.innerWidth;
            const totalWidth = this.totalImages * this.imageSpacing;
            const halfImageWidth = this.imageWidth / 2;

            // Create all images
            for (let i = 0; i < this.totalImages; i++) {
                const data = cmsData[i % cmsData.length];
                const card = this.createCardFromTemplate(data);
                if (!card) continue;
                
                // Calculate position using the same logic as in updateImagePositions
                let x = i * this.imageSpacing;
                
                // Wrap around if image goes off screen
                while (x < -this.imageWidth) {
                    x += totalWidth;
                }
                while (x > visibleWidth) {
                    x -= totalWidth;
                }

                // Calculate Y position and angle based on X position
                const normalizedX = (x + this.imageWidth) / (visibleWidth + this.imageWidth * 2);
                const position = this.getPositionOnTrajectory(normalizedX);
                
                card.style.position = 'fixed';
                card.style.left = `${x}px`;
                card.style.top = `${position.y}px`;
                card.style.transform = `translate(-50%, -50%) rotate(${position.angle}deg)`;
                card.style.opacity = '1';
                card.style.zIndex = '1000';
                
                this.container.appendChild(card);
                this.images.push({
                    element: card,
                    positionIndex: i,
                    angle: position.angle,
                    imageIndex: i
                });
            }
        }

        // Initialize images
        init() {
            this.calculateTrajectory();
            
            if (!this.trajectory) {
                console.error('Trajectory not calculated');
                return;
            }
            
            // Create all images
            this.createImages();
        }

        // Handle window resize
        handleResize() {
            window.addEventListener('resize', () => {
                // Recalculate trajectory
                this.calculateTrajectory();
                
                // Recalculate visible images
                const newVisibleImages = this.calculateVisibleImages();
                this.visibleImages = newVisibleImages;
                
                // Update all image positions
                this.updateImagePositions();
            });

            // Add scroll handler to update positions
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

        // Check if section is visible in viewport
        isSectionVisible() {
            if (!this.animationSection) return false;
            
            const rect = this.animationSection.getBoundingClientRect();
            const windowHeight = window.innerHeight;
            
            // Section is visible if any part of it is in the viewport
            return (
                rect.top < windowHeight &&
                rect.bottom > 0
            );
        }

        // Update image positions based on scroll
        updateImagePositions() {
            if (!this.animationSection) return;

            const sectionRect = this.animationSection.getBoundingClientRect();
            const sectionHeight = sectionRect.height;
            
            // Calculate scroll progress using absolute scroll position
            const scrollTop = window.pageYOffset;
            const sectionTop = sectionRect.top + window.pageYOffset;
            this.scrollProgress = Math.min(1, Math.max(0, scrollTop / sectionTop));
            this.horizontalProgress = this.scrollProgress;

            // Update trajectory on scroll
            this.calculateTrajectory();

            // Calculate visible width and total width
            const visibleWidth = window.innerWidth;
            const totalWidth = this.totalImages * this.imageSpacing;
            
            // Calculate offset based on horizontal progress
            const maxOffset = (this.totalImages - this.visibleImages) * this.imageSpacing;
            const offset = this.horizontalProgress * maxOffset;

            // Pre-calculate common values
            const halfImageWidth = this.imageWidth / 2;
            const imageSpacingDouble = this.imageSpacing * 2;
            const windowHeight = window.innerHeight;

            // Update each image position
            this.images.forEach((image, index) => {
                // Calculate base position for this image
                let x = (index * this.imageSpacing) - offset;
                
                // Wrap around if image goes off screen
                while (x < -this.imageWidth) {
                    x += totalWidth;
                }
                while (x > visibleWidth) {
                    x -= totalWidth;
                }

                // Calculate Y position and angle based on X position
                const normalizedX = (x + this.imageWidth) / (visibleWidth + this.imageWidth * 2);
                const position = this.getPositionOnTrajectory(normalizedX);
                
                let finalX = x;
                let finalY = position.y;
                let finalRotation = position.angle;
                let finalScale = 1;
                let finalOpacity = 1;

                // Handle images beyond screen edges
                if (x < -halfImageWidth) {
                    // Image beyond left edge - moves to bottom left corner
                    const exitProgress = Math.min(1, Math.abs(x + halfImageWidth) / imageSpacingDouble);
                    finalX = x - (exitProgress * this.imageSpacing * 0.5);
                    finalY = position.y + (exitProgress * windowHeight * 0.4);
                    finalRotation = position.angle * (1 - exitProgress);
                    finalScale = Math.max(TRAJECTORY_CONSTANTS.EXIT_SCALE_MIN, 1 - exitProgress * TRAJECTORY_CONSTANTS.EXIT_SCALE_FACTOR);
                    finalOpacity = Math.max(TRAJECTORY_CONSTANTS.EXIT_OPACITY_MIN, 1 - exitProgress * TRAJECTORY_CONSTANTS.EXIT_OPACITY_FACTOR);
                } else if (x > visibleWidth + halfImageWidth) {
                    // Image beyond right edge - moves to bottom right corner
                    const exitProgress = Math.min(1, (x - visibleWidth - halfImageWidth) / imageSpacingDouble);
                    finalX = x + (exitProgress * this.imageSpacing * 0.5);
                    finalY = position.y + (exitProgress * windowHeight * 0.4);
                    finalScale = Math.max(TRAJECTORY_CONSTANTS.EXIT_SCALE_MIN, 1 - exitProgress * TRAJECTORY_CONSTANTS.EXIT_SCALE_FACTOR);
                    finalOpacity = Math.max(TRAJECTORY_CONSTANTS.EXIT_OPACITY_MIN, 1 - exitProgress * TRAJECTORY_CONSTANTS.EXIT_OPACITY_FACTOR);
                }

                // Update position
                image.element.style.left = `${finalX}px`;
                image.element.style.top = `${finalY}px`;
                image.element.style.transform = `translate(-50%, -50%) rotate(${finalRotation}deg) scale(${finalScale})`;
                image.element.style.opacity = finalOpacity;
            });
        }
    }

    // Инициализация после загрузки DOM
    function init() {
        // Проверяем, что мы в Webflow
        if (window.Webflow) {
            // Ждем загрузки DOM
            window.Webflow.push(function() {
                // Проверяем наличие необходимых элементов
                const requiredElements = [
                    '[data-content="trail"]',
                    '[data-content="animation"]',
                    '[data-content="cms-collection"]',
                    '[data-content="card-template"]'
                ];

                const allElementsExist = requiredElements.every(selector => 
                    document.querySelector(selector)
                );

                if (allElementsExist) {
                    new HorizontalImageTrail();
                } else {
                    console.warn('Some required elements are missing. Make sure all data-content attributes are present.');
                }
            });
        } else {
            // Если не в Webflow, инициализируем после загрузки DOM
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', function() {
                    new HorizontalImageTrail();
                });
            } else {
                new HorizontalImageTrail();
            }
        }
    }

    // Запускаем инициализацию
    init();
})(); 