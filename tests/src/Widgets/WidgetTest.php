<?php

use Cheesegrits\FilamentGoogleMaps\Helpers\MapsHelper;
use Cheesegrits\FilamentGoogleMaps\Tests\TestCase;
use Cheesegrits\FilamentGoogleMaps\Tests\Widgets\Fixtures\TestMapWidget;
use Cheesegrits\FilamentGoogleMaps\Tests\Widgets\Fixtures\TestShouldUpdateMapWidget;

use function Pest\Livewire\livewire;

uses(TestCase::class);

beforeEach(function () {
    TestMapWidget::$records = [
        ['location' => ['lat' => 47.3769, 'lng' => 8.5417]],
    ];
    TestShouldUpdateMapWidget::$records = [
        ['location' => ['lat' => 47.3769, 'lng' => 8.5417]],
    ];
});

it('seeds the data checksum from the current data on mount', function () {
    livewire(TestMapWidget::class)
        ->call('updateMapData')
        ->assertNotDispatched('updateMap');
});

it('dispatches updateMap only when the data changes', function () {
    $component = livewire(TestMapWidget::class);

    TestMapWidget::$records[] = ['location' => ['lat' => 46.9480, 'lng' => 7.4474]];

    $component
        ->call('updateMapData')
        ->assertDispatched('updateMap')
        ->call('updateMapData')
        ->assertNotDispatched('updateMap');
});

it('does not dispatch updateMap before the component is initialized', function () {
    $component = livewire(TestMapWidget::class)
        ->set('initialized', false);

    TestMapWidget::$records[] = ['location' => ['lat' => 46.9480, 'lng' => 7.4474]];

    $component
        ->call('updateMapData')
        ->assertNotDispatched('updateMap');
});

it('updates the map from render when shouldUpdateMap is enabled', function () {
    $component = livewire(TestShouldUpdateMapWidget::class);

    TestShouldUpdateMapWidget::$records[] = ['location' => ['lat' => 46.9480, 'lng' => 7.4474]];

    $component
        ->call('$refresh')
        ->assertDispatched('updateMap');
});

it('exposes polyline and overlapping-marker-offset config', function () {
    $config = (new TestMapWidget)->getConfig();

    expect($config['drawPolylines'])->toBeTrue()
        ->and($config['overlappingMarkerOffset'])->toBe(0.00002);
});

it('keeps the DEMO_MAP_ID default in the merged map config', function () {
    $config = json_decode((new TestMapWidget)->getMapConfig(), true);

    expect($config['mapId'])->toBe('DEMO_MAP_ID');
});

it('requests the marker and geometry libraries', function () {
    $url = MapsHelper::mapsUrl();

    parse_str(parse_url($url, PHP_URL_QUERY), $query);
    $libraries = explode(',', $query['libraries']);

    expect($libraries)->toContain('places')
        ->toContain('marker')
        ->toContain('geometry');
});
