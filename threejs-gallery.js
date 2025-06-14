class ThreeJSGallery {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.artworks = [];
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.currentArtwork = null;
        this.galleryRoom = null;
        this.ambientSound = null;
        this.isVRMode = false;
    }

    async init() {
        this.createScene();
        this.createCamera();
        this.createRenderer();
        this.createControls();
        this.createLighting();
        await this.createGalleryRoom();
        this.setupEventListeners();
        this.animate();
    }

    createScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xf5f5f5);
        this.scene.fog = new THREE.Fog(0xf5f5f5, 50, 200);
    }

    createCamera() {
        const container = document.getElementById('threejsContainer');
        this.camera = new THREE.PerspectiveCamera(
            75,
            container.clientWidth / container.clientHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 1.7, 5);
    }

    createRenderer() {
        const canvas = document.getElementById('threejsCanvas');
        this.renderer = new THREE.WebGLRenderer({ 
            canvas: canvas, 
            antialias: true,
            alpha: true 
        });
        
        const container = document.getElementById('threejsContainer');
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;

        // VR support
        this.renderer.xr.enabled = true;
        document.body.appendChild(THREE.VRButton.createButton(this.renderer));
    }

    createControls() {
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.maxPolarAngle = Math.PI / 2;
        this.controls.minDistance = 2;
        this.controls.maxDistance = 20;
        this.controls.target.set(0, 1.5, 0);
    }

    createLighting() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
        this.scene.add(ambientLight);

        // Main directional light
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 10, 5);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 50;
        this.scene.add(directionalLight);

        // Gallery spotlights
        const spotLight1 = new THREE.SpotLight(0xffffff, 0.5);
        spotLight1.position.set(-5, 8, 0);
        spotLight1.angle = Math.PI / 6;
        spotLight1.penumbra = 0.2;
        spotLight1.castShadow = true;
        this.scene.add(spotLight1);

        const spotLight2 = new THREE.SpotLight(0xffffff, 0.5);
        spotLight2.position.set(5, 8, 0);
        spotLight2.angle = Math.PI / 6;
        spotLight2.penumbra = 0.2;
        spotLight2.castShadow = true;
        this.scene.add(spotLight2);
    }

    async createGalleryRoom() {
        // Floor
        const floorGeometry = new THREE.PlaneGeometry(30, 30);
        const floorMaterial = new THREE.MeshLambertMaterial({ 
            color: 0xffffff,
            roughness: 0.8,
            metalness: 0.1
        });
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        this.scene.add(floor);

        // Walls
        const wallMaterial = new THREE.MeshLambertMaterial({ color: 0xf8f8f8 });
        
        // Back wall
        const backWallGeometry = new THREE.PlaneGeometry(30, 10);
        const backWall = new THREE.Mesh(backWallGeometry, wallMaterial);
        backWall.position.set(0, 5, -15);
        this.scene.add(backWall);

        // Side walls
        const sideWallGeometry = new THREE.PlaneGeometry(30, 10);
        const leftWall = new THREE.Mesh(sideWallGeometry, wallMaterial);
        leftWall.rotation.y = Math.PI / 2;
        leftWall.position.set(-15, 5, 0);
        this.scene.add(leftWall);

        const rightWall = new THREE.Mesh(sideWallGeometry, wallMaterial);
        rightWall.rotation.y = -Math.PI / 2;
        rightWall.position.set(15, 5, 0);
        this.scene.add(rightWall);

        // Ceiling
        const ceilingGeometry = new THREE.PlaneGeometry(30, 30);
        const ceilingMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff });
        const ceiling = new THREE.Mesh(ceilingGeometry, ceilingMaterial);
        ceiling.rotation.x = Math.PI / 2;
        ceiling.position.y = 10;
        this.scene.add(ceiling);
    }

    async loadArtworks(artworkData) {
        this.clearArtworks();
        
        const positions = [
            { x: -8, y: 3, z: -14.5, rotation: 0 },
            { x: -4, y: 3, z: -14.5, rotation: 0 },
            { x: 0, y: 3, z: -14.5, rotation: 0 },
            { x: 4, y: 3, z: -14.5, rotation: 0 },
            { x: 8, y: 3, z: -14.5, rotation: 0 },
            { x: -14.5, y: 3, z: -8, rotation: Math.PI / 2 },
            { x: -14.5, y: 3, z: -4, rotation: Math.PI / 2 },
            { x: -14.5, y: 3, z: 0, rotation: Math.PI / 2 },
            { x: -14.5, y: 3, z: 4, rotation: Math.PI / 2 },
            { x: -14.5, y: 3, z: 8, rotation: Math.PI / 2 },
        ];

        for (let i = 0; i < Math.min(artworkData.length, positions.length); i++) {
            const artwork = artworkData[i];
            const position = positions[i];
            
            try {
                await this.createArtworkFrame(artwork, position);
            } catch (error) {
                console.warn(`Failed to load artwork ${artwork.title}:`, error);
            }
        }
    }

    async createArtworkFrame(artwork, position) {
        return new Promise((resolve, reject) => {
            const textureLoader = new THREE.TextureLoader();
            
            textureLoader.load(
                artwork.image,
                (texture) => {
                    // Create frame
                    const frameGroup = new THREE.Group();
                    
                    // Artwork dimensions
                    const aspectRatio = texture.image.width / texture.image.height;
                    const artworkWidth = Math.min(3, aspectRatio * 2);
                    const artworkHeight = artworkWidth / aspectRatio;
                    
                    // Frame geometry
                    const frameThickness = 0.1;
                    const frameWidth = 0.2;
                    
                    const frameGeometry = new THREE.BoxGeometry(
                        artworkWidth + frameWidth * 2,
                        artworkHeight + frameWidth * 2,
                        frameThickness
                    );
                    const frameMaterial = new THREE.MeshPhongMaterial({ color: 0x8B4513 });
                    const frame = new THREE.Mesh(frameGeometry, frameMaterial);
                    frame.castShadow = true;
                    frameGroup.add(frame);
                    
                    // Artwork plane
                    const artworkGeometry = new THREE.PlaneGeometry(artworkWidth, artworkHeight);
                    const artworkMaterial = new THREE.MeshBasicMaterial({ 
                        map: texture,
                        transparent: true
                    });
                    const artworkMesh = new THREE.Mesh(artworkGeometry, artworkMaterial);
                    artworkMesh.position.z = frameThickness / 2 + 0.01;
                    frameGroup.add(artworkMesh);
                    
                    // Position the frame
                    frameGroup.position.set(position.x, position.y, position.z);
                    frameGroup.rotation.y = position.rotation;
                    
                    // Add artwork data for interaction
                    frameGroup.userData = { 
                        artwork: artwork,
                        isArtwork: true 
                    };
                    
                    this.scene.add(frameGroup);
                    this.artworks.push(frameGroup);
                    
                    // Add artwork label
                    this.createArtworkLabel(artwork, {
                        x: position.x,
                        y: position.y - artworkHeight / 2 - 0.5,
                        z: position.z,
                        rotation: position.rotation
                    });
                    
                    resolve();
                },
                undefined,
                reject
            );
        });
    }

    createArtworkLabel(artwork, position) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 512;
        canvas.height = 128;
        
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        context.fillStyle = '#000000';
        context.font = 'bold 24px Arial';
        context.textAlign = 'center';
        context.fillText(artwork.title, canvas.width / 2, 40);
        
        context.font = '18px Arial';
        context.fillText(artwork.artist, canvas.width / 2, 70);
        context.fillText(artwork.date, canvas.width / 2, 100);
        
        const texture = new THREE.CanvasTexture(canvas);
        const labelGeometry = new THREE.PlaneGeometry(2, 0.5);
        const labelMaterial = new THREE.MeshBasicMaterial({ 
            map: texture,
            transparent: true
        });
        const label = new THREE.Mesh(labelGeometry, labelMaterial);
        
        label.position.set(position.x, position.y, position.z);
        label.rotation.y = position.rotation;
        
        this.scene.add(label);
    }

    setupEventListeners() {
        const canvas = this.renderer.domElement;
        
        canvas.addEventListener('click', (event) => this.onCanvasClick(event));
        canvas.addEventListener('mousemove', (event) => this.onCanvasMouseMove(event));
        
        window.addEventListener('resize', () => this.onWindowResize());
        
        // Exit 3D view
        document.getElementById('exitVR').addEventListener('click', () => {
            this.exit3DView();
        });

        // Audio guide toggle
        document.getElementById('toggleAudio').addEventListener('click', () => {
            this.toggleAudioGuide();
        });
    }

    onCanvasClick(event) {
        const canvas = this.renderer.domElement;
        const rect = canvas.getBoundingClientRect();
        
        this.mouse.x = ((event.clientX - rect.left) / canvas.clientWidth) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / canvas.clientHeight) * 2 + 1;
        
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.artworks, true);
        
        if (intersects.length > 0) {
            const intersected = intersects[0].object.parent;
            if (intersected.userData && intersected.userData.isArtwork) {
                this.showArtworkInfo(intersected.userData.artwork);
            }
        }
    }

    onCanvasMouseMove(event) {
        const canvas = this.renderer.domElement;
        const rect = canvas.getBoundingClientRect();
        
        this.mouse.x = ((event.clientX - rect.left) / canvas.clientWidth) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / canvas.clientHeight) * 2 + 1;
        
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.artworks, true);
        
        canvas.style.cursor = intersects.length > 0 ? 'pointer' : 'default';
    }

    showArtworkInfo(artwork) {
        const infoPanel = document.getElementById('artworkInfo');
        const title = document.getElementById('vrArtworkTitle');
        const details = document.getElementById('vrArtworkDetails');
        
        title.textContent = artwork.title;
        details.innerHTML = `
            <strong>Artist:</strong> ${artwork.artist}<br>
            <strong>Date:</strong> ${artwork.date}<br>
            <strong>Medium:</strong> ${artwork.medium}
        `;
        
        infoPanel.classList.remove('hidden');
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            infoPanel.classList.add('hidden');
        }, 5000);
    }

    onWindowResize() {
        const container = document.getElementById('threejsContainer');
        
        this.camera.aspect = container.clientWidth / container.clientHeight;
        this.camera.updateProjectionMatrix();
        
        this.renderer.setSize(container.clientWidth, container.clientHeight);
    }

    clearArtworks() {
        this.artworks.forEach(artwork => {
            this.scene.remove(artwork);
        });
        this.artworks = [];
    }

    animate() {
        this.renderer.setAnimationLoop(() => {
            this.controls.update();
            this.renderer.render(this.scene, this.camera);
        });
    }

    enter3DView() {
        const container = document.getElementById('threejsContainer');
        container.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        
        // Load current gallery artworks into 3D space
        if (window.gallery && window.gallery.filteredArtworks) {
            this.loadArtworks(window.gallery.filteredArtworks);
        }
        
        this.onWindowResize();
    }

    exit3DView() {
        const container = document.getElementById('threejsContainer');
        container.classList.add('hidden');
        document.body.style.overflow = 'auto';
    }

    toggleAudioGuide() {
        // Implement audio guide functionality
        console.log('Audio guide toggled');
    }
}

