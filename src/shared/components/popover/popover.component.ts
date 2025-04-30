import { ConnectionPositionPair, FlexibleConnectedPositionStrategy, Overlay, OverlayModule, OverlayRef } from "@angular/cdk/overlay";
import { PortalModule, TemplatePortal } from "@angular/cdk/portal";
import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, HostListener, OnDestroy, OnInit, TemplateRef, ViewContainerRef, computed, inject, input, output, signal, viewChild } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { explicitEffect } from "ngxtension/explicit-effect";
import { DEFAULT_POPOVER_OPTIONS, IPopoverFunctionControl, IPopoverOptions, TYPE_VERTICAL_ALIGNMENT } from "./interfaces";

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

  private popoverOrigin = viewChild<ElementRef>('popoverOrigin');
  private popoverContent = viewChild<TemplateRef<never>>('popoverContent');

  protected options$ = computed(() => ({ ...DEFAULT_POPOVER_OPTIONS, offset: this.getOffset(), ...this.options() }));
  private overlayRef = signal<OverlayRef | null>(null);
  private documentClickListener = signal<(() => void) | null>(null);
  private closeTimeoutId: ReturnType<typeof setTimeout> | null = null;

  private overlay = inject(Overlay);
  private elementRef = inject(ElementRef);
  private viewContainerRef = inject(ViewContainerRef);
  private destroyRef = inject(DestroyRef);


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

    if (this.options$().trigger === 'hover') {
      this.clearCloseTimeout();
      if (!this.overlayRef()) {
        this.doOpenPopover();
      }
    }
  }

  @HostListener('mouseleave')
  onMouseLeave(): void {
    if (this.closeTimeoutId !== null || this.options$().trigger !== 'hover'
      || this.options$().disableClose || !this.overlayRef() || this.options$().disabledOpen) {
      return;
    }

    const delay = this.options$().hoverRemoveDelay || 0;
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

    const positionStrategy = this.getPositionStrategy();
    const backdropClass = this.options$().blockInteraction
      ? ['cdk-overlay-transparent-backdrop']
      : ['cdk-overlay-transparent-backdrop', 'popover-click-through-backdrop'];

    const newOverlayRef = this.overlay.create({
      positionStrategy,
      scrollStrategy: this.overlay.scrollStrategies.reposition(),
      hasBackdrop: this.options$().hasBackdrop && this.options$().trigger === 'click',
      backdropClass
    });

    const template = this.options$().content || this.popoverContent();
    if (!template) {
      console.error('No template found for popover content');
      return;
    }

    const portal = new TemplatePortal(template, this.viewContainerRef);
    newOverlayRef.attach(portal);
    this.overlayRef.set(newOverlayRef);
    this.opened.emit();

    if (this.options$().hasBackdrop && !this.options$().disableClose && this.options$().trigger === 'click') {
      newOverlayRef.backdropClick()
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() => this.doClosePopover());
    }

    if ((!this.options$().hasBackdrop && !this.options$().disableClose && this.options$().trigger === 'click')) {
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
    popoverElement.classList.add(`position-${this.options$().position}`);

    if (this.options$().showArrow) {
      popoverElement.classList.add('has-arrow');
    }

    const alignment = this.options$().arrowAlignment;
    if (alignment === 'start') {
      popoverElement.classList.add('align-start');
      return;
    }

    if (alignment === 'end') {
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
    const position = this.options().position;
    if (position === 'top' || position === 'left') {
      return -8;
    }

    return 8;
  }

  private getPositionStrategy(): FlexibleConnectedPositionStrategy {
    const positions: ConnectionPositionPair[] = [];
    const originElement = this.popoverOrigin()?.nativeElement || this.elementRef.nativeElement;
    const alignment = this.options$().arrowAlignment;
    const originX = alignment === 'start' ? 'start' : alignment === 'end' ? 'end' : 'center';
    const overlayX = alignment === 'start' ? 'start' : alignment === 'end' ? 'end' : 'center';

    const position = this.options$().position;

    switch (position) {
      case 'top':
        positions.push({
          originX,
          originY: 'top',
          overlayX,
          overlayY: 'bottom',
          offsetY: this.options$().offset
        });
        break;
      case 'right':
        positions.push({
          originX: 'end',
          originY: this.getVerticalAlignmentToOverlayY(),
          overlayX: 'start',
          overlayY: this.getVerticalAlignmentToOverlayY(),
          offsetX: this.options$().offset
        });
        break;
      case 'left':
        positions.push({
          originX: 'start',
          originY: this.getVerticalAlignmentToOverlayY(),
          overlayX: 'end',
          overlayY: this.getVerticalAlignmentToOverlayY(),
          offsetX: this.options$().offset
        });
        break;
      case 'bottom':
      default:
        positions.push({
          originX,
          originY: 'bottom',
          overlayX,
          overlayY: 'top',
          offsetY: this.options$().offset
        });
        break;
    }

    positions.push(
      { originX: 'center', originY: 'bottom', overlayX: 'center', overlayY: 'top', offsetY: this.options$().offset },
      { originX: 'center', originY: 'top', overlayX: 'center', overlayY: 'bottom', offsetY: this.options$().offset }
    );

    return this.overlay.position()
      .flexibleConnectedTo(originElement)
      .withPositions(positions)
      .withPush(true);
  }

  private getVerticalAlignmentToOverlayY(): TYPE_VERTICAL_ALIGNMENT {
    switch (this.options$().arrowAlignment) {
      case 'start': {
        return 'top'
      }

      case 'end': {
        return 'bottom';
      }

      default:
        return 'center';
    }
  }
}
