import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
    AfterContentInit,
    AfterViewChecked,
    AfterViewInit,
    ChangeDetectionStrategy,
    Component,
    ContentChild,
    ContentChildren,
    ElementRef,
    EventEmitter,
    inject,
    input,
    Input,
    NgModule,
    NgZone,
    OnDestroy,
    OnInit,
    Output,
    QueryList,
    SimpleChanges,
    TemplateRef,
    ViewChild,
    ViewEncapsulation
} from '@angular/core';
import { findSingle, getHeight, getWidth, isTouchDevice, isVisible } from '@primeuix/utils';
import { PrimeTemplate, ScrollerOptions, SharedModule } from 'primeng/api';
import { BaseComponent } from 'primeng/basecomponent';
import { SpinnerIcon } from 'primeng/icons';
import { Nullable, VoidListener } from 'primeng/ts-helpers';
import { ScrollerLazyLoadEvent, ScrollerScrollEvent, ScrollerScrollIndexChangeEvent, ScrollerToType } from './scroller.interface';
import { ScrollerStyle } from './style/scrollerstyle';

@Component({
    selector: 'ro-watcher',
    imports: [],
    standalone: true,
    template: `<ng-content />`
})
class RoWatcher implements AfterViewInit, OnDestroy {
    ro = input.required<ResizeObserver>();
    grid = input.required<boolean>();

    constructor(private host: ElementRef) {}

    ngAfterViewInit(): void {
        if (this.grid()) {
            const ro = this.ro();
            for (let child of this.host.nativeElement.children) ro.observe(child);
        } else this.ro().observe(this.host.nativeElement);
    }

    ngOnDestroy(): void {
        this.ro().unobserve(this.host.nativeElement);
    }
}

/**
 * Scroller is a performance-approach to handle huge data efficiently.
 * @group Components
 */
@Component({
    selector: 'p-scroller, p-virtualscroller, p-virtual-scroller, p-virtualScroller',
    imports: [CommonModule, SpinnerIcon, SharedModule, RoWatcher],
    standalone: true,
    template: `
        <ng-container *ngIf="!_disabled; else disabledContainer">
            <div
                #element
                [attr.id]="_id"
                [attr.tabindex]="tabindex"
                [ngStyle]="_style"
                [class]="_styleClass"
                [ngClass]="{
                    'p-virtualscroller': true,
                    'p-virtualscroller-inline': inline,
                    'p-virtualscroller-both p-both-scroll': both,
                    'p-virtualscroller-horizontal p-horizontal-scroll': horizontal
                }"
                (scroll)="onContainerScroll($event)"
                [attr.data-pc-name]="'scroller'"
                [attr.data-pc-section]="'root'"
            >
                <ng-container *ngIf="contentTemplate || _contentTemplate; else buildInContent">
                    <ng-container *ngTemplateOutlet="contentTemplate || _contentTemplate; context: { $implicit: loadedItems, options: getContentOptions() }"></ng-container>
                </ng-container>
                <ng-template #buildInContent>
                    <div #content class="p-virtualscroller-content" [ngClass]="{ 'p-virtualscroller-loading ': d_loading }" [ngStyle]="contentStyle" [attr.data-pc-section]="'content'">
                        <ng-container *ngFor="let item of loadedItems; let index = index; trackBy: _trackBy">
                            <ro-watcher [ro]="ro" [grid]="both">
                                <ng-container *ngTemplateOutlet="itemTemplate || _itemTemplate; context: { $implicit: item, options: getOptions(index) }"></ng-container>
                            </ro-watcher>
                        </ng-container>
                    </div>
                </ng-template>
                <div *ngIf="_showSpacer" class="p-virtualscroller-spacer" [ngStyle]="spacerStyle" [attr.data-pc-section]="'spacer'"></div>
                <div *ngIf="!loaderDisabled && _showLoader && d_loading" class="p-virtualscroller-loader" [ngClass]="{ 'p-virtualscroller-loader-mask': !loaderTemplate }" [attr.data-pc-section]="'loader'">
                    <ng-container *ngIf="loaderTemplate || _loaderTemplate; else buildInLoader">
                        <ng-container *ngFor="let item of loaderArr; let index = index">
                            <ng-container
                                *ngTemplateOutlet="
                                    loaderTemplate || _loaderTemplate;
                                    context: {
                                        options: getLoaderOptions(index, both && { numCols: numItemsInViewport.cols })
                                    }
                                "
                            ></ng-container>
                        </ng-container>
                    </ng-container>
                    <ng-template #buildInLoader>
                        <ng-container *ngIf="loaderIconTemplate || _loaderIconTemplate; else buildInLoaderIcon">
                            <ng-container *ngTemplateOutlet="loaderIconTemplate || _loaderIconTemplate; context: { options: { styleClass: 'p-virtualscroller-loading-icon' } }"></ng-container>
                        </ng-container>
                        <ng-template #buildInLoaderIcon>
                            <SpinnerIcon [styleClass]="'p-virtualscroller-loading-icon pi-spin'" [attr.data-pc-section]="'loadingIcon'" />
                        </ng-template>
                    </ng-template>
                </div>
            </div>
        </ng-container>
        <ng-template #disabledContainer>
            <ng-content></ng-content>
            <ng-container *ngIf="contentTemplate || _contentTemplate">
                <ng-container *ngTemplateOutlet="contentTemplate || _contentTemplate; context: { $implicit: items, options: { rows: _items, columns: loadedColumns } }"></ng-container>
            </ng-container>
        </ng-template>
    `,
    changeDetection: ChangeDetectionStrategy.Default,
    encapsulation: ViewEncapsulation.None,
    providers: [ScrollerStyle]
})
export class Scroller extends BaseComponent implements OnInit, AfterContentInit, AfterViewChecked, OnDestroy {
    /**
     * Unique identifier of the element.
     * @group Props
     */
    @Input() get id(): string | undefined {
        return this._id;
    }
    set id(val: string | undefined) {
        this._id = val;
    }
    /**
     * Inline style of the component.
     * @group Props
     */
    @Input() get style(): Partial<CSSStyleDeclaration> {
        return this._style;
    }
    set style(val: any) {
        this._style = val;
    }
    /**
     * Style class of the element.
     * @group Props
     */
    @Input() get styleClass(): string | undefined {
        return this._styleClass;
    }
    set styleClass(val: string | undefined) {
        this._styleClass = val;
    }
    /**
     * Index of the element in tabbing order.
     * @group Props
     */
    @Input() get tabindex() {
        return this._tabindex;
    }
    set tabindex(val: number) {
        this._tabindex = val;
    }
    /**
     * The height/width (or their getter function) of item according to orientation.
     * @group Props
     */
    @Input() get itemSize(): number[] | number | ((item: unknown, mainAxisIndex: number, crossAxisIndex: number) => { mainAxis: number; crossAxis?: number }) {
        return this._itemSize;
    }
    set itemSize(val: number[] | number | ((item: unknown, mainAxisIndex: number, crossAxisIndex: number) => { mainAxis: number; crossAxis?: number })) {
        this._itemSize = val;
        this._getItemSize = typeof val === 'function' ? val : () => (Array.isArray(val) ? { mainAxis: val[0] ?? this.defaultHeight, crossAxis: val[1] } : { mainAxis: val });
        //this.recalculateSize({ x: { start: 0, end: 100 }, y: { start: 0, end: 100 } });
    }
    /**
     * An array of objects to display.
     * @group Props
     */
    @Input() get items() {
        return this._items;
    }
    set items(val) {
        this._items = val;
        //this.recalculateSize({ x: { start: 0, end: 100 }, y: { start: 0, end: 100 } });
        //this._itemsPositions = this.isBoth(val) ? getInitGridPositions(val) : { mainAxis: getInitPositions(val), crossAxis: [] };
    }
    /**
     * Height of the scroll viewport.
     * @group Props
     */
    @Input() get scrollHeight(): string | undefined {
        return this._scrollHeight;
    }
    set scrollHeight(val: string | undefined) {
        this._scrollHeight = val;
    }
    /**
     * Width of the scroll viewport.
     * @group Props
     */
    @Input() get scrollWidth(): string | undefined {
        return this._scrollWidth;
    }
    set scrollWidth(val: string | undefined) {
        this._scrollWidth = val;
    }
    /**
     * The orientation of scrollbar.
     * @group Props
     */
    @Input() get orientation(): 'vertical' | 'horizontal' | 'both' {
        return this._orientation;
    }
    set orientation(val: 'vertical' | 'horizontal' | 'both') {
        this._orientation = val;
    }
    /**
     * Used to specify how many items to load in each load method in lazy mode.
     * @group Props
     */
    @Input() get step(): number {
        return this._step;
    }
    set step(val: number) {
        this._step = val;
    }
    /**
     * Delay in scroll before new data is loaded.
     * @group Props
     */
    @Input() get delay() {
        return this._delay;
    }
    set delay(val: number) {
        this._delay = val;
    }
    /**
     * Delay after window's resize finishes.
     * @group Props
     */
    @Input() get resizeDelay() {
        return this._resizeDelay;
    }
    set resizeDelay(val: number) {
        this._resizeDelay = val;
    }
    /**
     * Used to append each loaded item to top without removing any items from the DOM. Using very large data may cause the browser to crash.
     * @group Props
     */
    @Input() get appendOnly(): boolean {
        return this._appendOnly;
    }
    set appendOnly(val: boolean) {
        this._appendOnly = val;
    }
    /**
     * Specifies whether the scroller should be displayed inline or not.
     * @group Props
     */
    @Input() get inline() {
        return this._inline;
    }
    set inline(val: boolean) {
        this._inline = val;
    }
    /**
     * Defines if data is loaded and interacted with in lazy manner.
     * @group Props
     */
    @Input() get lazy() {
        return this._lazy;
    }
    set lazy(val: boolean) {
        this._lazy = val;
    }
    /**
     * If disabled, the scroller feature is eliminated and the content is displayed directly.
     * @group Props
     */
    @Input() get disabled() {
        return this._disabled;
    }
    set disabled(val: boolean) {
        this._disabled = val;
    }
    /**
     * Used to implement a custom loader instead of using the loader feature in the scroller.
     * @group Props
     */
    @Input() get loaderDisabled() {
        return this._loaderDisabled;
    }
    set loaderDisabled(val: boolean) {
        this._loaderDisabled = val;
    }
    /**
     * Columns to display.
     * @group Props
     */
    @Input() get columns(): any[] | undefined | null {
        return this._columns;
    }
    set columns(val: any[] | undefined | null) {
        this._columns = val;
    }
    /**
     * Used to implement a custom spacer instead of using the spacer feature in the scroller.
     * @group Props
     */
    @Input() get showSpacer() {
        return this._showSpacer;
    }
    set showSpacer(val: boolean) {
        this._showSpacer = val;
    }
    /**
     * Defines whether to show loader.
     * @group Props
     */
    @Input() get showLoader() {
        return this._showLoader;
    }
    set showLoader(val: boolean) {
        this._showLoader = val;
    }
    /**
     * Determines how many additional elements to add to the DOM outside of the view. According to the scrolls made up and down, extra items are added in a certain algorithm in the form of multiples of this number. Default value is half the number of items shown in the view.
     * @group Props
     */
    @Input() get numToleratedItems() {
        return this._numToleratedItems;
    }
    set numToleratedItems(val: number) {
        this._numToleratedItems = val;
    }
    /**
     * Defines whether the data is loaded.
     * @group Props
     */
    @Input() get loading(): boolean | undefined {
        return this._loading;
    }
    set loading(val: boolean | undefined) {
        this._loading = val;
    }
    /**
     * Defines whether to dynamically change the height or width of scrollable container.
     * @group Props
     */
    @Input() get autoSize(): boolean {
        return this._autoSize;
    }
    set autoSize(val: boolean) {
        this._autoSize = val;
    }
    /**
     * Function to optimize the dom operations by delegating to ngForTrackBy, default algoritm checks for object identity.
     * @group Props
     */
    @Input() get trackBy(): Function {
        return this._trackBy;
    }
    set trackBy(val: Function) {
        this._trackBy = val;
    }
    /**
     * Defines whether to use the scroller feature. The properties of scroller component can be used like an object in it.
     * @group Props
     */
    @Input() get options(): ScrollerOptions | undefined {
        return this._options;
    }
    set options(val: ScrollerOptions | undefined) {
        this._options = val;

        if (val && typeof val === 'object') {
            //@ts-ignore
            Object.entries(val).forEach(([k, v]) => this[`_${k}`] !== v && (this[`_${k}`] = v));
        }
    }
    /**
     * Callback to invoke in lazy mode to load new data.
     * @param {ScrollerLazyLoadEvent} event - Custom lazy load event.
     * @group Emits
     */
    @Output() onLazyLoad: EventEmitter<ScrollerLazyLoadEvent> = new EventEmitter<ScrollerLazyLoadEvent>();
    /**
     * Callback to invoke when scroll position changes.
     * @param {ScrollerScrollEvent} event - Custom scroll event.
     * @group Emits
     */
    @Output() onScroll: EventEmitter<ScrollerScrollEvent> = new EventEmitter<ScrollerScrollEvent>();
    /**
     * Callback to invoke when scroll position and item's range in view changes.
     * @param {ScrollerScrollEvent} event - Custom scroll index change event.
     * @group Emits
     */
    @Output() onScrollIndexChange: EventEmitter<ScrollerScrollIndexChangeEvent> = new EventEmitter<ScrollerScrollIndexChangeEvent>();

