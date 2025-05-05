import { Component, signal } from "@angular/core";
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
  private functionControlPopover = signal<IPopoverFunctionControl | null>(null);
  private customPopoverControl = signal<IPopoverFunctionControl | null>(null);

  constructor() { }

  protected handlerFunctionControl(event: IPopoverFunctionControl): void {
    this.functionControlPopover.set(event);
  }

  protected handlerCustomPopoverControl(event: IPopoverFunctionControl): void {
    this.customPopoverControl.set(event);
  }

  protected openPopover(): void {
    this.functionControlPopover()?.openPopover();
  }

  protected closePopover(): void {
    this.functionControlPopover()?.closePopover();
  }

  protected togglePopover(): void {
    this.functionControlPopover()?.togglePopover();
  }

  protected closeCustomPopover(event: Event): void {
    event.stopPropagation();
    this.customPopoverControl()?.closePopover();
  }
}
