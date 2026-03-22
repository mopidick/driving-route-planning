import type { LocationPoint, POI, RoutePlan, RouteStep, TransportMode } from '../types';
import type { AmapApiResponse } from '../types/amap';
import { dedupePoisByNameAndLocation } from '../utils/recommendation';

const BASE_URL = import.meta.env.VITE_AMAP_PROXY_BASE || '/amap';
const AMAP_SERVICE_KEY = import.meta.env.VITE_AMAP_SERVICE_KEY || import.meta.env.VITE_AMAP_KEY;

class AmapRequestError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'AmapRequestError';
  }
}

interface AmapPoiRaw {
  id: string;
  name: string;
  address: string;
  location: string;
  distance?: string;
  biz_ext?: {
    rating?: string;
  };
  type?: string;
  photos?: Array<{ url: string }>;
}

interface GeolocationResult {
  lng: number;
  lat: number;
}

interface ReGeoResponse extends AmapApiResponse {
  regeocode?: {
    formatted_address?: string;
    addressComponent?: {
      city?: string | string[];
      province?: string;
    };
  };
}

interface PoiSearchResponse extends AmapApiResponse {
  pois?: AmapPoiRaw[];
}

interface PoiTextSearchResponse extends AmapApiResponse {
  pois?: AmapPoiRaw[];
}

interface DrivingRouteResponse extends AmapApiResponse {
  route?: {
    paths?: Array<{
      distance: string;
      duration: string;
      tolls?: string;
      steps?: Array<{
        instruction?: string;
        road?: string;
        distance?: string;
        duration?: string;
        polyline?: string;
      }>;
    }>;
  };
}

interface TransitRouteResponse extends AmapApiResponse {
  route?: {
    transits?: Array<{
      distance: string;
      duration: string;
      cost?: string;
      segments?: Array<{
        walking?: {
          instruction?: string;
          distance?: string;
          duration?: string;
        };
        bus?: {
          buslines?: Array<{
            name?: string;
            departure_stop?: { name?: string };
            arrival_stop?: { name?: string };
            distance?: string;
            duration?: string;
          }>;
        };
      }>;
    }>;
  };
}

function ensureAmapKey(): string {
  if (!AMAP_SERVICE_KEY) {
    throw new AmapRequestError(
      '缺少高德 Web 服务 Key。请在 .env 中配置 VITE_AMAP_SERVICE_KEY。',
      'MISSING_AMAP_SERVICE_KEY'
    );
  }
  return AMAP_SERVICE_KEY;
}

async function requestJson<T extends AmapApiResponse>(path: string, query: Record<string, string>): Promise<T> {
  const key = ensureAmapKey();
  const search = new URLSearchParams({ ...query, key });
  const response = await fetch(`${BASE_URL}${path}?${search.toString()}`);

  if (!response.ok) {
    throw new AmapRequestError(`地图服务请求失败 (${response.status})`, 'HTTP_ERROR');
  }

  const json = (await response.json()) as T;
  if (json.status !== '1') {
    throw new AmapRequestError(mapAmapErrorMessage(json.info, json.infocode), json.infocode || 'API_ERROR');
  }

  return json;
}

export async function getCurrentLocation(): Promise<LocationPoint> {
  const coordinates = await getBrowserGeolocation();
  const geoInfo = await reverseGeocode(coordinates.lng, coordinates.lat);
  return {
    lng: coordinates.lng,
    lat: coordinates.lat,
    address: geoInfo.address,
    city: geoInfo.city
  };
}

export async function reverseGeocode(lng: number, lat: number): Promise<{ address?: string; city?: string }> {
  const json = await requestJson<ReGeoResponse>('/v3/geocode/regeo', {
    location: `${lng},${lat}`,
    extensions: 'base'
  });

  const cityRaw = json.regeocode?.addressComponent?.city;
  const city = Array.isArray(cityRaw)
    ? cityRaw[0] || json.regeocode?.addressComponent?.province
    : cityRaw || json.regeocode?.addressComponent?.province;

  return {
    address: json.regeocode?.formatted_address,
    city
  };
}

export async function searchPOI(params: {
  origin: LocationPoint;
  radiusMeters: number;
  keyword?: string;
  page?: number;
  pageSize?: number;
  sortRule?: 'weight' | 'distance';
}): Promise<POI[]> {
  const response = await requestJson<PoiSearchResponse>('/v3/place/around', {
    location: `${params.origin.lng},${params.origin.lat}`,
    radius: `${params.radiusMeters}`,
    keywords: params.keyword || '热门景点',
    types: '110000',
    sortrule: params.sortRule || 'weight',
    offset: `${params.pageSize || 20}`,
    page: `${params.page || 1}`,
    extensions: 'all'
  });

  const pois = (response.pois || [])
    .map((poi): POI | null => {
      const [lngText, latText] = (poi.location || '').split(',');
      const lng = Number(lngText);
      const lat = Number(latText);
      if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
        return null;
      }

      return {
        id: poi.id,
        name: poi.name,
        address: poi.address || '地址待补充',
        location: {
          lng,
          lat
        },
        distanceMeters: poi.distance ? Number(poi.distance) : undefined,
        rating: poi.biz_ext?.rating ? Number(poi.biz_ext.rating) : undefined,
        type: poi.type,
        photo: poi.photos?.[0]?.url
      };
    })
    .filter((item): item is POI => Boolean(item));

  return dedupePoisByNameAndLocation(pois);
}