    @ViewChild('element') elementViewChild: Nullable<ElementRef>;

    @ViewChild('content') contentViewChild: Nullable<ElementRef>;

    _id: string | undefined;

    _style: Partial<CSSStyleDeclaration> | null | undefined;

    _styleClass: string | undefined;

    _tabindex: number = 0;

    _items: unknown[][] | unknown[] | null | undefined;

    _itemSize: number[] | number | ((item: unknown, mainAxisIndex: number, crossAxisIndex: number) => { mainAxis: number; crossAxis?: number }) = [];

    _itemsPositions: { mainAxis: ItemPos[]; crossAxis: ItemPos[] } = { mainAxis: [], crossAxis: [] };

    _poss: ReturnType<typeof initPositions> = initPositions({
        getItemSize: () => 0,
        scrollerEl: { scrollTop: 0 },
        items: [],
        viewportSize: 0
    });

    _scrollHeight: string | undefined;

    _scrollWidth: string | undefined;

    _orientation: 'vertical' | 'horizontal' | 'both' = 'vertical';

    _step: number = 0;

    _delay: number = 0;

    _resizeDelay: number = 10;

    _appendOnly: boolean = false;

    _inline: boolean = false;

    _lazy: boolean = false;

    _disabled: boolean = false;

    _loaderDisabled: boolean = false;

    _columns: any[] | undefined | null;

    _showSpacer: boolean = true;

    _showLoader: boolean = false;

    _numToleratedItems: any;

    _loading: boolean | undefined;

    _autoSize: boolean = false;

    _trackBy: any;

    _options: ScrollerOptions | undefined;

    _getItemSize: (item: unknown, mainAxisIndex: number, crossAxisIndex: number) => { mainAxis: number; crossAxis?: number } | undefined;

    d_loading: boolean = false;

    d_numToleratedItems: any;

    contentEl: any;
    /**
     * Content template of the component.
     * @group Templates
     */
    @ContentChild('content', { descendants: false }) contentTemplate: Nullable<TemplateRef<any>>;

    /**
     * Item template of the component.
     * @group Templates
     */
    @ContentChild('item', { descendants: false }) itemTemplate: Nullable<TemplateRef<any>>;

    /**
     * Loader template of the component.
     * @group Templates
     */
    @ContentChild('loader', { descendants: false }) loaderTemplate: Nullable<TemplateRef<any>>;

    /**
     * Loader icon template of the component.
     * @group Templates
     */
    @ContentChild('loadericon', { descendants: false }) loaderIconTemplate: Nullable<TemplateRef<any>>;

    @ContentChildren(PrimeTemplate) templates: Nullable<QueryList<PrimeTemplate>>;

    _contentTemplate: TemplateRef<any> | undefined;

    _itemTemplate: TemplateRef<any> | undefined;

    _loaderTemplate: TemplateRef<any> | undefined;

    _loaderIconTemplate: TemplateRef<any> | undefined;

    first: any = 0;

    last: any = 0;

    page: number = 0;

    isRangeChanged: boolean = false;

    numItemsInViewport: any = 0;

    lastScrollPos: any = 0;

    lazyLoadState: any = {};

    loaderArr: any[] = [];

    spacerStyle: { [klass: string]: any } | null | undefined = {};

    contentStyle: { [klass: string]: any } | null | undefined = {};

    scrollTimeout: any;

    resizeTimeout: any;

    initialized: boolean = false;

    windowResizeListener: VoidListener;

    defaultWidth: number | undefined;

    defaultHeight: number | undefined;

    defaultContentWidth: number | undefined;

    defaultContentHeight: number | undefined;

    get vertical() {
        return this._orientation === 'vertical';
    }

    get horizontal() {
        return this._orientation === 'horizontal';
    }

    get both() {
        return this._orientation === 'both';
    }

