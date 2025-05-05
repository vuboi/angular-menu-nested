import { ConnectedOverlayPositionChange, ConnectionPositionPair, FlexibleConnectedPositionStrategy, Overlay, OverlayRef } from "@angular/cdk/overlay";
import { TemplatePortal } from "@angular/cdk/portal";
import { NgTemplateOutlet } from "@angular/common";
import { AfterViewInit, ChangeDetectionStrategy, Component, computed, DestroyRef, ElementRef, inject, input, OnDestroy, OnInit, output, signal, TemplateRef, viewChild, ViewContainerRef } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { explicitEffect } from "ngxtension/explicit-effect";
import { fromEvent, Subscription, throttleTime, timer } from "rxjs";
import { DEFAULT_TOOLTIP_CONFIG } from "./defines/tooltip.define";
import { ITooltipConfig, ITooltipFunctionControl, TYPE_TOOLTIP_POSITION } from "./interfaces/tooltip.interface";

@Component({
  selector: "app-tooltip",
  templateUrl: "./tooltip.component.html",
  styleUrl: "./tooltip.component.scss",
  standalone: true,
  imports: [NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TooltipComponent implements AfterViewInit, OnDestroy, OnInit {
  public config = input<ITooltipConfig, ITooltipConfig>(DEFAULT_TOOLTIP_CONFIG(), {
    transform: (config) => {
      this.getTooltipContent(config);
      return { ...DEFAULT_TOOLTIP_CONFIG(), ...config };
    }
  });
  public functionControl = output<ITooltipFunctionControl>();

  protected tooltipStr = signal<string>('');
  protected tooltipTemplate = signal<TemplateRef<unknown> | null>(null);
  private subscriptions = new Subscription();
  private overlayRef = signal<OverlayRef | null>(null);
  private hasTextEllipsis = signal<boolean>(false);
  private openTooltipWithControl = signal<boolean>(false);
  private tooltipElement = computed(() => this.overlayRef()?.overlayElement.querySelector('.tooltip-content') as HTMLElement)

  private overlay = inject(Overlay);
  private viewContainerRef = inject(ViewContainerRef);
  private destroyRef = inject(DestroyRef);

  private tooltipContent = viewChild.required<TemplateRef<unknown>>("tooltipContent");
  private tooltipTrigger = viewChild.required<ElementRef>('tooltipTrigger');

  constructor() {
    explicitEffect([this.overlayRef], () =>
      this.setupTooltipHoverListeners()
    );
  }

  ngOnInit(): void {
    this.emitFunctionControl();
  }


  ngAfterViewInit(): void {
    fromEvent(this.tooltipTrigger().nativeElement, 'mouseenter').pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.handleShowTooltip());

    fromEvent(this.tooltipTrigger().nativeElement, 'mouseleave').pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.scheduleRemoveTooltip());

    fromEvent(window, 'resize').pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.autoAdjustArrowAlignment());

    this.checkForTextEllipsis();
    this.hideTooltipWhenScroll();
  }

  private emitFunctionControl(): void {
    this.functionControl.emit({
      showTooltip: this.showTooltipControl.bind(this),
      hideTooltip: this.handleHideTooltip.bind(this),
      updatePosition: (position: TYPE_TOOLTIP_POSITION) =>
        this.updateTooltipPosition(undefined, position, true)
    });
  }

  private showTooltipControl(): void {
    if (this.config().disabled) {
      return;
    }

    this.openTooltipWithControl.set(true);
    this.handleShowTooltip();
    this.hideTooltipWhenClickOutside();
    timer(100).pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.openTooltipWithControl.set(false));

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


  private scheduleRemoveTooltip(): void {
    const { timeout = 0, disableClose } = this.config() || {};
    if (disableClose || !this.overlayRef()) {
      return;
    }

    if (timeout > 0) {
      const hideSubscription = timer(timeout).pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() => this.handleHideTooltip());
      this.subscriptions.add(hideSubscription);
      return;
    }

    this.handleHideTooltip();
  }

  private setupTooltipHoverListeners(): void {
    if (!this.tooltipElement()) {
      return;
    }

    const mouseEnter$ = fromEvent<MouseEvent>(this.tooltipElement(), 'mouseenter')
      .pipe(takeUntilDestroyed(this.destroyRef));
    const mouseLeave$ = fromEvent<MouseEvent>(this.tooltipElement(), 'mouseleave')
      .pipe(takeUntilDestroyed(this.destroyRef));

    const mouseEnterSubscription = mouseEnter$.subscribe(() => {
      mouseEnterSubscription.unsubscribe();
    });

    const mouseLeaveSubscription = mouseLeave$.subscribe(() => {
      this.scheduleRemoveTooltip();
      mouseLeaveSubscription.unsubscribe();
    });
  }

  private setTooltipClasses(positionCurrent?: TYPE_TOOLTIP_POSITION): void {
    if (!this.tooltipElement()) {
      return;
    }

    const { position: positionConfig, showArrow, zIndex } = this.config() || {};
    const position = positionCurrent || positionConfig;
    const classList = this.tooltipElement().classList;
    classList.forEach((className) => {
      if (['position-top', 'position-bottom', 'position-left', 'position-right'].includes(className)) {
        classList.remove(className);
      }
    });

    this.tooltipElement().classList.add(`position-${position}`);
    const zIndexClass = `z-${zIndex}`;
    this.tooltipElement().classList.add(zIndexClass);

    if (showArrow) {
      this.tooltipElement().classList.add('has-arrow');
    }

    this.autoAdjustArrowAlignment(positionCurrent);
  }

  private autoAdjustArrowAlignment(positionCurrent?: string): void {
    if (!this.overlayRef() || !this.tooltipElement()) {
      return;
    }

    const tooltipElement = this.tooltipElement();
    const triggerRect = this.tooltipTrigger().nativeElement.getBoundingClientRect();
    const tooltipRect = tooltipElement.getBoundingClientRect();
    const position = positionCurrent || this.config().position;

    tooltipElement.classList.remove('align-start', 'align-end');
    if ((position === 'left' || position === 'right') && tooltipRect.height < 60) {
      tooltipElement.classList.add('align-center');
      return;
    }

    if ((position === 'top' || position === 'bottom') && tooltipRect.width < 60) {
      tooltipElement.classList.add('align-center');
      return;
    }

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const edgeThreshold = 50;

    if (position === 'top' || position === 'bottom') {
      if (triggerRect.right > viewportWidth - edgeThreshold) {
        tooltipElement.classList.add('align-end');
      }

      if (triggerRect.left < edgeThreshold) {
        tooltipElement.classList.add('align-start');
      }
    }

    if (position === 'left' || position === 'right') {
      if (triggerRect.bottom > viewportHeight - edgeThreshold) {
        tooltipElement.classList.add('align-end');
      }

      if (triggerRect.top < edgeThreshold) {
        tooltipElement.classList.add('align-start');
      }
    }
  }

  private handleShowTooltip(): void {
    const { content, position, alwayShow, disabled } = this.config() || {};
    if (this.overlayRef() || !alwayShow && !this.hasTextEllipsis() || disabled) {
      return;
    }

    const positions: ConnectionPositionPair[] = this.getPositionsForDirection(position as TYPE_TOOLTIP_POSITION);
    const positionStrategy = this.overlay
      .position()
      .flexibleConnectedTo(this.tooltipTrigger())
      .withPositions(positions)
      .withPush(true);

    positionStrategy.positionChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((event) => this.updateTooltipPosition(event));

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

  private hideTooltipWhenClickOutside(): void {
    timer(0)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        const clickSubscription = fromEvent<MouseEvent>(document, 'click')
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe((event) => {
            if (!this.overlayRef()) {
              clickSubscription.unsubscribe();
              return;
            }

            if (this.openTooltipWithControl()) {
              return;
            }

            const tooltipElement = this.tooltipElement();
            const triggerElement = this.tooltipTrigger()?.nativeElement;
            const clickedInside = tooltipElement?.contains(event.target as Node) || triggerElement?.contains(event.target as Node);
            if (!clickedInside && !this.config().disableClose) {
              this.handleHideTooltip();
              this.openTooltipWithControl.set(false);
              clickSubscription.unsubscribe();
            }
          });
      });
  }

  private hideTooltipWhenScroll(): void {
    let element: HTMLElement | null = this.tooltipTrigger().nativeElement;
    const scrollableParents: HTMLElement[] = [];

    while (element) {
      const style = window.getComputedStyle(element);
      if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
        scrollableParents.push(element);
      }
      element = element.parentElement;
    }

    scrollableParents.push(document.documentElement);
    scrollableParents.forEach(parent => {
      fromEvent(parent, 'scroll')
        .pipe(
          throttleTime(1000),
          takeUntilDestroyed(this.destroyRef))
        .subscribe((e) => {
          this.handleHideTooltip();
        });
    });
  }

  private updateTooltipPosition(event?: ConnectedOverlayPositionChange, position?: TYPE_TOOLTIP_POSITION, forceApply = false): void {
    if (!this.overlayRef()) {
      return;
    }

    if (forceApply) {
      this.openTooltipWithControl.set(true);
      const positionStrategy = this.overlayRef()?.getConfig().positionStrategy as FlexibleConnectedPositionStrategy;
      if (positionStrategy && 'apply' in positionStrategy) {
        void this.tooltipElement()?.offsetHeight;
        const newPosition = (position || this.config().position) as TYPE_TOOLTIP_POSITION;
        const positions: ConnectionPositionPair[] = this.getPositionsForDirection(newPosition);

        if ('withPositions' in positionStrategy) {
          positionStrategy.withPositions(positions);
          positionStrategy.apply();
          this.setTooltipClasses(newPosition);
          this.autoAdjustArrowAlignment(newPosition);
          const subUpdatePosition = timer(50)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(() => {
              this.openTooltipWithControl.set(false);
              subUpdatePosition.unsubscribe();
            });
        }
      }

      return;
    }

    if (event) {
      const { originX, originY } = event.connectionPair || {};
      const positionOverlay = ['top', 'bottom'].includes(this.config().position || 'top') ? originY : originX;
      const objPosition: Record<string, string> = { start: 'left', end: 'right' };
      const positionCurrent = (objPosition[positionOverlay] || positionOverlay) as TYPE_TOOLTIP_POSITION;
      this.setTooltipClasses(positionCurrent);
      return;
    }

    this.setTooltipClasses(position || this.config().position);
    this.autoAdjustArrowAlignment();
  }

  private getPositionsForDirection(position: TYPE_TOOLTIP_POSITION): ConnectionPositionPair[] {
    const { offset = 0 } = this.config();
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

    return positions;
  }

  private handleHideTooltip(): void {
    if (!this.overlayRef()) {
      return;
    }

    this.subscriptions.unsubscribe();
    this.subscriptions = new Subscription();

    if (this.tooltipElement()) {
      this.tooltipElement().classList.add('closing');
    }

    const closingSubscription = timer(150)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.overlayRef()?.detach();
        this.overlayRef()?.dispose();
        this.overlayRef.set(null);
      });

    this.subscriptions.add(closingSubscription);
  }

  private checkForTextEllipsis(): void {
    const element = this.tooltipTrigger().nativeElement;
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
    if (style.textOverflow === 'ellipsis' || style.overflow === 'hidden' || style.whiteSpace === 'nowrap') {
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

  ngOnDestroy(): void {
    this.handleHideTooltip();
  }
}
