<?php

namespace Cheesegrits\FilamentGoogleMaps\Tests\Widgets\Fixtures;

class TestShouldUpdateMapWidget extends TestMapWidget
{
    public static array $records = [];

    protected static ?bool $shouldUpdateMap = true;

    protected function getData(): array
    {
        return static::$records;
    }
}
