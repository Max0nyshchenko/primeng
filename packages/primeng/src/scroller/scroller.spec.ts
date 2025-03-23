import { Component, Type } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { binarySearchFirst, initGridPositions, initPositions, Scroller } from './scroller';
import { BrowserModule, By } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { BrowserAnimationsModule, NoopAnimationsModule, provideAnimations } from '@angular/platform-browser/animations';
import { debounce, debounceTime, first, fromEvent, lastValueFrom, map, of, switchMap, take, tap } from 'rxjs';

fdescribe('mytest', () => {
    @Component({
        template: `
            <p-virtualscroller [items]="items" [itemSize]="itemSize" scrollHeight="200px" styleClass="border border-surface" [style]="{ width: '200px', height: '200px' }">
                <ng-template #item let-item let-options="options">
                    <div class="flex items-center p-2" [ngClass]="{ 'bg-surface-100 dark:bg-surface-700': options.odd }" style="height: {{ itemSize }}px; overflow: hidden;">
                        {{ item }}
                    </div>
                </ng-template>
            </p-virtualscroller>
        `,
        imports: [Scroller, CommonModule]
    })
    class BasicScrollerWrapper {
        items = Array.from({ length: 1000 }).map((_, i) => `Item #${i}`);
        itemSize = 50;
    }

    const getRenderedItems = <T>(fixture: ComponentFixture<T>) =>
        fixture.debugElement
            .queryAll(By.css('.p-virtualscroller-content div'))
            .map((x) => x.nativeElement)
            .filter((x) => x instanceof HTMLElement);
    const findByBoundingClientRect = (items: HTMLElement[], scrollerDiv: HTMLDivElement, predicate: (itemRect: DOMRect, viewportRect: DOMRect, index: number) => boolean) => {
        return items.find((x, i) => predicate(x.getBoundingClientRect(), scrollerDiv.getBoundingClientRect(), i));
    };
    const getFirstInViewport = <T>(fixture: ComponentFixture<T>, scrollerDiv: HTMLDivElement) =>
        findByBoundingClientRect(getRenderedItems(fixture), scrollerDiv, (itemRect, viewportRect) => itemRect.top <= viewportRect.top && itemRect.bottom > viewportRect.top);
    const getLastInViewport = <T>(fixture: ComponentFixture<T>, scrollerDiv: HTMLDivElement) =>
        findByBoundingClientRect(getRenderedItems(fixture), scrollerDiv, (itemRect, viewportRect) => itemRect.top <= viewportRect.bottom && itemRect.bottom >= viewportRect.bottom);
    const getBoundaryViewportItems = <T>(fixture: ComponentFixture<T>, scrollerDiv: HTMLDivElement) => ({ lastInViewport: getLastInViewport(fixture, scrollerDiv), firstInViewport: getFirstInViewport(fixture, scrollerDiv) });
    const expandInViewport = <T>(num: number, fixture: ComponentFixture<T>) => {
        getRenderedItems(fixture)
            .slice(0, num)
            .forEach((item) => item.click());
    };

    describe('Scroller', () => {
        let fixture: ComponentFixture<BasicScrollerWrapper>;
        let component: BasicScrollerWrapper;
        let scroller: Scroller;
        let scrollerDiv: HTMLDivElement;
        beforeEach(async () => {
            await TestBed.configureTestingModule({ imports: [BasicScrollerWrapper] }).compileComponents();
            fixture = TestBed.createComponent(BasicScrollerWrapper);
            component = fixture.componentInstance;
            fixture.autoDetectChanges();
            scroller = fixture.debugElement.query(By.directive(Scroller)).componentInstance;
            scrollerDiv = scroller.elementViewChild.nativeElement;
        });

        it('should scrollToIndex of the last index with itemSize equals to 50', () => {
            scroller.scrollToIndex(scroller.items.length - 1);
            scrollerDiv.dispatchEvent(new Event('scroll'));

            const renderedItems = getRenderedItems(fixture);
            const firstInViewport = findByBoundingClientRect(renderedItems, scrollerDiv, (itemRect, viewportRect) => itemRect.top <= viewportRect.top && itemRect.bottom > viewportRect.top);
            const lastInViewport = findByBoundingClientRect(renderedItems, scrollerDiv, (itemRect, viewportRect) => itemRect.bottom === viewportRect.bottom);

            expect(scroller.last).toBe(scroller.items.length);
            expect(firstInViewport).toBeTruthy();
            expect(lastInViewport.textContent.trim()).toBe(component.items.at(-1));
        });

        it('should scrollToIndex of the middle index with itemSize equals to 50', () => {
            const itemIdx = scroller.items.length / 2;
            scroller.scrollToIndex(itemIdx);
            scrollerDiv.dispatchEvent(new Event('scroll'));

            const { firstInViewport, lastInViewport } = getBoundaryViewportItems(fixture, scrollerDiv);

            expect(scroller.first).not.toBe(0);
            expect(firstInViewport.textContent.trim()).toBe(component.items.at(itemIdx));
            expect(lastInViewport).toBeTruthy();
        });

        it('should scrollToIndex of the last index with itemSize equals to 5', () => {
            component.itemSize = 5;
            fixture.detectChanges();
            scroller.scrollToIndex(scroller.items.length - 1);
            scrollerDiv.dispatchEvent(new Event('scroll'));

            const { firstInViewport, lastInViewport } = getBoundaryViewportItems(fixture, scrollerDiv);

            expect(scroller.last).toBe(scroller.items.length);
            expect(firstInViewport).toBeTruthy();
            expect(lastInViewport.textContent.trim()).toBe(component.items.at(-1));
        });

        it('should scrollToIndex of the middle index with itemSize equals to 5', () => {
            component.itemSize = 5;
            fixture.detectChanges();
            const itemIdx = scroller.items.length / 2;
            scroller.scrollToIndex(itemIdx);
            scrollerDiv.dispatchEvent(new Event('scroll'));

            const { firstInViewport, lastInViewport } = getBoundaryViewportItems(fixture, scrollerDiv);

            expect(scroller.first).not.toBe(0);
            expect(firstInViewport.textContent.trim()).toBe(component.items.at(itemIdx));
            expect(lastInViewport).toBeTruthy();
        });

        it('should scrollTo the bottom with itemSize equals to 50', () => {
            scroller.scrollTo({ top: scroller._poss.totalSize().main });
            scrollerDiv.dispatchEvent(new Event('scroll'));

            const { firstInViewport, lastInViewport } = getBoundaryViewportItems(fixture, scrollerDiv);

            expect(scroller.last).toBe(scroller.items.length);
            expect(firstInViewport).toBeTruthy();
            expect(lastInViewport.textContent.trim()).toBe(component.items.at(-1));
        });

        it('should scrollTo the middle with itemSize equals to 50', () => {
            scroller.scrollTo({ top: scroller._poss.totalSize().main / 2 });
            scrollerDiv.dispatchEvent(new Event('scroll'));

            const { firstInViewport, lastInViewport } = getBoundaryViewportItems(fixture, scrollerDiv);

            expect(scroller.first).not.toBe(0);
            expect(firstInViewport).toBeTruthy();
            expect(lastInViewport).toBeTruthy();
        });
    });

    @Component({
        template: `
            <p-virtualscroller [items]="items" [itemSize]="recreateItemSizeOnEachRender ? itemSize.bind(this) : itemSize" scrollHeight="200px" styleClass="border border-surface" [style]="{ width: '200px', height: '200px' }">
                <ng-template #item let-item let-options="options">
                    <div
                        (click)="expandedItems.has(item) ? expandedItems.delete(item) : expandedItems.add(item)"
                        class="flex items-center p-2"
                        [ngClass]="{ 'bg-surface-100 dark:bg-surface-700': options.odd }"
                        style="height: {{ itemSize(item).mainAxis }}px; overflow: hidden;"
                    >
                        {{ item }}
                    </div>
                </ng-template>
            </p-virtualscroller>
        `,
        imports: [Scroller, CommonModule],
        providers: [provideAnimations()]
    })
    class FlexibleScrollerWrapper {
        items = Array.from({ length: 1000 }).map((_, i) => `Item #${i}`);
        expandedItems = new Set<string>();
        itemSize = (item: string) => ({ mainAxis: this.expandedItems.has(item) ? 100 : 30 });
        recreateItemSizeOnEachRender = false;
    }

    describe('Flexible Scroller', () => {
        let fixture: ComponentFixture<FlexibleScrollerWrapper>;
        let component: FlexibleScrollerWrapper;
        let scroller: Scroller;
        let scrollerDiv: HTMLDivElement;
        beforeEach(async () => {
            await TestBed.configureTestingModule({ imports: [FlexibleScrollerWrapper] }).compileComponents();
            fixture = TestBed.createComponent(FlexibleScrollerWrapper);
            component = fixture.componentInstance;
            fixture.autoDetectChanges();
            scroller = fixture.debugElement.query(By.directive(Scroller)).componentInstance;
            scrollerDiv = scroller.elementViewChild.nativeElement;
        });

        it('should scrollToIndex of the last item', () => {
            scroller.scrollToIndex(component.items.length - 1);
            scrollerDiv.dispatchEvent(new Event('scroll'));

            const { firstInViewport, lastInViewport } = getBoundaryViewportItems(fixture, scrollerDiv);

            expect(firstInViewport).toBeTruthy();
            expect(lastInViewport.textContent.trim()).toBe(component.items.at(-1));
        });

        it('should scrollToIndex of the middle item', () => {
            const itemIdx = component.items.length / 2;
            scroller.scrollToIndex(itemIdx);
            scrollerDiv.dispatchEvent(new Event('scroll'));

            const { firstInViewport, lastInViewport } = getBoundaryViewportItems(fixture, scrollerDiv);

            expect(firstInViewport.textContent.trim()).toBe(component.items.at(itemIdx));
            expect(lastInViewport).toBeTruthy();
        });

        it('should scrollTo the middle', () => {
            scroller.scrollTo({ top: scrollerDiv.scrollHeight / 2 });
            scrollerDiv.dispatchEvent(new Event('scroll'));

            const { firstInViewport, lastInViewport } = getBoundaryViewportItems(fixture, scrollerDiv);

            expect(firstInViewport).toBeTruthy();
            expect(lastInViewport).toBeTruthy();
        });

        it('should scrollTo the bottom', () => {
            scroller.scrollTo({ top: scrollerDiv.scrollHeight });
            scrollerDiv.dispatchEvent(new Event('scroll'));

            const { firstInViewport, lastInViewport } = getBoundaryViewportItems(fixture, scrollerDiv);

            expect(firstInViewport).toBeTruthy();
            expect(lastInViewport.textContent.trim()).toBe(component.items.at(-1));
        });

        it('should expand first item', () => {
            const { firstInViewport } = getBoundaryViewportItems(fixture, scrollerDiv);
            firstInViewport.click();

            expect(firstInViewport.offsetHeight).toBe(100);
        });

        it('should expand first 5 items and scrollTo the middle', () => {
            expandInViewport(5, fixture);
            scroller.scrollTo({ top: scrollerDiv.scrollHeight / 2 });
            scrollerDiv.dispatchEvent(new Event('scroll'));

            const { firstInViewport, lastInViewport } = getBoundaryViewportItems(fixture, scrollerDiv);

            expect(firstInViewport).toBeTruthy();
            expect(lastInViewport).toBeTruthy();
        });

        it('should expand first 5 items and scrollTo the bottom', () => {
            expandInViewport(5, fixture);
            scroller.scrollTo({ top: scrollerDiv.scrollHeight });
            scrollerDiv.dispatchEvent(new Event('scroll'));

            const { firstInViewport, lastInViewport } = getBoundaryViewportItems(fixture, scrollerDiv);

            expect(firstInViewport).toBeTruthy();
            expect(lastInViewport.textContent.trim()).toBe(component.items.at(-1));
        });

        it('should expand first 5 items and scrollToIndex of the middle item', () => {
            expandInViewport(5, fixture);
            const itemIdx = component.items.length / 2;
            scroller.scrollToIndex(itemIdx);
            scrollerDiv.dispatchEvent(new Event('scroll'));

            const { firstInViewport, lastInViewport } = getBoundaryViewportItems(fixture, scrollerDiv);

            expect(firstInViewport.textContent.trim()).toBe(component.items.at(itemIdx));
            expect(lastInViewport).toBeTruthy();
        });

        it('should expand first 5 items and scrollToIndex of the last item', () => {
            expandInViewport(5, fixture);
            scroller.scrollToIndex(component.items.length - 1);
            scrollerDiv.dispatchEvent(new Event('scroll'));

            const { firstInViewport, lastInViewport } = getBoundaryViewportItems(fixture, scrollerDiv);

            expect(firstInViewport).toBeTruthy();
            expect(lastInViewport.textContent.trim()).toBe(component.items.at(-1));
        });

        it('should smoothly scrollToIndex of the middle item', async () => {
            const itemIdx = component.items.length / 2;
            scroller.scrollToIndex(itemIdx, 'smooth');
            const scroll$ = fromEvent(scrollerDiv, 'scroll').pipe(
                tap(() => scrollerDiv.dispatchEvent(new Event('scroll'))),
                debounceTime(100),
                first()
            );
            await lastValueFrom(scroll$);

            const { firstInViewport, lastInViewport } = getBoundaryViewportItems(fixture, scrollerDiv);

            expect(firstInViewport.textContent.trim()).toBe(component.items.at(itemIdx));
            expect(lastInViewport).toBeTruthy();
        });

        it('should smoothly scrollTo the middle', async () => {
            const scrollTo = scrollerDiv.scrollHeight / 2;
            scroller.scrollTo({ top: scrollTo, behavior: 'smooth' });
            const scroll$ = fromEvent(scrollerDiv, 'scroll').pipe(
                tap(() => scrollerDiv.dispatchEvent(new Event('scroll'))),
                debounceTime(100),
                first()
            );
            await lastValueFrom(scroll$);
            const itemIdx = binarySearchFirst(scrollTo, scroller._poss.positions.mainAxis);

            const { firstInViewport, lastInViewport } = getBoundaryViewportItems(fixture, scrollerDiv);

            expect(firstInViewport.textContent.trim()).toBe(component.items.at(itemIdx));
            expect(lastInViewport).toBeTruthy();
        });

        it('should scrollTo the middle while recreating itemSize function on every render', async () => {
            component.recreateItemSizeOnEachRender = true;
            fixture.detectChanges();
            const scrollPos = scrollerDiv.scrollHeight / 2;
            scroller.scrollTo({ top: scrollPos });
            const scroll$ = fromEvent(scrollerDiv, 'scroll').pipe(
                tap(() => scrollerDiv.dispatchEvent(new Event('scroll'))),
                debounceTime(100),
                first()
            );
            await lastValueFrom(scroll$);
            const itemIdx = binarySearchFirst(scrollPos, scroller._poss.positions.mainAxis);

            const { firstInViewport, lastInViewport } = getBoundaryViewportItems(fixture, scrollerDiv);

            expect(firstInViewport.textContent.trim()).toBe(component.items.at(itemIdx));
            expect(lastInViewport).toBeTruthy();
        });

        it('should smoothly scrollTo the middle while recreating itemSize function on every render', async () => {
            component.recreateItemSizeOnEachRender = true;
            fixture.detectChanges();
            const scrollPos = scrollerDiv.scrollHeight / 2;
            scroller.scrollTo({ top: scrollPos, behavior: 'smooth' });
            const scroll$ = fromEvent(scrollerDiv, 'scroll').pipe(
                tap(() => scrollerDiv.dispatchEvent(new Event('scroll'))),
                debounceTime(100),
                first()
            );
            await lastValueFrom(scroll$);
            const itemIdx = binarySearchFirst(scrollPos, scroller._poss.positions.mainAxis);

            const { firstInViewport, lastInViewport } = getBoundaryViewportItems(fixture, scrollerDiv);

            expect(firstInViewport.textContent.trim()).toBe(component.items.at(itemIdx));
            expect(lastInViewport).toBeTruthy();
        });
    });

    describe('initPositions', () => {
        const getItems = (len: number = 5) => Array.from({ length: len }, (_, idx) => `Item #${idx}`);
        it('should create positions', () => {
            const positions = initPositions({ items: getItems(10), scrollerEl: { scrollTop: 0 }, getItemSize: () => 50, viewportSize: 200 });

            expect(positions.positions).toEqual({
                mainAxis: [
                    { size: 50, pos: 0 },
                    { size: 50, pos: 50 },
                    { size: 50, pos: 100 },
                    { size: 50, pos: 150 },
                    { size: 50, pos: 200 },
                    { size: 50, pos: 250 },
                    { size: 50, pos: 300 },
                    { size: 50, pos: 350 },
                    { size: 40, pos: 400 },
                    { size: 40, pos: 440 }
                ],
                crossAxis: []
            });
        });

        it('should calculate positions at the bottom', () => {
            const positions = initPositions({ items: getItems(10), scrollerEl: { scrollTop: 0 }, getItemSize: () => 200, viewportSize: 200 });
            positions.updateByIndex(-1);

            expect(positions.positions).toEqual({
                mainAxis: [
                    { size: 200, pos: 0 },
                    { size: 200, pos: 200 },
                    { size: 40, pos: 400 },
                    { size: 40, pos: 440 },
                    { size: 40, pos: 480 },
                    { size: 40, pos: 520 },
                    { size: 40, pos: 560 },
                    { size: 40, pos: 600 },
                    { size: 200, pos: 640 },
                    { size: 200, pos: 840 }
                ],
                crossAxis: []
            });
        });

        it('should calculate positions at the middle', () => {
            const positions = initPositions({ items: getItems(10), scrollerEl: { scrollTop: 0 }, getItemSize: () => 200, viewportSize: 200 });
            positions.updateByIndex(4);

            expect(positions.positions).toEqual({
                mainAxis: [
                    { size: 200, pos: 0 },
                    { size: 200, pos: 200 },
                    { size: 40, pos: 400 },
                    { size: 200, pos: 440 },
                    { size: 200, pos: 640 },
                    { size: 200, pos: 840 },
                    { size: 40, pos: 1040 },
                    { size: 40, pos: 1080 },
                    { size: 40, pos: 1120 },
                    { size: 40, pos: 1160 }
                ],
                crossAxis: []
            });
        });

        it('should calculate real positions and adjust leftover positions from top down', () => {
            const positions = initPositions({ items: getItems(), scrollerEl: { scrollTop: 0 }, getItemSize: () => 200, viewportSize: 200 });
            positions.updateByIndex(1);

            expect(positions.positions).toEqual({
                mainAxis: [
                    { size: 200, pos: 0 },
                    { size: 200, pos: 200 },
                    { size: 40, pos: 400 },
                    { size: 40, pos: 440 },
                    { size: 40, pos: 480 }
                ],
                crossAxis: []
            });
        });

        it('should calculate real positions and adjust leftover positions from bottom up', () => {
            const positions = initPositions({ items: getItems(), scrollerEl: { scrollTop: 0 }, getItemSize: () => 200, viewportSize: 200 });
            positions.updateByIndex(-1);

            expect(positions.positions).toEqual({
                mainAxis: [
                    { size: 200, pos: 0 },
                    { size: 200, pos: 200 },
                    { size: 40, pos: 400 },
                    { size: 200, pos: 440 },
                    { size: 200, pos: 640 }
                ],
                crossAxis: []
            });
        });

        it('should calculate correct jumps', () => {
            let actualJump: number;
            const scrollerEl = { scrollTop: 0 };
            const positions = initPositions({ items: getItems(100), scrollerEl, getItemSize: () => 200, viewportSize: 200, onChange: ({ jump }) => (actualJump = jump) });
            const itemIdx = 50;
            const positionBefore = positions.positions.mainAxis.at(itemIdx).pos;
            scrollerEl.scrollTop = positionBefore;
            positions.at(25);
            const expectedJump = positions.positions.mainAxis.at(itemIdx).pos - positionBefore;

            expect(actualJump).toBe(expectedJump);
        });

        it('should be pure', () => {
            const positions = initPositions({ items: getItems(100), scrollerEl: { scrollTop: 0 }, getItemSize: () => 200, viewportSize: 200 });
            const positions2 = initPositions({ items: getItems(100), scrollerEl: { scrollTop: 0 }, getItemSize: () => 200, viewportSize: 200 });
            const idx = 25;
            positions.at(idx);
            positions2.at(idx);

            expect(positions.positions).toEqual(positions2.positions);
        });
    });

    describe('initGridPositions', () => {
        const getItems = (lenMain = 5, lenCross = 5) => Array.from({ length: lenMain }, (_, idx) => Array.from({ length: lenCross }, (_, idxCross) => `Item #${idx}_${idxCross}`));
        it('should create positions', () => {
            const { positions } = initGridPositions({ items: getItems(), scrollerEl: { scrollTop: 0, scrollLeft: 0 }, getItemSize: () => ({ main: 50, cross: 60 }), viewportSize: { main: 100, cross: 100 } });
            expect(positions).toEqual({
                mainAxis: [
                    { size: 50, pos: 0 },
                    { size: 50, pos: 50 },
                    { size: 50, pos: 100 },
                    { size: 50, pos: 150 },
                    { size: 40, pos: 200 }
                ],
                crossAxis: [
                    { size: 60, pos: 0 },
                    { size: 60, pos: 60 },
                    { size: 60, pos: 120 },
                    { size: 60, pos: 180 },
                    { size: 40, pos: 240 }
                ]
            });
        });

        it('should calculate positions at the bottom', () => {
            const { positions, updateByIndex } = initGridPositions({
                items: getItems(6, 5),
                scrollerEl: { scrollTop: 340, scrollLeft: 400 },
                getItemSize: (_, mainIdx, crossIdx) => ({ main: [20, 50, 100][mainIdx % 3], cross: [30, 60, 110][crossIdx % 3] }),
                viewportSize: { main: 100, cross: 100 }
            });
            updateByIndex({ main: -1, cross: -1 });

            expect(positions).toEqual({
                mainAxis: [
                    { size: 40, pos: 0 },
                    { size: 40, pos: 40 },
                    { size: 100, pos: 80 },
                    { size: 20, pos: 180 },
                    { size: 50, pos: 200 },
                    { size: 100, pos: 250 }
                ],
                crossAxis: [
                    { size: 40, pos: 0 },
                    { size: 40, pos: 40 },
                    { size: 110, pos: 80 },
                    { size: 30, pos: 190 },
                    { size: 60, pos: 220 }
                ]
            });
        });

        it('should calculate positions at the middle', () => {
            const { positions, updateByIndex } = initGridPositions({
                items: getItems(10, 10),
                scrollerEl: { scrollTop: 160, scrollLeft: 160 },
                getItemSize: (_, mainIdx, crossIdx) => ({ main: [20, 50, 100][mainIdx % 3], cross: [30, 60, 110][crossIdx % 3] }),
                viewportSize: { main: 100, cross: 100 }
            });
            updateByIndex({ main: 4, cross: 4 });

            expect(positions).toEqual({
                mainAxis: [
                    { size: 40, pos: 0 },
                    { size: 40, pos: 40 },
                    { size: 100, pos: 80 },
                    { size: 20, pos: 180 },
                    { size: 50, pos: 200 },
                    { size: 100, pos: 250 },
                    { size: 20, pos: 350 },
                    { size: 50, pos: 370 },
                    { size: 40, pos: 420 },
                    { size: 40, pos: 460 }
                ],
                crossAxis: [
                    { size: 40, pos: 0 },
                    { size: 40, pos: 40 },
                    { size: 110, pos: 80 },
                    { size: 30, pos: 190 },
                    { size: 60, pos: 220 },
                    { size: 110, pos: 280 },
                    { size: 30, pos: 390 },
                    { size: 40, pos: 420 },
                    { size: 40, pos: 460 },
                    { size: 40, pos: 500 }
                ]
            });
        });

        it('should calculate real positions and adjust leftover positions from top down', () => {
            const { positions, updateByIndex } = initGridPositions({ items: getItems(), scrollerEl: { scrollTop: 0, scrollLeft: 0 }, getItemSize: () => ({ main: 200, cross: 200 }), viewportSize: { main: 200, cross: 200 } });
            updateByIndex({ main: 1, cross: 1 });

            expect(positions).toEqual({
                mainAxis: [
                    { size: 200, pos: 0 },
                    { size: 200, pos: 200 },
                    { size: 200, pos: 400 },
                    { size: 40, pos: 600 },
                    { size: 40, pos: 640 }
                ],
                crossAxis: [
                    { size: 200, pos: 0 },
                    { size: 200, pos: 200 },
                    { size: 200, pos: 400 },
                    { size: 40, pos: 600 },
                    { size: 40, pos: 640 }
                ]
            });
        });

        it('should calculate real positions and adjust leftover positions from bottom up', () => {
            const { positions, updateByIndex } = initGridPositions({ items: getItems(), scrollerEl: { scrollTop: 0, scrollLeft: 0 }, getItemSize: () => ({ main: 200, cross: 200 }), viewportSize: { main: 200, cross: 200 } });
            updateByIndex({ main: -1, cross: -1 });

            expect(positions).toEqual({
                mainAxis: [
                    { size: 200, pos: 0 },
                    { size: 200, pos: 200 },
                    { size: 40, pos: 400 },
                    { size: 200, pos: 440 },
                    { size: 200, pos: 640 }
                ],
                crossAxis: [
                    { size: 200, pos: 0 },
                    { size: 200, pos: 200 },
                    { size: 40, pos: 400 },
                    { size: 200, pos: 440 },
                    { size: 200, pos: 640 }
                ]
            });
        });

        it('should calculate correct jumps', () => {
            let actualJump: { main: number; cross: number };
            const scrollerEl = { scrollTop: 0, scrollLeft: 0 };
            const { positions, at } = initGridPositions({ items: getItems(100, 100), scrollerEl, getItemSize: () => ({ main: 200, cross: 200 }), viewportSize: { main: 200, cross: 200 }, onChange: ({ jump }) => (actualJump = jump) });
            const itemIdx = { main: 50, cross: 50 };
            const positionBefore = { main: positions.mainAxis.at(itemIdx.main).pos, cross: positions.crossAxis.at(itemIdx.cross).pos };
            scrollerEl.scrollTop = positionBefore.main;
            scrollerEl.scrollLeft = positionBefore.cross;
            at(25);
            const expectedJump = {
                main: positions.mainAxis.at(itemIdx.main).pos - positionBefore.main,
                cross: positions.crossAxis.at(itemIdx.cross).pos - positionBefore.cross
            };

            expect(actualJump).toEqual(expectedJump);
        });

        it('should be pure', () => {
            const positions = initGridPositions({ items: getItems(100), scrollerEl: { scrollTop: 0, scrollLeft: 0 }, getItemSize: () => ({ main: 200, cross: 200 }), viewportSize: { main: 200, cross: 200 } });
            const positions2 = initGridPositions({ items: getItems(100), scrollerEl: { scrollTop: 0, scrollLeft: 0 }, getItemSize: () => ({ main: 200, cross: 200 }), viewportSize: { main: 200, cross: 200 } });
            const idx = 25;
            positions.at(idx, idx);
            positions2.at(idx, idx);

            expect(positions.positions).toEqual(positions2.positions);
        });
    });
});
