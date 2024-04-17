<?php

namespace Cheesegrits\FilamentGoogleMaps\Widgets;

use Cheesegrits\FilamentGoogleMaps\Helpers\MapsHelper;
use Filament\Actions\Concerns\InteractsWithActions;
use Filament\Actions\Contracts\HasActions;
use Filament\Forms\Concerns\InteractsWithForms;
use Filament\Forms\Contracts\HasForms;
use Filament\Widgets;

class MapWidget extends Widgets\Widget implements HasActions, HasForms
{
    use InteractsWithActions;
    use InteractsWithForms;
    use Widgets\Concerns\CanPoll;

    protected ?array $cachedData = null;

    public string $dataChecksum;

    public ?string $filter = null;

    protected static ?string $heading = null;

    protected static ?string $maxHeight = null;

    protected static ?string $minHeight = '50vh';

    protected static ?array $options = null;

    protected static ?int $precision = 8;

    protected static ?bool $clustering = true;

    protected static ?bool $fitToBounds = true;
    protected static ?bool $drawPolylines = false;

    protected static ?int $zoom = null;

    protected static array $layers = [];

    protected static ?string $mapId = null;

    protected static ?string $markerAction = null;

    protected static ?string $icon = 'heroicon-o-map';
    protected static ?bool $shouldUpdateMap = false;

    protected static bool $collapsible = false;
    protected ?bool $initialized = false;

    protected static string $view = 'filament-google-maps::widgets.filament-google-maps-widget';

    public array $controls = [
        'mapTypeControl'    => true,
        'scaleControl'      => true,
        'streetViewControl' => true,
        'rotateControl'     => true,
        'fullscreenControl' => true,
        'searchBoxControl'  => false,
        'zoomControl'       => true,
    ];

    protected array $mapConfig = [
        'draggable'     => false,
        'center'        => [
            'lat' => 15.3419776,
            'lng' => 44.2171392,
        ],
        'zoom'          => 8,
        'fit'           => true,
        'gmaps'         => '',
        'clustering'    => true,
        'drawPolylines' => false,
        'mapId'         => 'DEMO_MAP_ID',
        'mapConfig'     => [],
    ];

    public function mount()
    {
        \Log::info('Mounting Map Widget');

        $this->dataChecksum = $this->generateDataChecksum();
        \Log::info("data Checksum on mount: {$this->dataChecksum}");
        $this->initialized = true;
    }

    protected function generateDataChecksum(): string
    {
        return md5(json_encode($this->getCachedData()));
    }

    protected function getCachedData(): array
    {
        return $this->cachedData ??= $this->getData();
    }

    protected function getData(): array
    {
        return [];
    }

    protected function getFilters(): ?array
    {
        return null;
    }

    protected function getZoom(): ?int
    {
        return static::$zoom ?? 8;
    }

    protected function getHeading(): ?string
    {
        return static::$heading;
    }

    protected function getMaxHeight(): ?string
    {
        return static::$maxHeight;
    }

    protected function getMinHeight(): ?string
    {
        return static::$minHeight;
    }

    protected function getOptions(): ?array
    {
        return static::$options;
    }

    protected function getClustering(): ?bool
    {
        return static::$clustering;
    }

    protected function getFitToBounds(): ?bool
    {
        return static::$fitToBounds;
    }

    protected function getDrawPolylines(): ?bool
    {
        return static::$drawPolylines;
    }

    protected function getShouldUpdateMap(): ?bool
    {
        return static::$shouldUpdateMap;
    }

    protected function getLayers(): array
    {
        return static::$layers;
    }

    protected function getMarkerAction(): ?string
    {
        return static::$markerAction;
    }

    protected function getIcon(): ?string
    {
        return static::$icon;
    }

    protected function getCollapsible(): bool
    {
        return static::$collapsible;
    }

    public function getConfig(): array
    {
        return [
            'clustering'   => self::getClustering(),
            'drawPolylines'=> $this->getDrawPolylines(),
            'layers'       => $this->getLayers(),
            'zoom'         => $this->getZoom(),
            'controls'     => $this->controls,
            'fit'          => $this->getFitToBounds(),
            'markerAction' => $this->getMarkerAction(),
            'gmaps'        => MapsHelper::mapsUrl(),
            'mapConfig'    => [],
        ];
    }

    public function getMapConfig(): string
    {
        $config = $this->getConfig();

        return json_encode(
            array_merge(
                $this->mapConfig,
                $config,
            )
        );
    }

    public function getMapId(): ?string
    {
        $mapId = static::$mapId ?? str(get_called_class())->afterLast('\\')->studly()->toString();

        return preg_replace('/[^a-zA-Z0-9_]/', '', $mapId);
    }

    public function updateMapData()
    {
        if (!$this->initialized) {
            return;
        }
        
        $newDataChecksum = $this->generateDataChecksum();

        if ($newDataChecksum !== $this->dataChecksum) {
            $this->dataChecksum = $newDataChecksum;
            \Log::info('checksum changed, updating map');

            $this->dispatch('updateMap', data: $this->getCachedData());
        }
    }

    public function updatedFilter(): void
    {
        $newDataChecksum = $this->generateDataChecksum();

        if ($newDataChecksum !== $this->dataChecksum) {
            $this->dataChecksum = $newDataChecksum;

            $this->dispatch('filterChartData', [
                'data' => $this->getCachedData(),
            ])->self();
        }
    }

    public function hasJs(): bool
    {
        return true;
    }

    public function jsUrl(): string
    {
        $manifest = json_decode(file_get_contents(__DIR__ . '/../../dist/mix-manifest.json'), true);

        return url($manifest['/cheesegrits/filament-google-maps/filament-google-maps-widget.js']);
    }

    public function hasCss(): bool
    {
        return false;
    }

    public function cssUrl(): string
    {
        $manifest = json_decode(file_get_contents(__DIR__ . '/../../dist/mix-manifest.json'), true);

        return url($manifest['/cheesegrits/filament-google-maps/filament-google-maps-widget.css']);
    }
}
