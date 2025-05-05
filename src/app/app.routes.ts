import { Route } from '@angular/router';
import { LayoutComponent } from 'src/layout/layout.component';
import { RoutesConstant } from 'src/shared/constant/routes.constant';

export const appRoutes: Route[] = [
  {
    path: '',
    component: LayoutComponent,
    children: [
      {
        path: '',
        redirectTo: RoutesConstant.PRODUCT_DETAIL,
        pathMatch: 'full',
      },
      {
        path: RoutesConstant.HOME,
        loadComponent: () => import('src/pages/404/404.component').then(m => m.Page404Component),
      },
      {
        path: RoutesConstant.PRODUCT,
        loadComponent: () => import('src/pages/404/404.component').then(m => m.Page404Component),
      },
      {
        path: RoutesConstant.ORDER,
        loadComponent: () => import('src/pages/dashboard/dashboard.component').then(m => m.DashboardComponent),
      },
      {
        path: RoutesConstant.USER,
        loadComponent: () => import('src/pages/dashboard/dashboard.component').then(m => m.DashboardComponent),
      },
      {
        path: RoutesConstant.PRODUCT_DETAIL,
        loadComponent: () => import('src/pages/404/404.component').then(m => m.Page404Component),
      },
      {
        path: RoutesConstant.ORDER_DETAIL,
        loadComponent: () => import('src/pages/404/404.component').then(m => m.Page404Component),
      },
      {
        path: RoutesConstant.USER_DETAIL,
        loadComponent: () => import('src/pages/dashboard/dashboard.component').then(m => m.DashboardComponent),
      },
      {
        path: RoutesConstant.POPOVER_DEMO,
        loadComponent: () => import('src/demo/popover-demo/popover-demo.component').then(m => m.PopoverDemoComponent),
      },
      {
        path: RoutesConstant.TOOLTIP_DEMO,
        loadComponent: () => import('src/demo/tooltip-demo/tooltip-demo.component').then(m => m.TooltipDemoComponent),
      },
      {
        path: '**',
        loadComponent: () => import('src/pages/404/404.component').then(m => m.Page404Component),
      }
    ],
  },
];