    get loadedItems() {
        if (this._items && !this.d_loading) {
            if (this.isBoth(this._items)) return this._items.slice(this._appendOnly ? 0 : this.first.rows, this.last.rows).map((item) => (this._columns ? item : item.slice(this._appendOnly ? 0 : this.first.cols, this.last.cols)));
            else if (this.horizontal && this._columns) return this._items;
            else return this._items.slice(this._appendOnly ? 0 : this.first, this.last);
        }

        return [];
    }

    get loadedRows() {
        return this.d_loading ? (this._loaderDisabled ? this.loaderArr : []) : this.loadedItems;
    }

    get loadedColumns() {
        if (this._columns && (this.both || this.horizontal)) {
            return this.d_loading && this._loaderDisabled ? (this.both ? this.loaderArr[0] : this.loaderArr) : this._columns.slice(this.both ? this.first.cols : this.first, this.both ? this.last.cols : this.last);
        }

        return this._columns;
    }

    _componentStyle = inject(ScrollerStyle);

    constructor(private zone: NgZone) {
        super();
    }

    ngOnInit() {
        super.ngOnInit();
        this.setInitialState();
    }

    ngOnChanges(simpleChanges: SimpleChanges) {
        super.ngOnChanges(simpleChanges);
        let isLoadingChanged = false;

        if (simpleChanges.loading) {
            const { previousValue, currentValue } = simpleChanges.loading;

            if (this.lazy && previousValue !== currentValue && currentValue !== this.d_loading) {
                this.d_loading = currentValue;
                isLoadingChanged = true;
            }
        }

        if (simpleChanges.orientation) {
            this.lastScrollPos = this.both ? { top: 0, left: 0 } : 0;
        }

        if (simpleChanges.numToleratedItems) {
            const { previousValue, currentValue } = simpleChanges.numToleratedItems;

            if (previousValue !== currentValue && currentValue !== this.d_numToleratedItems) {
                this.d_numToleratedItems = currentValue;
            }
        }

        if (simpleChanges.options) {
            const { previousValue, currentValue } = simpleChanges.options;

            if (this.lazy && previousValue?.loading !== currentValue?.loading && currentValue?.loading !== this.d_loading) {
                this.d_loading = currentValue.loading;
                isLoadingChanged = true;
            }

            if (previousValue?.numToleratedItems !== currentValue?.numToleratedItems && currentValue?.numToleratedItems !== this.d_numToleratedItems) {
                this.d_numToleratedItems = currentValue.numToleratedItems;
            }
        }

        if (this.initialized) {
            const isChanged = !isLoadingChanged && (simpleChanges.items?.previousValue?.length !== simpleChanges.items?.currentValue?.length || simpleChanges.itemSize || simpleChanges.scrollHeight || simpleChanges.scrollWidth);

            if (isChanged) {
                this.init();
                this.calculateAutoSize();
            }
        }
    }

    ngAfterContentInit() {
        (this.templates as QueryList<PrimeTemplate>).forEach((item) => {
            switch (item.getType()) {
                case 'content':
                    this._contentTemplate = item.template;
                    break;

                case 'item':
                    this._itemTemplate = item.template;
                    break;

                case 'loader':
                    this._loaderTemplate = item.template;
                    break;

                case 'loadericon':
                    this._loaderIconTemplate = item.template;
                    break;

                default:
                    this._itemTemplate = item.template;
                    break;
            }
        });
    }

    ngAfterViewInit() {
        super.ngAfterViewInit();
        Promise.resolve().then(() => {
            this.viewInit();
        });
    }

    ngAfterViewChecked() {
        if (!this.initialized) {
            this.viewInit();
        }
    }

    ngOnDestroy() {
        this.unbindResizeListener();

        this.contentEl = null;
        this.initialized = false;
        super.ngOnDestroy();
    }

    viewInit() {
        if (isPlatformBrowser(this.platformId) && !this.initialized) {
            if (isVisible(this.elementViewChild?.nativeElement)) {
                this.setInitialState();
                this.setContentEl(this.contentEl);
                this.init();

                this.defaultWidth = getWidth(this.elementViewChild?.nativeElement);
                this.defaultHeight = getHeight(this.elementViewChild?.nativeElement);
                this.defaultContentWidth = getWidth(this.contentEl);
                this.defaultContentHeight = getHeight(this.contentEl);
                this.initialized = true;
            }
        }
    }

    ro = new ResizeObserver((entries) => {
        entries.forEach((entry) => {});
    });

    init() {
        if (!this._disabled) {
            this._poss = initPositions({
                items: this.items,
                viewportSize: this.orientation === 'horizontal' ? this.elementViewChild?.nativeElement.offsetWidth || 0 : this.elementViewChild?.nativeElement.offsetHeight || 0,
                getItemSize: (item, idx) => this._getItemSize(item, idx, 0).mainAxis,
                scrollerEl: this.elementViewChild.nativeElement,
                onChange: ({ jump, totalSizeDiff }) => {
                    const scrollTop = this.elementViewChild?.nativeElement.scrollTop;

                    if (this.count < 100) {
                        this.count++;
                        console.error({ scrollTop, jump, totalSizeDiff });
                    }

                    if (totalSizeDiff) {
                        this.setSpacerSize();
                        this.cd.detectChanges();
                    }
                    if (jump) {
                        this.scrollTo({ top: scrollTop + jump });
                        //this.onScrollPositionChange({scrollLeft: 0, scrollTop: Math.max(0, scrollTop + jump)})
                        this.cd.detectChanges();
                    }
                }
                //onTotalSizeChanged: (spacerSizeDiff: number) => {
                //    const scrollTop = this.elementViewChild?.nativeElement.scrollTop;
                //    this.setSpacerSize();
                //    this.cd.detectChanges();
                //},
                //onJump: (jump) => {
                //    const scrollTop = this.elementViewChild?.nativeElement.scrollTop;
                //    this.scrollTo({ top: scrollTop + jump });
                //    this.cd.detectChanges();
                //}
            });

            this.setSize();
            this.calculateOptions();
            this.setSpacerSize();
            this.bindResizeListener();

            this.cd.detectChanges();
        }
    }

    setContentEl(el?: HTMLElement) {
        this.contentEl = el || this.contentViewChild?.nativeElement || findSingle(this.elementViewChild?.nativeElement, '.p-virtualscroller-content');
    }

    setInitialState() {
        this.first = this.both ? { rows: 0, cols: 0 } : 0;
        this.last = this.both ? { rows: 0, cols: 0 } : 0;
        this.numItemsInViewport = this.both ? { rows: 0, cols: 0 } : 0;
        this.lastScrollPos = this.both ? { top: 0, left: 0 } : 0;
        this.d_loading = this._loading || false;
        this.d_numToleratedItems = this._numToleratedItems;
        this.loaderArr = [];
        this.spacerStyle = {};
        this.contentStyle = {};
    }

    getElementRef() {
        return this.elementViewChild;
    }

    getPageByFirst(first?: any) {
        return Math.floor(((first ?? this.first) + this.d_numToleratedItems * 4) / (this._step || 1));
    }

    isPageChanged(first?: any) {
        return this._step ? this.page !== this.getPageByFirst(first ?? this.first) : true;
    }

    private count = 0;
    scrollTo(options: ScrollToOptions) {
        // this.lastScrollPos = this.both ? { top: 0, left: 0 } : 0;
        if (typeof options.top === 'number') this._poss.updateByScrollPos(options.top);
        console.error('scrollTO:', { ...options, positions: JSON.parse(JSON.stringify(this._poss.positions)), idx: binarySearchFirst(options.top, this._poss.positions) });
        this.elementViewChild?.nativeElement?.scrollTo(options);
    }

    private scrolledIndex: number | undefined = undefined;
    scrollToIndex(index: number | number[], behavior: ScrollBehavior = 'auto') {
        const valid = this.both ? (index as number[]).every((i) => i > -1) : (index as number) > -1;

        if (valid) {
            const first = this.first;
            const { scrollTop = 0, scrollLeft = 0 } = this.elementViewChild?.nativeElement;
            //const { numToleratedItems } = this.calculateNumItems();
            const { tolerated: numToleratedItems } = this._poss.numsInViewport();
            const contentPos = this.getContentPosition();
            const calculateFirst = (_index = 0, _numT) => (_index <= _numT ? 0 : _index);
            const scrollTo = (left = 0, top = 0) => this.scrollTo({ left, top, behavior });
            let newFirst = this.both ? { rows: 0, cols: 0 } : 0;
            let isRangeChanged = false,
                isScrollChanged = false;

            if (this.both) {
                newFirst = {
                    rows: calculateFirst(index[0], numToleratedItems[0]),
                    cols: calculateFirst(index[1], numToleratedItems[1])
                };
                const pos = { y: this._itemsPositions.mainAxis[index[0]], x: this._itemsPositions.crossAxis[index[1]] };
                scrollTo(pos.x.pos + contentPos.left, pos.y.pos + contentPos.top);
                isScrollChanged = this.lastScrollPos.top !== scrollTop || this.lastScrollPos.left !== scrollLeft;
                isRangeChanged = newFirst.rows !== first.rows || newFirst.cols !== first.cols;
            } else {
                newFirst = calculateFirst(index as number, numToleratedItems);
                //const mergeIdx = Math.max(0, (index as number) - 100);
                //const calculatedPos = calculatePositions(this._items.slice(mergeIdx, Math.min(this._items.length, (index as number) + 100)), (item, i, j) => this._getItemSize(item, i, j).mainAxis);
                //this._itemsPositions.mainAxis = mergePositions(this._itemsPositions.mainAxis, calculatedPos, mergeIdx);
                const pos = this._poss.at(index as number);
                this.horizontal ? scrollTo(pos.pos + contentPos.left, scrollTop) : scrollTo(scrollLeft, pos.pos + contentPos.top);
                isScrollChanged = this.lastScrollPos !== (this.horizontal ? scrollLeft : scrollTop);
                isRangeChanged = newFirst !== first;
            }

            this.scrolledIndex = index as number;
            this.isRangeChanged = isRangeChanged;
            isScrollChanged && (this.first = newFirst);
        }
    }

