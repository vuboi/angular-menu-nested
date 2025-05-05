import { TemplateRef } from "@angular/core";

export type TYPE_TOOLTIP_POSITION = 'top' | 'right' | 'bottom' | 'left';
export interface ITooltipConfig {
  content?: string | TemplateRef<unknown>;
  position?: TYPE_TOOLTIP_POSITION;
  showArrow?: boolean;
  offset?: number;
  zIndex?: number;
  disableClose?: boolean;
  timeout?: number;  // Delay before tooltip closes when mouse leave
  alwayShow?: boolean; // If true, tooltip alway show when hover, if false, tooltip only show tooltip when hover and text ellipsis
  classContent?: string;
  classStr?: string;
}

export interface ITooltipFunctionControl {
  updatePosition: (position: TYPE_TOOLTIP_POSITION) => void,
  showTooltip: () => void,
  hideTooltip: () => void,
}
