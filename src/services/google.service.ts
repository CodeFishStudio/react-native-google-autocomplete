import queryString from 'query-string';

const BASE_URL = 'https://maps.googleapis.com/maps/api/place';

export type LatLng = {
  lat: number;
  lng: number;
};

export type QueryTypes =
  | 'address'
  | 'geocode'
  | '(cities)'
  | '(regions)'
  | 'establishment'
  | 'geocode|establishment';

export interface Query {
  language: string;
  key: string;
  types: QueryTypes;
  components?: string;
  radius?: string;
  lat?: number;
  lng?: number;
  strictBounds?: boolean;
  locationRestriction?:
    | {
        type: 'circle';
        radius: number;
        center: LatLng;
      }
    | {
        type: 'rectangle';
        southWest: LatLng;
        northEast: LatLng;
      };
}

export interface GoogleLocationDetailResult {
  adr_address: string;
  formatted_address: string;
  icon: string;
  id: string;
  name: string;
  place_id: string;
  scope: string;
  reference: string;
  url: string;
  utc_offset: number;
  vicinity: string;
  types: string[];
  geometry: {
    location: LatLng;
    viewport: {
      [type: string]: LatLng;
    };
  };
  address_components: Array<{
    long_name: string;
    short_name: string;
    types: string[];
  }>;
}

export interface GoogleLocationResult {
  description: string;
  id: string;
  matched_substrings: Array<{
    length: number;
    offset: number;
  }>;
  place_id: string;
  reference: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
    main_text_matched_substrings: Array<{
      length: number;
    }>;
  };
  terms: Array<{
    offset: number;
    value: string;
  }>;
  types: string[];
}

interface NormalizeQuery {
  language: string;
  key: string;
  types: QueryTypes;
  components?: string;
  radius?: string;
  location?: string;
  strictBounds?: boolean;
  locationrestriction?: string;
}

const normalizeQuery = (query: Query): NormalizeQuery => {
  const { lat, lng, locationRestriction, ...rest } = query;

  // The latitude/longitude around which to retrieve place information. This must be specified as latitude,longitude.
  let location;

  // If one of the value is provide lat/lng both must be there
  if ((lat && !lng) || (lng && !lat)) {
    throw new Error('Query: Location must have both lat & lng');
  }

  if (lat && lng) {
    location = `${lat},${lng}`;
  }

  // Handle location restrictions
  let locationrestriction;

  if (locationRestriction) {
    switch (locationRestriction.type) {
      case 'circle': {
        const { center, radius } = locationRestriction;
        locationrestriction = `circle:${radius}@${center.lat},${center.lng}`;
        break;
      }
      case 'rectangle':
        const { southWest, northEast } = locationRestriction;
        locationrestriction = `rectangle:${southWest.lat},${southWest.lng}|${northEast.lat},${northEast.lng}`;
        break;
      default:
        break;
    }
  }

  return {
    ...rest,
    location,
    locationrestriction,
  };
};

export class GoogleService {
  public static async search(
    term: string,
    query: Query,
    proxyUrl?: string,
    headers?: HeadersInit
  ): Promise<{
    predictions: GoogleLocationResult[];
    status: string;
  }> {
    const url = `${BASE_URL}/autocomplete/json?&input=${encodeURIComponent(
      term
    )}&${queryString.stringify({ ...normalizeQuery(query) })}${
      query.strictBounds ? '&strictbounds' : ''
    }`;

    const _url = proxyUrl ? proxyUrl + url : url;

    const res = await fetch(_url, {
      headers,
    });

    if (!res.ok) {
      throw new Error(res.statusText);
    }

    return res.json();
  }

  public static async searchDetails(
    placeid: string,
    query: Query & { fields?: string },
    headers?: HeadersInit
  ): Promise<GoogleLocationDetailResult> {
    const url = `${BASE_URL}/details/json?${queryString.stringify({
      ...normalizeQuery(query),
      placeid,
    })}`;

    const res = await fetch(url, {
      headers,
    });

    const resJson: {
      status: string;
      result: GoogleLocationDetailResult;
    } = await res.json();

    if (!resJson.status) {
      throw new Error(res.statusText);
    }

    return Promise.resolve(resJson.result);
  }
}