    scrollInView(index: number, to: ScrollerToType, behavior: ScrollBehavior = 'auto') {
        if (to) {
            const { first, viewport } = this.getRenderedRange();
            const scrollTo = (left = 0, top = 0) => this.scrollTo({ left, top, behavior });
            const isToStart = to === 'to-start';
            const isToEnd = to === 'to-end';

            if (isToStart) {
                if (this.both) {
                    if (viewport.first.rows - first.rows > (<any>index)[0]) {
                        const y = this._itemsPositions.mainAxis[viewport.first.rows - 1];
                        const x = this._itemsPositions.crossAxis[viewport.first.cols];
                        scrollTo(x.pos, y.pos);
                    } else if (viewport.first.cols - first.cols > (<any>index)[1]) {
                        const y = this._itemsPositions.mainAxis[viewport.first.rows];
                        const x = this._itemsPositions.crossAxis[viewport.first.cols - 1];
                        scrollTo(x.pos, y.pos);
                    }
                } else {
                    if (viewport.first - first > index) {
                        const pos = this._poss.at(viewport.first - 1);
                        this.horizontal ? scrollTo(pos.pos, 0) : scrollTo(0, pos.pos);
                    }
                }
            } else if (isToEnd) {
                if (this.both) {
                    if (viewport.last.rows - first.rows <= (<any>index)[0] + 1) {
                        const y = this._itemsPositions.mainAxis[viewport.first.rows + 1];
                        const x = this._itemsPositions.crossAxis[viewport.first.cols];
                        scrollTo(x.pos, y.pos);
                    } else if (viewport.last.cols - first.cols <= (<any>index)[1] + 1) {
                        const y = this._itemsPositions.mainAxis[viewport.first.rows];
                        const x = this._itemsPositions.crossAxis[viewport.first.cols + 1];
                        scrollTo(x.pos, y.pos);
                    }
                } else {
                    if (viewport.last - first <= index + 1) {
                        const pos = this._poss.at(viewport.first + 1).pos;
                        this.horizontal ? scrollTo(pos, 0) : scrollTo(0, pos);
                    }
                }
            }
        } else {
            this.scrollToIndex(index, behavior);
        }
    }

    getRenderedRange() {
        let firstInViewport = this.first;
        let lastInViewport: any = 0;

        if (this.elementViewChild?.nativeElement) {
            const { scrollTop, scrollLeft } = this.elementViewChild.nativeElement;

            if (this.both) {
                const firstLast = this.getFirstInViewport<number>(scrollTop, scrollLeft);
                firstInViewport = { rows: firstLast.firstRowIdx, cols: firstLast.firstColIdx };
                lastInViewport = { rows: firstInViewport.rows + this.numItemsInViewport.rows, cols: firstInViewport.cols + this.numItemsInViewport.cols };
            } else {
                const scrollPos = this.horizontal ? scrollLeft : scrollTop;
                const viewport = this._poss.numsInViewport();
                firstInViewport = viewport.first;
                lastInViewport = viewport.last;
            }
        }

        return {
            first: this.first,
            last: this.last,
            viewport: {
                first: firstInViewport,
                last: lastInViewport
            }
        };
    }

    calculateOptions() {
        const { num: numItemsInViewport, tolerated: numToleratedItems } = this._poss.numsInViewport();
        const calculateLast = (_first: number, _num: number, _numT: number, _isCols: boolean = false) => this.getLast(_first + _num + (_first < _numT ? 2 : 3) * _numT, _isCols);
        const first = this.first;
        const last = this.both
            ? {
                  rows: calculateLast(this.first.rows, numItemsInViewport, numToleratedItems[0]),
                  cols: calculateLast(this.first.cols, numItemsInViewport, numToleratedItems[1], true)
              }
            : calculateLast(this.first, numItemsInViewport, numToleratedItems);

        this.last = last;
        this.numItemsInViewport = numItemsInViewport;
        this.d_numToleratedItems = numToleratedItems;

        if (this.showLoader) {
            this.loaderArr = this.both ? Array.from({ length: numItemsInViewport }).map(() => Array.from({ length: numItemsInViewport })) : Array.from({ length: numItemsInViewport });
        }

        if (this._lazy) {
            Promise.resolve().then(() => {
                this.lazyLoadState = {
                    first: this._step ? (this.both ? { rows: 0, cols: first.cols } : 0) : first,
                    last: Math.min(this._step ? this._step : this.last, (<any[]>this.items).length)
                };

                this.handleEvents('onLazyLoad', this.lazyLoadState);
            });
        }
    }

    calculateAutoSize() {
        if (this._autoSize && !this.d_loading) {
            Promise.resolve().then(() => {
                if (this.contentEl) {
                    this.contentEl.style.minHeight = this.contentEl.style.minWidth = 'auto';
                    this.contentEl.style.position = 'relative';
                    (<ElementRef>this.elementViewChild).nativeElement.style.contain = 'none';

                    const [contentWidth, contentHeight] = [getWidth(this.contentEl), getHeight(this.contentEl)];
                    contentWidth !== this.defaultContentWidth && ((<ElementRef>this.elementViewChild).nativeElement.style.width = '');
                    contentHeight !== this.defaultContentHeight && ((<ElementRef>this.elementViewChild).nativeElement.style.height = '');

                    const [width, height] = [getWidth((<ElementRef>this.elementViewChild).nativeElement), getHeight((<ElementRef>this.elementViewChild).nativeElement)];
                    (this.both || this.horizontal) && ((<ElementRef>this.elementViewChild).nativeElement.style.width = width < <number>this.defaultWidth ? width + 'px' : this._scrollWidth || this.defaultWidth + 'px');
                    (this.both || this.vertical) && ((<ElementRef>this.elementViewChild).nativeElement.style.height = height < <number>this.defaultHeight ? height + 'px' : this._scrollHeight || this.defaultHeight + 'px');

                    this.contentEl.style.minHeight = this.contentEl.style.minWidth = '';
                    this.contentEl.style.position = '';
                    (<ElementRef>this.elementViewChild).nativeElement.style.contain = '';
                }
            });
        }
    }

    getLast(last = 0, isCols = false) {
        const gridItems = this.isBoth(this._items) ? this._items[0] || [] : this._items;
        return this._items ? Math.min(isCols ? (this._columns || gridItems).length : this._items.length, last) : 0;
    }

    getContentPosition() {
        if (this.contentEl) {
            const style = getComputedStyle(this.contentEl);
            const left = parseFloat(style.paddingLeft) + Math.max(parseFloat(style.left) || 0, 0);
            const right = parseFloat(style.paddingRight) + Math.max(parseFloat(style.right) || 0, 0);
            const top = parseFloat(style.paddingTop) + Math.max(parseFloat(style.top) || 0, 0);
            const bottom = parseFloat(style.paddingBottom) + Math.max(parseFloat(style.bottom) || 0, 0);

            return { left, right, top, bottom, x: left + right, y: top + bottom };
        }

        return { left: 0, right: 0, top: 0, bottom: 0, x: 0, y: 0 };
    }

    setSize() {
        if (this.elementViewChild?.nativeElement) {
            const parentElement = this.elementViewChild.nativeElement.parentElement.parentElement;
            const width = this._scrollWidth || `${this.elementViewChild.nativeElement.offsetWidth || parentElement.offsetWidth}px`;
            const height = this._scrollHeight || `${this.elementViewChild.nativeElement.offsetHeight || parentElement.offsetHeight}px`;
            const setProp = (_name: string, _value: any) => ((<ElementRef>this.elementViewChild).nativeElement.style[_name] = _value);

            if (this.both || this.horizontal) {
                setProp('height', height);
                setProp('width', width);
            } else {
                setProp('height', height);
            }
        }
    }

