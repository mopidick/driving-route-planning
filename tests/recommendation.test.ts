import { describe, expect, it } from 'vitest';
import type { POI, RoutePlan, SearchParams } from '../src/types';
import {
  buildRecommendation,
  createTodoFromRecommendation,
  dedupePoisByNameAndLocation,
  filterAndSortRecommendations
} from '../src/utils/recommendation';

const basePoi: POI = {
  id: 'p1',
  name: '测试景点',
  address: '测试地址',
  location: { lng: 121.4, lat: 31.2 },
  rating: 4.2
};

const fastRoute: RoutePlan = {
  mode: 'driving',
  distanceMeters: 12000,
  durationSeconds: 1800,
  tollsCny: 10,
  steps: [{ instruction: '沿主路前行' }]
};

const slowRoute: RoutePlan = {
  mode: 'driving',
  distanceMeters: 50000,
  durationSeconds: 12000,
  steps: [{ instruction: '沿高速前行' }]
};

describe('recommendation utils', () => {
  it('filters by hours limit and keeps reachable items', () => {
    const params: SearchParams = {
      origin: { lng: 121.47, lat: 31.23, city: '上海市' },
      hoursLimit: 2,
      mode: 'driving'
    };
    const recs = [
      buildRecommendation({ ...basePoi, id: 'a', rating: 3.9 }, slowRoute),
      buildRecommendation({ ...basePoi, id: 'b', rating: 4.8 }, fastRoute)
    ];

    const result = filterAndSortRecommendations(recs, params);
    expect(result).toHaveLength(1);
    expect(result[0]?.poi.id).toBe('b');
  });

  it('sorts by heat score first instead of shortest duration', () => {
    const params: SearchParams = {
      origin: { lng: 121.47, lat: 31.23, city: '上海市' },
      hoursLimit: 5,
      mode: 'driving'
    };
    const shortLowHeat = buildRecommendation(
      { ...basePoi, id: 'short', rating: 3.9, photo: undefined, type: '公园' },
      { ...fastRoute, durationSeconds: 1200 }
    );
    const longHighHeat = buildRecommendation(
      { ...basePoi, id: 'hot', rating: 4.9, photo: 'a.jpg', type: '风景名胜' },
      { ...fastRoute, durationSeconds: 3200 }
    );

    const result = filterAndSortRecommendations([shortLowHeat, longHighHeat], params);
    expect(result[0]?.poi.id).toBe('hot');
  });

  it('uses rating and type to raise popular scenic spots', () => {
    const params: SearchParams = {
      origin: { lng: 120.15, lat: 30.27, city: '杭州市' },
      hoursLimit: 5,
      mode: 'driving'
    };
    const tinyPark = buildRecommendation(
      { ...basePoi, id: 'tiny', name: '社区口袋公园', rating: 3.6, type: '公园' },
      { ...fastRoute, durationSeconds: 900 }
    );
    const famousSpot = buildRecommendation(
      { ...basePoi, id: 'famous', name: '西湖景区', rating: 4.9, type: '风景名胜', photo: 'x.jpg' },
      { ...fastRoute, durationSeconds: 2400 }
    );
    const result = filterAndSortRecommendations([tinyPark, famousSpot], params);
    expect(result[0]?.poi.id).toBe('famous');
  });

  it('creates todo snapshot with route/tips details', () => {
    const params: SearchParams = {
      origin: { lng: 121.47, lat: 31.23, city: '上海市' },
      hoursLimit: 3,
      mode: 'driving'
    };
    const rec = buildRecommendation(basePoi, fastRoute);
    const todo = createTodoFromRecommendation(rec, params);

    expect(todo.title).toBe(basePoi.name);
    expect(todo.routeSummary.durationSeconds).toBe(1800);
    expect(todo.routeSteps[0]?.instruction).toContain('主路');
    expect(todo.tips.length).toBeGreaterThan(0);
    expect(todo.amapNavigationUrl).toContain('uri.amap.com/navigation');
  });

  it('dedupes poi list by name and nearby location', () => {
    const items: POI[] = [
      { ...basePoi, id: '1', location: { lng: 121.4001, lat: 31.2001 } },
      { ...basePoi, id: '2', location: { lng: 121.40012, lat: 31.20012 } },
      { ...basePoi, id: '3', name: '另一个景点', location: { lng: 121.41, lat: 31.21 } }
    ];
    const result = dedupePoisByNameAndLocation(items);
    expect(result).toHaveLength(2);
  });
});
