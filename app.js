// Global variables
let allObjectIDs = [];
let currentPage = 0;
const itemsPerPage = 50; // Changed from 12 to 50
let artworks = [];
let scene, camera, renderer, controls;
let currentArtworkIndex = 0;
let artworkMeshes = [];
let autoRotateEnabled = false;

// DOM Elements
const galleryEl = document.getElementById('gallery');
const statusEl = document.getElementById('status');
const searchInput = document.getElementById('searchInput');
const departmentSelect = document.getElementById('departmentSelect');
const searchBtn = document.getElementById('searchBtn');
const loadMoreBtn = document.getElementById('loadMore');
const view3dBtn = document.getElementById('view3d');
const modal3dEl = document.getElementById('modal3d');
const artworkModal = document.getElementById('artworkModal');
const closeBtn = document.querySelector('.close');
const close3dBtn = document.querySelector('.close3d');
const canvasContainer = document.getElementById('canvas-container');

// Search artworks
async function searchArtworks(query = '', departmentId = '') {
    try {
        statusEl.textContent = 'Searching artworks...';
        
        let searchUrl = 'https://collectionapi.metmuseum.org/public/collection/v1/search?hasImages=true';
        
        if (query) {
            searchUrl += `&q=${encodeURIComponent(query)}`;
        } else {
            searchUrl += '&q=painting'; // Default search term
        }
        
        if (departmentId) {
            searchUrl += `&departmentIds=${departmentId}`;
        }
        
        const response = await fetch(searchUrl);
        const data = await response.json();
        
        if (!data.objectIDs || data.objectIDs.length === 0) {
            statusEl.textContent = 'No artworks found. Try a different search.';
            return [];
        }
        
        statusEl.textContent = `Found ${data.objectIDs.length} artworks`;
        return data.objectIDs;
    } catch (error) {
        console.error('Search error:', error);
        statusEl.textContent = 'Error searching artworks. Please try again.';
        return [];
    }
}

// Fetch artwork details
async function fetchArtworkDetails(objectIDs) {
    const artworksData = await Promise.all(
        objectIDs.map(async (id) => {
            try {
                const response = await fetch(`https://collectionapi.metmuseum.org/public/collection/v1/objects/${id}`);
                const data = await response.json();
                return data;
            } catch (error) {
                console.error(`Error fetching artwork ${id}:`, error);
                return null;
            }
        })
    );
    
    // Filter out null results and artworks without images
    return artworksData.filter(artwork => artwork && artwork.primaryImage);
}

// Render gallery
function renderGallery(newArtworks, append = false) {
    if (!append) {
        galleryEl.innerHTML = '';
        artworks = [];
    }
    
    artworks.push(...newArtworks);
    
    const html = newArtworks.map((artwork, index) => `
        <div class="artwork" data-index="${artworks.length - newArtworks.length + index}">
            <img src="${artwork.primaryImageSmall}" alt="${artwork.title}" loading="lazy">
            <div class="artwork-info">
                <h3>${artwork.title}</h3>
                <p>${artwork.artistDisplayName || 'Unknown artist'}</p>
                <p>${artwork.objectDate || 'Date unknown'}</p>
            </div>
        </div>
    `).join('');
    
    galleryEl.insertAdjacentHTML('beforeend', html);
    
    // Add click handlers to new artworks
    const newArtworkEls = galleryEl.querySelectorAll('.artwork:not([data-listener])');
    newArtworkEls.forEach(el => {
        el.setAttribute('data-listener', 'true');
        el.addEventListener('click', () => showArtworkDetails(parseInt(el.dataset.index)));
    });
}

// Show artwork details in modal
function showArtworkDetails(index) {
    const artwork = artworks[index];
    
    document.getElementById('modalImage').src = artwork.primaryImage;
    document.getElementById('modalTitle').textContent = artwork.title;
    document.getElementById('modalArtist').textContent = `Artist: ${artwork.artistDisplayName || 'Unknown'}`;
    document.getElementById('modalDate').textContent = `Date: ${artwork.objectDate || 'Unknown'}`;
    document.getElementById('modalMedium').textContent = `Medium: ${artwork.medium || 'Unknown'}`;
    document.getElementById('modalDepartment').textContent = `Department: ${artwork.department || 'Unknown'}`;
    
    // Reset extended info
    document.getElementById('extendedInfo').classList.add('hidden');
    document.querySelector('.modal-content').classList.remove('fullscreen');
    document.querySelector('.modal-body').classList.remove('expanded');
    
    // Store current artwork index for 3D view
    currentArtworkIndex = index;
    
    artworkModal.style.display = 'block';
}

