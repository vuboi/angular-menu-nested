import { ITooltipConfig } from "../interfaces/tooltip.interface";

export const DEFAULT_TOOLTIP_CONFIG = (): ITooltipConfig => {
  return {
    content: 'Tooltip content !!!',
    position: 'top',
    showArrow: true,
    offset: 8,
    zIndex: 1000,
    disableClose: false,
    timeout: 100,
    alwayShow: true,
    classContent: '',
    classStr: '',
  }
}
