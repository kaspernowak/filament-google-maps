@php
    $heading = $this->getHeading();
    $filters = $this->getFilters();
@endphp

<x-filament-widgets::widget class="filament-google-maps-widget">
    <x-filament::card>
        @if ($heading || $filters)
            <div class="flex items-center justify-between gap-8">
                @if ($heading)
                    <x-filament::card.heading>
                        {{ $heading }}
                    </x-filament::card.heading>
                @endif

                @if ($filters)
                    <select
                            wire:model="filter"
                            @class([
                                'text-gray-900 border-gray-300 block h-10 transition duration-75 rounded-lg shadow-sm focus:border-primary-500 focus:ring-1 focus:ring-inset focus:ring-primary-500',
                                'dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 dark:focus:border-primary-500' => config('filament.dark_mode'),
                            ])
                            wire:loading.class="animate-pulse"
                    >
                        @foreach ($filters as $value => $label)
                            <option value="{{ $value }}">
                                {{ $label }}
                            </option>
                        @endforeach
                    </select>
                @endif
            </div>

            <x-filament::hr/>
        @endif

        <div class=""
                wire:key="{{ rand() }}"
                x-ignore
                ax-load
                ax-load-src="{{ \Filament\Support\Facades\FilamentAsset::getAlpineComponentSrc('filament-google-maps-widget', 'cheesegrits/filament-google-maps') }}"
                x-data="filamentGoogleMapsWidget({
                    cachedData: {{  json_encode($this->getCachedData()) }},
                    config: {{ $this->getMapConfig()}},
                    mapEl: $refs.map,
{{--                    mapFilterIds: {{ $this->mapIsFilter() ? 'wire:@entangle("mapFilterIds")' : null}}--}}
                })"
                wire:ignore
                @if ($maxHeight = $this->getMaxHeight())
                    style=" max-height: {{ $maxHeight }}"
                @endif
            >
            <div
                @if($this->mapIsFilter())
                    wire:@entangle('mapFilterIds')
                @endif
                        
                wire:ignore
                id="map-{{ $this->getMapId() }}" x-ref="map" class="w-full"
                style="min-height: 50vh; z-index: 1 !important;"
                >
            </div>

        </div>
    </x-filament::card>

    <x-filament::card>
        {{ $this->table }}
    </x-filament::card>

</x-filament-widgets::widget>
