import type { POI, Recommendation, RoutePlan, SearchParams, TodoItemSnapshot, TransportMode } from '../types';

const TRANSPORT_LABEL: Record<TransportMode, string> = {
  driving: '自驾',
  transit: '公共交通'
};

export function buildRecommendation(poi: POI, routePlan: RoutePlan): Recommendation {
  const hours = routePlan.durationSeconds / 3600;
  const heatScore = computeHeatScore(poi, routePlan);
  const factors = computeRecommendationFactors(poi, routePlan, heatScore);
  const summary = `${TRANSPORT_LABEL[routePlan.mode]}约${hours.toFixed(1)}小时可达`;
  const reason =
    heatScore >= 82
      ? '综合热度高，适合优先安排'
      : (poi.rating ?? 0) >= 4
        ? '口碑稳定，可放心打卡'
        : '热度适中，适合轻松出游';

  const tips = buildTips(poi, routePlan);

  return {
    id: `${poi.id}-${routePlan.mode}`,
    poi,
    route: routePlan,
    heatScore,
    factors,
    summary,
    reason,
    tips,
    createdAt: new Date().toISOString()
  };
}

export function filterAndSortRecommendations(
  recommendations: Recommendation[],
  params: SearchParams
): Recommendation[] {
  const durationLimit = params.hoursLimit * 3600;
  return recommendations
    .filter((rec) => rec.route.durationSeconds <= durationLimit)
    .sort((a, b) => {
      if (a.heatScore !== b.heatScore) {
        return b.heatScore - a.heatScore;
      }
      if ((a.poi.rating ?? 0) !== (b.poi.rating ?? 0)) {
        return (b.poi.rating ?? 0) - (a.poi.rating ?? 0);
      }
      return a.route.durationSeconds - b.route.durationSeconds;
    });
}

export function createTodoFromRecommendation(
  rec: Recommendation,
  searchSnapshot: SearchParams
): TodoItemSnapshot {
  return {
    id: `${rec.id}-${Date.now()}`,
    title: rec.poi.name,
    acceptedAt: new Date().toISOString(),
    searchSnapshot,
    poi: rec.poi,
    routeSummary: {
      distanceMeters: rec.route.distanceMeters,
      durationSeconds: rec.route.durationSeconds,
      costCny: rec.route.costCny,
      tollsCny: rec.route.tollsCny,
      polyline: rec.route.polyline
    },
    routeSteps: rec.route.steps,
    tips: rec.tips,
    amapNavigationUrl: buildAmapNavigationUrl(searchSnapshot.origin, rec.poi, rec.route.mode)
  };
}

export function computeSearchRadiusMeters(hours: number, mode: TransportMode): number {
  const speed = mode === 'driving' ? 60 : 35;
  const radius = hours * speed * 1000;
  return Math.min(Math.max(radius, 5000), 100000);
}

export function dedupePoisByNameAndLocation<T extends POI>(pois: T[]): T[] {
  const map = new Map<string, T>();
  for (const poi of pois) {
    const key = `${poi.name}-${poi.location.lng.toFixed(4)}-${poi.location.lat.toFixed(4)}`;
    if (!map.has(key)) {
      map.set(key, poi);
    }
  }
  return [...map.values()];
}

function buildTips(poi: POI, routePlan: RoutePlan): string[] {
  const tips: string[] = [];
  if (routePlan.mode === 'transit') {
    tips.push('建议提前10分钟到站，避免错过换乘。');
    tips.push('高峰时段请预留额外换乘时间。');
  } else {
    tips.push('出发前关注实时路况与停车位。');
    if ((routePlan.tollsCny ?? 0) > 0) {
      tips.push('路线涉及高速，注意通行费与ETC余额。');
    }
  }

  if ((poi.rating ?? 0) >= 4.5) {
    tips.push('该景点评分较高，周末可能排队，建议错峰出行。');
  } else {
    tips.push('可结合附近景点一起规划，提升行程性价比。');
  }
  return tips;
}

function computeHeatScore(poi: POI, routePlan: RoutePlan): number {
  let score = (poi.rating ?? 3.8) * 18;
  if (poi.photo) {
    score += 8;
  }
  if ((poi.type || '').includes('风景名胜')) {
    score += 6;
  }
  if ((poi.type || '').includes('公园')) {
    score += 4;
  }
  if (routePlan.durationSeconds <= 3600) {
    score += 6;
  } else if (routePlan.durationSeconds <= 2 * 3600) {
    score += 3;
  }
  return Math.round(Math.min(100, Math.max(50, score)));
}

function computeRecommendationFactors(poi: POI, routePlan: RoutePlan, heatScore: number): string[] {
  const factors: string[] = [];
  if ((poi.rating ?? 0) >= 4.7) {
    factors.push('评分高');
  } else if ((poi.rating ?? 0) >= 4.3) {
    factors.push('口碑稳');
  }
  if ((poi.type || '').includes('风景名胜')) {
    factors.push('地标景区');
  }
  if (routePlan.durationSeconds <= 3600) {
    factors.push('1小时内可达');
  } else if (routePlan.durationSeconds <= 2 * 3600) {
    factors.push('2小时内可达');
  }
  if (heatScore >= 86) {
    factors.push('热度领先');
  }
  return factors.slice(0, 3);
}

function buildAmapNavigationUrl(origin: SearchParams['origin'], poi: POI, mode: TransportMode): string {
  const modeValue = mode === 'driving' ? 0 : 1;
  const from = `${origin.lng},${origin.lat},当前位置`;
  const to = `${poi.location.lng},${poi.location.lat},${encodeURIComponent(poi.name)}`;
  return `https://uri.amap.com/navigation?from=${from}&to=${to}&mode=${modeValue}&policy=1&src=codex-mvp`; 
}