// Add event listener for View in 3D button
document.getElementById('viewIn3DBtn').addEventListener('click', () => {
    // Close artwork modal
    artworkModal.style.display = 'none';
    
    // Open 3D modal
    modal3dEl.style.display = 'block';
    
    if (!scene) {
        init3DScene();
    }
    
    // Update 3D display with current artwork
    updateArtworkDisplay();
    
    const onResize = () => {
        camera.aspect = canvasContainer.clientWidth / canvasContainer.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(canvasContainer.clientWidth, canvasContainer.clientHeight);
    };
    
    window.addEventListener('resize', onResize);
});

// Load more artworks
async function loadMore() {
    loadMoreBtn.disabled = true;
    loadMoreBtn.textContent = 'Loading...';
    
    const startIndex = currentPage * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageIDs = allObjectIDs.slice(startIndex, endIndex);
    
    if (pageIDs.length > 0) {
        const newArtworks = await fetchArtworkDetails(pageIDs);
        renderGallery(newArtworks, true);
        currentPage++;
        
        if (endIndex >= allObjectIDs.length) {
            loadMoreBtn.style.display = 'none';
        }
    }
    
    loadMoreBtn.disabled = false;
    loadMoreBtn.textContent = 'Load More';
}

// Initialize 3D scene
function init3DScene() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111111);
    
    camera = new THREE.PerspectiveCamera(
        75,
        canvasContainer.clientWidth / canvasContainer.clientHeight,
        0.1,
        1000
    );
    camera.position.set(0, 0, 5);
    
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(canvasContainer.clientWidth, canvasContainer.clientHeight);
    canvasContainer.appendChild(renderer.domElement);
    
    // Add controls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    
    // Add lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    const spotLight = new THREE.SpotLight(0xffffff, 0.8);
    spotLight.position.set(0, 5, 5);
    scene.add(spotLight);
    
    // Create artwork display
    updateArtworkDisplay();
    
    animate();
}

// Update artwork display in 3D
function updateArtworkDisplay() {
    // Clear existing meshes
    artworkMeshes.forEach(mesh => scene.remove(mesh));
    artworkMeshes = [];
    
    if (artworks.length === 0) return;
    
    const artwork = artworks[currentArtworkIndex];
    const textureLoader = new THREE.TextureLoader();
    
    textureLoader.load(artwork.primaryImage, (texture) => {
        const aspectRatio = texture.image.width / texture.image.height;
        const geometry = new THREE.PlaneGeometry(4 * aspectRatio, 4);
        const material = new THREE.MeshBasicMaterial({ map: texture });
        const mesh = new THREE.Mesh(geometry, material);
        
        scene.add(mesh);
        artworkMeshes.push(mesh);
        
        // Add frame
        const frameGeometry = new THREE.BoxGeometry(4 * aspectRatio + 0.2, 4.2, 0.1);
        const frameMaterial = new THREE.MeshPhongMaterial({ color: 0x8B4513 });
        const frame = new THREE.Mesh(frameGeometry, frameMaterial);
        frame.position.z = -0.06;
        
        scene.add(frame);
        artworkMeshes.push(frame);
    });
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    
    controls.update();
    
    if (autoRotateEnabled && artworkMeshes.length > 0) {
        artworkMeshes.forEach(mesh => {
            mesh.rotation.y += 0.005;
        });
    }
    
    renderer.render(scene, camera);
}

// Event listeners
searchBtn.addEventListener('click', async () => {
    const query = searchInput.value;
    const departmentId = departmentSelect.value;
    
    allObjectIDs = await searchArtworks(query, departmentId);
    currentPage = 0;
    
    if (allObjectIDs.length > 0) {
        const initialIDs = allObjectIDs.slice(0, itemsPerPage);
        const initialArtworks = await fetchArtworkDetails(initialIDs);
        renderGallery(initialArtworks);
        currentPage = 1;
        
        loadMoreBtn.style.display = allObjectIDs.length > itemsPerPage ? 'block' : 'none';
    } else {
        galleryEl.innerHTML = '';
        loadMoreBtn.style.display = 'none';
    }
});

searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchBtn.click();
});

loadMoreBtn.addEventListener('click', loadMore);

view3dBtn.addEventListener('click', () => {
    if (artworks.length === 0) {
        alert('Please search and load some artworks first!');
        return;
    }
    
    modal3dEl.style.display = 'block';
    
    if (!scene) {
        init3DScene();
    }
    
    const onResize = () => {
        camera.aspect = canvasContainer.clientWidth / canvasContainer.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(canvasContainer.clientWidth, canvasContainer.clientHeight);
    };
    
    window.addEventListener('resize', onResize);
});

document.getElementById('prevArt').addEventListener('click', () => {
    currentArtworkIndex = (currentArtworkIndex - 1 + artworks.length) % artworks.length;
    updateArtworkDisplay();
});

document.getElementById('nextArt').addEventListener('click', () => {
    currentArtworkIndex = (currentArtworkIndex + 1) % artworks.length;
    updateArtworkDisplay();
});

