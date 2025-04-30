/* eslint-disable @typescript-eslint/no-explicit-any */
import { TemplateRef } from '@angular/core';

export type TYPE_POPOVER_POSITION = 'top' | 'right' | 'bottom' | 'left';
export type TYPE_ARROW_ALIGNMENT = 'center' | 'start' | 'end';
export type TYPE_VERTICAL_ALIGNMENT = 'top' | 'center' | 'bottom';

export interface IPopoverOptions {
  content?: TemplateRef<any>;
  position?: TYPE_POPOVER_POSITION;
  hasBackdrop?: boolean;
  disableClose?: boolean;
  disabledOpen?: boolean;
  blockInteraction?: boolean;
  showArrow?: boolean;
  arrowAlignment?: TYPE_ARROW_ALIGNMENT;
  trigger?: 'click' | 'hover';
  hoverRemoveDelay?: number;
  zIndex?: number;
  offset?: number;
}

export interface IPopoverFunctionControl {
  openPopover: () => void;
  closePopover: () => void;
  togglePopover: () => void;
}

export const DEFAULT_POPOVER_OPTIONS: IPopoverOptions = {
  position: 'bottom',
  hasBackdrop: true,
  disableClose: false,
  disabledOpen: false,
  blockInteraction: true,
  showArrow: true,
  arrowAlignment: 'center',
  trigger: 'click',
  hoverRemoveDelay: 0,
  zIndex: 1000,
};
