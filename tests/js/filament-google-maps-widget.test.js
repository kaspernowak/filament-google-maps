import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const loader = vi.hoisted(() => ({
  importLibrary: vi.fn(),
  setOptions: vi.fn(),
}));

vi.mock("@googlemaps/js-api-loader", () => loader);

async function importWidgetModule() {
  vi.resetModules();
  return import("../../resources/js/filament-google-maps-widget.js");
}

describe("filamentGoogleMapsWidget", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    loader.importLibrary.mockReset();
    loader.setOptions.mockReset();
    loader.importLibrary.mockImplementation(async (name) => ({ name }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads the upstream Google Maps libraries once for all widgets", async () => {
    const { loadGoogleMapsLibraries } = await importWidgetModule();

    const firstLoad = await loadGoogleMapsLibraries("test-key");
    const secondLoad = await loadGoogleMapsLibraries("test-key");

    expect(loader.setOptions).toHaveBeenCalledOnce();
    expect(loader.setOptions).toHaveBeenCalledWith({ key: "test-key" });
    expect(loader.importLibrary.mock.calls).toEqual([
      ["maps"],
      ["places"],
      ["marker"],
      ["geometry"],
    ]);
    expect(secondLoad).toBe(firstLoad);
    expect(document.querySelector("script")).toBeNull();
  });

  it("restores the trip-stop form and removes its window listener on destroy", async () => {
    const { default: createWidget } = await importWidgetModule();
    const widget = createWidget({
      apiKey: "test-key",
      cachedData: [],
      config: {},
      mapEl: document.createElement("div"),
    });

    document.body.innerHTML = `
      <div class="info-window-content" data-fgm-scope>
        <form data-fgm-form>
          <button data-fgm-submit disabled aria-busy="true" class="opacity-50 cursor-not-allowed">
            <span class="fgm-spinner"></span>
          </button>
        </form>
      </div>
    `;
    widget.infoWindow = { get: () => false };
    widget.addWindowListener("trip-stops-updated", () => {
      widget.restoreInfoWindowFormState();
    });

    window.dispatchEvent(new Event("trip-stops-updated"));

    const button = document.querySelector("[data-fgm-submit]");
    const spinner = document.querySelector(".fgm-spinner");
    expect(button.disabled).toBe(false);
    expect(button.hasAttribute("aria-busy")).toBe(false);
    expect(button.classList.contains("opacity-50")).toBe(false);
    expect(button.classList.contains("cursor-not-allowed")).toBe(false);
    expect(spinner.classList.contains("hidden")).toBe(true);

    widget.destroy();
    button.disabled = true;
    window.dispatchEvent(new Event("trip-stops-updated"));
    expect(button.disabled).toBe(true);
  });

  it("creates and attaches both destination and origin Advanced Markers", async () => {
    const { default: createWidget } = await importWidgetModule();
    const widget = createWidget({
      apiKey: "test-key",
      cachedData: [],
      config: {},
      mapEl: document.createElement("div"),
    });
    const map = {};
    vi.stubGlobal("Alpine", { raw: (value) => value });

    widget.map = map;
    widget.config.mapIsFilter = false;
    widget.data = [
      {
        id: 1,
        location: { lat: 47, lng: 8 },
        origin: { id: 0, location: { lat: 46, lng: 7 } },
      },
    ];
    widget.createMarker = vi.fn(async (location) => ({
      map: null,
      model_id: location.id,
      position: location.location,
    }));
    widget.createMarkerListener = vi.fn();

    await widget.mergeMarkers();

    expect(widget.markers).toHaveLength(2);
    expect(widget.markers.every((marker) => marker.map === map)).toBe(true);
    expect(widget.createMarkerListener).toHaveBeenCalledTimes(2);
  });

  it("tracks dragging state on the widget rather than the global window", async () => {
    const { default: createWidget } = await importWidgetModule();
    const listeners = {};
    const widget = createWidget({
      apiKey: "test-key",
      cachedData: [],
      config: {},
      mapEl: document.createElement("div"),
    });
    vi.stubGlobal("google", {
      maps: {
        event: {
          addListener: (_target, name, listener) => {
            listeners[name] = listener;
          },
        },
      },
    });

    widget.map = {};
    widget.config.mapIsFilter = false;
    widget.idle();

    listeners.dragstart();
    expect(widget.isMapDragging).toBe(true);
    listeners.dragend();
    expect(widget.isMapDragging).toBe(false);
  });
});
