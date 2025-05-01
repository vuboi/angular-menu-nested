import { CommonModule, NgTemplateOutlet } from "@angular/common";
import { ChangeDetectionStrategy, Component, inject, OnDestroy, OnInit, signal } from "@angular/core";
import { Router, RouterModule } from "@angular/router";
import { ChevronDownIcon, ChevronRightIcon, ChevronsLeftIcon, ChevronsRightIcon, LucideAngularModule } from "lucide-angular";
import { explicitEffect } from 'ngxtension/explicit-effect';
import { uuid } from "src/shared/helpers";
import { PopoverComponent } from "../../shared/components/popover";
import { IPopoverFunctionControl, IPopoverOptions } from "../../shared/components/popover/interfaces";
import { sidebarMenu } from "./defines/sidebar.define";
import { IMenuItem } from "./interfaces/sidebar.interface";
import { CalculatorMaxHeightSubMenuPipe } from "./pipes/calculator-max-height-sub-menu.pipe";

@Component({
  selector: "app-sidebar",
  templateUrl: "./sidebar.component.html",
  styleUrl: "./sidebar.component.scss",
  standalone: true,
  imports: [
    RouterModule,
    CommonModule,
    NgTemplateOutlet,
    LucideAngularModule,
    PopoverComponent,
    CalculatorMaxHeightSubMenuPipe
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})

export class SidebarComponent implements OnInit, OnDestroy {
  // TODO: Viết component tooltip dùng cho text bị cát ....
  protected readonly chevronsLeftIcon = ChevronsLeftIcon;
  protected readonly chevronsRightIcon = ChevronsRightIcon;
  protected readonly chevronRightIcon = ChevronRightIcon;
  protected readonly chevronDownIcon = ChevronDownIcon;

  protected popoverOptions = signal<IPopoverOptions>(this.getPopoverOptions());
  protected sideCollapsed = signal<boolean>(true);
  protected menus = signal<IMenuItem[]>(this.buildMenus());
  protected menuActive = signal<IMenuItem | undefined>(undefined);
  protected popoverControls = signal<Map<string, IPopoverFunctionControl>>(new Map());
  protected keyFetchSubMenu = signal<string>('');

  private router = inject(Router);

  constructor() {
    explicitEffect([this.sideCollapsed], ([isCollapsed]) => {
      if (isCollapsed) {
        this.popoverOptions.update((options) => ({ ...options, disabledOpen: false }));
        return;
      }

      this.popoverOptions.update((options) => ({ ...options, disabledOpen: true }));
    });
  }

  ngOnInit(): void {
    this.setActiveRoute();
  }

  private buildMenus(): IMenuItem[] {
    const menusMap: IMenuItem[] = [];
    const flatMapMenus = (menus: IMenuItem[], level = 1, parent?: IMenuItem): void => {
      for (const menu of menus) {
        menu.level = level;
        if (parent) {
          menu.parents = { ...parent.parents, [parent.id]: parent };
        }

        if (menu.children?.length) {
          menu.expanded = false;
        }

        menu.hidden = menu.level > 1;
        menusMap.push(menu);
        if (menu.children?.length) {
          flatMapMenus(menu.children, level + 1, menu);
        }
      }
    }

    flatMapMenus(sidebarMenu());
    return menusMap;
  }

  private setStateParent(callback: (parent: IMenuItem) => void): void {
    const menuActive = this.menuActive();
    if (!menuActive) {
      return;
    }

    Object.values(menuActive.parents || {}).forEach(parent => {
      callback(parent);
    });
  }

  private setActiveRoute(): void {
    const activeRoute = this.router.url;
    const menuActive = this.menus().find(menu => `/${menu.path}` === activeRoute);
    if (!menuActive) {
      return;
    }

    menuActive.active = true;
    this.menuActive.set(menuActive);
    if (this.sideCollapsed()) {
      this.setStateParent((parent) => {
        if (parent.level === 1) {
          parent.active = true;
        }
      })
    }

    this.setExpandedMenu();
  }

  private setExpandedMenu(): void {
    this.setStateParent((parent) => {
      parent.expanded = true;
      parent.hidden = false;
      this.setShowMenu([parent]);
    })
  }

  private setShowMenu(menuItems: IMenuItem[]): void {
    menuItems.forEach(menu => {
      menu.hidden = false;
      menu.children?.forEach(child => this.setShowMenu([child]));
    });
  }

  protected setHiddenMenu(menuItem: IMenuItem, shouldHide: boolean): void {
    const hiddenMenu = (menu: IMenuItem, hidden: boolean) => {
      if (menu.id !== menuItem.id) {
        menu.hidden = hidden;
      }

      if (hidden) {
        menu.children?.forEach(child => hiddenMenu(child, hidden));
        return;
      }

      if (menu.expanded) {
        menu.children?.forEach(child => hiddenMenu(child, hidden));
      }
    };

    hiddenMenu(menuItem, shouldHide);
  }

  protected handlerClickMenuItem(event: Event, menuItem: IMenuItem): void {
    event.stopPropagation();
    if (menuItem.children?.length) {
      menuItem.expanded = !menuItem.expanded;
    }

    const doMenuExpandAction = () => {
      if (menuItem.expanded) {
        this.setHiddenMenu(menuItem, false);
        return;
      }

      setTimeout(() => {
        if (!menuItem.expanded) {
          this.setHiddenMenu(menuItem, true);
        }
      }, 300);
    }

    doMenuExpandAction();
    this.setStateParent((parent) => parent.active = false);
    this.navigateToMenuItem(menuItem);
    this.setStateParent((parent) => {
      if (parent.level === 1 && this.sideCollapsed()) {
        parent.active = true;
      }
    });
  }

  protected navigateToMenuItem(menuItem: IMenuItem): void {
    if (menuItem.children?.length || !menuItem.path) {
      return;
    }

    const menuActive = this.menuActive();
    if (menuActive) {
      menuActive.active = false;
    }

    menuItem.active = true;
    this.menuActive.set(menuItem);
    this.router.navigate([menuItem.path]);
  }

  protected handlerToggleSidebar(event: Event): void {
    event.stopPropagation();
    this.sideCollapsed.update((value) => !value);
    if (this.sideCollapsed()) {
      this.setStateParent((parent) => {
        if (parent.level === 1) {
          parent.active = true;
        }
      });

      return;
    }

    this.setStateParent((parent) => {
      parent.active = false;
      this.setExpandedMenu();
    });
  }

  protected handlerFunctionControl(menuId: string, control: IPopoverFunctionControl): void {
    this.popoverControls.update((controls) => {
      controls.set(menuId, control);
      return controls;
    });
  }

  private getPopoverOptions(): IPopoverOptions {
    return {
      position: 'right',
      showArrow: false,
      offset: 5,
      arrowAlignment: 'start',
      hasBackdrop: false,
      blockInteraction: false,
      disableClose: false
    };
  }

  protected handlerToggleMenuPopover(event: Event, menu: IMenuItem): void {
    event.stopPropagation();
    if (!this.sideCollapsed() || !menu.children?.length) {
      return;
    }

    const control = this.popoverControls().get(menu.id);
    if (control) {
      control.togglePopover();
    }
  }

  protected handlerToggleSubMenu(event: Event, child: IMenuItem): void {
    event.stopPropagation();
    this.handlerClickMenuItem(event, child);
    this.keyFetchSubMenu.set(uuid());
  }

  private collapseAllSubmenus(items: IMenuItem[]): void {
    items.forEach(item => {
      item.expanded = false;
      if (item.children?.length) {
        this.collapseAllSubmenus(item.children);
      }
    });
  }

  ngOnDestroy(): void {
    this.menuActive.set(undefined);
    this.menus.set([]);
  }
}
