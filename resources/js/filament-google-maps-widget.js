import { MarkerClusterer } from "@googlemaps/markerclusterer";
import debounce from "underscore/modules/debounce.js";

export default function filamentGoogleMapsWidget({
  cachedData,
  config,
  mapEl,
}) {
  return {
    map: null,
    bounds: null,
    infoWindow: null,
    mapEl: null,
    data: null,
    markers: [],
    paths: [],
    layers: [],
    modelIds: [],
    mapIsFilter: false,
    clusterer: null,
    center: null,
    isMapDragging: false,
    isIdleSkipped: false,
    config: {
      center: {
        lat: 0,
        lng: 0,
      },
      clustering: false,
      controls: {
        mapTypeControl: true,
        scaleControl: true,
        streetViewControl: true,
        rotateControl: true,
        fullscreenControl: true,
        searchBoxControl: false,
        zoomControl: false,
      },
      fit: true,
      mapIsFilter: false,
      gmaps: "",
      layers: [],
      zoom: 12,
      markerAction: null,
      mapConfig: [],
    }, 
    loadGMaps: function () {
      console.log("Loading Google Maps API...");
      return new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = this.config.gmaps + "&map_id="+this.config.mapId+"&callback=filamentGoogleMapsAsyncLoad";
          document.head.appendChild(script);
  
          window.filamentGoogleMapsAsyncLoad = () => {
              console.log("Google Maps API loaded successfully.");
              resolve();
          };
  
          script.onerror = (error) => {
              console.error("Error loading Google Maps API:", error);
              reject(error);
          };
      });
    },
    init: async function () {
      this.mapEl = document.getElementById(mapEl) || mapEl;
      this.data = cachedData;
      console.log('this config', this.config);
      console.log('config', config);
      this.config = { ...this.config, ...config };
      console.log('java config', this.config);
      this.createMap()
    },

    callWire: function (thing) {},
    createMap: async function () {      
      if (!window.google || !window.google.maps) {
          console.log("Google Maps library not found, loading...");
          await this.loadGMaps();
      } else {
          console.log("Google Maps library already loaded.");
      }

      this.infoWindow = new google.maps.InfoWindow({
        content: "",
        disableAutoPan: true,
      });


      console.log("creating map with map ID: ", this.config.mapId);

      this.map = new google.maps.Map(this.mapEl, {
        center: this.config.center,
        zoom: this.config.zoom,
        //mapId: 'DEMO_MAP_ID',
        mapId: this.config.mapId,
        ...this.config.controls,
        ...this.config.mapConfig,
        mapTypeId: 'satellite',
      }); 

      this.center = this.config.center;

      /* this.map.addListener("idle", () => {
        setTimeout(() => {
        const zoom = this.map.getZoom(); 
        console.log("Getting clusterer: ", Alpine.raw(this.clusterer));   
        console.log("Getting markers: ", Alpine.raw(this.markers)); 
        if (this.paths) {
            Alpine.raw(this.paths).forEach(path => {
                console.log('Adjusting path visibility for path:', path, "to:", zoom > 13 ? 'visible' : 'hidden');
                const pathCoords = path.getPath().getArray().map(p => ({ lat: p.lat(), lng: p.lng() }));
                console.log('Zoomed path coordinates:', pathCoords);

                const markers = Alpine.raw(this.markers);
                const markerCoords = markers.map(marker => ({
                    lat: marker.position.lat,
                    lng: marker.position.lng
                }));
                console.log('Marker coordinates:', markerCoords);
                
                // Find each marker on the path
                markers.forEach(marker => {
                    const markerLat = marker.position.lat;
                    const markerLng = marker.position.lng;
                    const isOnPath = pathCoords.some(pathCoord =>
                        pathCoord.lat === markerLat && pathCoord.lng === markerLng
                    );
                    console.log(`Marker at (${markerLat}, ${markerLng}) is on path: ${isOnPath}`);
                
                    // If marker is on the path, do something with it
                    if (isOnPath) {
                      const markerEl = marker.element;
                      console.log(`Marker aria described by: `, marker.title, ` marker class: `, marker.Pn, ` marker element: `, markerEl, ` map element: `, this.mapEl);
                      console.log('Does map element contain marker element?: ', this.mapEl.contains(markerEl));
                        // Access the marker's DOM element if possible
                        // Note: Google Maps API does not provide a direct way to access the marker's DOM element
                        // If you are using a custom overlay or HTML marker, you might manage this yourself
                    path.setMap(this.mapEl.contains(markerEl) ? this.map : null);
                    }
                });
                //path.setMap(zoom > 12 ? this.map : null);
            });
        }
      }, 100);
      }); */

      await this.createMarkers();

      this.createPaths();
      console.log("After Paths creation, we have paths: ", this.paths)

      this.createClustering();

      /* google.maps.event.addListener(this.clusterer, 'clusteringend', () => {
        if(!this.config.drawPaths && this.paths.length > 0){
          return;
        }

        console.log("Clustering operation finished.");
        console.log("Getting clusterer: ", this.clusterer);
        console.log("Getting markers of clusterer: ", this.clusterer.markers);
        console.log("Getting clusters in clusterer: ", this.clusterer.clusters);
        console.log("Getting paths on map : ", Alpine.raw(this.paths));
        console.log("Getting paths count : ", this.paths.length);
        this.clusterer.clusters.forEach(cluster => {
            console.log("Cluster", cluster);
            console.log("Cluster size", cluster.size);
            console.log("Cluster count", cluster.count);
            console.log("Cluster markers", cluster.markers);
            
              Alpine.raw(this.paths).forEach((path, index) => {
                if(cluster.count > 1)
                {
                  console.log('We are in an actual cluster');
                  console.log(`Path ${index + 1}: `, path);
                  const pathCoords = path.getPath().getArray().map(p => ({ lat: p.lat(), lng: p.lng() }))
    
                  const markers = Alpine.raw(cluster.markers);
                  const markerCoords = markers.map(marker => ({
                      lat: marker.position.lat,
                      lng: marker.position.lng
                  }));
                  console.log('Path coordinates:', pathCoords);
                  console.log('Marker coordinates:', markerCoords);
                  
                  // Check if any marker is on the path
                  const isAnyMarkerOnPath = markers.some(marker => {
                      const markerLat = marker.position.lat;
                      const markerLng = marker.position.lng;
                      return pathCoords.some(pathCoord => pathCoord.lat === markerLat && pathCoord.lng === markerLng);
                  });

                  path.setMap(!isAnyMarkerOnPath ? this.map : null);

              } else {
                console.log('We are in a fake cluster, just set path on map.');
                path.setMap(this.map);
              }
              });    
        });
      }); */




      
      google.maps.event.addListener(this.clusterer, 'clusteringend', () => {
        console.log("Clustering operation ended on map: ", this.map, " with paths: ", this.paths);
    
        if (!this.config.drawPaths || this.paths.length === 0) {
            console.log("No paths to draw or path drawing is disabled.");
            return; // Skip processing if path drawing is disabled or no paths are defined
        }
    
        console.log(`Processing ${this.paths.length} paths.`);
    
        Alpine.raw(this.paths).forEach((path, index) => {
            const pathCoords = path.getPath().getArray().map(p => ({ lat: p.lat(), lng: p.lng() }));
            let pathShouldBeVisible = true; // Default path visibility
            console.log(`Path ${index + 1}: Checking clusters for visibility rules.`);
    
            for (const cluster of this.clusterer.clusters) {
                if (cluster.count > 1) { // Only consider real clusters
                    console.log(`Cluster with more than one marker found. Cluster count: ${cluster.count}`);
    
                    const markers = Alpine.raw(cluster.markers);
                    const isAnyMarkerOnPath = markers.some(marker => 
                        pathCoords.some(pathCoord => 
                            pathCoord.lat === marker.position.lat && pathCoord.lng === marker.position.lng
                        )
                    );
    
                    if (isAnyMarkerOnPath) {
                        console.log(`Path ${index + 1}: Markers found on path, setting visibility to hidden.`);
                        pathShouldBeVisible = false; // Set path to invisible if any marker is on the path
                        break; // No need to check further if one cluster already determines visibility
                    }
                }
            }

            path.setMap(pathShouldBeVisible ? this.map : null); // Apply visibility setting
        });
        console.log("Done listening on cluster end on map: ", this.map, " finished paths: ", this.paths);

      });   

      this.createLayers();

      this.idle();

      window.addEventListener(
        "filament-google-maps::widget/setMapCenter",
        (event) => {
          this.recenter(event.detail);
        }
      );

      console.log("Creating update map event listener")
      window.addEventListener(
        'updateMap', 
        (event) => {
          console.log("Event received: ", event.detail);
          this.update(event.detail.data); 
        }
      );

      this.show(true);
    },
    show: function (force = false) {
      if (this.markers.length > 0 && this.config.fit) {
        this.fitToBounds(force);
      } else {
        if (this.markers.length > 0) {
          console.log('markers in show function: ', this.markers);
          this.map.setCenter(this.markers[0].position);
        } else {
          this.map.setCenter(this.config.center);
        }
      }
    },
    createLayers: function () {
      this.layers = this.config.layers.map((layerUrl) => {
        return new google.maps.KmlLayer({
          url: layerUrl,
          map: this.map,
        });
      });
    },
    createMarkerContent: async function(location) {
      const { PinElement } = await google.maps.importLibrary("marker");
      let content = null; 
      let pinOptions = {};

      function createImageElement(url, type = null, scale = null) {
        const img = document.createElement('img');
        img.src = url;
        if (type === "svg" && scale && Array.isArray(scale) && scale.length === 2) {
          img.style.width = `${scale[0]}px`;
          img.style.height = `${scale[1]}px`;
        }
        return img;
      }

      function createSvgElement(svgString, scale) {
        const parser = new DOMParser();
        const svgElement = parser.parseFromString(svgString, "image/svg+xml").documentElement;
        if (scale && Array.isArray(scale) && scale.length === 2) {
          svgElement.setAttribute("width", `${scale[0]}px`);
          svgElement.setAttribute("height", `${scale[1]}px`);
        }
        return svgElement;
      }

      function createPinOptions({ scale = 1, glyph = null, glyphColor = "#ff8300", background = "#FFD514", borderColor = "#ff8300"}) {
        const pinScale = typeof scale === 'number' ? scale : 1; // Ensure scale is a number
        return {
          scale: pinScale,
          glyph,
          glyphColor: glyphColor,
          background: background,
          borderColor: borderColor,
        };
      }

      function createIconContainer(icon) {
        const iconEl = document.createElement('i');
        iconEl.className = icon;
        const iconContainer = document.createElement('div');
        iconContainer.appendChild(iconEl);
        return iconContainer;
      }

      if (location.icon && typeof location.icon === "object") {
          if (location.icon.hasOwnProperty("url")) {
            const imageElement = createImageElement(location.icon.url, location.icon.type, location.icon.scale);
            if(location.icon.hasOwnProperty("glyph") && location.icon.glyph) {
              pinOptions = createPinOptions({ glyph: imageElement });
            } else {
              content = imageElement
            }
          } else if (location.icon.hasOwnProperty("svg")) {
              const svgElement = createSvgElement(location.icon.svg, location.icon.scale);
              if(location.icon.glyph) {
                pinOptions = createPinOptions({ glyph: svgElement });
              } else {
                content = svgElement
              }
          } else if (location.icon.hasOwnProperty("html")) {
              content = document.createElement('div');
              content.innerHTML = location.icon.html;
              content = content.firstChild;
          } else if (location.icon.hasOwnProperty("text")) {
              content = document.createElement('div');
              if (location.icon.class) content.className = location.icon.class;
              content.textContent = location.icon.text;
              if (location.hasOwnProperty("color")) {
                Object.assign(content.style, {
                  background: location.color,
                  borderTopColor: location.color,
                  color: 'white',
                  padding: '5px',
                  borderRadius: '5px',
                  textAlign: 'center',
                  width: '60px'
                });
                //content.classList.add("after:content-[''] after:absolute after:left-1/2 after:top-full after:-translate-x-1/2 after:translate-y-0 after:w-0 after:h-0 after:border-solid after:border-l-8 after:border-r-8 after:border-t-8 after:border-l-transparent after:border-r-transparent after:border-t-inherit")
              }
          } else if (location.icon.hasOwnProperty("icon")) {
              const iconContainer = createIconContainer(location.icon.icon);
              pinOptions = createPinOptions({ glyph: iconContainer, scale: location.icon.scale });
          } else if (location.icon.hasOwnProperty("glyphColor") || location.icon.hasOwnProperty("borderColor") || location.icon.type === "pin" ) {
            const pinScale = typeof location.icon.scale === 'number' ? location.icon.scale : 1; // Ensure scale is a number
            pinOptions = createPinOptions({
              scale: pinScale,
              glyphColor: location.icon.glyphColor, // Direct use without ternary; undefined defaults to function's defaults
              background: location.color, // Direct use, undefined will use default in function
              borderColor: location.icon.borderColor // Direct use, undefined will use default in function
          });
          }
      }
  
      const pin = Object.keys(pinOptions).length > 0 ? new PinElement(pinOptions) : undefined;

      const contentElement = content || (pin ? pin.element : null)

      return contentElement
    },    
    createMarker: async function (location) {
      const { AdvancedMarkerElement /* , PinElement */ } = await google.maps.importLibrary("marker");
      /* let content = null; 
      let pinOptions = {};

      function createImageElement(url, type = null, scale = null) {
        const img = document.createElement('img');
        img.src = url;
        if (type === "svg" && scale && Array.isArray(scale) && scale.length === 2) {
          img.style.width = `${scale[0]}px`;
          img.style.height = `${scale[1]}px`;
        }
        return img;
      }

      function createSvgElement(svgString, scale) {
        const parser = new DOMParser();
        const svgElement = parser.parseFromString(svgString, "image/svg+xml").documentElement;
        if (scale && Array.isArray(scale) && scale.length === 2) {
          svgElement.setAttribute("width", `${scale[0]}px`);
          svgElement.setAttribute("height", `${scale[1]}px`);
        }
        return svgElement;
      }

      function createPinOptions({ scale = 1, glyph = null, glyphColor = "#ff8300", background = "#FFD514", borderColor = "#ff8300"}) {
        const pinScale = typeof scale === 'number' ? scale : 1; // Ensure scale is a number
        return {
          scale: pinScale,
          glyph,
          glyphColor: glyphColor,
          background: background,
          borderColor: borderColor,
        };
      }

      function createIconContainer(icon) {
        const iconEl = document.createElement('i');
        iconEl.className = icon;
        const iconContainer = document.createElement('div');
        iconContainer.appendChild(iconEl);
        return iconContainer;
      }

      if (location.icon && typeof location.icon === "object") {
          if (location.icon.hasOwnProperty("url")) {
            const imageElement = createImageElement(location.icon.url, location.icon.type, location.icon.scale);
            if(location.icon.hasOwnProperty("glyph") && location.icon.glyph) {
              pinOptions = createPinOptions({ glyph: imageElement });
            } else {
              content = imageElement
            }
          } else if (location.icon.hasOwnProperty("svg")) {
              const svgElement = createSvgElement(location.icon.svg, location.icon.scale);
              if(location.icon.glyph) {
                pinOptions = createPinOptions({ glyph: svgElement });
              } else {
                content = svgElement
              }
          } else if (location.icon.hasOwnProperty("html")) {
              content = document.createElement('div');
              content.innerHTML = location.icon.html;
              content = content.firstChild;
          } else if (location.icon.hasOwnProperty("text")) {
              content = document.createElement('div');
              if (location.icon.class) content.className = location.icon.class;
              content.textContent = location.icon.text;
          } else if (location.icon.hasOwnProperty("icon")) {
              const iconContainer = createIconContainer(location.icon.icon);
              pinOptions = createPinOptions({ glyph: iconContainer, scale: location.icon.scale });
          } else if (location.icon.type === "pin") {
            const pinScale = typeof location.icon.scale === 'number' ? location.icon.scale : 1; // Ensure scale is a number
            pinOptions = createPinOptions({
              scale: pinScale,
              glyphColor: location.icon.glyphColor, // Direct use without ternary; undefined defaults to function's defaults
              background: location.color, // Direct use, undefined will use default in function
              borderColor: location.icon.borderColor // Direct use, undefined will use default in function
          });
          }
      }
  
      const pin = Object.keys(pinOptions).length > 0 ? new PinElement(pinOptions) : undefined; */
      /* const { content, pinOptions } = this.createMarkerContent(location);
      const pin = Object.keys(pinOptions).length > 0 ? new PinElement(pinOptions) : undefined; */

      const content = await this.createMarkerContent(location);

      const marker = new AdvancedMarkerElement({
        position: location.location,
        content: content/*  || (pin ? pin.element : null) */,
        title: location.label,
      });

      //console.log(`created marker:`, marker);

      marker.model_id = location.id;

      if (this.modelIds.indexOf(location.id) === -1) {
        this.modelIds.push(location.id);
      }

      return marker;
    },
    createMarkers: async function () {
      console.log("Starting to create markers...");
  
      // Track how many markers are being created
      console.log(`Creating ${this.data.length} markers...`);
  
      const markerPromises = this.data.map((location, index) => {
          console.log(`Creating marker ${index + 1} for location:`, location);
          return this.createMarker(location).then(marker => {
            console.log(`Marker ${index + 1} created:`, marker);
            return marker;
          });
      });
  
      const markers = await Promise.all(markerPromises);
  
      console.log("All markers created:", markers);
  
      this.markers = markers;
  
      markers.forEach((marker, index) => {
          console.log(`Setting marker ${index + 1} on map:`, marker);
          marker.setMap(Alpine.raw(this.map));
  
          if (this.config.markerAction) {
              console.log(`Adding click listener to marker ${index + 1}`);
              google.maps.event.addListener(marker, "click", () => {
                  this.$wire.mountAction(this.config.markerAction, {
                      model_id: marker.model_id,
                  });
              });
          }
      });
  
      console.log("Finished setting up all markers.", );
    },
    removeMarker: function (marker) {
      console.log("Removing marker: ", marker.position); 
      marker.map = null;
    },
    removeMarkers: function () {
      console.log("Removing markers: ", this.markers); 
      for (let i = 0; i < this.markers.length; i++) {
        this.markers[i].map = null;
      }

      this.markers = [];
    },
    mergeMarkers: async function() {
      //console.log("Starting mergeMarkers with data: ", this.data);
      //console.log("Existing markers before merge: ", this.markers);
    
      // Temporary storage for updated markers
      const updatedMarkers = [];
    
      // Check existing markers and update or keep them based on new data
      for (const marker of this.markers) {
        const location = this.data.find(loc => 
          loc.location.lat === marker.position.lat && loc.location.lng === marker.position.lng
        );
    
        if (location) {
          //console.log("Marker has existing location");
          const content = await this.createMarkerContent(location); // Assuming it now returns an object with 'content'
          if (marker.content !== content || marker.title !== location.label) {
            //console.log("Updating marker for location: ", location);
            marker.content = content;
            marker.title = location.label;
          }
          updatedMarkers.push(marker);
        } else if (!this.config.mapIsFilter) {
          //console.log("removing marker!");
          // If not filtering, remove markers that are no longer present in the data
          marker.position = null; // Properly remove marker from the map
        } else {
          //console.log("We're filtering");
          // If filtering, keep the marker for future filter changes
          updatedMarkers.push(marker);
        }
      }
    
      // Check for new data to add new markers
      const newLocations = this.data.filter(loc =>
        !updatedMarkers.some(marker => 
          marker.position.lat === loc.location.lat && marker.position.lng === loc.location.lng
        )
      );
    
      for (const location of newLocations) {
        //console.log("Creating new marker for location: ", location);
        const newMarker = await this.createMarker(location);
        if (this.config.markerAction) {
          google.maps.event.addListener(newMarker, "click", () => {
              this.$wire.mountAction(this.config.markerAction, {
                model_id: newMarker.model_id,
              });
          });
        } else {
          newMarker.addListener("click", () => {
            this.infoWindow.setContent(location.label);
            this.infoWindow.open(this.map, newMarker);
          });
        }
        newMarker.setMap(Alpine.raw(this.map));
        updatedMarkers.push(newMarker);
      }
    
      // Update the main markers array with the new or updated markers
      this.markers = updatedMarkers;
      //console.log("Merge complete, current markers: ", this.markers);
      this.fitToBounds();
    },
    /* createPath: function(groupedPathInfo) {
      console.log("GroupPathInfo: ", groupedPathInfo);
      const lineSymbol = {
          path: google.maps.SymbolPath[groupedPathInfo.symbol],
      };

      let totalPathLength = 0;
      const pathLengths = [];
      const icons = [];
  
      // First, calculate total path length and individual segment lengths
      for (let i = 0; i < groupedPathInfo.locations.length - 1; i++) {
          const start = groupedPathInfo.locations[i];
          const end = groupedPathInfo.locations[i + 1];
          const segmentLength = google.maps.geometry.spherical.computeDistanceBetween(
              new google.maps.LatLng(start.lat, start.lng),
              new google.maps.LatLng(end.lat, end.lng)
          );
          pathLengths.push(segmentLength);
          totalPathLength += segmentLength;
      }
  
      let accumulatedLength = 0;
      for (let i = 0; i < pathLengths.length; i++) {
          let offsetPercentage;
          accumulatedLength += pathLengths[i];
  
          // Calculate the offset based on the symbolPos value
          if (groupedPathInfo.symbolPos === 'start') {
              // For 'start', place the symbol at the beginning of each segment
              offsetPercentage = ((accumulatedLength - (pathLengths[i] / 1.2)) / totalPathLength) * 100;
          } else if (groupedPathInfo.symbolPos === 'end') {
              // For 'end', place the symbol at the end of each segment
              offsetPercentage = ((accumulatedLength - (pathLengths[i] * 0.1)) / totalPathLength) * 100;
          } else {
              // For 'center' or default, place the symbol at the midpoint of each segment
              offsetPercentage = ((accumulatedLength - (pathLengths[i] / 2)) / totalPathLength) * 100;
          }
  
          icons.push({
              icon: lineSymbol,
              offset: `${offsetPercentage}%`,
          });
      }

      console.log("Icons for ",groupedPathInfo.symbolPos,": ", icons);
  
      // Create the Polyline object for a single grouped path.
      const path = new google.maps.Polyline({
          path: groupedPathInfo.locations,
          geodesic: true,
          strokeColor: groupedPathInfo.color, // Use the color specified in groupedPathInfo
          strokeOpacity: groupedPathInfo.opacity,
          strokeWeight: groupedPathInfo.weight,
          icons: icons,
      });
  
      return path;
    },
    createPaths: function() {
      console.log("Creating paths");
      if (!this.config.drawPaths) {
          console.log("drawPaths is disabled.");
          return; // Exit if drawPaths is disabled
      }
  
      const groupedByPath = {};
  
      // Group locations by pathGroup and sort by pathOrder if present
      this.data.forEach(location => {
          const pathGroup = location.pathGroup;
          if (!groupedByPath[pathGroup]) {
              groupedByPath[pathGroup] = {
                  locations: [],
                  color: location.color || '#FF0000', // Default color fallback
                  opacity: location.pathOpacity || 1.0,
                  weight: location.pathWeight || 2,
                  symbol: location.pathSymbol || null,
                  symbolPos: location.pathSymbolPos || 'center',
              };
          }
          groupedByPath[pathGroup].locations.push({
              lat: parseFloat(location.location.lat),
              lng: parseFloat(location.location.lng),
              order: location.pathOrder || 0, // Default order
          });
      }); */
    createPath: function(groupedPathInfo) {
      console.log("GroupPathInfo: ", groupedPathInfo);
      const lineSymbol = {
          path: google.maps.SymbolPath[groupedPathInfo.symbol],
      };

      const icons = [];

      if (groupedPathInfo.symbol) {
          let totalPathLength = 0;
          const pathLengths = [];
  
          // Calculate total path length and individual segment lengths
          for (let i = 0; i < groupedPathInfo.locations.length - 1; i++) {
              const start = groupedPathInfo.locations[i];
              const end = groupedPathInfo.locations[i + 1];
              const segmentLength = google.maps.geometry.spherical.computeDistanceBetween(
                  new google.maps.LatLng(start.lat, start.lng),
                  new google.maps.LatLng(end.lat, end.lng)
              );
              pathLengths.push(segmentLength);
              totalPathLength += segmentLength;
          }
  
          let accumulatedLength = 0;
          for (let i = 0; i < pathLengths.length; i++) {
              const start = groupedPathInfo.locations[i];
              const end = groupedPathInfo.locations[i + 1];
              accumulatedLength += pathLengths[i];
  
              // Determine direction and calculate offset
              const isNorthwards = end.lat > start.lat; // true if end is north of start
              let offsetPercentage;
              if (isNorthwards) {
                  // If northwards, position closer to the end
                  offsetPercentage = ((accumulatedLength - (pathLengths[i] * 0.2)) / totalPathLength) * 100;
              } else {
                  // If southwards, position closer to the start
                  offsetPercentage = ((accumulatedLength - (pathLengths[i] * 0.6)) / totalPathLength) * 100;
              }
  
              icons.push({
                  icon: lineSymbol,
                  offset: `${offsetPercentage}%`,
              });
          }
      }
  
          /* // Calculate total path length and individual segment lengths
          for (let i = 0; i < groupedPathInfo.locations.length - 1; i++) {
              const start = groupedPathInfo.locations[i];
              const end = groupedPathInfo.locations[i + 1];
              const segmentLength = google.maps.geometry.spherical.computeDistanceBetween(
                  new google.maps.LatLng(start.lat, start.lng),
                  new google.maps.LatLng(end.lat, end.lng)
              );
              pathLengths.push(segmentLength);
              totalPathLength += segmentLength;
          }
  
          let accumulatedLength = 0;
          for (let i = 0; i < pathLengths.length; i++) {
              let offsetPercentage;
              accumulatedLength += pathLengths[i];
  
              // Calculate the offset based on the symbolPos value
              if (groupedPathInfo.symbolPos === 'start') {
                  offsetPercentage = ((accumulatedLength - (pathLengths[i] / 1.2)) / totalPathLength) * 100;
              } else if (groupedPathInfo.symbolPos === 'end') {
                  offsetPercentage = ((accumulatedLength - (pathLengths[i] * 0.1)) / totalPathLength) * 100;
              } else { // Default to 'center'
                  offsetPercentage = ((accumulatedLength - (pathLengths[i] / 2)) / totalPathLength) * 100;
              }
  
              icons.push({
                  icon: lineSymbol,
                  offset: `${offsetPercentage}%`,
              });
          } 
      }*/

      console.log("Icons for ",groupedPathInfo.symbolPos,": ", icons);
  
      // Create the Polyline object for a single grouped path.
      const path = new google.maps.Polyline({
          path: groupedPathInfo.locations,
          geodesic: true,
          strokeColor: groupedPathInfo.color, // Use the color specified in groupedPathInfo
          strokeOpacity: groupedPathInfo.opacity,
          strokeWeight: groupedPathInfo.weight,
          icons: icons,
      });

      path.addListener('click', (event) => {
          console.log('Path clicked:', groupedPathInfo.group);

          this.infoWindow.setOptions({
              disableAutoPan: false
          });
          this.infoWindow.close();
          this.infoWindow.setContent(groupedPathInfo.label);

          this.infoWindow.setPosition(event.latLng);
          this.infoWindow.open({
              map: this.map,
              anchor: path,
              shouldFocus: false
          });

          google.maps.event.addListenerOnce(this.infoWindow, 'domready', () => {
              this.infoWindow.setOptions({
                  disableAutoPan: true
              });
          });
      });

      path.group = groupedPathInfo.group;
  
      return path;
    },
    createPaths: function() {
      console.log("Creating paths");
      if (!this.config.drawPaths) {
          console.log("drawPaths is disabled.");
          return; // Exit if drawPaths is disabled
      }

      const groupedByPath = this.groupDataByPath();

  
      /* const groupedByPath = {};
  
      this.data.forEach(location => {
          let pathGroup;
          
          // Check if the path object exists
          if (location.path) {
              if (location.path.hasOwnProperty('group')) {
                  // Use the group property if it exists
                  pathGroup = location.path.group;
              } else {
                // Use a single default group for all locations
                pathGroup = "default_group";
              }
              
  
              // Initialize the group in groupedByPath if not already done
              if (!groupedByPath[pathGroup]) {
                  groupedByPath[pathGroup] = {
                      locations: [],
                      color: location.color || '#FF0000', // Default color fallback
                      opacity: location.path.opacity || 1.0,
                      weight: location.path.weight || 2,
                      symbol: location.path.symbol || null,
                      symbolPos: location.path.symbolPos || 'center',
                  };
              }
  
              // Add location to the appropriate group
              groupedByPath[pathGroup].locations.push({
                  lat: parseFloat(location.location.lat),
                  lng: parseFloat(location.location.lng),
                  order: location.path.order || 0, // Default order, if applicable
              });
          }
      });
      console.log("Final groupedByPath:", groupedByPath);
  
      // Sort locations within each path group by pathOrder if applicable
      Object.values(groupedByPath).forEach(pathInfo => {
          if (pathInfo.locations.some(loc => loc.order !== 0)) {
              pathInfo.locations.sort((a, b) => a.order - b.order);
          }
      }); */
  
      // Clear existing paths from the map before adding new ones
      this.paths.forEach(path => path.setMap(null));
      this.paths = [];
      console.log("Before creating polyline for grou yuup");
  
      // Create and set a path for each path group
      Object.values(groupedByPath).forEach(pathInfo => {
        console.log("Creating polyline for group:", pathInfo);
          const path = this.createPath(pathInfo);
          path.setMap(this.map);
          this.paths.push(path); // Store the path for potential future use or modifications
      });

      // Add a listener to control path visibility based on zoom level

      /* this.map.addListener("zoom_changed", () => {
        console.log("When zooming, we have these paths: ", this.paths);

          const zoom = this.map.getZoom();
          Alpine.raw(this.paths).forEach(path => {
              console.log("This map get zoom: ", this.map.getZoom(), " for path: ", path);
              path.setMap(zoom > 13 ? this.map : null);  // Adjust this value as necessary
          });
      }); */

      // Initially set paths on the map based on the starting zoom level
      const initialZoom = this.map.getZoom();
      /* Alpine.raw(this.paths).forEach(path => {
        console.log("Initial zoom after creating paths: ", initialZoom, " for path: ", path);
          path.setMap(initialZoom > 13 ? this.map : null);
      });  */
    },
    /* createPaths: function() {
      console.log("creating paths");
      if (!this.config.drawPaths) {
          console.log("drawPaths is disabled.");
          return; // Exit the function early if drawPaths is false
      }
  
      const groupedByPath = {};


      // Define a symbol using a predefined path (an arrow)
      // supplied by the Google Maps JavaScript API.
      const lineSymbol = {
        path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
      };
  
      // Group markers by pathGroup and sort by pathOrder if present
      this.data.forEach(location => {
          const pathGroup = location.pathGroup;
          if (!groupedByPath[pathGroup]) {
              groupedByPath[pathGroup] = {
                  locations: [],
                  color: location.color || '#FF0000', // Use the specified color or a fallback
                  opacity: location.pathOpacity || 1.0,
                  weight: location.pathWeight || 2,
              };
          }
          groupedByPath[pathGroup].locations.push({
              lat: parseFloat(location.location.lat),
              lng: parseFloat(location.location.lng),
              order: location.pathOrder || 0 // Use 0 or another default for non-ordered items
          });
      });
  
      // Sort locations within each path group by pathOrder if applicable
      Object.values(groupedByPath).forEach(pathInfo => {
          if (pathInfo.locations.some(loc => loc.order !== 0)) {
              pathInfo.locations.sort((a, b) => a.order - b.order);
          }
      });
  
      // Draw a path for each path group
      Object.entries(groupedByPath).forEach(([pathGroup, {locations, color, opacity, weight}]) => {
          const path = new google.maps.Polyline({
              path: locations,
              geodesic: true,
              strokeColor: color, // Dynamically assigned color, with fallback if not specified
              strokeOpacity: opacity,
              strokeWeight: weight,
              icons: [
                {
                  icon: lineSymbol,
                  offset: "50%",
                },
              ],
          });
  
          path.setMap(this.map);
      });
    }, */
    /* mergeMarkers: async function() {
      console.log("Starting mergeMarkers with data: ", this.data);
      console.log("Starting mergeMarkers with markers: ", this.markers);
      const operation = (list1, list2, isUnion = false) =>
        list1.filter(
          (a) =>
            isUnion ===
            list2.some(
              (b) =>
                a.position.lat === b.position.lat &&
                a.position.lng === b.position.lng
            )
        );

      const inBoth = (list1, list2) => operation(list1, list2, true),
        inFirstOnly = operation,
        inSecondOnly = (list1, list2) => inFirstOnly(list2, list1);

      const newMarkers = await Promise.all(this.data.map(async (location) => {
        console.log("Creating marker for location: ", location);
        const marker = await this.createMarker(location);
        marker.addListener("click", () => {
          this.infoWindow.setContent(location.label);
          this.infoWindow.open(this.map, marker);
        });
        return marker;
      }));

      console.log("New markers created: ", newMarkers);  // Log new markers

      if (!this.config.mapIsFilter) {
        const oldMarkersRemove = inSecondOnly(newMarkers, this.markers);

        console.log("Old markers to be removed: ", oldMarkersRemove);

        for (let i = oldMarkersRemove.length - 1; i >= 0; i--) {
          oldMarkersRemove[i].map = null;
          const index = this.markers.findIndex(
            (marker) =>
              marker.position.lat ===
                oldMarkersRemove[i].position.lat &&
              marker.position.lng ===
                oldMarkersRemove[i].position.lng
          );
          this.markers.splice(index, 1);
        }
      }

      console.log("Markers from data: ", this.markers); 

      const newMarkersCreate = inSecondOnly(this.markers, newMarkers);
      console.log("Markers to add: ", newMarkersCreate); 

      for (let i = 0; i < newMarkersCreate.length; i++) {
        newMarkersCreate[i].setMap(Alpine.raw(this.map));
        console.log("New markers to create: ", this.markers); 
        this.markers.push(newMarkersCreate[i]);
      }
    
      // Adjust the map view to include all markers, if necessary
      this.fitToBounds();
      console.log("Merge complete, current markers: ", this.markers);  // Log final state of markers
    }, */
    groupDataByPath: function() {
      console.log("Grouping data by path");
      const groupedByPath = {};
    
      this.data.forEach(location => {
          let pathGroup;
    
          // Check if the path object exists
          if (location.path) {
              if (location.path.hasOwnProperty('group')) {
                  // Use the group property if it exists
                  pathGroup = location.path.group;
              } else {
                  // Use a single default group for all locations
                  pathGroup = "default_group";
              }
    
              // Initialize the group in groupedByPath if not already done
              if (!groupedByPath[pathGroup]) {
                  groupedByPath[pathGroup] = {
                      locations: [],
                      group: pathGroup,
                      label: location.path.label || pathGroup,
                      color: location.color || '#FF0000', // Default color fallback
                      opacity: location.path.opacity || 1.0,
                      weight: location.path.weight || 2,
                      symbol: location.path.symbol || null,
                      symbolPos: location.path.symbolPos || 'center',
                  };
              }
    
              // Add location to the appropriate group
              groupedByPath[pathGroup].locations.push({
                  lat: parseFloat(location.location.lat),
                  lng: parseFloat(location.location.lng),
                  order: location.path.order || 0, // Default order, if applicable
              });
          }
      });
    
      // Sort locations within each path group by order, if applicable
      Object.values(groupedByPath).forEach(pathInfo => {
          if (pathInfo.locations.some(loc => loc.order !== 0)) {
              pathInfo.locations.sort((a, b) => a.order - b.order);
          }
      });
    
      console.log("Data grouped by path:", groupedByPath);
      return groupedByPath;
    },
    hasPathChanged: function(oldPath, newPathInfo) {

      /* console.log('oldPath: ', oldPath);
      console.log('newPathInfo: ', newPathInfo); */
      // Compare basic attributes like color, opacity, and weight
      if (oldPath.strokeColor !== newPathInfo.strokeColor ||
          oldPath.strokeOpacity !== newPathInfo.strokeOpacity ||
          oldPath.strokeWeight !== newPathInfo.strokeWeight) {
            console.log('path comparison 1 true');
            return true;
      }

      /* console.log('old path coordinates: ', oldPath.getPath().getArray().map(p => ({ lat: p.lat(), lng: p.lng() })));
      console.log('new path coordinates: ', newPathInfo.getPath().getArray().map(p => ({ lat: p.lat(), lng: p.lng() }))); */
    
      // Compare path locations
      const oldPathCoords = oldPath.getPath().getArray().map(p => ({ lat: p.lat(), lng: p.lng() }));
      const newPathCoords = newPathInfo.getPath().getArray().map(p => ({ lat: p.lat(), lng: p.lng() }));
    
      // Check if number of coordinates or any coordinate has changed
      if (oldPathCoords.length !== newPathCoords.length) {
        console.log('path comparison 2 true')
          return true;
      }
    
      for (let i = 0; i < oldPathCoords.length; i++) {
          if (oldPathCoords[i].lat !== newPathCoords[i].lat || oldPathCoords[i].lng !== newPathCoords[i].lng) {
            console.log('path comparison 3 true')
              return true;
          }
      }
    
      // If all checks are the same, return false
      return false;
    },
    mergePaths: function() {
      console.log("Starting to merge paths based on current data, current paths: ", this.paths);
    
      // Temporary storage for updated paths
      const updatedPaths = [];
    
      // Group new data by path group just like in createPaths
      const newGroupedByPath = this.groupDataByPath();
      //const currentZoom = this.map.getZoom();  // Get current zoom level
    
      // Check existing paths and update or keep them based on new grouped data
      Alpine.raw(this.paths).forEach(path => {
        console.log('Existing path: ', path);
        const groupInfo = newGroupedByPath[path.group];
        console.log('Existing paths groupInfo: ', groupInfo);
        if (groupInfo) {
          // If path still exists, check for changes and update if necessary
          const newPath = this.createPath(groupInfo);
          console.log('New path: ', newPath);
          
          if (this.hasPathChanged(path, newPath)) {
            console.log("Updating path for group: ", groupInfo);
            path.setPath(newPath.getPath());
            path.setOptions({
              strokeColor: groupInfo.color,
              strokeOpacity: groupInfo.opacity,
              strokeWeight: groupInfo.weight,
              icons: newPath.icons // Assumes icons setup is recalculated in createPath
            });
          }

          updatedPaths.push(path);
          delete newGroupedByPath[path.group];
        } else {
          console.log("Removing path as group no longer exist: ", groupInfo);
          // If path group no longer exists, remove path
          path.setMap(null);
        }
        /* // Ensure visibility is correctly set for each existing path
        path.setMap(currentZoom > 13 ? this.map : null); */
      });

      // Add new paths for groups that didn't have a corresponding existing path
      for (const groupId in newGroupedByPath) {
          console.log("Creating new path for group:", newGroupedByPath[groupId]);
          const newPath = this.createPath(newGroupedByPath[groupId]);
          newPath.setMap(this.map);
          updatedPaths.push(newPath);
      }
  
      // Update the main paths array with the new or updated paths
      this.paths = updatedPaths;
      console.log("Paths merge complete, current paths: ", this.paths);
    
      /* // Add new paths for new groups
      Object.keys(newGroupedByPath).forEach(groupId => {
        if (!updatedPaths.some(path => path.groupId === groupId)) {
          console.log("Creating new path for group:", newGroupedByPath[groupId]);
          const newPath = this.createPath(newGroupedByPath[groupId]);
          newPath.setMap(this.map);
          updatedPaths.push(newPath);
        } 
      });*/
    
      // Update the main paths array with the new or updated paths
      this.paths = updatedPaths;
      console.log("Paths merge complete, current paths: ", this.paths);
    },
    fitToBounds: function (force = false) {
      if (
        this.markers.length > 0 &&
        this.config.fit &&
        (force || !this.config.mapIsFilter)
      ) {
        this.bounds = new google.maps.LatLngBounds();

        for (const marker of this.markers) {
          this.bounds.extend(marker.position);
        }

        this.map.fitBounds(this.bounds);
      }
    },
    createClustering: function () {
      if (this.markers.length > 0 && this.config.clustering) {
        //console.log('creating clustering, this map: ',Alpine.raw(this.map), ' , this markers: ',this.markers);
        // use default algorithm and renderer

        this.clusterer = new MarkerClusterer({
          map: Alpine.raw(this.map),
          markers: this.markers,
        });
      }
    },
    updateClustering: function () {
      if (this.clusterer && this.config.clustering) {
        //console.log('Updating clustering with clustering: ', this.config.clustering);
        //console.log('Updating clustering with markers: ', this.markers);
        //console.log('Current Clusterer: ', this.clusterer);
        this.clusterer.clearMarkers(true);

        /* function removeLine() {
          flightPath.setMap(null);
        } */
        //this.createMarkers();

        this.clusterer.addMarkers(Alpine.raw(this.markers),true);
        /* this.clusterer = new MarkerClusterer({
          map: Alpine.raw(this.map),
          markers: this.markers,
        });  */
        //console.log('Updated Clusterer: ', this.clusterer);
      }
    },
    moved: function () {
      function areEqual(array1, array2) {
        if (array1.length === array2.length) {
          return array1.every((element, index) => {
            if (element === array2[index]) {
              return true;
            }

            return false;
          });
        }

        return false;
      }

      //console.log("moved");

      const bounds = this.map.getBounds();
      const visible = this.markers.filter((marker) => {
        return bounds.contains(marker.position);
      });
      const ids = visible.map((marker) => marker.model_id);

      if (!areEqual(this.modelIds, ids)) {
        this.modelIds = ids;
        console.log(ids);
        this.$wire.set("mapFilterIds", ids);
      }
    },
    idle: function () {
      if (this.config.mapIsFilter) {
        let that = self;
        const debouncedMoved = debounce(this.moved, 1000).bind(this);

        google.maps.event.addListener(this.map, "idle", (event) => {
          if (self.isMapDragging) {
            self.idleSkipped = true;
            return;
          }
          self.idleSkipped = false;
          debouncedMoved();
        });
        google.maps.event.addListener(this.map, "dragstart", (event) => {
          self.isMapDragging = true;
        });
        google.maps.event.addListener(this.map, "dragend", (event) => {
          self.isMapDragging = false;
          if (self.idleSkipped === true) {
            debouncedMoved();
            self.idleSkipped = false;
          }
        });
        google.maps.event.addListener(this.map, "bounds_changed", (event) => {
          self.idleSkipped = false;
        });
      }
    },
    update: async function (data) {
      console.log("running map update with data: ", data, "on map: ", Alpine.raw(this.map));
      this.data = data;
      //this.createMap()
      //console.log("Markers before mergeMarkers: ", this.markers);
      await this.mergeMarkers();
      //console.log("Markers after mergeMarkers: ", this.markers);
      //console.log("Map after mergeMarkers: ", Alpine.raw(this.map));
      //this.createMarkers();
      //this.createPaths()
      this.mergePaths();
      this.updateClustering();
      //this.show();
      /* await this.mergeMarkers();
      this.updatePaths();
      this.updateClustering();
      this.show(); */
    },
    recenter: function (data) {
      console.log("recentering map");
      this.map.panTo({ lat: data.lat, lng: data.lng });
      this.map.setZoom(data.zoom);
    },
  };
}
