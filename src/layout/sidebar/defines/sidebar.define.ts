import { ChartColumnIcon, LayoutDashboardIcon, LogsIcon, UsersRoundIcon } from "lucide-angular";
import { RoutesConstant } from "src/shared/constant/routes.constant";
import { IMenuItem } from "../interfaces/sidebar.interface";

export const sidebarMenu = (): IMenuItem[] => {
  // TODO: Name will be update with translation i18n like: i18n_dashboard_menu, i18n_user_menu
  return [
    {
      id: '1abcz3431',
      name: 'Dashboard',
      icon: LayoutDashboardIcon,
      children: [
        {
          id: '1abcz34311',
          name: 'Category',
          icon: ChartColumnIcon,
          children: [
            {
              id: '1abcz343111',
              name: 'Product',
              icon: ChartColumnIcon,
              children: [
                {
                  id: '1abcz3431111',
                  name: 'Product Detail',
                  icon: ChartColumnIcon,
                  path: RoutesConstant.PRODUCT_DETAIL,
                },
                {
                  id: '1abcz3431112',
                  name: 'Order Detail',
                  icon: ChartColumnIcon,
                  path: RoutesConstant.ORDER_DETAIL
                },
                {
                  id: '1abcz3431113',
                  name: 'User Detail',
                  icon: ChartColumnIcon,
                  path: RoutesConstant.USER_DETAIL
                }
              ]
            }
          ]
        },
        {
          id: '1abcz34312',
          name: 'Order',
          icon: LogsIcon,
          path: RoutesConstant.ORDER,
        }
      ]
    },
    {
      id: '1abcz3431zzz',
      name: 'Home',
      icon: LayoutDashboardIcon,
      children: [
        {
          id: '1abcz34311cvsfdf',
          name: 'Category',
          icon: ChartColumnIcon,
          path: RoutesConstant.HOME,
        }
      ]
    },
    {
      id: '1abcz3432',
      name: 'User',
      icon: UsersRoundIcon,
      path: RoutesConstant.USER,
    },
    {
      id: '1abcz343366',
      name: 'Product',
      icon: UsersRoundIcon,
      path: RoutesConstant.PRODUCT,
    },
    {
      id: '1abcz343367',
      name: 'Popover Demo',
      icon: ChartColumnIcon,
      path: RoutesConstant.POPOVER_DEMO,
    },
    {
      id: '1abcz343368xx',
      name: 'Tooltip Demo',
      icon: ChartColumnIcon,
      path: RoutesConstant.TOOLTIP_DEMO,
    }
  ]
}
