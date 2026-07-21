export type GeocodableProjectLocation = {
  id: number;
  address: string;
  city: string;
  state: string;
  zip: string;
};

export type GeocodedProjectLocation = {
  id: number;
  latitude: number;
  longitude: number;
};

const CENSUS_BATCH_GEOCODER_URL = "https://geocoding.geo.census.gov/geocoder/locations/addressbatch?benchmark=Public_AR_Current";
const MAX_BATCH_SIZE = 10_000;
const REQUEST_TIMEOUT_MS = 60_000;

function csvCell(value: string | number) {
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function parseCsvRecord(line: string) {
  const values: string[] = [];
  let value = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (inQuotes && line[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (character === "," && !inQuotes) {
      values.push(value);
      value = "";
    } else {
      value += character;
    }
  }
  values.push(value);
  return values;
}

function buildBatchCsv(locations: GeocodableProjectLocation[]) {
  return `${locations
    .map(location => [location.id, location.address, location.city, location.state, location.zip]
      .map(csvCell)
      .join(","))
    .join("\n")}\n`;
}

function parseBatchResponse(responseText: string) {
  const coordinates = new Map<number, GeocodedProjectLocation>();

  for (const line of responseText.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const [idValue, , matchType, , , coordinateValue] = parseCsvRecord(line);
    const id = Number.parseInt(idValue, 10);
    if (!Number.isInteger(id) || matchType !== "Match" || !coordinateValue) continue;

    const [longitudeText, latitudeText] = coordinateValue.split(",");
    const longitude = Number.parseFloat(longitudeText);
    const latitude = Number.parseFloat(latitudeText);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) continue;
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) continue;

    coordinates.set(id, { id, latitude, longitude });
  }

  return Array.from(coordinates.values());
}

async function geocodeBatch(locations: GeocodableProjectLocation[]) {
  const form = new FormData();
  form.append(
    "addressFile",
    new Blob([buildBatchCsv(locations)], { type: "text/csv" }),
    "project-locations.csv",
  );

  const response = await fetch(CENSUS_BATCH_GEOCODER_URL, {
    method: "POST",
    body: form,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`Census geocoder request failed with HTTP ${response.status}`);
  }

  return parseBatchResponse(await response.text());
}

/**
 * Resolves U.S. property-address coordinates through the Census Geocoder.
 * A failed enrichment intentionally does not block an authorized import.
 */
export async function geocodeProjectLocations(locations: GeocodableProjectLocation[]) {
  const allCoordinates: GeocodedProjectLocation[] = [];

  for (let start = 0; start < locations.length; start += MAX_BATCH_SIZE) {
    allCoordinates.push(...await geocodeBatch(locations.slice(start, start + MAX_BATCH_SIZE)));
  }

  return allCoordinates;
}

export const __testOnly = {
  buildBatchCsv,
  parseBatchResponse,
  parseCsvRecord,
};
