import { TemplateRef } from "@angular/core";

export interface ITooltipConfig {
  content?: string | TemplateRef<unknown>;
  position?: 'top' | 'right' | 'bottom' | 'left';
  showArrow?: boolean;
  offset?: number;
  zIndex?: number;
  disableClose?: boolean;
  timeout?: number;  // Delay before tooltip closes when mouse leave
  alwayShow?: boolean; // If true, tooltip alway show when hover, if false, tooltip only show tooltip when hover and text ellipsis
  classContent?: string;
  classStr?: string;
}
