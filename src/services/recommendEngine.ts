import { planRoute, searchPOI, searchPOIByCity } from './amapApi';
import type { Recommendation, SearchParams } from '../types';
import {
  buildRecommendation,
  computeSearchRadiusMeters,
  dedupePoisByNameAndLocation,
  filterAndSortRecommendations
} from '../utils/recommendation';

const PAGE_SIZE = 20;
const MAX_ROUTE_CALC = 16;
const MIN_POPULARITY_SCORE = 76;

export async function fetchReachableRecommendations(params: SearchParams): Promise<Recommendation[]> {
  const radiusMeters = computeSearchRadiusMeters(params.hoursLimit, params.mode);
  const aroundTasks = [
    searchPOI({
      origin: params.origin,
      radiusMeters,
      pageSize: PAGE_SIZE,
      page: 1,
      sortRule: 'weight'
    }),
    searchPOI({
      origin: params.origin,
      radiusMeters,
      pageSize: PAGE_SIZE,
      page: 2,
      sortRule: 'weight'
    })
  ];

  const cityTasks = buildCityHotSearchTasks(params.origin.city);
  const allResult = await Promise.allSettled([...aroundTasks, ...cityTasks]);
  const merged = dedupePoisByNameAndLocation(
    allResult
      .filter((item): item is PromiseFulfilledResult<Awaited<ReturnType<typeof searchPOI>>> => item.status === 'fulfilled')
      .flatMap((item) => item.value)
  );

  const ranked = merged
    .filter((poi) => !shouldExcludeLowTierPoi(poi))
    .map((poi) => ({ poi, score: scorePOIForPopularity(poi) }))
    .sort((a, b) => b.score - a.score);

  const filtered = ranked.filter((item) => item.score >= MIN_POPULARITY_SCORE).map((item) => item.poi);
  const routeCandidates = (filtered.length > 0 ? filtered : ranked.map((item) => item.poi)).slice(0, MAX_ROUTE_CALC);
  const routePlans = await Promise.allSettled(
    routeCandidates.map((poi) =>
      planRoute({
        origin: params.origin,
        destination: { ...poi.location, city: params.origin.city },
        mode: params.mode,
        city: params.origin.city
      }).then((route) => buildRecommendation(poi, route))
    )
  );

  const recommendations = routePlans
    .filter((item): item is PromiseFulfilledResult<Recommendation> => item.status === 'fulfilled')
    .map((item) => item.value);

  return filterAndSortRecommendations(recommendations, params);
}

function scorePOIForPopularity(poi: { rating?: number; photo?: string; type?: string }): number {
  let score = (poi.rating ?? 3.8) * 20;
  if (poi.photo) {
    score += 12;
  }
  if ((poi.type || '').includes('风景名胜')) {
    score += 8;
  }
  if ((poi.type || '').includes('公园')) {
    score += 4;
  }
  if ((poi.type || '').includes('博物馆') || (poi.type || '').includes('文物古迹')) {
    score += 4;
  }
  return score;
}

function buildCityHotSearchTasks(city?: string): Array<Promise<Awaited<ReturnType<typeof searchPOIByCity>>>> {
  if (!city) {
    return [];
  }
  const keywords = ['热门景点', '必去景点', '风景名胜', ...cityLandmarkHints(city)];
  return keywords.map((keyword) =>
    searchPOIByCity({
      city,
      keyword,
      pageSize: 15,
      page: 1
    })
  );
}

function cityLandmarkHints(city: string): string[] {
  if (city.includes('杭州')) {
    return ['西湖', '灵隐寺'];
  }
  if (city.includes('北京')) {
    return ['故宫', '颐和园'];
  }
  if (city.includes('上海')) {
    return ['外滩', '豫园'];
  }
  if (city.includes('西安')) {
    return ['兵马俑', '大雁塔'];
  }
  return [];
}

function shouldExcludeLowTierPoi(poi: { name: string; type?: string; rating?: number; photo?: string }): boolean {
  const lowTierNamePattern = /(口袋公园|文化小广场|城市广场|生态公园|社区公园|遗址公园|村文化公园)/;
  const lowTierTypePattern = /(城市广场|公园广场)/;
  const rating = poi.rating ?? 0;
  const hasPhoto = Boolean(poi.photo);
  const byName = lowTierNamePattern.test(poi.name);
  const byType = lowTierTypePattern.test(poi.type || '');
  return (byName || byType) && rating < 4.3 && !hasPhoto;
}
