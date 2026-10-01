<?php

namespace Cheesegrits\FilamentGoogleMaps\Tests\Widgets\Fixtures;

use Cheesegrits\FilamentGoogleMaps\Widgets\MapWidget;

class TestMapWidget extends MapWidget
{
    public static array $records = [];

    protected static ?bool $drawPolylines = true;

    protected static ?float $overlappingMarkerOffset = 0.00002;

    protected function getData(): array
    {
        return static::$records;
    }
}
