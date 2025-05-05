import { CommonModule } from "@angular/common";
import { Component, signal } from "@angular/core";
import { ITooltipFunctionControl } from "src/shared/components/tooltip/interfaces/tooltip.interface";
import { TooltipComponent } from "src/shared/components/tooltip/tooltip.component";

@Component({
  selector: 'app-tooltip-demo',
  templateUrl: './tooltip-demo.component.html',
  styleUrls: ['./tooltip-demo.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    TooltipComponent
  ],
})
export class TooltipDemoComponent {
  private tooltipControl = signal<ITooltipFunctionControl | null>(null);

  constructor() { }

  protected onFunctionControl(control: ITooltipFunctionControl): void {
    this.tooltipControl.set(control);
  }

  protected showTooltip(): void {
    this.tooltipControl()?.showTooltip();
  }

  protected hideTooltip(): void {
    this.tooltipControl()?.hideTooltip();
  }

  protected updatePosition(position: 'top' | 'right' | 'bottom' | 'left'): void {
    this.tooltipControl()?.updatePosition(position);
  }
}