document.getElementById('autoRotate').addEventListener('click', (e) => {
    autoRotateEnabled = !autoRotateEnabled;
    e.target.textContent = autoRotateEnabled ? 'Stop Rotation' : 'Auto Rotate';
});

closeBtn.addEventListener('click', () => {
    artworkModal.style.display = 'none';
});

close3dBtn.addEventListener('click', () => {
    modal3dEl.style.display = 'none';
});

window.addEventListener('click', (e) => {
    if (e.target === artworkModal) artworkModal.style.display = 'none';
    if (e.target === modal3dEl) modal3dEl.style.display = 'none';
});

// Add event listener for Read More button
document.getElementById('readMoreBtn').addEventListener('click', async () => {
    const extendedInfo = document.getElementById('extendedInfo');
    const extendedContent = document.getElementById('extendedContent');
    const modalContent = document.querySelector('.modal-content');
    const modalBody = document.querySelector('.modal-body');
    const artwork = artworks[currentArtworkIndex];
    
    // Toggle visibility
    if (extendedInfo.classList.contains('hidden')) {
        extendedInfo.classList.remove('hidden');
        modalContent.classList.add('fullscreen');
        modalBody.classList.add('expanded');
        
        // Fetch extended information
        extendedContent.innerHTML = '<p class="loading-text">Loading information...</p>';
        
        try {
            // Fetch additional details from MET API
            const response = await fetch(`https://collectionapi.metmuseum.org/public/collection/v1/objects/${artwork.objectID}`);
            const detailedData = await response.json();
            
            // Build extended content without duplicating existing displayed info
            let content = '';
            
            // Only show artist bio if it's different from what's already displayed
            if (detailedData.artistDisplayBio && !artwork.artistDisplayName.includes(detailedData.artistDisplayBio)) {
                content += `
                    <div class="info-section">
                        <p class="info-label">About the Artist</p>
                        <p>${detailedData.artistDisplayBio}</p>
                    </div>
                `;
            }
            
            if (detailedData.objectHistory) {
                content += `
                    <div class="info-section">
                        <p class="info-label">History</p>
                        <p>${detailedData.objectHistory}</p>
                    </div>
                `;
            }
            
            if (detailedData.excavation) {
                content += `
                    <div class="info-section">
                        <p class="info-label">Excavation</p>
                        <p>${detailedData.excavation}</p>
                    </div>
                `;
            }
            
            if (detailedData.creditLine) {
                content += `
                    <div class="info-section">
                        <p class="info-label">Credit Line</p>
                        <p>${detailedData.creditLine}</p>
                    </div>
                `;
            }
            
            if (detailedData.dimensions) {
                content += `
                    <div class="info-section">
                        <p class="info-label">Dimensions</p>
                        <p>${detailedData.dimensions}</p>
                    </div>
                `;
            }
            
            if (detailedData.city || detailedData.country || detailedData.region) {
                content += `
                    <div class="info-section">
                        <p class="info-label">Origin</p>
                        <p>${[detailedData.city, detailedData.region, detailedData.country].filter(Boolean).join(', ')}</p>
                    </div>
                `;
            }
            
            if (detailedData.culture && detailedData.culture !== artwork.culture) {
                content += `
                    <div class="info-section">
                        <p class="info-label">Culture</p>
                        <p>${detailedData.culture}</p>
                    </div>
                `;
            }
            
            if (detailedData.period && detailedData.period !== artwork.period) {
                content += `
                    <div class="info-section">
                        <p class="info-label">Period</p>
                        <p>${detailedData.period}</p>
                    </div>
                `;
            }
            
            // Try to fetch Wikipedia info
            if (detailedData.artistDisplayName && detailedData.artistDisplayName !== 'Unknown') {
                try {
                    const wikiResponse = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(detailedData.artistDisplayName)}`);
                    if (wikiResponse.ok) {
                        const wikiData = await wikiResponse.json();
                        if (wikiData.extract) {
                            content += `
                                <div class="info-section">
                                    <p class="info-label">Artist Biography (Wikipedia)</p>
                                    <p>${wikiData.extract}</p>
                                </div>
                            `;
                        }
                    }
                } catch (wikiError) {
                    console.log('Wikipedia data not available');
                }
            }
            
            if (content) {
                extendedContent.innerHTML = content;
            } else {
                extendedContent.innerHTML = '<p>No additional information available for this artwork.</p>';
            }
            
        } catch (error) {
            console.error('Error fetching extended information:', error);
            extendedContent.innerHTML = '<p>Unable to load additional information at this time.</p>';
        }
    } else {
        extendedInfo.classList.add('hidden');
        modalContent.classList.remove('fullscreen');
        modalBody.classList.remove('expanded');
    }
});

// Initialize with default search
window.addEventListener('DOMContentLoaded', () => {
    // Trigger initial search
    searchBtn.click();
});
