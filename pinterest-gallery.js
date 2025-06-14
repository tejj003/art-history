class PinterestGallery {
    constructor() {
        this.allArtworks = [];
        this.displayedArtworks = [];
        this.currentFilter = 'all';
        this.currentYear = 1900;
        this.isLoading = false;
        this.metDepartments = [1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 21];
        this.init();
    }

    async init() {
        this.bindEvents();
        await this.loadAllArtworks();
    }

    bindEvents() {
        // Year slider
        const yearSlider = document.getElementById('yearSlider');
        yearSlider.addEventListener('input', (e) => {
            this.currentYear = parseInt(e.target.value);
            this.updateYearDisplay();
            this.filterByYear();
        });

        // Filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentFilter = e.target.dataset.filter;
                this.filterByYear();
            });
        });

        // Modal
        document.querySelector('.close').addEventListener('click', () => {
            document.getElementById('artworkModal').style.display = 'none';
        });
    }

    async loadAllArtworks() {
        const loadingOverlay = document.getElementById('loadingOverlay');
        const progressFill = document.getElementById('progressFill');
        const loadingProgress = document.getElementById('loadingProgress');
        
        try {
            // First, get all object IDs with images
            loadingProgress.textContent = 'Fetching artwork catalog...';
            progressFill.style.width = '10%';
            
            // Change the search query from * to a valid search term
            const searchResponse = await fetch(
                'https://collectionapi.metmuseum.org/public/collection/v1/search?hasImages=true&q=art'
            );
            const searchData = await searchResponse.json();
            
            if (!searchData.objectIDs || searchData.objectIDs.length === 0) {
                throw new Error('No artworks found');
            }

            // Sample a diverse set of artworks (limit for performance)
            const totalArtworks = Math.min(searchData.objectIDs.length, 500);
            const sampledIDs = this.sampleArtworks(searchData.objectIDs, totalArtworks);
            
            loadingProgress.textContent = `Loading ${totalArtworks} artworks...`;
            progressFill.style.width = '20%';

            // Fetch artwork details in batches
            const batchSize = 20;
            const batches = [];
            
            for (let i = 0; i < sampledIDs.length; i += batchSize) {
                batches.push(sampledIDs.slice(i, i + batchSize));
            }

            let loadedCount = 0;
            
            for (const batch of batches) {
                const batchPromises = batch.map(id => 
                    fetch(`https://collectionapi.metmuseum.org/public/collection/v1/objects/${id}`)
                        .then(res => res.json())
                        .catch(err => null)
                );
                
                const batchResults = await Promise.all(batchPromises);
                const validArtworks = batchResults.filter(artwork => 
                    artwork && 
                    artwork.primaryImageSmall && 
                    artwork.objectBeginDate
                );
                
                this.allArtworks.push(...validArtworks);
                
                loadedCount += batch.length;
                const progress = 20 + (loadedCount / sampledIDs.length) * 70;
                progressFill.style.width = `${progress}%`;
                loadingProgress.textContent = `Loaded ${this.allArtworks.length} artworks...`;
            }

            // Sort by date
            this.allArtworks.sort((a, b) => a.objectBeginDate - b.objectBeginDate);
            
            progressFill.style.width = '100%';
            loadingProgress.textContent = 'Preparing gallery...';
            
            // Initial display
            this.filterByYear();
            
            setTimeout(() => {
                loadingOverlay.classList.add('hidden');
            }, 500);

        } catch (error) {
            console.error('Error loading artworks:', error);
            loadingProgress.textContent = 'Error loading artworks. Please refresh.';
        }
    }

    sampleArtworks(objectIDs, sampleSize) {
        // Get evenly distributed sample across the collection
        const step = Math.floor(objectIDs.length / sampleSize);
        const sampled = [];
        
        for (let i = 0; i < objectIDs.length && sampled.length < sampleSize; i += step) {
            sampled.push(objectIDs[i]);
        }
        
        return sampled;
    }

    filterByYear() {
        // Filter artworks within ±50 years of current year
        const yearRange = 50;
        const minYear = this.currentYear - yearRange;
        const maxYear = this.currentYear + yearRange;
        
        this.displayedArtworks = this.allArtworks.filter(artwork => {
            const yearMatch = artwork.objectBeginDate >= minYear && artwork.objectBeginDate <= maxYear;
            
            if (this.currentFilter === 'all') return yearMatch;
            
            const classification = (artwork.classification || '').toLowerCase();
            const objectName = (artwork.objectName || '').toLowerCase();
            
            switch (this.currentFilter) {
                case 'painting':
                    return yearMatch && (classification.includes('painting') || objectName.includes('painting'));
                case 'sculpture':
                    return yearMatch && (classification.includes('sculpture') || objectName.includes('sculpture'));
                case 'ceramics':
                    return yearMatch && (classification.includes('ceramic') || objectName.includes('ceramic'));
                case 'textiles':
                    return yearMatch && (classification.includes('textile') || objectName.includes('textile'));
                default:
                    return yearMatch;
            }
        });
        
        this.renderGallery();
    }

    renderGallery() {
        const container = document.getElementById('pinterestGrid');
        
        if (this.displayedArtworks.length === 0) {
            container.innerHTML = '<p style="text-align: center; padding: 4rem;">No artworks found for this time period.</p>';
            return;
        }
        
        container.innerHTML = this.displayedArtworks.map(artwork => `
            <div class="pinterest-item" onclick="gallery.showArtworkDetails('${artwork.objectID}')">
                <img src="${artwork.primaryImageSmall}" alt="${artwork.title}" loading="lazy">
                <div class="pinterest-info">
                    <h3>${this.truncateTitle(artwork.title)}</h3>
                    <p>${artwork.artistDisplayName || artwork.culture || 'Unknown'}</p>
                    <span class="year-tag">${this.formatYear(artwork.objectBeginDate)}</span>
                </div>
            </div>
        `).join('');
    }

    truncateTitle(title, maxLength = 50) {
        if (title.length <= maxLength) return title;
        return title.substring(0, maxLength) + '...';
    }

    formatYear(year) {
        if (year < 0) return `${Math.abs(year)} BCE`;
        if (year < 1000) return `${year} CE`;
        return year.toString();
    }

    updateYearDisplay() {
        document.getElementById('currentYear').textContent = this.formatYear(this.currentYear);
        document.getElementById('currentEra').textContent = this.getEraName(this.currentYear);
    }

    getEraName(year) {
        if (year < -3000) return 'Prehistoric';
        if (year < -1200) return 'Bronze Age';
        if (year < -500) return 'Iron Age';
        if (year < 500) return 'Classical Antiquity';
        if (year < 1000) return 'Early Medieval';
        if (year < 1300) return 'High Medieval';
        if (year < 1600) return 'Renaissance';
        if (year < 1750) return 'Baroque';
        if (year < 1850) return 'Neoclassical';
        if (year < 1900) return 'Impressionist Era';
        if (year < 1945) return 'Modern Era';
        if (year < 2000) return 'Contemporary';
        return 'Digital Age';
    }

    showArtworkDetails(objectID) {
        const artwork = this.allArtworks.find(a => a.objectID == objectID);
        if (!artwork) return;
        
        document.getElementById('modalImage').src = artwork.primaryImage;
        document.getElementById('modalTitle').textContent = artwork.title;
        document.getElementById('modalArtist').textContent = artwork.artistDisplayName || 'Artist unknown';
        document.getElementById('modalDate').textContent = artwork.objectDate || 'Date unknown';
        document.getElementById('modalCulture').textContent = artwork.culture || artwork.period || '';
        document.getElementById('modalMedium').textContent = artwork.medium || '';
        document.getElementById('modalDimensions').textContent = artwork.dimensions || '';
        document.getElementById('modalDescription').textContent = artwork.creditLine || '';
        document.getElementById('modalLink').href = artwork.objectURL;
        
        document.getElementById('artworkModal').style.display = 'block';
    }
}

