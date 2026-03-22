import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { LocationPoint, POI, RoutePlan, SearchParams, TransportMode } from '../src/types';

vi.mock('../src/services/amapApi', () => {
  return {
    searchPOI: vi.fn(),
    searchPOIByCity: vi.fn(),
    planRoute: vi.fn()
  };
});

import { fetchReachableRecommendations } from '../src/services/recommendEngine';
import { planRoute, searchPOI, searchPOIByCity } from '../src/services/amapApi';

const mockSearchPOI = vi.mocked(searchPOI);
const mockSearchPOIByCity = vi.mocked(searchPOIByCity);
const mockPlanRoute = vi.mocked(planRoute);

const origin: LocationPoint = {
  lng: 120.1551,
  lat: 30.2741,
  city: '杭州市'
};

const baseParams: SearchParams = {
  origin,
  hoursLimit: 3,
  mode: 'driving'
};

function poi(input: Partial<POI> & Pick<POI, 'id' | 'name'>): POI {
  return {
    id: input.id,
    name: input.name,
    address: input.address || '测试地址',
    location: input.location || { lng: 120.16, lat: 30.28 },
    rating: input.rating,
    type: input.type,
    photo: input.photo,
    distanceMeters: input.distanceMeters
  };
}

function route(mode: TransportMode, durationSeconds: number, distanceMeters = 10000): RoutePlan {
  return {
    mode,
    distanceMeters,
    durationSeconds,
    steps: [{ instruction: '测试导航步骤' }]
  };
}

describe('recommend engine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('keeps hotspot landmark ahead of nearby low-pop spots', async () => {
    const nearbySmall = poi({
      id: 'near-small',
      name: '社区口袋公园',
      rating: 3.2,
      type: '公园',
      location: { lng: 120.157, lat: 30.275 },
      distanceMeters: 800
    });
    const westLake = poi({
      id: 'west-lake',
      name: '西湖景区',
      rating: 4.9,
      type: '风景名胜',
      photo: 'westlake.jpg',
      location: { lng: 120.138, lat: 30.243 },
      distanceMeters: 5200
    });

    mockSearchPOI
      .mockResolvedValueOnce([nearbySmall])
      .mockResolvedValueOnce([]);
    mockSearchPOIByCity.mockResolvedValue([westLake]);
    mockPlanRoute.mockImplementation(async ({ destination, mode }) => {
      if (destination.lng === westLake.location.lng) {
        return route(mode, 2400, 12000);
      }
      return route(mode, 1000, 1500);
    });

    const result = await fetchReachableRecommendations(baseParams);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]?.poi.name).toBe('西湖景区');
  });

  it('adds city hotspot keyword tasks for hangzhou including west lake', async () => {
    mockSearchPOI.mockResolvedValue([]);
    mockSearchPOIByCity.mockResolvedValue([]);
    mockPlanRoute.mockResolvedValue(route('driving', 1200));

    await fetchReachableRecommendations(baseParams);

    const keywords = mockSearchPOIByCity.mock.calls.map((call) => call[0].keyword);
    expect(keywords).toContain('西湖');
    expect(keywords).toContain('灵隐寺');
    expect(keywords).toContain('热门景点');
  });

  it('falls back to ranked results when all candidates are below popularity threshold', async () => {
    const allLowPop = [
      poi({ id: 'a', name: '街心绿地A', rating: 3.3, type: '公园' }),
      poi({ id: 'b', name: '街心绿地B', rating: 3.4, type: '公园' })
    ];
    mockSearchPOI
      .mockResolvedValueOnce(allLowPop)
      .mockResolvedValueOnce([]);
    mockSearchPOIByCity.mockResolvedValue([]);
    mockPlanRoute.mockResolvedValue(route('driving', 1800));

    const result = await fetchReachableRecommendations(baseParams);
    expect(result).toHaveLength(2);
  });

  it('still respects n-hour reachable filter after popularity ranking', async () => {
    const hotButFar = poi({
      id: 'hot-far',
      name: '超热门远景点',
      rating: 4.9,
      photo: 'hot.jpg',
      type: '风景名胜',
      location: { lng: 120.30, lat: 30.40 }
    });
    const hotReachable = poi({
      id: 'hot-near',
      name: '热门可达景点',
      rating: 4.7,
      photo: 'hot2.jpg',
      type: '风景名胜',
      location: { lng: 120.19, lat: 30.29 }
    });

    mockSearchPOI
      .mockResolvedValueOnce([hotButFar, hotReachable])
      .mockResolvedValueOnce([]);
    mockSearchPOIByCity.mockResolvedValue([]);
    mockPlanRoute.mockImplementation(async ({ destination, mode }) => {
      if (destination.lng === hotButFar.location.lng && destination.lat === hotButFar.location.lat) {
        return route(mode, 4 * 3600);
      }
      return route(mode, 2 * 3600);
    });

    const result = await fetchReachableRecommendations({
      ...baseParams,
      hoursLimit: 3
    });
    expect(result.map((item) => item.poi.id)).toEqual(['hot-near']);
  });
});
