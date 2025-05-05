import { ConnectionPositionPair, FlexibleConnectedPositionStrategy, Overlay, OverlayModule, OverlayRef } from "@angular/cdk/overlay";
import { PortalModule, TemplatePortal } from "@angular/cdk/portal";
import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, HostListener, OnDestroy, OnInit, TemplateRef, ViewContainerRef, computed, inject, input, output, signal, viewChild } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { explicitEffect } from "ngxtension/explicit-effect";
import { DEFAULT_POPOVER_OPTIONS, IPopoverFunctionControl, IPopoverOptions, TYPE_ARROW_ALIGNMENT, TYPE_VERTICAL_ALIGNMENT } from "./interfaces";

@Component({
  selector: "app-popover",
  templateUrl: "./popover.component.html",
  styleUrl: "./popover.component.scss",
  standalone: true,
  imports: [
    OverlayModule,
    PortalModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PopoverComponent implements OnInit, OnDestroy {
  public options = input<IPopoverOptions>(DEFAULT_POPOVER_OPTIONS);
  public classOrigin = input<string>('');
  public classContent = input<string>('');
  public opened = output<void>();
  public closed = output<void>();
  public functionControl = output<IPopoverFunctionControl>();

  protected options$ = computed(() => ({ ...DEFAULT_POPOVER_OPTIONS, offset: this.getOffset(), ...this.options() }));
  private overlayRef = signal<OverlayRef | null>(null);
  private documentClickListener = signal<(() => void) | null>(null);
  private closeTimeoutId: ReturnType<typeof setTimeout> | null = null;

  private overlay = inject(Overlay);
  private viewContainerRef = inject(ViewContainerRef);
  private destroyRef = inject(DestroyRef);

  private popoverOrigin = viewChild<ElementRef>('popoverOrigin');
  private popoverContent = viewChild<TemplateRef<never>>('popoverContent');

  constructor() {
    explicitEffect([this.overlayRef], ([overlayRef]) => {
      if (overlayRef === null) {
        return;
      }

      const popoverContent = this.overlayRef()?.overlayElement.querySelector('.popover-content');
      if (!popoverContent) {
        return;
      }

      this.setPopoverClasses(popoverContent as HTMLElement);
    });
  }

  ngOnInit(): void {
    this.emitFunctionControl();
  }

  ngOnDestroy(): void {
    this.clearCloseTimeout();
    this.doClosePopover();
  }

  private emitFunctionControl(): void {
    this.functionControl.emit({
      openPopover: () => this.doOpenPopover(),
      closePopover: () => this.doClosePopover(),
      togglePopover: () => this.handlerTogglePopover(),
    });
  }

  public handlerTogglePopover(event?: Event): void {
    event?.stopPropagation();
    if (this.options$().trigger !== 'click' || this.options$().disabledOpen) {
      return;
    }

    if (this.overlayRef()) {
      this.doClosePopover();
      return;
    }

    this.doOpenPopover();
  }

  @HostListener('mouseenter')
  onMouseEnter(): void {
    if (this.options$().disabledOpen || this.options$().trigger !== 'hover') {
      return;
    }

    this.clearCloseTimeout();
    if (!this.overlayRef()) {
      this.doOpenPopover();
    }
  }

  @HostListener('mouseleave')
  onMouseLeave(): void {
    const { trigger, disableClose, disabledOpen, hoverRemoveDelay } = this.options$() || {};
    if (this.closeTimeoutId !== null || trigger !== 'hover' || disableClose || disabledOpen || !this.overlayRef()) {
      return;
    }

    const delay = hoverRemoveDelay || 0;
    if (delay > 0) {
      this.closeTimeoutId = setTimeout(() => {
        this.doClosePopover();
        this.closeTimeoutId = null;
      }, delay);

      return;
    }

    this.doClosePopover();
  }

  private clearCloseTimeout(): void {
    if (this.closeTimeoutId) {
      clearTimeout(this.closeTimeoutId);
      this.closeTimeoutId = null;
    }
  }

  private doOpenPopover(): void {
    if (this.overlayRef()) {
      return;
    }
    const { trigger, hasBackdrop, content, disableClose, blockInteraction } = this.options$() || {};
    const positionStrategy = this.getPositionStrategy();
    const backdropClass = blockInteraction
      ? ['cdk-overlay-transparent-backdrop']
      : ['cdk-overlay-transparent-backdrop', 'popover-click-through-backdrop'];

    const newOverlayRef = this.overlay.create({
      positionStrategy,
      scrollStrategy: this.overlay.scrollStrategies.reposition(),
      hasBackdrop: hasBackdrop && trigger === 'click',
      backdropClass
    });

    const template = content || this.popoverContent();
    if (!template) {
      console.error('No template found for popover content');
      return;
    }

    const portal = new TemplatePortal(template, this.viewContainerRef);
    newOverlayRef.attach(portal);
    this.overlayRef.set(newOverlayRef);
    this.opened.emit();

    if (hasBackdrop && !disableClose && trigger === 'click') {
      newOverlayRef.backdropClick()
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() => this.doClosePopover());
    }

    if ((!hasBackdrop && !disableClose && trigger === 'click')) {
      this.setupDocumentClickListener();
    }
  }

  private doClosePopover(): void {
    const currentOverlayRef = this.overlayRef();
    if (!currentOverlayRef) {
      return;
    }

    const overlayElement = currentOverlayRef.overlayElement;
    overlayElement.querySelector('.popover-content')?.classList.add('closing');

    setTimeout(() => {
      const ref = this.overlayRef();
      if (!ref) {
        return;
      }

      ref.detach();
      ref.dispose();
      this.overlayRef.set(null);
      this.closed.emit();
      this.removeDocumentClickListener();
    }, 200);
  }

  private setupDocumentClickListener(): void {
    this.removeDocumentClickListener();
    setTimeout(() => {
      const handler = (event: MouseEvent) => {
        const overlayPane = this.overlayRef()?.overlayElement;
        const originEl = this.popoverOrigin()?.nativeElement;

        if (!overlayPane || !originEl) {
          return;
        }

        if (!overlayPane.contains(event.target as Node) &&
          !originEl.contains(event.target as Node)) {
          this.doClosePopover();
        }
      };

      document.addEventListener('click', handler, true);

      this.documentClickListener.set(() => {
        document.removeEventListener('click', handler, true);
      });
    }, 100);
  }

  private removeDocumentClickListener(): void {
    const listener = this.documentClickListener();
    if (listener) {
      listener();
      this.documentClickListener.set(null);
    }
  }

  private setPopoverClasses(popoverElement: HTMLElement): void {
    const { position, showArrow, arrowAlignment } = this.options$() || {};
    popoverElement.classList.add(`position-${position}`);

    if (showArrow) {
      popoverElement.classList.add('has-arrow');
    }

    if (arrowAlignment === 'start') {
      popoverElement.classList.add('align-start');
      return;
    }

    if (arrowAlignment === 'end') {
      popoverElement.classList.add('align-end');
      return;
    }

    this.autoAdjustArrowAlignment(popoverElement);
  }

  private autoAdjustArrowAlignment(popoverElement: HTMLElement): void {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const originElement = this.popoverOrigin()?.nativeElement;
    if (!originElement) {
      return;
    }

    const triggerRect = originElement.getBoundingClientRect();
    const edgeThreshold = 50;

    const position = this.options$().position;

    if (position === 'top' || position === 'bottom') {
      if (triggerRect.right > viewportWidth - edgeThreshold) {
        popoverElement.classList.add('align-end');
        return;
      }

      if (triggerRect.left < edgeThreshold) {
        popoverElement.classList.add('align-start');
      }
      return;
    }

    if (position === 'left' || position === 'right') {
      if (triggerRect.bottom > viewportHeight - edgeThreshold) {
        popoverElement.classList.add('align-end');
        return;
      }

      if (triggerRect.top < edgeThreshold) {
        popoverElement.classList.add('align-start');
      }
    }
  }

  private getOffset(): number {
    const { position } = this.options() || {};
    if (position === 'top' || position === 'left') {
      return -8;
    }

    return 8;
  }

  private getPositionStrategy(): FlexibleConnectedPositionStrategy {
    const positions: ConnectionPositionPair[] = [];
    const originElement = this.popoverOrigin()?.nativeElement;
    const { position, arrowAlignment, offset } = this.options$() || {};
    const originX = arrowAlignment === 'start' ? 'start' : arrowAlignment === 'end' ? 'end' : 'center';
    const overlayX = arrowAlignment === 'start' ? 'start' : arrowAlignment === 'end' ? 'end' : 'center';
    switch (position) {
      case 'top':
        positions.push({
          originX,
          originY: 'top',
          overlayX,
          overlayY: 'bottom',
          offsetY: offset
        });
        break;
      case 'right':
        positions.push({
          originX: 'end',
          originY: this.getVerticalAlignmentToOverlayY(),
          overlayX: 'start',
          overlayY: this.getVerticalAlignmentToOverlayY(),
          offsetX: offset
        });
        break;
      case 'left':
        positions.push({
          originX: 'start',
          originY: this.getVerticalAlignmentToOverlayY(),
          overlayX: 'end',
          overlayY: this.getVerticalAlignmentToOverlayY(),
          offsetX: offset
        });
        break;
      case 'bottom':
      default:
        positions.push({
          originX,
          originY: 'bottom',
          overlayX,
          overlayY: 'top',
          offsetY: offset
        });
        break;
    }

    positions.push(
      { originX: 'center', originY: 'bottom', overlayX: 'center', overlayY: 'top', offsetY: offset },
      { originX: 'center', originY: 'top', overlayX: 'center', overlayY: 'bottom', offsetY: offset }
    );

    return this.overlay.position()
      .flexibleConnectedTo(originElement)
      .withPositions(positions)
      .withPush(true);
  }

  private getVerticalAlignmentToOverlayY(): TYPE_VERTICAL_ALIGNMENT {
    const { arrowAlignment } = this.options$() || {};
    const alignmentObj: Record<TYPE_ARROW_ALIGNMENT, TYPE_VERTICAL_ALIGNMENT> = {
      start: 'top',
      end: 'bottom',
      center: 'center'
    }

    return alignmentObj[arrowAlignment as TYPE_ARROW_ALIGNMENT] || 'center';
  }
}
