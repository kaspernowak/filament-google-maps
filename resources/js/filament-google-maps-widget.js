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
      if (!document.getElementById("filament-google-maps-google-maps-js")) {
        const script = document.createElement("script");
        script.id = "filament-google-maps-google-maps-js";
        window.filamentGoogleMapsAsyncLoad = this.createMap.bind(this);
        script.src =
          this.config.gmaps + "&callback=filamentGoogleMapsAsyncLoad";
        document.head.appendChild(script);
      } else {
        const waitForGlobal = function (key, callback) {
          if (window[key]) {
            callback();
          } else {
            setTimeout(function () {
              waitForGlobal(key, callback);
            }, 100);
          }
        };

        waitForGlobal(
          "filamentGoogleMapsAPILoaded",
          function () {
            this.createMap();
          }.bind(this)
        );
      }
    },

    init: function () {
      this.mapEl = document.getElementById(mapEl) || mapEl;
      this.data = cachedData;
      this.config = { ...this.config, ...config };
      this.loadGMaps();
    },

    callWire: function (thing) {},

    createMap: function () {
      console.log("Creating map");
      window.filamentGoogleMapsAPILoaded = true;
      this.infoWindow = new google.maps.InfoWindow({
        content: "",
        disableAutoPan: true,
      });

      this.map = new google.maps.Map(this.mapEl, {
        center: this.config.center,
        zoom: this.config.zoom,
        ...this.config.controls,
        ...this.config.mapConfig,
      });

      this.center = this.config.center;

      this.createMarkers();

      this.createPaths();

      this.createClustering();

      this.createLayers();

      this.idle();

      window.addEventListener(
        "filament-google-maps::widget/setMapCenter",
        (event) => {
          this.recenter(event.detail);
        }
      );

      this.show(true);
    },
    show: function (force = false) {
      if (this.markers.length > 0 && this.config.fit) {
        this.fitToBounds(force);
      } else {
        if (this.markers.length > 0) {
          this.map.setCenter(this.markers[0].getPosition());
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
    createMarker: function (location) {
      let markerIcon;

      if (location.icon && typeof location.icon === "object") {
        if (location.icon.hasOwnProperty("url")) {
          markerIcon = {
            url: location.icon.url,
          };

          if (
            location.icon.hasOwnProperty("type") &&
            location.icon.type === "svg" &&
            location.icon.hasOwnProperty("scale")
          ) {
            markerIcon.scaledSize = new google.maps.Size(
              location.icon.scale[0],
              location.icon.scale[1]
            );
          }
        }
      }

      const point = location.location;
      const label = location.label;

      const marker = new google.maps.Marker({
        position: point,
        title: label,
        model_id: location.id,
        ...(markerIcon && { icon: markerIcon }),
      });

      if (this.modelIds.indexOf(location.id) === -1) {
        this.modelIds.push(location.id);
      }

      return marker;
    },
    createMarkers: function () {
      this.markers = this.data.map((location) => {
        const marker = this.createMarker(location);
        marker.setMap(this.map);

        if (this.config.markerAction) {
          google.maps.event.addListener(marker, "click", (event) => {
            this.$wire.mountAction(this.config.markerAction, {
              model_id: marker.model_id,
            });
          });
        }

        return marker;
      });
    },
    createPaths: function() {
      console.log("creating paths");
      if (!this.config.drawPaths) {
          console.log("drawPaths is disabled.");
          return; // Exit the function early if drawPaths is false
      }
  
      const groupedByPath = {};
  
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
          });
  
          path.setMap(this.map);
      });
    },
    removeMarker: function (marker) {
      marker.setMap(null);
    },
    removeMarkers: function () {
      for (let i = 0; i < this.markers.length; i++) {
        this.markers[i].setMap(null);
      }

      this.markers = [];
    },
    mergeMarkers: function () {
      const operation = (list1, list2, isUnion = false) =>
        list1.filter(
          (a) =>
            isUnion ===
            list2.some(
              (b) =>
                a.getPosition().lat() === b.getPosition().lat() &&
                a.getPosition().lng() === b.getPosition().lng()
            )
        );

      const inBoth = (list1, list2) => operation(list1, list2, true),
        inFirstOnly = operation,
        inSecondOnly = (list1, list2) => inFirstOnly(list2, list1);

      const newMarkers = this.data.map((location) => {
        let marker = this.createMarker(location);
        marker.addListener("click", () => {
          this.infoWindow.setContent(location.label);
          this.infoWindow.open(this.map, marker);
        });

        return marker;
      });

      if (!this.config.mapIsFilter) {
        const oldMarkersRemove = inSecondOnly(newMarkers, this.markers);

        for (let i = oldMarkersRemove.length - 1; i >= 0; i--) {
          oldMarkersRemove[i].setMap(null);
          const index = this.markers.findIndex(
            (marker) =>
              marker.getPosition().lat() ===
                oldMarkersRemove[i].getPosition().lat() &&
              marker.getPosition().lng() ===
                oldMarkersRemove[i].getPosition().lng()
          );
          this.markers.splice(index, 1);
        }
      }

      const newMarkersCreate = inSecondOnly(this.markers, newMarkers);

      for (let i = 0; i < newMarkersCreate.length; i++) {
        newMarkersCreate[i].setMap(this.map);
        this.markers.push(newMarkersCreate[i]);
      }

      this.fitToBounds();
    },
    fitToBounds: function (force = false) {
      if (
        this.markers.length > 0 &&
        this.config.fit &&
        (force || !this.config.mapIsFilter)
      ) {
        this.bounds = new google.maps.LatLngBounds();

        for (const marker of this.markers) {
          this.bounds.extend(marker.getPosition());
        }

        this.map.fitBounds(this.bounds);
      }
    },
    createClustering: function () {
      if (this.markers.length > 0 && this.config.clustering) {
        // use default algorithm and renderer
        this.clusterer = new MarkerClusterer({
          map: this.map,
          markers: this.markers,
        });
      }
    },
    updateClustering: function () {
      if (this.config.clustering) {
        this.clusterer.clearMarkers();
        this.clusterer.addMarkers(this.markers);
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

      console.log("moved");

      const bounds = this.map.getBounds();
      const visible = this.markers.filter((marker) => {
        return bounds.contains(marker.getPosition());
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
    update: function (data) {
      console.log("running map update");
      this.data = data;
      this.mergeMarkers();
      this.updateClustering();
      this.show();
    },
    recenter: function (data) {
      this.map.panTo({ lat: data.lat, lng: data.lng });
      this.map.setZoom(data.zoom);
    },
  };
}