    setSpacerSize() {
        if (this._items) {
            const setProp = (_name, _size) => (this.spacerStyle = { ...this.spacerStyle, ...{ [`${_name}`]: _size + 'px' } });

            if (this.isBoth(this._items)) {
                setProp('height', this._itemsPositions.mainAxis.at(-1).pos + this._itemsPositions.mainAxis.at(-1).size);
                setProp('width', this._itemsPositions.crossAxis.at(-1).pos + this._itemsPositions.crossAxis.at(-1).size);
            } else {
                const spacerSize = this._poss.totalSize();
                setProp(this.horizontal ? 'width' : 'height', spacerSize);
            }
        }
    }

    setContentPosition(pos: any, jump: { rows: number; cols: number }) {
        if (this.contentEl && !this._appendOnly) {
            const first = pos ? pos.first : this.first;
            const setTransform = (_x = 0, _y = 0) => (this.contentStyle = { ...this.contentStyle, ...{ transform: `translate3d(${_x}px, ${_y}px, 0)` } });

            if (this.both) {
                setTransform(this._itemsPositions.crossAxis[first.cols].pos + jump.cols, this._itemsPositions.mainAxis[first.rows].pos + jump.rows);
            } else {
                //const jj = this._poss.updateByIndexWithChanges(first);
                const translateVal = this._poss.positions.at(first).pos;
                console.error('setContentPosition', { translateVal, positions: JSON.parse(JSON.stringify(this._poss.positions)) });
                this.horizontal ? setTransform(translateVal, 0) : setTransform(0, translateVal);
            }
        }
    }

    onScrollPositionChange(event: { scrollTop: number; scrollLeft: number }) {
        const { height: spacerHeight, width: spacerWidth } = this.spacerStyle;
        const contentPos = this.getContentPosition();
        const calculateScrollPos = (_pos: number, _cpos: number) => (_pos ? (_pos > _cpos ? _pos - _cpos : _pos) : 0);
        const calculateTriggerIndex = (_currentIndex: number, _first: number, _last: number, _num: number, _numT: number, _isScrollDownOrRight: boolean, _isJump: boolean) => {
            //if (_isJump) return _currentIndex;
            return _currentIndex <= _numT ? _numT : _isScrollDownOrRight ? _last - _num - _numT : _first + _numT - 1;
        };
        const calculateFirst = (_currentIndex: number, _triggerIndex: number, _first: number, _last: number, _num: number, _numT: number, _isScrollDownOrRight: boolean) => {
            if (_currentIndex <= _numT) return 0;
            else return Math.max(0, _isScrollDownOrRight ? (_currentIndex < _triggerIndex ? _first : _currentIndex - _numT) : _currentIndex > _triggerIndex ? _first : _currentIndex - 2 * _numT);
        };
        const calculateLast = (_currentIndex: number, _first: number, _last: number, _num: number, _numT: number, _isCols = false) => {
            let lastValue = _first + _num + 2 * _numT;

            if (_currentIndex >= _numT) {
                lastValue += _numT + 1;
            }

            return this.getLast(lastValue, _isCols);
        };

        const scrollTop = calculateScrollPos(event.scrollTop, contentPos.top);
        const scrollLeft = calculateScrollPos(event.scrollLeft, contentPos.left);
        const scrollTo = (left = 0, top = 0) => this.scrollTo({ left, top, behavior: 'auto' });

        let newFirst = this.both ? { rows: 0, cols: 0 } : 0;
        let newLast = this.last;
        let isRangeChanged = false;
        let newScrollPos = this.lastScrollPos;
        let jumpDiff = { rows: 0, cols: 0 };

        if (this.both) {
            const isScrollDown = this.lastScrollPos.top <= scrollTop;
            const isScrollRight = this.lastScrollPos.left <= scrollLeft;

            if (!this._appendOnly || (this._appendOnly && (isScrollDown || isScrollRight))) {
                const initj = { rows: this._itemsPositions.mainAxis[this.first.rows].pos, cols: this._itemsPositions.crossAxis[this.first.cols].pos };
                const currentIndex = this.getFirstInViewport(scrollTop, scrollLeft);
                const triggerIndex = {
                    rows: calculateTriggerIndex(currentIndex.firstRowIdx, this.first.rows, this.last.rows, this.numItemsInViewport.rows, this.d_numToleratedItems[0], isScrollDown, false),
                    cols: calculateTriggerIndex(currentIndex.firstColIdx, this.first.cols, this.last.cols, this.numItemsInViewport.cols, this.d_numToleratedItems[1], isScrollRight, false)
                };

                newFirst = {
                    rows: calculateFirst(currentIndex.firstRowIdx, triggerIndex.rows, this.first.rows, this.last.rows, this.numItemsInViewport.rows, this.d_numToleratedItems[0], isScrollDown),
                    cols: calculateFirst(currentIndex.firstColIdx, triggerIndex.cols, this.first.cols, this.last.cols, this.numItemsInViewport.cols, this.d_numToleratedItems[1], isScrollRight)
                };
                newLast = {
                    rows: calculateLast(currentIndex.firstRowIdx, newFirst.rows, this.last.rows, this.numItemsInViewport.rows, this.d_numToleratedItems[0]),
                    cols: calculateLast(currentIndex.firstColIdx, newFirst.cols, this.last.cols, this.numItemsInViewport.cols, this.d_numToleratedItems[1], true)
                };

                isRangeChanged = newFirst.rows !== this.first.rows || newLast.rows !== this.last.rows || newFirst.cols !== this.first.cols || newLast.cols !== this.last.cols || this.isRangeChanged;
                newScrollPos = { top: scrollTop, left: scrollLeft };
                const rowsRange = new Range(newFirst.rows, newLast.rows);
                const colsRange = new Range(newFirst.cols, newLast.cols);
                jumpDiff = {
                    rows: !rowsRange.inRange(this.first.rows) || !rowsRange.inRange(this.last.rows) ? 0 : initj.rows - this._itemsPositions.mainAxis[this.first.rows].pos,
                    cols: !colsRange.inRange(this.first.cols) || !colsRange.inRange(this.last.cols) ? 0 : initj.cols - this._itemsPositions.crossAxis[this.first.cols].pos
                };
                jumpDiff.rows = initj.rows - this._itemsPositions.mainAxis[this.first.rows].pos;
                jumpDiff.cols = initj.cols - this._itemsPositions.crossAxis[this.first.cols].pos;
            }
        } else {
            const scrollPos = this.horizontal ? scrollLeft : scrollTop;
            const isScrollDownOrRight = this.lastScrollPos <= scrollPos;

            if (!this._appendOnly || (this._appendOnly && isScrollDownOrRight)) {
                const calculateScrolledIdx = (idx: number) => (idx > this._itemsPositions.mainAxis.length - this.numItemsInViewport ? this._itemsPositions.mainAxis.length - this.numItemsInViewport : idx);
                //const currentIndex = this.scrolledIndex !== undefined ? calculateScrolledIdx(this.scrolledIndex) : this.getFirstInViewport(scrollPos);
                const viewport = this._poss.numsInViewport();
                const currentIndex = viewport.first;
                const triggerIndex = calculateTriggerIndex(currentIndex, this.first, this.last, viewport.num, viewport.tolerated, isScrollDownOrRight, false);

                //newFirst = calculateFirst(currentIndex, triggerIndex, this.first, this.last, viewport.num, viewport.tolerated, isScrollDownOrRight);
                newFirst = this._poss.getFirst(this.first);
                //newLast = calculateLast(currentIndex, newFirst, this.last, viewport.num, viewport.tolerated);
                newLast = this._poss.getLast(newFirst) + 1;
                console.error('onScrollPositionChange', { newFirst, triggerIndex });
                isRangeChanged = newFirst !== this.first || newLast !== this.last || this.isRangeChanged;
                newScrollPos = scrollPos;
                this.scrolledIndex = undefined;
            }
        }

        return {
            first: newFirst,
            last: newLast,
            isRangeChanged,
            scrollPos: newScrollPos,
            jump: jumpDiff
        };
    }

