/* eslint-disable @typescript-eslint/no-unused-expressions */
import { Pipe, PipeTransform } from "@angular/core";
import { IMenuItem } from "../interfaces/sidebar.interface";

@Pipe({
  name: "calculatorMaxHeightSubMenu",
  standalone: true
})

export class CalculatorMaxHeightSubMenuPipe implements PipeTransform {
  transform(expandedMenu: boolean, menu: IMenuItem, keyFetchSubMenu: string): number {
    keyFetchSubMenu;
    if (!expandedMenu) {
      return 0;
    }

    return this.calculateHeightChildren(menu);
  }

  private calculateHeightChildren(menu: IMenuItem): number {
    if (!menu.expanded || !menu.children?.length) {
      return 0;
    }

    let height = 0;
    height += menu.children.length * 45;
    menu.children.forEach(child => {
      height += this.calculateHeightChildren(child);
    });

    return height;
  }
}
