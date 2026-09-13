/**
 * Sampling grid for the ADSB.lol radius queries.
 *
 * Pure data, kept out of the ingestion service so adding or moving a sample
 * point never means editing pipeline logic.
 */
// The global /v2/all snapshot is frequently rate-limited, so sample the world
// with radius queries (250 nm cap per query) and merge the results. Coverage
// still depends on volunteer ground receivers, so mid-ocean gaps remain where
// no receiver can hear an aircraft.
export const COVERAGE_REGIONS: Array<[number, number]> = [
  // North America
  [40.6, -73.8], // New York
  [33.9, -118.4], // Los Angeles
  [41.9, -87.9], // Chicago
  [29.6, -95.3], // Houston
  [25.8, -80.3], // Miami
  [37.6, -122.4], // San Francisco
  [43.7, -79.6], // Toronto
  [39.8, -104.7], // Denver
  [47.5, -122.3], // Seattle
  [19.4, -99.1], // Mexico City
  [21.3, -157.9], // Honolulu
  [61.2, -149.9], // Anchorage
  // North Atlantic corridor
  [47.6, -52.7], // Gander / NL
  [44.9, -63.5], // Halifax
  [64.1, -21.9], // Reykjavik
  [61.6, -6.8], // Faroe Islands
  [52.7, -8.9], // Shannon
  [37.7, -25.7], // Azores
  [32.4, -64.7], // Bermuda
  [64.2, -51.7], // Nuuk
  [18.4, -66.0], // San Juan
  // Europe
  [51.5, -0.1], // London
  [50.0, 8.6], // Frankfurt
  [40.5, -3.6], // Madrid
  [41.9, 12.5], // Rome
  [59.6, 17.9], // Stockholm
  [52.3, 4.8], // Amsterdam
  [37.9, 23.7], // Athens
  [55.7, 37.6], // Moscow
  [41.0, 28.8], // Istanbul
  // Africa & Middle East
  [30.1, 31.4], // Cairo
  [6.6, 3.3], // Lagos
  [-1.3, 36.9], // Nairobi
  [-26.1, 28.2], // Johannesburg
  [-33.9, 18.6], // Cape Town
  [25.3, 55.4], // Dubai
  [24.7, 46.7], // Riyadh
  // Asia
  [28.6, 77.1], // Delhi
  [19.1, 72.9], // Mumbai
  [13.7, 100.7], // Bangkok
  [1.36, 103.99], // Singapore
  [-6.1, 106.7], // Jakarta
  [22.3, 114.2], // Hong Kong
  [31.2, 121.5], // Shanghai
  [39.5, 116.4], // Beijing
  [37.5, 126.8], // Seoul
  [35.6, 139.8], // Tokyo
  [14.5, 121.0], // Manila
  // Oceania & South America
  [-33.9, 151.2], // Sydney
  [-37.7, 144.8], // Melbourne
  [-36.9, 174.8], // Auckland
  [-18.1, 178.4], // Fiji
  [-23.5, -46.6], // Sao Paulo
  [-34.8, -58.5], // Buenos Aires
  [-12.0, -77.1], // Lima
  [4.7, -74.1], // Bogota
  [-33.4, -70.8], // Santiago
];