    onScrollChange(event: Event) {
        const { first, last, isRangeChanged, scrollPos, jump } = this.onScrollPositionChange({ scrollTop: (<HTMLElement>event.target).scrollTop, scrollLeft: (<HTMLElement>event.target).scrollLeft });

        if (isRangeChanged) {
            const newState = { first, last };

            this.setContentPosition(newState, jump);

            this.first = first;
            this.last = last;
            this.lastScrollPos = scrollPos;

            this.handleEvents('onScrollIndexChange', newState);

            if (this._lazy && this.isPageChanged(first)) {
                const lazyLoadState = {
                    first: this._step ? Math.min(this.getPageByFirst(first) * this._step, (<any[]>this.items).length - this._step) : first,
                    last: Math.min(this._step ? (this.getPageByFirst(first) + 1) * this._step : last, (<any[]>this.items).length)
                };
                const isLazyStateChanged = this.lazyLoadState.first !== lazyLoadState.first || this.lazyLoadState.last !== lazyLoadState.last;

                isLazyStateChanged && this.handleEvents('onLazyLoad', lazyLoadState);
                this.lazyLoadState = lazyLoadState;
            }
        }
    }

    onContainerScroll(event: Event) {
        this.handleEvents('onScroll', { originalEvent: event });

        if (this._delay && this.isPageChanged()) {
            if (this.scrollTimeout) {
                clearTimeout(this.scrollTimeout);
            }

            if (!this.d_loading && this.showLoader) {
                const { isRangeChanged } = this.onScrollPositionChange({ scrollTop: (<HTMLElement>event.target).scrollTop, scrollLeft: (<HTMLElement>event.target).scrollLeft });
                const changed = isRangeChanged || (this._step ? this.isPageChanged() : false);

                if (changed) {
                    this.d_loading = true;

                    this.cd.detectChanges();
                }
            }

            this.scrollTimeout = setTimeout(() => {
                this.onScrollChange(event);

                if (this.d_loading && this.showLoader && (!this._lazy || this._loading === undefined)) {
                    this.d_loading = false;
                    this.page = this.getPageByFirst();
                }
                this.cd.detectChanges();
            }, this._delay);
        } else {
            !this.d_loading && this.onScrollChange(event);
        }
    }

    bindResizeListener() {
        if (isPlatformBrowser(this.platformId)) {
            if (!this.windowResizeListener) {
                this.zone.runOutsideAngular(() => {
                    const window = this.document.defaultView as Window;
                    const event = isTouchDevice() ? 'orientationchange' : 'resize';
                    this.windowResizeListener = this.renderer.listen(window, event, this.onWindowResize.bind(this));
                });
            }
        }
    }

    unbindResizeListener() {
        if (this.windowResizeListener) {
            this.windowResizeListener();
            this.windowResizeListener = null;
        }
    }

    onWindowResize() {
        if (this.resizeTimeout) {
            clearTimeout(this.resizeTimeout);
        }

        this.resizeTimeout = setTimeout(() => {
            if (isVisible(this.elementViewChild?.nativeElement)) {
                const [width, height] = [getWidth(this.elementViewChild?.nativeElement), getHeight(this.elementViewChild?.nativeElement)];
                const [isDiffWidth, isDiffHeight] = [width !== this.defaultWidth, height !== this.defaultHeight];
                const reinit = this.both ? isDiffWidth || isDiffHeight : this.horizontal ? isDiffWidth : this.vertical ? isDiffHeight : false;

                reinit &&
                    this.zone.run(() => {
                        this.d_numToleratedItems = this._numToleratedItems;
                        this.defaultWidth = width;
                        this.defaultHeight = height;
                        this.defaultContentWidth = getWidth(this.contentEl);
                        this.defaultContentHeight = getHeight(this.contentEl);

                        this.init();
                    });
            }
        }, this._resizeDelay);
    }

    handleEvents(name: string, params: any) {
        //@ts-ignore
        return this.options && (<any>this.options)[name] ? (<any>this.options)[name](params) : this[name].emit(params);
    }

    getContentOptions() {
        return {
            contentStyleClass: `p-virtualscroller-content ${this.d_loading ? 'p-virtualscroller-loading' : ''}`,
            items: this.loadedItems,
            getItemOptions: (index: number) => this.getOptions(index),
            loading: this.d_loading,
            getLoaderOptions: (index: number, options?: any) => this.getLoaderOptions(index, options),
            itemSize: this._itemSize,
            rows: this.loadedRows,
            columns: this.loadedColumns,
            spacerStyle: this.spacerStyle,
            contentStyle: this.contentStyle,
            vertical: this.vertical,
            horizontal: this.horizontal,
            both: this.both
        };
    }

    getOptions(renderedIndex: number) {
        const count = (this._items || []).length;
        const index = this.both ? this.first.rows + renderedIndex : this.first + renderedIndex;
        const firstCrossAxisIndex = this.both ? this.first.cols : 0;

        return {
            index,
            firstCrossAxisIndex,
            count,
            first: index === 0,
            last: index === count - 1,
            even: index % 2 === 0,
            odd: index % 2 !== 0
        };
    }

    getLoaderOptions(index: number, extOptions: any) {
        const count = this.loaderArr.length;

        return {
            index,
            count,
            first: index === 0,
            last: index === count - 1,
            even: index % 2 === 0,
            odd: index % 2 !== 0,
            ...extOptions
        };
    }

    private isBoth(items: typeof this.items): items is unknown[][] {
        return this.both && items.length && Array.isArray(items[0]);
    }

    private binarySearchFirst(pos: number, positions: ItemPos[]): number {
        let left = 0,
            right = positions.length,
            prevMiddle = 0;
        while (true) {
            const middle = Math.floor((left + right) / 2);
            const currPos = positions[middle];
            const nextPos = positions[middle + 1];

            if (currPos === undefined || nextPos === undefined || currPos.pos === pos || (currPos.pos < pos && nextPos.pos > pos) || middle === prevMiddle) return middle;
            if (pos < currPos.pos) right = middle;
            else left = middle;
            prevMiddle = middle;
        }
    }

    private calculatedPos: { main: Range; cross: Range } = { main: new Range(0, 0), cross: new Range(0, 0) };
    private getFirstInViewport<T>(mainScrollPos: number, crossScrollPos?: T): T extends number ? { firstRowIdx: number; firstColIdx: number } : number {
        if (typeof crossScrollPos === 'number' && this.isBoth(this._items)) {
            const firstRowIdx = this.binarySearchFirst(mainScrollPos, this._itemsPositions.mainAxis);
            const firstColIdx = this.binarySearchFirst(crossScrollPos, this._itemsPositions.crossAxis);

            const mergeStartIdx = Math.max(0, firstRowIdx - 100);
            const mergeEndIdx = Math.min(this._itemsPositions.mainAxis.length - 1, firstRowIdx + 100);
            const crossMergeStartIdx = Math.max(0, firstColIdx - 100);
            const crossMergeEndIdx = Math.min(this._itemsPositions.crossAxis.length - 1, firstColIdx + 100);

            const calculatedGridPositions = calculateGridPositions(
                this._items.slice(mergeStartIdx, mergeEndIdx + 1).map((slice) => slice.slice(crossMergeStartIdx, crossMergeEndIdx + 1)),
                this._getItemSize.bind(this)
            );

            this._itemsPositions = mergeGridPositions(this._itemsPositions, calculatedGridPositions, { mainAxis: mergeStartIdx, crossAxis: crossMergeStartIdx });
            const updatedFirstRowIdx = this.binarySearchFirst(mainScrollPos, this._itemsPositions.mainAxis);
            const updatedFirstColIdx = this.binarySearchFirst(crossScrollPos, this._itemsPositions.crossAxis);
            this.setSpacerSize();

            return { firstRowIdx: updatedFirstRowIdx, firstColIdx: updatedFirstColIdx } as T extends number ? { firstRowIdx: number; firstColIdx: number } : number;
        } else {
            const firstRowIdx = this.binarySearchFirst(mainScrollPos, this._itemsPositions.mainAxis);

            const mergeStartIdx = Math.max(0, firstRowIdx - 100);
            const mergeEndIdx = Math.min(this._itemsPositions.mainAxis.length - 1, mergeStartIdx + 200);

            const calculatedPositions = calculatePositions(this._items.slice(mergeStartIdx, mergeEndIdx + 1), (i, idx, xidx) => this._getItemSize(i, idx, xidx).mainAxis);
            this._itemsPositions.mainAxis = mergePositions(this._itemsPositions.mainAxis, calculatedPositions, mergeStartIdx);
            const updatedFirstRowIdx = this.binarySearchFirst(mainScrollPos, this._itemsPositions.mainAxis);
            this.setSpacerSize();

            return updatedFirstRowIdx as T extends number ? { firstRowIdx: number; firstColIdx: number } : number;
        }
    }

