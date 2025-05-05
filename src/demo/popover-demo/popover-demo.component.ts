import { Component } from "@angular/core";
import { IPopoverFunctionControl } from "src/shared/components/popover/interfaces";
import { PopoverComponent } from "src/shared/components/popover/popover.component";

@Component({
  selector: "app-popover-demo",
  templateUrl: "./popover-demo.component.html",
  styleUrl: "./popover-demo.component.scss",
  standalone: true,
  imports: [
    PopoverComponent,
  ],
})
export class PopoverDemoComponent {
  private functionControlPopover: IPopoverFunctionControl | undefined;

  constructor() { }

  protected handlerFunctionControl(event: IPopoverFunctionControl): void {
    this.functionControlPopover = event;
  }

  protected handlerClosePopover(event: Event): void {
    event.stopPropagation();
    this.functionControlPopover?.closePopover();
  }
}
