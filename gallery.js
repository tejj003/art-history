class ArtGallery {
    constructor() {
        this.artworks = [];
        this.filteredArtworks = [];
        this.currentFilter = 'all';
        this.currentView = 'grid';
        this.currentMuseum = 'met';
        this.isLoading = false;
        this.favorites = JSON.parse(localStorage.getItem('artFavorites') || '[]');
        this.aiRecommendations = [];
        this.voiceRecognition = null;
        this.init();
    }

    async init() {
        this.setupVoiceRecognition();
        this.bindEvents();
        this.showLoadingScreen();
        await this.loadInitialArtworks();
        this.hideLoadingScreen();
        await this.loadAIRecommendations();
    }

    async loadInitialArtworks() {
        try {
            this.updateLoadingText('Fetching masterpieces from Metropolitan Museum...');
            this.artworks = await window.apiManager.searchArtworks('met', 'painting famous', {});
            this.filteredArtworks = [...this.artworks];
            this.renderGallery();
        } catch (error) {
            console.error('Failed to load initial artworks:', error);
            this.showError('Failed to load artworks. Please try again.');
        }
    }

    async loadAIRecommendations() {
        try {
            // Simulate AI recommendations based on popular artworks
            const recommendations = await window.apiManager.searchArtworks('chicago', 'impressionist', {});
            this.aiRecommendations = recommendations.slice(0, 4);
            this.renderAIRecommendations();
        } catch (error) {
            console.error('Failed to load AI recommendations:', error);
        }
    }

    bindEvents() {
        // Search functionality
        const searchInput = document.getElementById('searchInput');
        const searchBtn = document.getElementById('searchBtn');
        
        searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));
        searchBtn.addEventListener('click', () => this.handleSearch(searchInput.value));

        // Filter buttons
        const filterBtns = document.querySelectorAll('.filter-btn');
        filterBtns.forEach(btn => {
            btn.addEventListener('click', (e) => this.handleFilter(e.target.dataset.filter));
        });

        // View toggle
        const gridViewBtn = document.getElementById('gridView');
        const listViewBtn = document.getElementById('listView');
        
        gridViewBtn.addEventListener('click', () => this.toggleView('grid'));
        listViewBtn.addEventListener('click', () => this.toggleView('list'));

        // Modal events
        const modal = document.getElementById('artworkModal');
        const closeBtn = document.querySelector('.close');
        
        closeBtn.addEventListener('click', () => this.closeModal());
        window.addEventListener('click', (e) => {
            if (e.target === modal) this.closeModal();
        });
    }

    async handleSearch(query) {
        if (!query.trim()) {
            this.filteredArtworks = [...this.artworks];
            this.renderGallery();
            return;
        }

        this.isLoading = true;
        this.showLoadingInGallery();

        try {
            const results = await window.apiManager.searchArtworks(
                this.currentMuseum,
                query,
                { category: this.currentFilter }
            );
            
            this.artworks = results;
            this.filteredArtworks = [...results];
            this.renderGallery();
        } catch (error) {
            console.error('Search failed:', error);
            this.showError('Search failed. Please try again.');
        } finally {
            this.isLoading = false;
        }
    }

    handleFilter(filter) {
        this.currentFilter = filter;
        
        // Update active button
        document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-filter="${filter}"]`).classList.add('active');
        
        // Filter artworks
        if (filter === 'all') {
            this.filteredArtworks = [...this.artworks];
        } else {
            this.filteredArtworks = this.artworks.filter(artwork => artwork.category === filter);
        }
        
        // Apply search if active
        const searchQuery = document.getElementById('searchInput').value;
        if (searchQuery) {
            this.handleSearch(searchQuery);
        } else {
            this.renderGallery();
        }
    }

    toggleView(view) {
        this.currentView = view;
        
        // Update active button
        document.querySelectorAll('.view-btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById(`${view}View`).classList.add('active');
        
        // Update gallery class
        const gallery = document.getElementById('galleryGrid');
        if (view === 'list') {
            gallery.classList.add('list-view');
        } else {
            gallery.classList.remove('list-view');
        }
    }

    renderGallery() {
        const gallery = document.getElementById('galleryGrid');
        
        if (this.filteredArtworks.length === 0) {
            gallery.innerHTML = '<div class="loading">No artworks found matching your criteria.</div>';
            return;
        }
        
        gallery.innerHTML = this.filteredArtworks.map(artwork => `
            <div class="artwork-item" onclick="gallery.openModal(${artwork.id})">
                <div class="artwork-image">
                    <img src="${artwork.image}" alt="${artwork.title}" loading="lazy">
                    <div class="artwork-overlay">
                        <div class="overlay-info">
                            <h4>${artwork.title}</h4>
                            <p>${artwork.artist}, ${artwork.year}</p>
                        </div>
                    </div>
                </div>
                <div class="artwork-details">
                    <h4>${artwork.title}</h4>
                    <p class="artwork-meta">by ${artwork.artist}</p>
                    <p class="artwork-meta">${artwork.year} • ${artwork.medium}</p>
                    <p class="artwork-price">${artwork.price}</p>
                </div>
            </div>
        `).join('');
    }

    setupVoiceRecognition() {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.voiceRecognition = new SpeechRecognition();
            this.voiceRecognition.continuous = false;
            this.voiceRecognition.interimResults = false;
            this.voiceRecognition.lang = 'en-US';

            this.voiceRecognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                document.getElementById('searchInput').value = transcript;
                this.handleSearch(transcript);
            };

            document.getElementById('voiceSearchBtn').addEventListener('click', () => {
                this.voiceRecognition.start();
            });
        } else {
            document.getElementById('voiceSearchBtn').style.display = 'none';
        }
    }

    showLoadingScreen() {
        document.getElementById('loadingScreen').style.display = 'flex';
    }

    hideLoadingScreen() {
        document.getElementById('loadingScreen').style.display = 'none';
    }

    updateLoadingText(text) {
        document.getElementById('loadingText').textContent = text;
    }

    showLoadingInGallery() {
        const gallery = document.getElementById('galleryGrid');
        gallery.innerHTML = '<div class="loading">🎨 Loading masterpieces...</div>';
    }

    showError(message) {
        const gallery = document.getElementById('galleryGrid');
        gallery.innerHTML = `<div class="error">❌ ${message}</div>`;
    }

    async openModal(artworkId) {
        const artwork = this.artworks.find(art => art.id === artworkId);
        if (!artwork) return;
        
        document.getElementById('modalImage').src = artwork.image;
        document.getElementById('modalTitle').textContent = artwork.title;
        document.getElementById('modalArtist').textContent = `Artist: ${artwork.artist}`;
        document.getElementById('modalYear').textContent = `Year: ${artwork.year}`;
        document.getElementById('modalMedium').textContent = `Medium: ${artwork.medium}`;
        document.getElementById('modalDimensions').textContent = `Dimensions: ${artwork.dimensions}`;
        document.getElementById('modalDescription').textContent = artwork.description;
        
        // Load similar artworks
        try {
            const similarArtworks = await window.apiManager.getSimilarArtworks(artwork);
            this.renderSimilarArtworks(similarArtworks);
        } catch (error) {
            console.error('Failed to load similar artworks:', error);
        }
        
        document.getElementById('artworkModal').style.display = 'block';
        document.body.style.overflow = 'hidden';
    }

    renderSimilarArtworks(artworks) {
        const similarContainer = document.createElement('div');
        similarContainer.className = 'similar-artworks-grid';
        similarContainer.innerHTML = artworks.map(artwork => `
            <div class="similar-artwork" onclick="gallery.openModal('${artwork.id}')">
                <img src="${artwork.imageSmall || artwork.image}" alt="${artwork.title}">
                <p>${artwork.title}</p>
            </div>
        `).join('');
        
        // Add to modal tab content when similar tab is selected
        return similarContainer.outerHTML;
    }

    closeModal() {
        document.getElementById('artworkModal').style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

async function fetchArtworks() {
    const searchUrl = 'https://collectionapi.metmuseum.org/public/collection/v1/search?hasImages=true&q=painting';
    const res = await fetch(searchUrl);
    const data = await res.json();
    const ids = (data.objectIDs || []).slice(0, 8);
    const artworks = await Promise.all(ids.map(async id => {
        const objRes = await fetch(`https://collectionapi.metmuseum.org/public/collection/v1/objects/${id}`);
        return await objRes.json();
    }));
    return artworks.filter(a => a.primaryImageSmall);
}

function renderGallery(artworks) {
    const grid = document.getElementById('galleryGrid');
    grid.innerHTML = artworks.map(a => `
        <div class="artwork-item">
            <img src="${a.primaryImageSmall}" alt="${a.title}">
            <h3>${a.title}</h3>
            <p>${a.artistDisplayName || 'Unknown Artist'}</p>
        </div>
    `).join('');
}

document.addEventListener('DOMContentLoaded', async () => {
    const artworks = await fetchArtworks();
    renderGallery(artworks);
    window._artworks = artworks; // for 3D gallery
});

// Initialize gallery when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.gallery = new ArtGallery();
});