// Initialize gallery
const gallery = new PinterestGallery();
    }
}

// Initialize gallery when page loads
window.addEventListener('DOMContentLoaded', () => {
    window.gallery = new PinterestGallery();
});
    }

    truncateTitle(title, maxLength = 50) {
        if (title.length <= maxLength) return title;
        return title.substring(0, maxLength) + '...';
    }

    formatYear(year) {
        if (year < 0) return `${Math.abs(year)} BCE`;
        if (year < 1000) return `${year} CE`;
        return year.toString();
    }

    updateYearDisplay() {
        document.getElementById('currentYear').textContent = this.formatYear(this.currentYear);
        document.getElementById('currentEra').textContent = this.getEraName(this.currentYear);
    }

    getEraName(year) {
        if (year < -3000) return 'Prehistoric';
        if (year < -1200) return 'Bronze Age';
        if (year < -500) return 'Iron Age';
        if (year < 500) return 'Classical Antiquity';
        if (year < 1000) return 'Early Medieval';
        if (year < 1300) return 'High Medieval';
        if (year < 1600) return 'Renaissance';
        if (year < 1750) return 'Baroque';
        if (year < 1850) return 'Neoclassical';
        if (year < 1900) return 'Impressionist Era';
        if (year < 1945) return 'Modern Era';
        if (year < 2000) return 'Contemporary';
        return 'Digital Age';
    }

    showArtworkDetails(objectID) {
        const artwork = this.allArtworks.find(a => a.objectID == objectID);
        if (!artwork) return;
        
        document.getElementById('modalImage').src = artwork.primaryImage;
        document.getElementById('modalTitle').textContent = artwork.title;
        document.getElementById('modalArtist').textContent = artwork.artistDisplayName || 'Artist unknown';
        document.getElementById('modalDate').textContent = artwork.objectDate || 'Date unknown';
        document.getElementById('modalCulture').textContent = artwork.culture || artwork.period || '';
        document.getElementById('modalMedium').textContent = artwork.medium || '';
        document.getElementById('modalDimensions').textContent = artwork.dimensions || '';
        document.getElementById('modalDescription').textContent = artwork.creditLine || '';
        document.getElementById('modalLink').href = artwork.objectURL;
        
        document.getElementById('artworkModal').style.display = 'block';
    }
}

// Initialize gallery when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.gallery = new PinterestGallery();
});
}
