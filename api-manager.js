class APIManager {
    constructor() {
        this.apis = {
            met: {
                baseUrl: 'https://collectionapi.metmuseum.org/public/collection/v1',
                name: 'Metropolitan Museum of Art'
            },
            harvard: {
                baseUrl: 'https://api.harvardartmuseums.org/v1',
                apiKey: 'YOUR_HARVARD_API_KEY', // Replace with actual key
                name: 'Harvard Art Museums'
            },
            rijks: {
                baseUrl: 'https://www.rijksmuseum.nl/api/nl/collection',
                apiKey: 'YOUR_RIJKS_API_KEY', // Replace with actual key
                name: 'Rijksmuseum'
            },
            chicago: {
                baseUrl: 'https://api.artic.edu/api/v1',
                name: 'Art Institute of Chicago'
            }
        };
        this.cache = new Map();
        this.rateLimiter = new Map();
    }

    async fetchFromMET(query = '', objectType = '') {
        try {
            const searchUrl = `${this.apis.met.baseUrl}/search?hasImages=true&q=${encodeURIComponent(query)}`;
            const searchResponse = await fetch(searchUrl);
            const searchData = await searchResponse.json();

            if (!searchData.objectIDs || searchData.objectIDs.length === 0) {
                return [];
            }

            const objectIds = searchData.objectIDs.slice(0, 20);
            const artworks = await Promise.all(
                objectIds.map(async (id) => {
                    try {
                        const objectUrl = `${this.apis.met.baseUrl}/objects/${id}`;
                        const response = await fetch(objectUrl);
                        const artwork = await response.json();
                        
                        if (artwork.primaryImage) {
                            return this.formatMETArtwork(artwork);
                        }
                        return null;
                    } catch (error) {
                        console.warn(`Failed to fetch MET object ${id}:`, error);
                        return null;
                    }
                })
            );

            return artworks.filter(artwork => artwork !== null);
        } catch (error) {
            console.error('MET API Error:', error);
            return [];
        }
    }

    async fetchFromChicago(query = '') {
        try {
            const searchUrl = `${this.apis.chicago.baseUrl}/artworks/search?q=${encodeURIComponent(query)}&limit=20&fields=id,title,artist_display,date_display,medium_display,image_id,department_title,artwork_type_title,style_title,classification_title`;
            const response = await fetch(searchUrl);
            const data = await response.json();

            if (!data.data || data.data.length === 0) {
                return [];
            }

            return data.data.map(artwork => this.formatChicagoArtwork(artwork));
        } catch (error) {
            console.error('Chicago API Error:', error);
            return [];
        }
    }

    async fetchFromHarvard(query = '') {
        if (!this.apis.harvard.apiKey || this.apis.harvard.apiKey === 'YOUR_HARVARD_API_KEY') {
            console.warn('Harvard API key not configured');
            return [];
        }

        try {
            const searchUrl = `${this.apis.harvard.baseUrl}/object?apikey=${this.apis.harvard.apiKey}&hasimage=1&q=${encodeURIComponent(query)}&size=20`;
            const response = await fetch(searchUrl);
            const data = await response.json();

            if (!data.records || data.records.length === 0) {
                return [];
            }

            return data.records.map(artwork => this.formatHarvardArtwork(artwork));
        } catch (error) {
            console.error('Harvard API Error:', error);
            return [];
        }
    }

    async fetchFromRijks(query = '') {
        if (!this.apis.rijks.apiKey || this.apis.rijks.apiKey === 'YOUR_RIJKS_API_KEY') {
            console.warn('Rijksmuseum API key not configured');
            return [];
        }

        try {
            const searchUrl = `${this.apis.rijks.baseUrl}?key=${this.apis.rijks.apiKey}&hasimage=True&q=${encodeURIComponent(query)}&ps=20&format=json`;
            const response = await fetch(searchUrl);
            const data = await response.json();

            if (!data.artObjects || data.artObjects.length === 0) {
                return [];
            }

            return data.artObjects.map(artwork => this.formatRijksArtwork(artwork));
        } catch (error) {
            console.error('Rijksmuseum API Error:', error);
            return [];
        }
    }

    formatMETArtwork(artwork) {
        return {
            id: `met_${artwork.objectID}`,
            title: artwork.title || 'Untitled',
            artist: artwork.artistDisplayName || 'Unknown Artist',
            date: artwork.objectDate || 'Date unknown',
            medium: artwork.medium || 'Medium unknown',
            dimensions: artwork.dimensions || 'Dimensions unknown',
            department: artwork.department || '',
            culture: artwork.culture || '',
            period: artwork.period || '',
            dynasty: artwork.dynasty || '',
            image: artwork.primaryImage,
            imageSmall: artwork.primaryImageSmall,
            additionalImages: artwork.additionalImages || [],
            museum: 'Metropolitan Museum of Art',
            museumUrl: artwork.objectURL,
            accessionNumber: artwork.accessionNumber,
            classification: artwork.classification,
            category: this.categorizeArtwork(artwork.objectName, artwork.classification),
            tags: artwork.tags ? artwork.tags.map(tag => tag.term) : [],
            isPublicDomain: artwork.isPublicDomain,
            description: artwork.artistDisplayBio || '',
            creditLine: artwork.creditLine || '',
            repository: artwork.repository || '',
            objectName: artwork.objectName || '',
            reign: artwork.reign || '',
            portfolio: artwork.portfolio || '',
            constituents: artwork.constituents || []
        };
    }

    formatChicagoArtwork(artwork) {
        const imageUrl = artwork.image_id 
            ? `https://www.artic.edu/iiif/2/${artwork.image_id}/full/843,/0/default.jpg`
            : null;

        return {
            id: `chicago_${artwork.id}`,
            title: artwork.title || 'Untitled',
            artist: artwork.artist_display || 'Unknown Artist',
            date: artwork.date_display || 'Date unknown',
            medium: artwork.medium_display || 'Medium unknown',
            dimensions: 'Dimensions available on request',
            department: artwork.department_title || '',
            image: imageUrl,
            imageSmall: imageUrl,
            museum: 'Art Institute of Chicago',
            museumUrl: `https://www.artic.edu/artworks/${artwork.id}`,
            classification: artwork.classification_title,
            category: this.categorizeArtwork(artwork.artwork_type_title, artwork.classification_title),
            style: artwork.style_title,
            artworkType: artwork.artwork_type_title,
            description: `${artwork.style_title || ''} artwork from the Art Institute of Chicago collection.`
        };
    }

    formatHarvardArtwork(artwork) {
        const primaryImage = artwork.images && artwork.images.length > 0 
            ? artwork.images[0].baseimageurl 
            : null;

        return {
            id: `harvard_${artwork.id}`,
            title: artwork.title || 'Untitled',
            artist: artwork.people ? artwork.people.map(p => p.displayname).join(', ') : 'Unknown Artist',
            date: artwork.dated || 'Date unknown',
            medium: artwork.medium || 'Medium unknown',
            dimensions: artwork.dimensions || 'Dimensions unknown',
            department: artwork.department || '',
            culture: artwork.culture || '',
            image: primaryImage,
            imageSmall: primaryImage,
            museum: 'Harvard Art Museums',
            museumUrl: artwork.url,
            classification: artwork.classification,
            category: this.categorizeArtwork(artwork.worktype, artwork.classification),
            technique: artwork.technique,
            period: artwork.period,
            description: artwork.description || '',
            accessionNumber: artwork.accessionNumber,
            creditLine: artwork.creditline
        };
    }

    formatRijksArtwork(artwork) {
        return {
            id: `rijks_${artwork.objectNumber}`,
            title: artwork.title || 'Untitled',
            artist: artwork.principalOrFirstMaker || 'Unknown Artist',
            date: artwork.dating ? artwork.dating.presentingDate : 'Date unknown',
            medium: 'Oil on canvas', // Rijks API doesn't always provide this
            dimensions: 'Dimensions available on request',
            image: artwork.webImage ? artwork.webImage.url : null,
            imageSmall: artwork.headerImage ? artwork.headerImage.url : null,
            museum: 'Rijksmuseum',
            museumUrl: artwork.links ? artwork.links.web : '',
            category: this.categorizeArtwork(artwork.objectTypes ? artwork.objectTypes[0] : ''),
            description: `Artwork from the Rijksmuseum collection, ${artwork.longTitle || artwork.title}`
        };
    }

    categorizeArtwork(objectType = '', classification = '') {
        const type = (objectType + ' ' + classification).toLowerCase();
        
        if (type.includes('painting') || type.includes('canvas') || type.includes('oil')) {
            return 'paintings';
        } else if (type.includes('sculpture') || type.includes('statue') || type.includes('bronze')) {
            return 'sculptures';
        } else if (type.includes('photograph') || type.includes('digital')) {
            return 'photography';
        } else if (type.includes('drawing') || type.includes('sketch')) {
            return 'drawings';
        } else if (type.includes('print') || type.includes('lithograph')) {
            return 'prints';
        } else {
            return 'other';
        }
    }

    async searchArtworks(museum, query, filters = {}) {
        const cacheKey = `${museum}_${query}_${JSON.stringify(filters)}`;
        
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        let results = [];
        
        switch (museum) {
            case 'met':
                results = await this.fetchFromMET(query);
                break;
            case 'chicago':
                results = await this.fetchFromChicago(query);
                break;
            case 'harvard':
                results = await this.fetchFromHarvard(query);
                break;
            case 'rijks':
                results = await this.fetchFromRijks(query);
                break;
            default:
                // Search all museums
                const [metResults, chicagoResults] = await Promise.all([
                    this.fetchFromMET(query),
                    this.fetchFromChicago(query)
                ]);
                results = [...metResults, ...chicagoResults];
        }

        // Apply filters
        if (filters.category && filters.category !== 'all') {
            results = results.filter(artwork => artwork.category === filters.category);
        }

        // Cache results for 10 minutes
        this.cache.set(cacheKey, results);
        setTimeout(() => this.cache.delete(cacheKey), 10 * 60 * 1000);

        return results;
    }

    async getArtworkDetails(artworkId) {
        const [museum, id] = artworkId.split('_');
        
        switch (museum) {
            case 'met':
                const metResponse = await fetch(`${this.apis.met.baseUrl}/objects/${id}`);
                return await metResponse.json();
            case 'chicago':
                const chicagoResponse = await fetch(`${this.apis.chicago.baseUrl}/artworks/${id}`);
                return await chicagoResponse.json();
            default:
                return null;
        }
    }

    async getSimilarArtworks(artwork, limit = 6) {
        const searchTerms = [
            artwork.artist,
            artwork.classification,
            artwork.style,
            artwork.period
        ].filter(term => term && term !== 'Unknown Artist').join(' ');

        const results = await this.searchArtworks('all', searchTerms);
        return results
            .filter(item => item.id !== artwork.id)
            .slice(0, limit);
    }
}

window.apiManager = new APIManager();
