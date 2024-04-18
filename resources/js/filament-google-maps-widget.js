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
    polylines: [],
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
      return new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = this.config.gmaps + "&map_id="+this.config.mapId+"&callback=filamentGoogleMapsAsyncLoad";
          document.head.appendChild(script);
  
          window.filamentGoogleMapsAsyncLoad = () => {
              resolve();
          };
  
          script.onerror = (error) => {
              reject(error);
          };
      });
    },
    init: async function () {
      this.mapEl = document.getElementById(mapEl) || mapEl;
      this.data = cachedData;
      this.config = { ...this.config, ...config };
      this.createMap()
    },
    callWire: function (thing) {},
    createMap: async function () {      
      if (!window.google || !window.google.maps) {
        await this.loadGMaps();
      }

      this.infoWindow = new google.maps.InfoWindow({
        content: "",
        disableAutoPan: true,
      });

      this.map = new google.maps.Map(this.mapEl, {
        center: this.config.center,
        zoom: this.config.zoom,
        mapId: this.config.mapId,
        ...this.config.controls,
        ...this.config.mapConfig,
      }); 

      this.center = this.config.center;

      await this.createMarkers();

      this.createClustering();  

      this.createPolylines();

      this.createLayers();

      this.idle();

      window.addEventListener(
        "filament-google-maps::widget/setMapCenter",
        (event) => {
          this.recenter(event.detail);
        }
      );

      window.addEventListener(
        'updateMap', 
        (event) => {
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
        const pinScale = typeof scale === 'number' ? scale : 1;
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
          const pinScale = typeof location.icon.scale === 'number' ? location.icon.scale : 1;
          pinOptions = createPinOptions({
            scale: pinScale,
            glyphColor: location.icon.glyphColor,
            background: location.color, 
            borderColor: location.icon.borderColor 
          });
        }
      }
  
      const pin = Object.keys(pinOptions).length > 0 ? new PinElement(pinOptions) : undefined;
      const contentElement = content || (pin ? pin.element : null)
      return contentElement
    },    
    createMarker: async function (location) {
      const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");
      const content = await this.createMarkerContent(location);
      const marker = new AdvancedMarkerElement({
        position: location.location,
        content: content,
        title: location.label,
      });

      marker.model_id = location.id;
      marker.info = location.info;

      if (this.modelIds.indexOf(location.id) === -1) {
        this.modelIds.push(location.id);
      }

      return marker;
    },
    createMarkers: async function () { 
      const originCoords = new Set();
  
      const markerPromises = this.data.flatMap((location) => {
        const markers = [this.createMarker(location)];
        if (location.origin) {
          const coordKey = `${location.origin.location.lat},${location.origin.location.lng}`;
          if (!originCoords.has(coordKey)) {
            originCoords.add(coordKey);
            markers.push(this.createMarker(location.origin));
          }
        }
        return markers;
      });
  
      const markers = await Promise.all(markerPromises);
      this.markers = markers;
      
      markers.forEach((marker, index) => {
        marker.map = Alpine.raw(this.map);
        this.createMarkerListener(marker);
      });
    },
    createMarkerListener: function(marker) {
      const handleInfowindow = (marker) => {
        if (this.infoWindow.isOpen && this.infoWindow.anchor === marker) {
            console.log('Window is already open on this marker, closing it.');
            this.infoWindow.close();
            this.infoWindow.isOpen = false;
        } else {
          if (this.infoWindow.isOpen) {
            console.log('Window is open on another marker, closing it.');
            this.infoWindow.close();
          }
          console.log('Opening window with new content.');
          this.infoWindow.setOptions({
            disableAutoPan: false
          });
          this.infoWindow.setContent(marker.info);
          this.infoWindow.open(this.map, marker);
          this.infoWindow.isOpen = true;
        }
      };
  
      if (this.config.markerAction && marker.model_id !== 0) {
        marker.addListener("click", () => {
          if (this.infoWindow.isOpen) {
            this.infoWindow.close();
            this.infoWindow.isOpen = false;
          }
          console.log('Executing action for record marker:', marker.model_id);
          this.$wire.mountAction(this.config.markerAction, {
            model_id: marker.model_id,
          });
        });
      } else {
        marker.addListener("click", () => handleInfowindow(marker));
      }
    },
    removeMarker: function (marker) {
      marker.map = null;
    },
    removeMarkers: function () {
      for (let i = 0; i < this.markers.length; i++) {
        this.markers[i].map = null;
      }

      this.markers = [];
    },
    mergeMarkers: async function() {
      const updatedMarkers = [];
    
      for (const marker of this.markers) {
        let location = this.data.find(loc => 
          (loc.location.lat === marker.position.lat && loc.location.lng === marker.position.lng) ||
          (loc.origin?.location.lat === marker.position.lat && loc.origin?.location.lng === marker.position.lng)
        );

        if (location?.origin?.location.lat === marker.position.lat && location.origin.location.lng === marker.position.lng) {
          location = location.origin;
        }
    
        if (location) {
          const content = await this.createMarkerContent(location);
          if (marker.content !== content || marker.title !== location.label) {
            marker.content = content;
            marker.title = location.label;
          }
          updatedMarkers.push(marker);
        } else if (!this.config.mapIsFilter) {
          marker.position = null;
        } else {
          updatedMarkers.push(marker);
        }
      }

      const newLocations = this.data.filter(loc =>
        !updatedMarkers.some(marker => 
          marker.position.lat === loc.location.lat && marker.position.lng === loc.location.lng
        )
      );
    
      for (const location of newLocations) {
        const newMarker = await this.createMarker(location);
        this.createMarkerListener(newMarker);
        newMarker.map = Alpine.raw(this.map);
        updatedMarkers.push(newMarker);

        if (location.origin && !updatedMarkers.some(marker =>
            marker.position.lat === location.origin.location.lat && marker.position.lng === location.origin.location.lng)) {
            const originMarker = await this.createMarker(location.origin);
            this.createMarkerListener(originMarker);
            originMarker.setMap(Alpine.raw(this.map));
            updatedMarkers.push(originMarker);
        }
      }
    
      this.markers = updatedMarkers;
      this.fitToBounds();
    },
    createPolyline: function(groupedPolylineInfo) {
      const lineSymbol = {
          path: google.maps.SymbolPath[groupedPolylineInfo.symbol],
      };

      const icons = [];

      if (groupedPolylineInfo.symbol) {
          let totalPolylineLength = 0;
          const polylineLengths = [];

          for (let i = 0; i < groupedPolylineInfo.locations.length - 1; i++) {
            const start = groupedPolylineInfo.locations[i];
            const end = groupedPolylineInfo.locations[i + 1];
            const segmentLength = google.maps.geometry.spherical.computeDistanceBetween(
              new google.maps.LatLng(start.lat, start.lng),
              new google.maps.LatLng(end.lat, end.lng)
            );
            polylineLengths.push(segmentLength);
            totalPolylineLength += segmentLength;
          }
  
          let accumulatedLength = 0;
          for (let i = 0; i < polylineLengths.length; i++) {
            const start = groupedPolylineInfo.locations[i];
            const end = groupedPolylineInfo.locations[i + 1];
            accumulatedLength += polylineLengths[i];

            const isNorthwards = end.lat > start.lat;
            let offsetPercentage;
            if (isNorthwards) {
              offsetPercentage = ((accumulatedLength - (polylineLengths[i] * 0.2)) / totalPolylineLength) * 100;
            } else {
              offsetPercentage = ((accumulatedLength - (polylineLengths[i] * 0.6)) / totalPolylineLength) * 100;
            }

            icons.push({
              icon: lineSymbol,
              offset: `${offsetPercentage}%`,
            });
          }
      }

      const polyline = new google.maps.Polyline({
        path: groupedPolylineInfo.locations,
        geodesic: true,
        strokeColor: groupedPolylineInfo.color,
        strokeOpacity: groupedPolylineInfo.opacity,
        strokeWeight: groupedPolylineInfo.weight,
        icons: icons,
      });

      polyline.addListener('click', (event) => {
        this.infoWindow.setOptions({
          disableAutoPan: false
        });
        this.infoWindow.close();
        this.infoWindow.setContent(groupedPolylineInfo.label);

        this.infoWindow.setPosition(event.latLng);
        this.infoWindow.open({
          map: this.map,
          anchor: polyline,
          shouldFocus: false
        });

        google.maps.event.addListenerOnce(this.infoWindow, 'domready', () => {
          this.infoWindow.setOptions({
            disableAutoPan: true
          });
        });
      });

      polyline.group = groupedPolylineInfo.group;
  
      return polyline;
    },
    createPolylines: function() {
      if (!this.config.drawPolylines) {
        return;
      }

      const groupedByPolyline = this.groupDataByPolyline();
      this.polylines.forEach(polyline => polyline.setMap(null));
      this.polylines = [];

      Object.values(groupedByPolyline).forEach(polylineInfo => {
        const polyline = this.createPolyline(polylineInfo);
        polyline.setMap(Alpine.raw(this.map));
        this.polylines.push(polyline);
      });

      if(this.config.clustering) {
        google.maps.event.addListener(this.clusterer, 'clusteringend', () => {  
          if (!this.config.drawPolylines || this.polylines.length === 0) {
            return;
          }
          Alpine.raw(this.polylines).forEach((polyline, index) => {
              const polylineCoords = polyline.getPath().getArray().map(p => ({ lat: p.lat(), lng: p.lng() }));
              let polylineShouldBeVisible = true;
      
              for (const cluster of this.clusterer.clusters) {
                if (cluster.count > 1) { 
                  const markers = Alpine.raw(cluster.markers);
                  const isAnyMarkerOnPolyline = markers.some(marker => 
                    polylineCoords.some(polylineCoord => 
                        polylineCoord.lat === marker.position.lat && polylineCoord.lng === marker.position.lng
                    )
                  );
                  if (isAnyMarkerOnPolyline) {
                    polylineShouldBeVisible = false;
                    break; 
                  }
                }
              }
              polyline.setMap(polylineShouldBeVisible ? Alpine.raw(this.map) : null);
          });
        });
      } 
    },
    groupDataByPolyline: function() {
      const groupedByPolyline = {};
    
      this.data.forEach(location => {
          let polylineGroup;
    
          if (location.polyline) {
            if (location.polyline.hasOwnProperty('group')) {
              polylineGroup = location.polyline.group;
            } else {
              polylineGroup = "default_group";
            }

            if (!groupedByPolyline[polylineGroup]) {
              groupedByPolyline[polylineGroup] = {
                locations: [],
                group: polylineGroup,
                label: location.polyline.label || polylineGroup,
                color: location.color || '#FF0000',
                opacity: location.polyline.opacity || 1.0,
                weight: location.polyline.weight || 2,
                symbol: location.polyline.symbol || null,
              };

              if (location.origin) {
                groupedByPolyline[polylineGroup].locations.push({
                  lat: parseFloat(location.origin.location.lat),
                  lng: parseFloat(location.origin.location.lng),
                  order: -Infinity 
                });
              }
            }
  
            groupedByPolyline[polylineGroup].locations.push({
              lat: parseFloat(location.location.lat),
              lng: parseFloat(location.location.lng),
              order: location.polyline.order || 0,
            });
          }
      });
    
      Object.values(groupedByPolyline).forEach(polylineInfo => {
          if (polylineInfo.locations.some(loc => loc.order !== 0)) {
            polylineInfo.locations.sort((a, b) => a.order - b.order);
          }
      });
    
      return groupedByPolyline;
    },
    hasPolylineChanged: function(oldPolyline, newPolylineInfo) {
      if (oldPolyline.strokeColor !== newPolylineInfo.strokeColor ||
          oldPolyline.strokeOpacity !== newPolylineInfo.strokeOpacity ||
          oldPolyline.strokeWeight !== newPolylineInfo.strokeWeight) {
        return true;
      }
      const oldPolylineCoords = oldPolyline.getPath().getArray().map(p => ({ lat: p.lat(), lng: p.lng() }));
      const newPolylineCoords = newPolylineInfo.getPath().getArray().map(p => ({ lat: p.lat(), lng: p.lng() }));
    
      if (oldPolylineCoords.length !== newPolylineCoords.length) {
        return true;
      }
    
      for (let i = 0; i < oldPolylineCoords.length; i++) {
        if (oldPolylineCoords[i].lat !== newPolylineCoords[i].lat || oldPolylineCoords[i].lng !== newPolylineCoords[i].lng) {
          return true;
        }
      }

      return false;
    },
    mergePolylines: function() {
      const updatedPolylines = [];
      const newGroupedByPolyline = this.groupDataByPolyline();
    
      Alpine.raw(this.polylines).forEach(polyline => {
        const groupInfo = newGroupedByPolyline[polyline.group];
        if (groupInfo) {
          const newPolyline = this.createPolyline(groupInfo);
          
          if (this.hasPolylineChanged(polyline, newPolyline)) {
            polyline.setPath(newPolyline.getPath());
            polyline.setOptions({
              strokeColor: groupInfo.color,
              strokeOpacity: groupInfo.opacity,
              strokeWeight: groupInfo.weight,
              icons: newPolyline.icons
            });
          }

          updatedPolylines.push(polyline);
          delete newGroupedByPolyline[polyline.group];
        } else {
          polyline.setMap(null);
        }
      });

      for (const groupId in newGroupedByPolyline) {
        const newPolyline = this.createPolyline(newGroupedByPolyline[groupId]);
        newPolyline.setMap(!this.config.clustering ? this.map : null);
        updatedPolylines.push(newPolyline);
      }
    
      this.polylines = updatedPolylines;
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

        this.clusterer = new MarkerClusterer({
          map: Alpine.raw(this.map),
          markers: this.markers,
        });
      }
    },
    updateClustering: function () {
      if (this.clusterer && this.config.clustering) {
        this.clusterer.clearMarkers(true);
        this.clusterer.addMarkers(Alpine.raw(this.markers),true);
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

      const bounds = this.map.getBounds();
      const visible = this.markers.filter((marker) => {
        return bounds.contains(marker.position);
      });
      const ids = visible.map((marker) => marker.model_id);

      if (!areEqual(this.modelIds, ids)) {
        this.modelIds = ids;
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
      this.data = data;
      await this.mergeMarkers();
      this.mergePolylines();
      this.updateClustering();
      this.show();
    },
    recenter: function (data) {
      this.map.panTo({ lat: data.lat, lng: data.lng });
      this.map.setZoom(data.zoom);
    },
  };
}
