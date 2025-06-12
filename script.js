(function() {
    // Animation constants
    const TRAJECTORY_CONSTANTS = {
        START_Y_PERCENT: 0.6,
        END_Y_PERCENT: 0.5,
        ARC_HEIGHT_FACTOR: 0.3,
        ANGLE_RANGE: 20,
        ANGLE_OFFSET: 10,
        EXIT_SCALE_MIN: 0.3,
        EXIT_OPACITY_MIN: 0.1,
        EXIT_SCALE_FACTOR: 0.7,
        EXIT_OPACITY_FACTOR: 0.8
    };

    class HorizontalImageTrail {
        constructor() {
            this.container = document.querySelector('[data-content="trail"]');
            this.animationSection = document.querySelector('[data-content="animation"]');
            this.cmsCollection = document.querySelector('[data-content="cms-collection"]');
            this.cardTemplate = document.querySelector('[data-content="card-template"]');

            if (!this.container || !this.animationSection || !this.cmsCollection || !this.cardTemplate) {
                console.error('Required elements not found. Make sure all data-content attributes are present.');
                return;
            }

            this.cmsData = this.getCmsData();
            if (!this.cmsData.length) {
                console.error('No CMS data found.');
                return;
            }

            const templateElement = this.cardTemplate.querySelector('[data-content="card-template-item"]');
            if (!templateElement) {
                console.error('Template item not found');
                return;
            }

            const computedStyle = getComputedStyle(templateElement);
            this.totalImages = this.cmsData.length;
            this.imageWidth = parseInt(computedStyle.width) || 200;
            const marginRight = parseInt(computedStyle.marginRight) || 35;
            this.imageSpacing = this.imageWidth + marginRight;

            this.visibleImages = this.calculateVisibleImages();
            this.images = [];
            this.scrollProgress = 0;
            this.horizontalProgress = 0;
            this.trajectory = null;
            this.trajectoryLength = 0;

            this.init();
            this.handleResize();
        }

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
            }).filter(Boolean);
        }

        createCardFromTemplate(data) {
            if (!this.cardTemplate) return null;
            const template = this.cardTemplate.querySelector('[data-content="card-template-item"]');
            if (!template) {
                console.error('Card template not found.');
                return null;
            }

            const card = template.cloneNode(true);
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

            card.style.transformOrigin = 'center center';
            card.style.willChange = 'transform';
            card.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
            return card;
        }

        calculateTrajectory() {
            if (!this.animationSection) return;
            const sectionRect = this.animationSection.getBoundingClientRect();
            const sectionHeight = sectionRect.height;

            const startX = 0;
            const startYInitial = sectionRect.top + (sectionHeight * TRAJECTORY_CONSTANTS.START_Y_PERCENT);
            const startYFinal = sectionRect.top + sectionHeight + 50;
            const endX = window.innerWidth;
            const endYInitial = sectionRect.top;
            const endYFinal = sectionRect.top + (sectionHeight * TRAJECTORY_CONSTANTS.END_Y_PERCENT);

            const scrollProgress = Math.min(1, Math.max(0, -sectionRect.top / (sectionHeight * TRAJECTORY_CONSTANTS.END_Y_PERCENT)));
            const startY = startYInitial + (startYFinal - startYInitial) * scrollProgress;
            const endY = endYInitial + (endYFinal - endYInitial) * scrollProgress;

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
        }

        calculateVisibleImages() {
            const containerWidth = this.container.offsetWidth;
            return Math.ceil(containerWidth / this.imageSpacing) + 1;
        }

        getPositionOnTrajectory(progress) {
            if (!this.trajectory) return { x: 0, y: 0, angle: 0 };
            const linearX = this.trajectory.start.x + (this.trajectory.deltaX * progress);
            const linearY = this.trajectory.start.y + (this.trajectory.deltaY * progress);
            const arcHeight = Math.abs(this.trajectory.deltaY) * TRAJECTORY_CONSTANTS.ARC_HEIGHT_FACTOR;
            const arcOffset = Math.sin(progress * Math.PI) * arcHeight;
            const angle = (progress * TRAJECTORY_CONSTANTS.ANGLE_RANGE) - TRAJECTORY_CONSTANTS.ANGLE_OFFSET;

            return {
                x: linearX,
                y: linearY - arcOffset,
                angle: angle
            };
        }

        createImages() {
            this.container.innerHTML = '';
            this.images = [];
            this.calculateTrajectory();
            const cmsData = this.cmsData;
            if (!cmsData.length) return;

            const visibleWidth = window.innerWidth;
            const totalWidth = this.totalImages * this.imageSpacing;
            const halfImageWidth = this.imageWidth / 2;

            for (let i = 0; i < this.totalImages; i++) {
                const data = cmsData[i % cmsData.length];
                const card = this.createCardFromTemplate(data);
                if (!card) continue;

                let x = i * this.imageSpacing;
                while (x < -this.imageWidth) x += totalWidth;
                while (x > visibleWidth) x -= totalWidth;

                const normalizedX = (x + this.imageWidth) / (visibleWidth + this.imageWidth * 2);
                const position = this.getPositionOnTrajectory(normalizedX);

                card.style.position = 'fixed';
                card.style.left = `${x}px`;
                card.style.top = `${position.y}px`;
                card.style.transform = `translate(-50%, -50%) rotate(${position.angle}deg) scale(0.8)`;
                card.style.opacity = '0';
                card.style.transition = 'opacity 0.5s ease-out, transform 0.5s ease-out';
                card.style.zIndex = '900';

                this.container.appendChild(card);
                
                // Add stagger effect
                setTimeout(() => {
                    card.style.opacity = '1';
                    card.style.transform = `translate(-50%, -50%) rotate(${position.angle}deg) scale(1)`;
                }, i * 100); // 100ms delay between each card

                this.images.push({
                    element: card,
                    positionIndex: i,
                    angle: position.angle,
                    imageIndex: i
                });
            }
        }

        init() {
            this.calculateTrajectory();
            if (!this.trajectory) {
                console.error('Trajectory not calculated');
                return;
            }
            this.createImages();
        }

        handleResize() {
            window.addEventListener('resize', () => {
                this.calculateTrajectory();
                this.visibleImages = this.calculateVisibleImages();
                this.updateImagePositions();
            });

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
            if (!this.animationSection) return;
            const sectionRect = this.animationSection.getBoundingClientRect();
            const sectionHeight = sectionRect.height;

            const scrollTop = window.pageYOffset;
            const sectionTop = sectionRect.top + window.pageYOffset;
            this.scrollProgress = Math.min(1, Math.max(0, scrollTop / sectionTop));
            this.horizontalProgress = this.scrollProgress;

            this.calculateTrajectory();

            const visibleWidth = window.innerWidth;
            const totalWidth = this.totalImages * this.imageSpacing;
            const maxOffset = Math.max(0, (this.totalImages - this.visibleImages + 1)) * this.imageSpacing;
            const offset = this.horizontalProgress * maxOffset;
            const halfImageWidth = this.imageWidth / 2;
            const imageSpacingDouble = this.imageSpacing * 2;
            const windowHeight = window.innerHeight;

            this.images.forEach((image, index) => {
                let x = (index * this.imageSpacing) - offset;
                while (x < -this.imageWidth) x += totalWidth;
                while (x > visibleWidth) x -= totalWidth;

                const normalizedX = (x + this.imageWidth) / (visibleWidth + this.imageWidth * 2);
                const position = this.getPositionOnTrajectory(normalizedX);

                let finalX = x;
                let finalY = position.y;
                let finalRotation = position.angle;
                let finalScale = 1;
                let finalOpacity = 1;

                if (x < -halfImageWidth) {
                    const exitProgress = Math.min(1, Math.abs(x + halfImageWidth) / imageSpacingDouble);
                    finalX = x - (exitProgress * this.imageSpacing * 0.5);
                    finalY = position.y + (exitProgress * windowHeight * 0.4);
                    finalRotation = position.angle * (1 - exitProgress);
                    finalScale = Math.max(TRAJECTORY_CONSTANTS.EXIT_SCALE_MIN, 1 - exitProgress * TRAJECTORY_CONSTANTS.EXIT_SCALE_FACTOR);
                    finalOpacity = Math.max(TRAJECTORY_CONSTANTS.EXIT_OPACITY_MIN, 1 - exitProgress * TRAJECTORY_CONSTANTS.EXIT_OPACITY_FACTOR);
                } else if (x > visibleWidth + halfImageWidth) {
                    const exitProgress = Math.min(1, (x - visibleWidth - halfImageWidth) / imageSpacingDouble);
                    finalX = x + (exitProgress * this.imageSpacing * 0.5);
                    finalY = position.y + (exitProgress * windowHeight * 0.4);
                    finalScale = Math.max(TRAJECTORY_CONSTANTS.EXIT_SCALE_MIN, 1 - exitProgress * TRAJECTORY_CONSTANTS.EXIT_SCALE_FACTOR);
                    finalOpacity = Math.max(TRAJECTORY_CONSTANTS.EXIT_OPACITY_MIN, 1 - exitProgress * TRAJECTORY_CONSTANTS.EXIT_OPACITY_FACTOR);
                }

                image.element.style.left = `${finalX}px`;
                image.element.style.top = `${finalY}px`;
                image.element.style.transform = `translate(-50%, -50%) rotate(${finalRotation}deg) scale(${finalScale})`;
                image.element.style.opacity = finalOpacity;
            });
        }
    }

    function init() {
        if (window.Webflow) {
            window.Webflow.push(function () {
                const requiredElements = [
                    '[data-content="trail"]',
                    '[data-content="animation"]',
                    '[data-content="cms-collection"]',
                    '[data-content="card-template"]'
                ];

                const allExist = requiredElements.every(sel => document.querySelector(sel));
                if (allExist) {
                    requestAnimationFrame(() => {
                        setTimeout(() => {
                            new HorizontalImageTrail();
                        }, 100);
                    });
                } else {
                    console.warn('Missing required data-content elements.');
                }
            });
        } else {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', function () {
                    requestAnimationFrame(() => {
                        setTimeout(() => {
                            new HorizontalImageTrail();
                        }, 100);
                    });
                });
            } else {
                requestAnimationFrame(() => {
                    setTimeout(() => {
                        new HorizontalImageTrail();
                    }, 100);
                });
            }
        }
    }

    init();
})();
