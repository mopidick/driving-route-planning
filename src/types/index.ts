export type TransportMode = 'driving' | 'transit';

export interface LocationPoint {
  lng: number;
  lat: number;
  address?: string;
  city?: string;
}

export interface SearchParams {
  origin: LocationPoint;
  hoursLimit: number;
  mode: TransportMode;
}

export interface POI {
  id: string;
  name: string;
  address: string;
  location: LocationPoint;
  distanceMeters?: number;
  rating?: number;
  type?: string;
  photo?: string;
}

export interface RouteStep {
  instruction: string;
  road?: string;
  distanceMeters?: number;
  durationSeconds?: number;
}

export interface RoutePlan {
  mode: TransportMode;
  distanceMeters: number;
  durationSeconds: number;
  costCny?: number;
  tollsCny?: number;
  steps: RouteStep[];
  polyline?: string;
}

export interface Recommendation {
  id: string;
  poi: POI;
  route: RoutePlan;
  heatScore: number;
  factors: string[];
  summary: string;
  reason: string;
  tips: string[];
  createdAt: string;
}

export interface TodoItemSnapshot {
  id: string;
  title: string;
  acceptedAt: string;
  searchSnapshot: {
    origin: LocationPoint;
    hoursLimit: number;
    mode: TransportMode;
  };
  poi: POI;
  routeSummary: {
    distanceMeters: number;
    durationSeconds: number;
    costCny?: number;
    tollsCny?: number;
    polyline?: string;
  };
  routeSteps: RouteStep[];
  tips: string[];
  amapNavigationUrl: string;
}