// Initialize 3D gallery
document.addEventListener('DOMContentLoaded', () => {
    window.threejsGallery = new ThreeJSGallery();
    window.threejsGallery.init();
    
    // Bind 3D view button
    document.getElementById('virtual3DBtn').addEventListener('click', () => {
        window.threejsGallery.enter3DView();
    });
});

let renderer, scene, camera, planes = [];

function show3DGallery() {
    document.getElementById('threejsContainer').classList.remove('hidden');
    if (!renderer) init3D();
    else animate();
}

function hide3DGallery() {
    document.getElementById('threejsContainer').classList.add('hidden');
    if (renderer) renderer.setAnimationLoop(null);
}

function init3D() {
    const canvas = document.getElementById('threejsCanvas');
    renderer = new THREE.WebGLRenderer({ canvas });
    renderer.setClearColor(0x222222);
    renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(60, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
    camera.position.set(0, 0, 12);

    // Light
    scene.add(new THREE.AmbientLight(0xffffff, 1));

    // Artworks as planes
    const artworks = window._artworks || [];
    planes = [];
    artworks.forEach((a, i) => {
        const tex = new THREE.TextureLoader().load(a.primaryImageSmall);
        const geo = new THREE.PlaneGeometry(3, 2);
        const mat = new THREE.MeshBasicMaterial({ map: tex });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.x = (i - (artworks.length - 1) / 2) * 4;
        scene.add(mesh);
        planes.push(mesh);
    });

    animate();
}

function animate() {
    renderer.setAnimationLoop(() => {
        renderer.render(scene, camera);
    });
}

document.getElementById('threejsBtn').onclick = show3DGallery;
document.getElementById('exit3dBtn').onclick = hide3DGallery;