    private recalculateSize(limits: { x: { start: number; end: number }; y: { start: number; end: number } }) {
        if (typeof this._getItemSize !== 'function' || !this._items) return;

        const itemsLength = this._items.length;
        this._itemsPositions.mainAxis = Array.from({ length: itemsLength });

        const mainAxisDefaultSize = 40;
        const crossAxisDefaultSize = 50;
        let i = -1,
            mainAxisPos = 0;
        if (this.isBoth(this._items)) {
            const crossAxisPositionsMap: Record<number, number> = {};
            while (++i < itemsLength) {
                let maxRowHeight = 0;

                let j = -1,
                    childItemLength = this._items[i].length,
                    crossAxisPos = 0;
                while (++j < childItemLength) {
                    const size = i < limits.y.start || i > limits.y.end || j < limits.x.start || j > limits.x.end ? { mainAxis: mainAxisDefaultSize, crossAxis: crossAxisDefaultSize } : this._getItemSize(this._items[i][j], i, j);
                    crossAxisPositionsMap[j] = crossAxisPos > (crossAxisPositionsMap[j] ?? 0) ? crossAxisPos : (crossAxisPositionsMap[j] ?? 0);
                    crossAxisPos += size.crossAxis || 0;
                    maxRowHeight = size.mainAxis > maxRowHeight ? size.mainAxis : maxRowHeight;
                }
                //this._itemsPositions.mainAxis[i] = mainAxisPos;
                mainAxisPos += maxRowHeight;
            }
            //this._itemsPositions.crossAxis = Object.values(crossAxisPositionsMap);
        } else {
            while (++i < itemsLength) {
                const size = i < limits.y.start || i > limits.y.end ? { mainAxis: mainAxisDefaultSize } : this._getItemSize(this._items[i], i, 0);
                //this._itemsPositions.mainAxis[i] = mainAxisPos;
                mainAxisPos += size.mainAxis;
            }
        }
    }

    private getNumItemsInViewport<T>(viewportMainAxisSize: number, scrollMainAxisPos: number, viewportCrossAxisSize?: T, scrollCrossAxisPos?: T): T extends number ? { cols: number; rows: number } : number {
        if (typeof viewportCrossAxisSize === 'number' && typeof scrollCrossAxisPos === 'number') {
            const first = this.getFirstInViewport(scrollMainAxisPos, scrollCrossAxisPos);
            const last = this.getFirstInViewport(scrollMainAxisPos + viewportMainAxisSize, scrollCrossAxisPos + viewportCrossAxisSize);
            return { cols: last.firstColIdx - first.firstColIdx + 1, rows: last.firstRowIdx - first.firstRowIdx + 1 } as T extends number ? { cols: number; rows: number } : number;
        } else {
            if (scrollMainAxisPos > this._itemsPositions.mainAxis.at(-1).pos) {
                this.scrollTo({ top: this._itemsPositions.mainAxis.at(-1).pos });
                scrollMainAxisPos = this._itemsPositions.mainAxis.at(-1).pos + this._itemsPositions.mainAxis.at(-1).size - viewportMainAxisSize;
            }
            const first = this.getFirstInViewport(scrollMainAxisPos);
            const last = this.getFirstInViewport(scrollMainAxisPos + viewportMainAxisSize);
            return (last - first + 1) as T extends number ? { cols: number; rows: number } : number;
        }
    }
}

export class Range {
    range: [number, number][] = [];
    constructor(min: number, max: number) {
        this.range.push([min, max]);
    }
    inRange(value: number) {
        return this.range.some((range) => value >= range[0] && value <= range[1]);
    }
    getRange(value: number) {
        return this.range.find((range) => value >= range[0] && value <= range[1]);
    }
    expand(min: number, max: number) {
        const minRange = this.getRange(min);
        if (minRange) {
            minRange[1] < max && (minRange[1] = max);
            return;
        }

        const maxRange = this.getRange(max);
        if (maxRange) {
            maxRange[0] > min && (maxRange[0] = min);
            return;
        }

        this.range.push([min, max]);
    }
}
export const getPositions = ({
    items,
    getItemSize,
    range,
    defaultValue = { mainAxis: 40, crossAxis: 50 },
    positions = { mainAxis: [], crossAxis: [] }
}: {
    items: unknown[];
    getItemSize: (x: unknown, mainAxisIdx: number, crossAxisIdx: number) => { mainAxis: number; crossAxis: number };
    range: { mainAxis: [number, number]; crossAxis: [number, number] };
    defaultValue?: { mainAxis: number; crossAxis: number };
    positions?: { mainAxis: number[]; crossAxis: number[] };
}) => {
    const itemsPositions: { mainAxis: number[]; crossAxis: number[] } = { mainAxis: [], crossAxis: [] };
    const isNestedArray = (arr: unknown[]): arr is unknown[][] => Array.isArray(arr[0]);

    const itemsLength = items.length;
    itemsPositions.mainAxis = Array.from({ length: itemsLength });

    let i = -1,
        mainAxisPos = 0;
    if (isNestedArray(items)) {
        const crossAxisPositionsMap: Record<number, number> = {};
        while (++i < itemsLength) {
            let maxRowHeight = 0;

            let j = -1,
                childItemLength = items[i].length,
                crossAxisPos = 0;
            while (++j < childItemLength) {
                const size = i < range.mainAxis[0] || i > range.mainAxis[1] || j < range.crossAxis[0] || j > range.crossAxis[1] ? defaultValue : getItemSize(items[i][j], i, j);
                crossAxisPositionsMap[j] = crossAxisPos > (crossAxisPositionsMap[j] ?? 0) ? crossAxisPos : (crossAxisPositionsMap[j] ?? 0);
                crossAxisPos += size.crossAxis || 0;
                maxRowHeight = size.mainAxis > maxRowHeight ? size.mainAxis : maxRowHeight;
            }
            itemsPositions.mainAxis[i] = mainAxisPos;
            mainAxisPos += maxRowHeight;
        }
        itemsPositions.crossAxis = Object.values(crossAxisPositionsMap);
    } else {
        while (++i < itemsLength) {
            const size = i < range.mainAxis[0] || i > range.mainAxis[1] ? defaultValue : getItemSize(items[i], i, 0);
            itemsPositions.mainAxis[i] = mainAxisPos;
            mainAxisPos += size.mainAxis;
        }
    }

    return itemsPositions;
};

type ItemPos = { size: number; pos: number };
export const getInitPositions = <T>(items: T[], defaultValue: number = 40): ItemPos[] => items.map((_i, idx) => ({ size: defaultValue, pos: idx * defaultValue }));
export const calculatePositions = <T>(items: T[], getItemSize: (item: T, mainAxisIdx: number, crossAxisIdx: number) => number): ItemPos[] => {
    const positions: ItemPos[] = [];
    let pos = 0,
        len = items.length,
        i = -1;
    while (++i < len) {
        const size = getItemSize(items[i], i, 0);
        positions.push({ size, pos });
        pos += size;
    }
    return positions;
};
export const mergePositions = (positions: ItemPos[], positionsToMerge: ItemPos[], mergeIndex: number): ItemPos[] => {
    const resPositions = [...positions];
    const posShift = (resPositions[mergeIndex - 1]?.pos ?? 0) + (resPositions[mergeIndex - 1]?.size ?? 0);
    resPositions.splice(mergeIndex, positionsToMerge.length, ...positionsToMerge.map((i) => ({ ...i, pos: i.pos + posShift })));
    let i = mergeIndex + positionsToMerge.length - 1,
        len = resPositions.length;
    while (++i < len) {
        const item = resPositions.at(i);
        const lastUpdated = resPositions.at(i - 1);
        if (item.pos === lastUpdated.pos + lastUpdated.size) break;
        item.pos = lastUpdated.pos + lastUpdated.size;
    }

    return resPositions;
};

export const binarySearchFirst = (pos: number, positions: ItemPos[]): number => {
    let left = 0,
        right = positions.length,
        prevMiddle = 0;
    while (true) {
        const middle = Math.floor((left + right) / 2);
        const currPos = positions[middle];
        const nextPos = positions[middle + 1];

        if (currPos === undefined || nextPos === undefined || currPos.pos === pos || (currPos.pos < pos && nextPos.pos > pos) || middle === prevMiddle) return middle;
        if (pos < currPos.pos) right = middle;
        else left = middle;
        prevMiddle = middle;
    }
};

