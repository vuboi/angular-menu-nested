import { Component } from "@angular/core";
import { TooltipComponent } from "src/shared/components/tooltip/tooltip.component";

@Component({
  selector: 'app-tooltip-demo',
  templateUrl: './tooltip-demo.component.html',
  styleUrls: ['./tooltip-demo.component.scss'],
  standalone: true,
  imports: [
    TooltipComponent
  ],
})

export class TooltipDemoComponent {
  constructor() { }

}