export async function searchPOIByCity(params: {
  city: string;
  keyword: string;
  page?: number;
  pageSize?: number;
}): Promise<POI[]> {
  const response = await requestJson<PoiTextSearchResponse>('/v3/place/text', {
    city: params.city,
    citylimit: 'true',
    keywords: params.keyword,
    types: '110000',
    offset: `${params.pageSize || 20}`,
    page: `${params.page || 1}`,
    extensions: 'all'
  });

  const pois = (response.pois || [])
    .map((poi): POI | null => {
      const [lngText, latText] = (poi.location || '').split(',');
      const lng = Number(lngText);
      const lat = Number(latText);
      if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
        return null;
      }
      return {
        id: poi.id,
        name: poi.name,
        address: poi.address || '地址待补充',
        location: { lng, lat },
        rating: poi.biz_ext?.rating ? Number(poi.biz_ext.rating) : undefined,
        type: poi.type,
        photo: poi.photos?.[0]?.url
      };
    })
    .filter((item): item is POI => Boolean(item));

  return dedupePoisByNameAndLocation(pois);
}

export async function planRoute(params: {
  origin: LocationPoint;
  destination: LocationPoint;
  mode: TransportMode;
  city?: string;
}): Promise<RoutePlan> {
  if (params.mode === 'driving') {
    return planDrivingRoute(params.origin, params.destination);
  }
  return planTransitRoute(params.origin, params.destination, params.city);
}

async function planDrivingRoute(origin: LocationPoint, destination: LocationPoint): Promise<RoutePlan> {
  const response = await requestJson<DrivingRouteResponse>('/v3/direction/driving', {
    origin: `${origin.lng},${origin.lat}`,
    destination: `${destination.lng},${destination.lat}`,
    strategy: '0',
    extensions: 'all'
  });

  const bestPath = response.route?.paths?.[0];
  if (!bestPath) {
    throw new AmapRequestError('未找到可用自驾路线。', 'NO_ROUTE_DRIVING');
  }

  const steps = (bestPath.steps || []).map<RouteStep>((step) => ({
    instruction: step.instruction || '按导航前进',
    road: step.road,
    distanceMeters: step.distance ? Number(step.distance) : undefined,
    durationSeconds: step.duration ? Number(step.duration) : undefined
  }));

  const polyline = (bestPath.steps || [])
    .map((step) => step.polyline)
    .filter((line): line is string => Boolean(line))
    .join(';');

  return {
    mode: 'driving',
    distanceMeters: Number(bestPath.distance),
    durationSeconds: Number(bestPath.duration),
    tollsCny: bestPath.tolls ? Number(bestPath.tolls) : undefined,
    steps,
    polyline
  };
}

async function planTransitRoute(
  origin: LocationPoint,
  destination: LocationPoint,
  city?: string
): Promise<RoutePlan> {
  const response = await requestJson<TransitRouteResponse>('/v3/direction/transit/integrated', {
    origin: `${origin.lng},${origin.lat}`,
    destination: `${destination.lng},${destination.lat}`,
    city: city || destination.city || '全国',
    strategy: '0',
    nightflag: '1'
  });

  const bestTransit = response.route?.transits?.[0];
  if (!bestTransit) {
    throw new AmapRequestError('未找到可用公交路线。', 'NO_ROUTE_TRANSIT');
  }

  const steps: RouteStep[] = [];
  for (const segment of bestTransit.segments || []) {
    if (segment.walking?.instruction) {
      steps.push({
        instruction: `步行：${segment.walking.instruction}`,
        distanceMeters: segment.walking.distance ? Number(segment.walking.distance) : undefined,
        durationSeconds: segment.walking.duration ? Number(segment.walking.duration) : undefined
      });
    }

    const busline = segment.bus?.buslines?.[0];
    if (busline?.name) {
      steps.push({
        instruction: `乘坐 ${busline.name}（${busline.departure_stop?.name || '起点'} - ${busline.arrival_stop?.name || '终点'}）`,
        distanceMeters: busline.distance ? Number(busline.distance) : undefined,
        durationSeconds: busline.duration ? Number(busline.duration) : undefined
      });
    }
  }

  return {
    mode: 'transit',
    distanceMeters: Number(bestTransit.distance),
    durationSeconds: Number(bestTransit.duration),
    costCny: bestTransit.cost ? Number(bestTransit.cost) : undefined,
    steps
  };
}

function getBrowserGeolocation(): Promise<GeolocationResult> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new AmapRequestError('当前浏览器不支持定位。', 'NO_GEOLOCATION'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lng: position.coords.longitude,
          lat: position.coords.latitude
        });
      },
      () => reject(new AmapRequestError('定位失败，请检查定位权限。', 'LOCATION_DENIED')),
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000
      }
    );
  });
}

function mapAmapErrorMessage(info?: string, infocode?: string): string {
  if (infocode === '10001') {
    return '地图 Key 不合法，请检查配置。';
  }
  if (infocode === '10003') {
    return '当前请求频率过高，请稍后重试。';
  }
  if (infocode === '10004') {
    return '地图服务今日配额不足，请稍后再试。';
  }
  if (infocode === '30000') {
    return '路线规划失败，请尝试更换出发地或交通方式。';
  }
  return info || '地图服务暂不可用，请稍后重试。';
}

export { AmapRequestError };
