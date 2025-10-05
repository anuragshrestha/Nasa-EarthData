import React, { useEffect, useRef, useState } from 'react';
import { loadGoogleMaps } from '../utils/loadGoogleMaps';

export default function AutocompleteAddress({
  placeholder = 'Enter Street address, City name or ZIP code',
  className,
  onPlaceSelected,
  defaultValue = '',
  countryRestriction, 
}) {
  const inputRef = useRef(null);
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    let autocomplete = null;
    let listener = null;
    let cancelled = false;

    loadGoogleMaps()
      .then(() => {
        if (cancelled || !inputRef.current) return;

        autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
          fields: ['place_id', 'name', 'formatted_address', 'geometry', 'address_components'],
          types: ['geocode'],
          componentRestrictions: countryRestriction ? { country: countryRestriction } : undefined,
        });

        listener = autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace();
          const label = place.formatted_address || place.name || '';
          setValue(label);

          onPlaceSelected &&
            onPlaceSelected({
              placeId: place.place_id || '',
              label,
              lat: place.geometry?.location?.lat(),
              lng: place.geometry?.location?.lng(),
              components: place.address_components,
            });
        });
      })
      .catch(() => console.error('Failed to load Google Maps JS API'));

    return () => {
      cancelled = true;
      if (listener) google.maps.event.removeListener(listener);
    };
  }, [onPlaceSelected, countryRestriction]);

  return (
    <input
      ref={inputRef}
      className={className}
      placeholder={placeholder}
      aria-label="Search by address, city, or ZIP"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      type="search"
      autoComplete="off"
    />
  );
}