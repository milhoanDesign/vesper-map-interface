import React, { useEffect, useRef, useState, useCallback } from 'react';
import { initializeBlock, useBase, useRecords, useCustomProperties } from '@airtable/blocks/interface/ui';
import { FieldType } from '@airtable/blocks/interface/models';
import './style.css';

function MapInterface() {
    const base = useBase();

    // Define custom properties configuration
    const getCustomProperties = useCallback((base) => {
        // Try to find Requirements and Listings tables by name for defaults
        const foundRequirementsTable = base.getTableByNameIfExists('Requirements');
        const foundListingsTable = base.getTableByNameIfExists('Listings');

        // Set up table references for field defaults (use found tables or fallback)
        const reqTable = foundRequirementsTable || base.tables[0];
        const listTable = foundListingsTable || base.tables[1] || base.tables[0];

        return [
            {
                key: 'VESPER_GOOGLE_API',
                label: 'Google Maps API Key',
                type: 'string',
                defaultValue: ''
            },
            {
                key: 'requirementsTable',
                label: 'Requirements Table',
                type: 'table',
                defaultValue: foundRequirementsTable || base.tables[0]
            },
            {
                key: 'listingsTable',
                label: 'Listings Table',
                type: 'table',
                defaultValue: foundListingsTable || base.tables[1] || base.tables[0]
            },
            {
                key: 'requirementAddressField',
                label: 'Requirement Address Field',
                type: 'field',
                table: reqTable,
                shouldFieldBeAllowed: (field) => field.config.type === FieldType.SINGLE_LINE_TEXT || field.config.type === FieldType.MULTILINE_TEXT,
                defaultValue: reqTable.getFieldByNameIfExists('Address')
            },
            {
                key: 'listingAddressField',
                label: 'Listing Address Field',
                type: 'field',
                table: listTable,
                shouldFieldBeAllowed: (field) => field.config.type === FieldType.SINGLE_LINE_TEXT || field.config.type === FieldType.MULTILINE_TEXT,
                defaultValue: listTable.getFieldByNameIfExists('Listing Address')
            },
            {
                key: 'listingUrlField',
                label: 'Listing URL Field',
                type: 'field',
                table: listTable,
                shouldFieldBeAllowed: (field) => field.config.type === FieldType.URL || field.config.type === FieldType.SINGLE_LINE_TEXT,
                defaultValue: listTable.getFieldByNameIfExists('Listing URL')
            },
            {
                key: 'listingDistanceField',
                label: 'Listing Distance Field',
                type: 'field',
                table: listTable,
                shouldFieldBeAllowed: (field) => field.config.type === FieldType.NUMBER || field.config.type === FieldType.CURRENCY,
                defaultValue: listTable.getFieldByNameIfExists('Drive Distance (mi)')
            },
            {
                key: 'listingDriveTimeField',
                label: 'Listing Drive Time Field',
                type: 'field',
                table: listTable,
                shouldFieldBeAllowed: (field) => field.config.type === FieldType.NUMBER || field.config.type === FieldType.DURATION,
                defaultValue: listTable.getFieldByNameIfExists('Drive Time (min)')
            },
            {
                key: 'listingRequirementsField',
                label: 'Listing Requirements Link Field',
                type: 'field',
                table: listTable,
                shouldFieldBeAllowed: (field) => field.config.type === FieldType.MULTIPLE_RECORD_LINKS,
                defaultValue: listTable.getFieldByNameIfExists('Requirements')
            },
            {
                key: 'listingImageUrlField',
                label: 'Listing Image URL Field',
                type: 'field',
                table: listTable,
                shouldFieldBeAllowed: (field) => field.config.type === FieldType.URL || field.config.type === FieldType.SINGLE_LINE_TEXT,
                defaultValue: listTable.getFieldByNameIfExists('Listing Image URL')
            },
            {
                key: 'listingPropertyTypeField',
                label: 'Property Type Field',
                type: 'field',
                table: listTable,
                shouldFieldBeAllowed: (field) => field.config.type === FieldType.SINGLE_SELECT || field.config.type === FieldType.SINGLE_LINE_TEXT,
                defaultValue: listTable.getFieldByNameIfExists('Property Type') || listTable.getFieldByNameIfExists('Listing Type') || listTable.getFieldByNameIfExists('Type')
            }
        ];
    }, []);

    const { customPropertyValueByKey, errorState } = useCustomProperties(getCustomProperties);

    const mapContainerRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const markersRef = useRef([]);
    const circlesRef = useRef([]);
    const infoWindowRef = useRef(null);
    const [mapsLoaded, setMapsLoaded] = useState(false);
    const [error, setError] = useState(null);

    // Get tables from custom properties
    const requirementsTable = customPropertyValueByKey.requirementsTable;
    const listingsTable = customPropertyValueByKey.listingsTable;

    // Get records from custom property tables
    const requirementRecords = useRecords(requirementsTable);
    const listingRecords = useRecords(listingsTable);

    // Load Google Maps API dynamically
    useEffect(() => {
        // Check if already loaded
        if (window.google && window.google.maps) {
            setMapsLoaded(true);
            return;
        }

        // Get API key from custom properties
        const GOOGLE_KEY = customPropertyValueByKey.VESPER_GOOGLE_API;

        if (!GOOGLE_KEY) {
            setError('Google Maps API key not found. Please set VESPER_GOOGLE_API in custom properties.');
            return;
        }

        // Create script element
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_KEY}`;
        script.async = true;
        script.defer = true;
        script.onload = () => setMapsLoaded(true);
        script.onerror = () => setError('Failed to load Google Maps API');

        document.head.appendChild(script);

        return () => {
            // Cleanup script if component unmounts
            if (script.parentNode) {
                script.parentNode.removeChild(script);
            }
        };
    }, [customPropertyValueByKey.VESPER_GOOGLE_API]);

    // Initialize map and markers
    useEffect(() => {
        if (!mapsLoaded || !mapContainerRef.current || !requirementsTable || !listingsTable) {
            return;
        }

        // Initialize map if not already initialized
        if (!mapInstanceRef.current) {
            mapInstanceRef.current = new window.google.maps.Map(mapContainerRef.current, {
                zoom: 5,
                center: { lat: 40.62999850026765, lng: -99.83076746904716 },
                mapTypeControl: true,
                streetViewControl: false,
                gestureHandling: 'greedy', // Allows scroll wheel zoom without Ctrl/Cmd
                scrollwheel: true,
            });

            // Initialize InfoWindow without default close button
            infoWindowRef.current = new window.google.maps.InfoWindow({
                disableAutoPan: false,
            });
        }

        // Clear existing markers and circles
        markersRef.current.forEach(marker => marker.setMap(null));
        markersRef.current = [];
        circlesRef.current.forEach(circle => circle.setMap(null));
        circlesRef.current = [];

        const bounds = new window.google.maps.LatLngBounds();
        const geocoder = new window.google.maps.Geocoder();
        let markerCount = 0;
        const totalRecords = (requirementRecords?.length || 0) + (listingRecords?.length || 0);

        // Function to fit bounds only once after all markers are loaded
        const checkAndFitBounds = () => {
            markerCount++;
            if (markerCount === totalRecords && !bounds.isEmpty()) {
                mapInstanceRef.current.fitBounds(bounds);
            }
        };

        // Add requirement markers (blue stars) - geocode addresses
        if (requirementRecords && requirementsTable) {
            requirementRecords.forEach((record, index) => {
                try {
                    // Get address field from custom properties
                    const addressField = customPropertyValueByKey.requirementAddressField;
                    const addressValue = addressField ? record.getCellValue(addressField.id) : null;

                    let address = null;
                    if (addressValue) {
                        if (typeof addressValue === 'string') {
                            address = addressValue.trim();
                        } else if (Array.isArray(addressValue) && addressValue.length > 0) {
                            address = addressValue[0];
                        }
                    }

                    // Get the site code (record name) for the requirement
                    const siteCode = record.name || '';

                    if (address) {
                        geocoder.geocode({ address: address }, (results, status) => {
                            if (status === 'OK' && results[0]) {
                                const position = results[0].geometry.location;

                                const marker = new window.google.maps.Marker({
                                    position,
                                    map: mapInstanceRef.current,
                                    title: address,
                                    icon: {
                                        path: window.google.maps.SymbolPath.CIRCLE,
                                        scale: 8,
                                        fillColor: '#1976d2',
                                        fillOpacity: 1,
                                        strokeColor: '#ffffff',
                                        strokeWeight: 1.6,
                                    },
                                });

                                // Create info window content for requirement
                                const requirementContentString = `
                                    <div style="
                                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                                        padding: 16px;
                                        padding-top: 12px;
                                        min-width: 220px;
                                        max-width: 280px;
                                        position: relative;
                                    ">
                                        <button onclick="document.querySelector('.gm-ui-hover-effect').click()" style="
                                            position: absolute;
                                            top: 0.5rem;
                                            right: 0.5rem;
                                            width: 2rem;
                                            height: 2rem;
                                            display: flex;
                                            align-items: center;
                                            justify-content: center;
                                            background: white;
                                            border: none;
                                            border-radius: 3px;
                                            cursor: pointer;
                                            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                                            font-size: 18px;
                                            color: #5f6368;
                                            font-weight: 400;
                                            transition: background 0.2s;
                                        " onmouseover="this.style.background='#f1f3f4'" onmouseout="this.style.background='white'">
                                            ×
                                        </button>

                                        <div style="
                                            display: inline-block;
                                            background-color: #e8eaed;
                                            color: #3c4043;
                                            padding: 4px 10px;
                                            border-radius: 12px;
                                            font-size: 0.875rem;
                                            font-weight: 500;
                                            margin-top: 8px;
                                            margin-bottom: 8px;
                                        ">
                                            ${siteCode}
                                        </div>

                                        <div style="
                                            font-size: 1rem;
                                            color: #202124;
                                            padding-right: 24px;
                                            line-height: 1.4;
                                        ">
                                            ${address}
                                        </div>
                                    </div>
                                `;

                                // Add click listener to requirement marker
                                marker.addListener('click', () => {
                                    infoWindowRef.current.setContent(requirementContentString);
                                    infoWindowRef.current.open(mapInstanceRef.current, marker);
                                });

                                markersRef.current.push(marker);

                                // Add 15-mile radius circle around requirement
                                const circle = new window.google.maps.Circle({
                                    center: position,
                                    radius: 24140.16, // 15 miles in meters
                                    map: mapInstanceRef.current,
                                    fillColor: '#1976d2',
                                    fillOpacity: 0.15,
                                    strokeColor: '#1976d2',
                                    strokeOpacity: 0.3,
                                    strokeWeight: 1,
                                });

                                circlesRef.current.push(circle);

                                bounds.extend(position);
                                checkAndFitBounds();
                            } else {
                                console.warn('Geocoding failed for:', address, status);
                                checkAndFitBounds();
                            }
                        });
                    } else {
                        console.warn('No address found for requirement record', index + 1);
                        checkAndFitBounds();
                    }
                } catch (err) {
                    console.warn('Error processing requirement record:', err);
                    checkAndFitBounds();
                }
            });
        }

        // Add listing markers (red) - geocode addresses
        if (listingRecords && listingsTable) {
            listingRecords.forEach(record => {
                try {
                    // Get fields from custom properties
                    const addressField = customPropertyValueByKey.listingAddressField;
                    const urlField = customPropertyValueByKey.listingUrlField;
                    const distanceField = customPropertyValueByKey.listingDistanceField;
                    const driveTimeField = customPropertyValueByKey.listingDriveTimeField;
                    const requirementsField = customPropertyValueByKey.listingRequirementsField;
                    const imageUrlField = customPropertyValueByKey.listingImageUrlField;
                    const propertyTypeField = customPropertyValueByKey.listingPropertyTypeField;

                    const address = addressField ? record.getCellValueAsString(addressField.id) : null;
                    const url = urlField ? record.getCellValueAsString(urlField.id) : null;
                    const distance = distanceField ? record.getCellValue(distanceField.id) : null;
                    const driveTime = driveTimeField ? record.getCellValue(driveTimeField.id) : null;
                    const imageUrl = imageUrlField ? record.getCellValueAsString(imageUrlField.id) : null;
                    const propertyType = propertyTypeField ? record.getCellValueAsString(propertyTypeField.id) : null;

                    // Get Requirements field value (it's a linked record field)
                    let requirementName = '';
                    if (requirementsField) {
                        const requirementsValue = record.getCellValue(requirementsField.id);
                        if (requirementsValue && requirementsValue.length > 0) {
                            requirementName = requirementsValue[0].name || '';
                        }
                    }

                    if (address) {
                        geocoder.geocode({ address: address }, (results, status) => {
                            if (status === 'OK' && results[0]) {
                                const position = results[0].geometry.location;

                                const marker = new window.google.maps.Marker({
                                    position,
                                    map: mapInstanceRef.current,
                                    icon: {
                                        path: window.google.maps.SymbolPath.CIRCLE,
                                        scale: 5.2,
                                        fillColor: '#f74022',
                                        fillOpacity: 1,
                                        strokeColor: '#ffffff',
                                        strokeWeight: 1.04,
                                    },
                                });

                                // Feature flags for easy toggling
                                const SHOW_IFRAME = false; // Set to false to disable iframe preview
                                const IFRAME_HEIGHT = '250px'; // Adjust iframe height here

                                // Create info window content matching the design
                                const contentString = `
                                    <div style="
                                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                                        padding: ${imageUrl ? '0.5rem 0 0 0' : '16px'};
                                        padding-top: ${imageUrl ? '0.5rem' : '12px'};
                                        min-width: 280px;
                                        max-width: 320px;
                                        position: relative;
                                    ">
                                        <button onclick="document.querySelector('.gm-ui-hover-effect').click()" style="
                                            position: absolute;
                                            top: 8px;
                                            right: 8px;
                                            width: 2rem;
                                            height: 2rem;
                                            display: flex;
                                            align-items: center;
                                            justify-content: center;
                                            background: white;
                                            border: none;
                                            border-radius: 3px;
                                            cursor: pointer;
                                            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                                            font-size: 18px;
                                            color: #5f6368;
                                            font-weight: 400;
                                            transition: background 0.2s;
                                            z-index: 10;
                                        " onmouseover="this.style.background='#f1f3f4'" onmouseout="this.style.background='white'">
                                            ×
                                        </button>

                                        ${imageUrl ? `
                                            <img src="${imageUrl}" alt="Listing" style="
                                                width: 100%;
                                                height: 180px;
                                                object-fit: cover;
                                                border-radius: 8px 8px 0 0;
                                                margin-bottom: 12px;
                                                margin-top: 0;
                                                display: block;
                                            " onerror="this.style.display='none'">
                                        ` : ''}

                                        <div style="padding: ${imageUrl ? '0 16px 16px 16px' : '0'};">
                                            <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px; margin-top: 8px;">
                                                ${requirementName ? `
                                                    <div style="
                                                        background-color: #e8eaed;
                                                        color: #000;
                                                        padding: 4px 12px;
                                                        border-radius: 4px;
                                                        font-size: 12px;
                                                        font-weight: 600;
                                                        display: inline-block;
                                                    ">
                                                        ${requirementName}
                                                    </div>
                                                ` : ''}
                                                ${propertyType ? `
                                                    <div style="
                                                        background-color: ${propertyType.toLowerCase().includes('parking') ? '#fff3cd' : propertyType.toLowerCase().includes('land') ? '#d1ecf1' : '#d4edda'};
                                                        color: ${propertyType.toLowerCase().includes('parking') ? '#856404' : propertyType.toLowerCase().includes('land') ? '#0c5460' : '#155724'};
                                                        padding: 4px 12px;
                                                        border-radius: 4px;
                                                        font-size: 12px;
                                                        font-weight: 600;
                                                        display: inline-block;
                                                        border: 1px solid ${propertyType.toLowerCase().includes('parking') ? '#ffeaa7' : propertyType.toLowerCase().includes('land') ? '#bee5eb' : '#c3e6cb'};
                                                    ">
                                                        ${propertyType}
                                                    </div>
                                                ` : ''}
                                            </div>

                                        <div style="
                                            font-size: 16px;
                                            font-weight: 600;
                                            margin-bottom: 8px;
                                            margin-top: ${requirementName ? '0' : '8px'};
                                            color: #202124;
                                            padding-right: 24px;
                                        ">
                                            ${address}
                                        </div>

                                        ${distance ? `
                                            <div style="
                                                font-size: 14px;
                                                color: #5f6368;
                                                margin-bottom: 4px;
                                            ">
                                                <strong>Drive Distance:</strong> ${distance} mi
                                            </div>
                                        ` : ''}

                                        ${driveTime ? `
                                            <div style="
                                                font-size: 14px;
                                                color: #5f6368;
                                                margin-bottom: 16px;
                                            ">
                                                <strong>Drive Time:</strong> ${driveTime} min
                                            </div>
                                        ` : ''}

                                            ${url ? `
                                                <a href="${url}"
                                                   target="_blank"
                                                   rel="noopener noreferrer"
                                                   style="
                                                       display: block;
                                                       background-color: #adc9ed;
                                                       color: #000;
                                                       text-align: center;
                                                       padding: 12px 16px;
                                                       border-radius: 8px;
                                                       text-decoration: none;
                                                       font-weight: 600;
                                                       font-size: 14px;
                                                       margin-bottom: ${SHOW_IFRAME ? '16px' : '0'};
                                                   ">
                                                    Visit listing
                                                </a>
                                            ` : ''}

                                            ${url && SHOW_IFRAME ? `
                                                <div style="
                                                    margin-top: 8px;
                                                    border-radius: 8px;
                                                    overflow: hidden;
                                                    border: 1px solid #e0e0e0;
                                                ">
                                                    <iframe
                                                        src="${url}"
                                                        style="
                                                            width: 100%;
                                                            height: ${IFRAME_HEIGHT};
                                                            border: none;
                                                            display: block;
                                                        "
                                                        sandbox="allow-scripts allow-same-origin"
                                                        title="Listing Preview"
                                                    ></iframe>
                                                </div>
                                            ` : ''}
                                        </div>
                                    </div>
                                `;

                                // Add click listener
                                marker.addListener('click', () => {
                                    infoWindowRef.current.setContent(contentString);
                                    infoWindowRef.current.open(mapInstanceRef.current, marker);
                                });

                                markersRef.current.push(marker);
                                bounds.extend(position);
                                checkAndFitBounds();
                            } else {
                                console.warn('Geocoding failed for:', address, status);
                                checkAndFitBounds();
                            }
                        });
                    } else {
                        checkAndFitBounds();
                    }
                } catch (err) {
                    console.warn('Error processing listing record:', err);
                    checkAndFitBounds();
                }
            });
        }

    }, [mapsLoaded, requirementRecords, listingRecords, requirementsTable, listingsTable]);

    // Check if custom properties are configured
    if (!requirementsTable || !listingsTable ||
        !customPropertyValueByKey.requirementAddressField ||
        !customPropertyValueByKey.listingAddressField) {
        return (
            <div style={{ padding: '40px', maxWidth: '600px', margin: '0 auto' }}>
                <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px' }}>
                    Configuration Required
                </h2>
                <p style={{ marginBottom: '16px', lineHeight: '1.6' }}>
                    Please configure the following custom properties using the properties panel:
                </p>
                <ul style={{ marginLeft: '20px', lineHeight: '2', marginBottom: '16px' }}>
                    {!customPropertyValueByKey.VESPER_GOOGLE_API && <li>Google Maps API Key</li>}
                    {!requirementsTable && <li>Requirements Table</li>}
                    {!listingsTable && <li>Listings Table</li>}
                    {!customPropertyValueByKey.requirementAddressField && <li>Requirement Address Field</li>}
                    {!customPropertyValueByKey.listingAddressField && <li>Listing Address Field</li>}
                </ul>
                <p style={{ color: '#666', fontSize: '14px' }}>
                    Note: Optional fields (URL, Distance, Drive Time, Requirements link) can be configured later.
                </p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="error-container">
                <p style={{ color: '#c62828', padding: '20px' }}>{error}</p>
            </div>
        );
    }

    if (!mapsLoaded) {
        return (
            <div className="loading-container">
                <p style={{ padding: '20px' }}>Loading Google Maps...</p>
            </div>
        );
    }

    return (
        <div className="map-container" ref={mapContainerRef} />
    );
}

initializeBlock({ interface: () => <MapInterface /> });
