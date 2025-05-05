import { ConnectedOverlayPositionChange, ConnectionPositionPair, Overlay, OverlayRef } from "@angular/cdk/overlay";
import { TemplatePortal } from "@angular/cdk/portal";
import { CommonModule } from "@angular/common";
import { AfterViewInit, ChangeDetectionStrategy, Component, DestroyRef, ElementRef, inject, input, signal, TemplateRef, viewChild, ViewContainerRef } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { explicitEffect } from "ngxtension/explicit-effect";
import { fromEvent, Subscription, timer } from "rxjs";
import { DEFAULT_TOOLTIP_CONFIG } from "./defines/tooltip.define";
import { ITooltipConfig } from "./interfaces/tooltip.interface";

@Component({
  selector: "app-tooltip",
  templateUrl: "./tooltip.component.html",
  styleUrl: "./tooltip.component.scss",
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TooltipComponent implements AfterViewInit {
  public config = input<ITooltipConfig, ITooltipConfig>(DEFAULT_TOOLTIP_CONFIG(), {
    transform: (config) => {
      this.getTooltipContent(config);
      return { ...DEFAULT_TOOLTIP_CONFIG(), ...config };
    }
  });

  protected tooltipStr = signal<string>('');
  protected tooltipTemplate = signal<TemplateRef<unknown> | null>(null);
  private subHiddenTooltip: Subscription | null = null;
  private overlayRef = signal<OverlayRef | null>(null);
  private hasTextEllipsis = signal<boolean>(false);

  private overlay = inject(Overlay);
  private viewContainerRef = inject(ViewContainerRef);
  private destroyRef = inject(DestroyRef);

  private tooltipContent = viewChild.required<TemplateRef<unknown>>("tooltipContent");
  private tooltipTrigger = viewChild.required<ElementRef>('tooltipTrigger');

  constructor() {
    explicitEffect([this.overlayRef], ([overlayRef]) =>
      this.setupTooltipHoverListeners(overlayRef)
    );
  }

  ngAfterViewInit(): void {
    fromEvent(this.tooltipTrigger().nativeElement, 'mouseenter')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.clearSubHiddenTimeout();
        this.handleShowTooltip();
      });

    fromEvent(this.tooltipTrigger().nativeElement, 'mouseleave')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (this.overlayRef()) {
          this.scheduleHideTooltip();
        }
      });

    fromEvent(window, 'resize')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (this.overlayRef()) {
          this.autoAdjustArrowAlignment(this.overlayRef()?.overlayElement.querySelector('.tooltip-content') as HTMLElement);
        }
      });

    this.checkForTextEllipsis(this.tooltipTrigger().nativeElement);
  }

  private getTooltipContent(config: ITooltipConfig): void {
    if (typeof config.content === "string") {
      this.tooltipStr.set(config.content as string);
      this.tooltipTemplate.set(null);
      return;
    }

    this.tooltipStr.set('');
    this.tooltipTemplate.set(config.content as TemplateRef<unknown>);
  }

  private clearSubHiddenTimeout(): void {
    if (this.subHiddenTooltip) {
      this.subHiddenTooltip.unsubscribe();
      this.subHiddenTooltip = null;
    }
  }

  private scheduleHideTooltip(): void {
    this.clearSubHiddenTimeout();
    const { timeout = 0, disableClose } = this.config() || {};
    if (disableClose) {
      return;
    }

    if (timeout > 0) {
      this.subHiddenTooltip = timer(timeout)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() => {
          this.handleHideTooltip();
        });
      return;
    }

    this.handleHideTooltip();
  }

  private setupTooltipHoverListeners(overlayRef: OverlayRef | null): void {
    if (overlayRef === null) {
      return;
    }

    const tooltipElement = this.overlayRef()?.overlayElement.querySelector('.tooltip-content');
    if (!tooltipElement) {
      return;
    }

    const mouseEnter$ = fromEvent<MouseEvent>(tooltipElement, 'mouseenter')
      .pipe(takeUntilDestroyed(this.destroyRef));
    const mouseLeave$ = fromEvent<MouseEvent>(tooltipElement, 'mouseleave')
      .pipe(takeUntilDestroyed(this.destroyRef));

    const mouseEnterSubscription = mouseEnter$.subscribe(() => {
      this.clearSubHiddenTimeout();
      mouseEnterSubscription.unsubscribe();
    });

    const mouseLeaveSubscription = mouseLeave$.subscribe(() => {
      this.scheduleHideTooltip();
      mouseLeaveSubscription.unsubscribe();
    });
  }

  private setTooltipClasses(tooltipElement: HTMLElement, positionCurrent?: string): void {
    const { position, showArrow, zIndex } = this.config() || {};
    const _position = () => {
      if (positionCurrent === 'end') {
        positionCurrent = 'right';
      }
      if (positionCurrent === 'start') {
        positionCurrent = 'left';
      }
      return positionCurrent || position;
    };

    const zIndexClass = `z-${zIndex}`;
    tooltipElement.classList.add(zIndexClass);
    const classList = tooltipElement.classList;
    classList.forEach((className) => {
      if (['position-top', 'position-bottom', 'position-left', 'position-right'].includes(className)) {
        classList.remove(className);
      }
    });

    tooltipElement.classList.add(`position-${_position()}`);

    if (showArrow) {
      tooltipElement.classList.add('has-arrow');
    }

    this.autoAdjustArrowAlignment(tooltipElement, positionCurrent);
  }

  private autoAdjustArrowAlignment(tooltipElement: HTMLElement, positionCurrent?: string): void {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const triggerRect = this.tooltipTrigger().nativeElement.getBoundingClientRect();
    const tooltipRect = tooltipElement.getBoundingClientRect();
    const edgeThreshold = 50;
    const position = positionCurrent || this.config().position;

    if (position === 'top' || position === 'bottom') {
      const arrowElement = tooltipElement.querySelector('.tooltip-arrow') as HTMLElement;
      if (!arrowElement) return;

      const triggerCenter = triggerRect.left + (triggerRect.width / 2);
      const tooltipLeft = tooltipRect.left;
      const arrowPosition = triggerCenter - tooltipLeft;
      const minPosition = 12;
      const maxPosition = tooltipRect.width - 12;
      const constrainedPosition = Math.max(minPosition, Math.min(arrowPosition, maxPosition));
      arrowElement.style.left = `${constrainedPosition}px`;

      tooltipElement.classList.remove('align-start', 'align-end');
      if (triggerRect.right > viewportWidth - edgeThreshold) {
        tooltipElement.classList.add('align-end');
        return;
      }

      if (triggerRect.left < edgeThreshold) {
        tooltipElement.classList.add('align-start');
      }
    }

    if (position === 'left' || position === 'right') {
      const arrowElement = tooltipElement.querySelector('.tooltip-arrow') as HTMLElement;
      if (!arrowElement) return;

      const triggerCenter = triggerRect.top + (triggerRect.height / 2);
      const tooltipTop = tooltipRect.top;
      const arrowPosition = triggerCenter - tooltipTop;
      const minPosition = 12;
      const maxPosition = tooltipRect.height - 12;
      const constrainedPosition = Math.max(minPosition, Math.min(arrowPosition, maxPosition));
      arrowElement.style.top = `${constrainedPosition}px`;

      tooltipElement.classList.remove('align-start', 'align-end');
      if (triggerRect.bottom > viewportHeight - edgeThreshold) {
        tooltipElement.classList.add('align-end');
        return;
      }

      if (triggerRect.top < edgeThreshold) {
        tooltipElement.classList.add('align-start');
      }
    }
  }

  private handleShowTooltip(): void {
    const { content, position, offset = 0, alwayShow } = this.config() || {};
    if (this.overlayRef() || !alwayShow && !this.hasTextEllipsis()) {
      return;
    }

    const positions: ConnectionPositionPair[] = [];

    switch (position) {
      case "top":
        positions.push(
          {
            originX: "center",
            originY: "top",
            overlayX: "center",
            overlayY: "bottom",
            offsetY: -offset,
          },
          {
            originX: "center",
            originY: "bottom",
            overlayX: "center",
            overlayY: "top",
            offsetY: offset,
          }
        );
        break;
      case "bottom":
        positions.push(
          {
            originX: "center",
            originY: "bottom",
            overlayX: "center",
            overlayY: "top",
            offsetY: offset,
          },
          {
            originX: "center",
            originY: "top",
            overlayX: "center",
            overlayY: "bottom",
            offsetY: -offset,
          }
        );
        break;
      case "left":
        positions.push(
          {
            originX: "start",
            originY: "center",
            overlayX: "end",
            overlayY: "center",
            offsetX: -offset,
          },
          {
            originX: "end",
            originY: "center",
            overlayX: "start",
            overlayY: "center",
            offsetX: offset,
          }
        );
        break;
      case "right":
        positions.push(
          {
            originX: "end",
            originY: "center",
            overlayX: "start",
            overlayY: "center",
            offsetX: offset,
          },
          {
            originX: "start",
            originY: "center",
            overlayX: "end",
            overlayY: "center",
            offsetX: -offset,
          }
        );
        break;
      default:
        positions.push({
          originX: "center",
          originY: "bottom",
          overlayX: "center",
          overlayY: "top",
          offsetY: offset,
        });
        break;
    }

    const positionStrategy = this.overlay
      .position()
      .flexibleConnectedTo(this.tooltipTrigger())
      .withPositions(positions)
      .withPush(true);

    positionStrategy.positionChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((event: ConnectedOverlayPositionChange) => {
        const { originX, originY } = event.connectionPair;
        const tooltipContent = this.overlayRef()?.overlayElement.querySelector('.tooltip-content');
        if (tooltipContent) {
          const positionCurrent = ['top', 'bottom'].includes(this.config().position || 'top') ? originY : originX;
          this.setTooltipClasses(tooltipContent as HTMLElement, positionCurrent);
        }
      });

    const overlayConfig = {
      positionStrategy,
      hasBackdrop: false,
      scrollStrategy: this.overlay.scrollStrategies.reposition(),
    };

    this.overlayRef.set(this.overlay.create(overlayConfig));

    if (typeof content === "string") {
      const tooltipPortal = new TemplatePortal(this.tooltipContent(), this.viewContainerRef);
      this.overlayRef()?.attach(tooltipPortal);
      return;
    }

    if (content instanceof TemplateRef) {
      const tooltipPortal = new TemplatePortal(this.tooltipContent(), this.viewContainerRef);
      this.overlayRef()?.attach(tooltipPortal);
    }
  }

  private handleHideTooltip(): void {
    if (this.overlayRef()) {
      const tooltipContent = this.overlayRef()?.overlayElement.querySelector('.tooltip-content');
      if (tooltipContent) {
        tooltipContent.classList.add('closing');
      }

      timer(150)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() => {
          this.overlayRef()?.detach();
          this.overlayRef()?.dispose();
          this.overlayRef.set(null);
        });
    }
  }

  private checkForTextEllipsis(element: HTMLElement): void {
    const targetElement = this.findTextElement(element);
    if (targetElement) {
      const isEllipsisActive = targetElement.offsetWidth < targetElement.scrollWidth;
      this.hasTextEllipsis.set(isEllipsisActive);
      return;
    }

    this.hasTextEllipsis.set(false);
  }

  private findTextElement(element: HTMLElement): HTMLElement | null {
    if (element.childElementCount === 0 && element.textContent?.trim()) {
      return element;
    }

    const style = window.getComputedStyle(element);
    if (
      style.textOverflow === 'ellipsis' ||
      style.overflow === 'hidden' ||
      style.whiteSpace === 'nowrap'
    ) {
      return element;
    }

    for (let i = 0; i < element.children.length; i++) {
      const child = element.children[i] as HTMLElement;
      const textElement = this.findTextElement(child);
      if (textElement) {
        return textElement;
      }
    }

    return null;
  }
}
