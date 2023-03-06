export default function filamentGoogleMapsField(
    {
        state,
        setStateUsing,
        getStateUsing,
        autocomplete,
        autocompleteReverse,
        geolocate,
        geolocateLabel,
        draggable,
        clickable,
        defaultLocation,
        statePath,
        controls,
        layers,
        reverseGeocodeFields,
        defaultZoom,
        debug,
        gmaps,
        mapEl,
        pacEl,
    }
) {
    return {
        state,
        map: null,
        geocoder: null,
        marker: null,
        markerLocation: null,
        layers: null,
        symbols: {
            '%n': ["street_number"],
            '%z': ["postal_code"],
            '%S': ["street_address", "route"],
            '%A1': ["administrative_area_level_1"],
            '%A2': ["administrative_area_level_2"],
            '%A3': ["administrative_area_level_3"],
            '%A4': ["administrative_area_level_4"],
            '%A5': ["administrative_area_level_5"],
            '%a1': ["administrative_area_level_1"],
            '%a2': ["administrative_area_level_2"],
            '%a3': ["administrative_area_level_3"],
            '%a4': ["administrative_area_level_4"],
            '%a5': ["administrative_area_level_5"],
            '%L': ["locality"],
            '%D': ["sublocality"],
            '%C': ["country"],
            '%c': ["country"],
        },

        loadGMaps: function () {
            if (!document.getElementById('filament-google-maps-google-maps-js')) {
                const script = document.createElement('script');
                script.id = 'filament-google-maps-google-maps-js';
                window.filamentGoogleMapsAsyncLoad = this.createMap.bind(this);
                script.src = gmaps + '&callback=filamentGoogleMapsAsyncLoad';
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

                waitForGlobal("filamentGoogleMapsAPILoaded", function () {
                    this.createMap();
                }.bind(this));
            }
        },

        init: function () {
            console.log('filament google map field init')
            this.loadGMaps();
        },

        createMap: function () {
            window.filamentGoogleMapsAPILoaded = true;

            if (autocompleteReverse || Object.keys(reverseGeocodeFields).length > 0) {
                this.geocoder = new google.maps.Geocoder();
            }

            this.map = new google.maps.Map(mapEl, {
                center: this.getCoordinates(),
                zoom: defaultZoom,
                ...controls
            });


            this.marker = new google.maps.Marker({
                draggable: draggable,
                map: this.map
            });

            this.marker.setPosition(this.getCoordinates());

            if (clickable) {
                this.map.addListener('click', (event) => {
                    this.markerLocation = event.latLng.toJSON();
                    this.setCoordinates(this.markerLocation);
                    this.updateAutocomplete(this.markerLocation);
                    this.updateGeocode(this.markerLocation);
                    //this.updateMap(this.markerLocation);
                    this.map.panTo(this.markerLocation);
                });
            }

            if (draggable) {
                google.maps.event.addListener(this.marker, 'dragend', (event) => {
                    this.markerLocation = event.latLng.toJSON();
                    this.setCoordinates(this.markerLocation);
                    this.updateAutocomplete(this.markerLocation);
                    this.updateGeocode(this.markerLocation);
                    // this.updateMap(this.markerLocation);
                    this.map.panTo(this.markerLocation);
                });
            }

            if (controls.searchBoxControl) {
                const input = pacEl;
                const searchBox = new google.maps.places.SearchBox(input);
                this.map.controls[google.maps.ControlPosition.TOP_LEFT].push(input);
                searchBox.addListener("places_changed", () => {
                    input.value = ''
                    this.markerLocation = searchBox.getPlaces()[0].geometry.location
                })
            }

            const geocompleteOptions = {
                fields: ["formatted_address", "geometry", "name"],
                strictBounds: false,
                types: ["geocode"],
            };


            if (autocomplete) {
                const geoComplete = document.getElementById(autocomplete);

                if (geoComplete) {
                    window.addEventListener('keydown', function (e) {
                        if (e.key === 'U+000A' || e.key === 'Enter' || e.code === 'Enter') {
                            if (e.target.nodeName === 'INPUT' && e.target.type === 'text') {
                                e.preventDefault();
                                return false;
                            }
                        }
                    }, true);

                    const autocomplete = new google.maps.places.Autocomplete(geoComplete, geocompleteOptions);

                    autocomplete.addListener("place_changed", () => {
                        const place = autocomplete.getPlace();

                        if (!place.geometry || !place.geometry.location) {
                            window.alert("No details available for input: '" + place.name + "'");
                            return;
                        }

                        if (place.geometry.viewport) {
                            this.map.fitBounds(place.geometry.viewport);
                        } else {
                            this.map.setCenter(place.geometry.location);
                        }

                        this.marker.setPosition(place.geometry.location);
                        this.markerLocation = place.geometry.location;
                        this.setCoordinates(place.geometry.location);
                    });
                }
            }

            if (layers) {
                this.layers = layers.map((layerUrl) => {
                    return new google.maps.KmlLayer({
                        url: layerUrl,
                        map: this.map,
                    });
                })
            }

            if (geolocate && "geolocation" in navigator) {
                const locationButton = document.createElement("button");

                locationButton.textContent = geolocateLabel;
                locationButton.classList.add("custom-map-control-button");
                this.map.controls[google.maps.ControlPosition.TOP_CENTER].push(locationButton);

                locationButton.addEventListener("click", () => {
                    navigator.geolocation.getCurrentPosition((position) => {
                        this.markerLocation = {
                            lat: position.coords.latitude,
                            lng: position.coords.longitude
                        };
                        this.setCoordinates(this.markerLocation);
                        this.updateAutocomplete(this.markerLocation);
                        this.updateGeocode(this.markerLocation);
                        this.map.panTo(this.markerLocation);
                    });
                });
            }

            this.$watch('state', () => {
                if (this.state === undefined) {
                    return
                }
                
                const location = this.getCoordinates();
                const markerLocation = this.marker.getPosition();

                if (!(location.lat === markerLocation.lat() && location.lng === markerLocation.lng())) {
                    this.updateAutocomplete(location)
                    this.updateMap(location);
                }
            })
        },
        updateMap: function (position) {
            this.marker.setPosition(position);
            this.map.panTo(position);
        },
        updateGeocode: function (position) {
            if (Object.keys(reverseGeocodeFields).length > 0) {
                this.geocoder
                    .geocode({location: position})
                    .then((response) => {
                        if (response.results[0]) {
                            const replacements = this.getReplacements(response.results[0].address_components);

                            for (const field in reverseGeocodeFields) {
                                let replaced = reverseGeocodeFields[field];

                                for (const replacement in replacements) {
                                    replaced = replaced.split(replacement).join(replacements[replacement]);
                                }

                                for (const symbol in this.symbols) {
                                    replaced = replaced.split(symbol).join('');
                                }

                                replaced = replaced.trim();
                                setStateUsing(field, replaced)
                            }

                        }
                    })
                    .catch((error) => {
                        console.log(error.message);
                    })
            }
        },
        updateAutocomplete: function (position) {
            if (autocomplete && autocompleteReverse) {
                this.geocoder
                    .geocode({location: position})
                    .then((response) => {
                        if (response.results[0]) {
                            setStateUsing(autocomplete, response.results[0].formatted_address);
                        }
                    })
                    .catch((error) => {
                        console.log(error.message);
                    })
            }
        },
        setCoordinates: function (position) {
            this.state = position;
        },
        getCoordinates: function () {
            if (this.state === null || !this.state.hasOwnProperty('lat')) {
                this.state = {lat: defaultLocation.lat, lng: defaultLocation.lng}
            }
            return this.state;
        },

        getReplacements: function (address_components) {
            let replacements = {};

            address_components.forEach(component => {
                for (const symbol in this.symbols) {
                    if (this.symbols[symbol].indexOf(component.types[0]) !== -1) {
                        if (symbol === symbol.toLowerCase()) {
                            replacements[symbol] = component.short_name;
                        } else {
                            replacements[symbol] = component.long_name;
                        }
                    }
                }
            });

            if (debug) {
                console.log(replacements);
            }

            return replacements;
        }

    }
}
