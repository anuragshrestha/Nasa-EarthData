let mapsLoader = null;

export function loadGoogleMaps() {
  if (window.google?.maps?.places) return Promise.resolve();
  if (mapsLoader) return mapsLoader;

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  mapsLoader = new Promise((resolve, reject) => {
    const id = 'google-maps-places';
    const existing = document.getElementById(id);
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.id = id;
    script.async = true;
    script.defer = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&v=weekly`;
    script.onload = () => resolve();
    script.onerror = (e) => reject(e);
    document.head.appendChild(script);
  });

  return mapsLoader;
}