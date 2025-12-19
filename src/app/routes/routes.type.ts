import { Router } from 'express';

export type TRoutes = {
  path: string;
  route: Router;
};

export type TRouteModules = TRoutes[];