export const initPositions = <T>({
    items,
    getItemSize,
    viewportSize,
    scrollerEl,
    onTotalSizeChanged = () => {},
    onJump = () => {},
    onChange = () => {}
}: {
    items: T[];
    getItemSize: (item: T, idx: number) => number;
    viewportSize: number;
    scrollerEl: { scrollTop: number };
    onTotalSizeChanged?: (totalSizeDiff: number) => void;
    onJump?: (jump: number) => void;
    onChange?: (changes: { jump: number; totalSizeDiff: number }) => void;
}) => {
    const positions = getInitPositions(items);

    const updateByIndex = (index: number) => {
        const dtp = viewportSize;
        const correctIdx = positions.indexOf(positions.at(index));

        let passed = 0,
            idx = correctIdx,
            totalpassed = 0;

        while (passed < dtp + dtp && idx < positions.length) {
            const size = getItemSize(items.at(idx), idx);
            passed += size;
            totalpassed += size;
            idx++;
        }
        passed = 0;
        idx = correctIdx;
        const additional = viewportSize * 2 - totalpassed;
        while (passed < dtp + dtp && idx > 0) {
            const size = getItemSize(items.at(idx), idx);
            passed += size;
            if (idx !== correctIdx) totalpassed += size; // cause we already counted correctIdx passed distance in the while loop above
            if (passed < dtp + dtp) idx--;
        }
        passed = 0;
        let currPos = positions.at(idx).pos;
        while (idx < positions.length) {
            const itemSize = passed < totalpassed ? getItemSize(items.at(idx), idx) : positions.at(idx).size;
            positions[idx] = { size: itemSize, pos: currPos };

            idx++;
            currPos += itemSize;
            passed += itemSize;
        }
        console.log({ positions });
    };

    const upd = (index: number) => {
        const cache = new Map<number, number>(),
            currPosItem = positions.at(index),
            additionalDistance = currPosItem.pos - (positions.slice(index).find((x, idx, arr) => x.pos - currPosItem.pos >= viewportSize || idx === arr.length - 1)?.pos ?? 0) + viewportSize,
            startPos = Math.max(currPosItem.pos - viewportSize - additionalDistance, 0),
            endPos = startPos + viewportSize * (currPosItem.pos - startPos < viewportSize ? 2 : 3),
            distanceToPass = currPosItem.pos - startPos,
            distToPass = additionalDistance + viewportSize,
            newDist = distToPass + (additionalDistance ? 0 : viewportSize);
        let idx = positions.indexOf(currPosItem),
            totalPassedDistance = 0;
        console.log({ startPos, distToPass, newDist, endPos, scrollerEl, positions: JSON.parse(JSON.stringify(positions)), index, currPosItem: { ...currPosItem }, additionalDistance, distanceToPass });

        if (distToPass) idx += 1;
        while (totalPassedDistance < distToPass) {
            idx--;
            const size = getItemSize(items.at(idx), idx);
            cache.set(idx, size);
            totalPassedDistance += size;
            //idx--;
            if (idx === 0) break;
        }

        let currPos = positions.at(idx).pos,
            passed = 0;
        console.log('idx', idx);
        while (idx < positions.length) {
            //const itemSize = currPos < endPos ? (cache.get(idx) ?? getItemSize(items.at(idx), idx)) : positions.at(idx).size;
            const itemSize = passed < newDist ? (cache.get(idx) ?? getItemSize(items.at(idx), idx)) : positions.at(idx).size;
            positions[idx] = { size: itemSize, pos: currPos };

            idx++;
            currPos += itemSize;
            passed += itemSize;
        }
        console.log('result positions', JSON.parse(JSON.stringify(positions)));
    };

    const setOfCalculatedIndexes = new Set<number>();

    let count = 0;
    const updateByIndexWithChanges = (index: number) => {
        //if (count < 100) {
        //    count++;
        //    console.error('updateByIndexWithEvents before', { positions: JSON.parse(JSON.stringify(positions)), scrollTop: scrollerEl.scrollTop });
        //}
        if (setOfCalculatedIndexes.has(index)) return { jump: 0, totalSizeDiff: 0 };
        setOfCalculatedIndexes.add(index);
        const firstInViewportIdx = binarySearchFirst(scrollerEl.scrollTop, positions);
        const initFirstInViewportPos = positions.at(firstInViewportIdx).pos;
        const initTotalSize = totalSize();

        updateByIndex(index);
        //if (count < 100) {
        //    count++;
        //    console.error('updateByIndexWithEvents after', { positions: JSON.parse(JSON.stringify(positions)) });
        //}

        const totalSizeDiff = totalSize() - initTotalSize;
        const jump = positions.at(firstInViewportIdx).pos - initFirstInViewportPos;
        console.error('totalsizediff', { totalSizeDiff, jump });
        return { jump, totalSizeDiff };
    };

    const updateByIndexWithEvents = (index: number) => {
        const { totalSizeDiff, jump } = updateByIndexWithChanges(index);
        if (totalSizeDiff !== 0) onTotalSizeChanged(totalSizeDiff);
        if (jump !== 0) onJump(jump);
        if (jump !== 0 || totalSizeDiff !== 0) onChange({ jump, totalSizeDiff });
    };

    const updateByScrollPos = (scrollPos: number) => {
        const first = binarySearchFirst(scrollPos, positions);
        updateByIndexWithEvents(first);
    };

    const findByPos = (pos: number) => {
        updateByScrollPos(pos);
        return binarySearchFirst(pos, positions);
    };

    const at = (index: number) => {
        updateByIndexWithEvents(index);
        return positions.at(index);
    };

    const numsInViewport = () => {
        //updateByScrollPos(startPos);
        //return binarySearchFirst(startPos + viewportSize, positions) - binarySearchFirst(startPos, positions) + 1;
        const first = binarySearchFirst(scrollerEl.scrollTop, positions);
        const last = binarySearchFirst(scrollerEl.scrollTop + viewportSize, positions);
        const num = last - first + 1;
        return { first, last, num, tolerated: Math.ceil(num / 2) };
    };

    const totalSize = () => positions.at(-1).pos + positions.at(-1).size;

    const getFirst = (first: number) => {
        const viewport = numsInViewport();
        const newFirst = binarySearchFirst(Math.max(scrollerEl.scrollTop - viewportSize, 0), positions);

        return Math.abs(first - newFirst) > viewport.tolerated ? newFirst : first;
    };

    const getLast = (first: number) => {
        const firstPos = positions.at(first).pos;
        return binarySearchFirst(Math.max(firstPos + viewportSize * 3, totalSize()), positions);
    };

    if (positions.length) {
        const idx = binarySearchFirst(scrollerEl.scrollTop, positions);
        setOfCalculatedIndexes.add(idx);
        updateByIndex(idx);
    }

    return {
        positions,
        updateByIndex,
        updateByScrollPos,
        numsInViewport,
        at,
        totalSize,
        getFirst,
        getLast
    };
};

type GridPos = {
    mainAxis: ItemPos[];
    crossAxis: ItemPos[];
};

export const getInitGridPositions = <T>(items: T[][], defaultSize: { mainAxis: number; crossAxis: number } = { mainAxis: 40, crossAxis: 40 }): GridPos => {
    return {
        mainAxis: items.map((_i, idx) => ({ size: defaultSize.mainAxis, pos: idx * defaultSize.mainAxis })),
        crossAxis: Array.from({ length: Math.max(...items.map((i) => i.length)) }, (_i, idx) => ({ size: defaultSize.crossAxis, pos: idx * defaultSize.crossAxis }))
    };
};

export const calculateGridPositions = <T>(items: T[][], getItemSize: (item: T, mainAxisIdx: number, crossAxisIdx: number) => { crossAxis: number; mainAxis: number }): GridPos => {
    let i = -1,
        itemsLength = items.length,
        mainAxisPos = 0;
    const crossAxisPositionsMap: Record<number, ItemPos> = {};
    const positions: { mainAxis: ItemPos[]; crossAxis: ItemPos[] } = {
        mainAxis: Array.from({ length: itemsLength }),
        crossAxis: []
    };
    while (++i < itemsLength) {
        let maxRowHeight = 0;

        let j = -1,
            childItemLength = items[i].length,
            crossAxisPos = 0;
        while (++j < childItemLength) {
            const size = getItemSize(items[i][j], i, j);
            crossAxisPositionsMap[j] = crossAxisPos > (crossAxisPositionsMap[j]?.pos ?? 0) ? { size: size.crossAxis, pos: crossAxisPos } : crossAxisPositionsMap[j] || { size: size.crossAxis, pos: crossAxisPos };
            crossAxisPos += size.crossAxis || 0;
            maxRowHeight = size.mainAxis > maxRowHeight ? size.mainAxis : maxRowHeight;
        }
        positions.mainAxis[i] = { pos: mainAxisPos, size: maxRowHeight };
        mainAxisPos += maxRowHeight;
    }
    positions.crossAxis = Object.values(crossAxisPositionsMap);
    return positions;
};

export const mergeGridPositions = (gridPositions: GridPos, positionsToMerge: GridPos, mergeIndexes: { mainAxis: number; crossAxis: number }): GridPos => {
    return {
        mainAxis: mergePositions(gridPositions.mainAxis, positionsToMerge.mainAxis, mergeIndexes.mainAxis),
        crossAxis: mergePositions(gridPositions.crossAxis, positionsToMerge.crossAxis, mergeIndexes.crossAxis)
    };
};

@NgModule({
    imports: [Scroller, SharedModule],
    exports: [Scroller, SharedModule]
})
export class ScrollerModule {}
