import { Component, Type } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { initPositions, Scroller } from './scroller';
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
            scroller.scrollTo({ top: scroller._poss.totalSize() });
            scrollerDiv.dispatchEvent(new Event('scroll'));

            const { firstInViewport, lastInViewport } = getBoundaryViewportItems(fixture, scrollerDiv);

            expect(scroller.last).toBe(scroller.items.length);
            expect(firstInViewport).toBeTruthy();
            expect(lastInViewport.textContent.trim()).toBe(component.items.at(-1));
        });

        it('should scrollTo the middle with itemSize equals to 50', () => {
            scroller.scrollTo({ top: scroller._poss.totalSize() / 2 });
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
        items = Array.from({ length: 100 }).map((_, i) => `Item #${i}`);
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

        xit('should smoothly scrollToIndex of the middle item', async () => {
            const itemIdx = component.items.length / 2;
            scroller.scrollToIndex(itemIdx, 'smooth');
            const scroll$ = fromEvent(scrollerDiv, 'scroll').pipe(
                tap(() => scrollerDiv.dispatchEvent(new Event('scroll'))),
                debounceTime(100),
                first()
            );
            await lastValueFrom(scroll$);
            //scrollerDiv.dispatchEvent(new Event('scroll'));
            //fixture.detectChanges();
            //scrollerDiv.dispatchEvent(new Event('scroll'));
            console.error('After Dispatch');

            const { firstInViewport, lastInViewport } = getBoundaryViewportItems(fixture, scrollerDiv);

            expect(firstInViewport.textContent.trim()).toBe(component.items.at(itemIdx));
            expect(lastInViewport).toBeTruthy();
        });

        xit('should smoothly scrollTo the middle', async () => {
            const itemIdx = component.items.length / 2;
            scroller.scrollTo({ top: scrollerDiv.scrollHeight / 2, behavior: 'smooth' });
            const scroll$ = fromEvent(scrollerDiv, 'scroll').pipe(
                tap(() => scrollerDiv.dispatchEvent(new Event('scroll'))),
                debounceTime(100),
                first()
            );
            await lastValueFrom(scroll$);
            //scrollerDiv.dispatchEvent(new Event('scroll'));
            //fixture.detectChanges();
            //scrollerDiv.dispatchEvent(new Event('scroll'));
            console.error('After Dispatch');

            const { firstInViewport, lastInViewport } = getBoundaryViewportItems(fixture, scrollerDiv);

            expect(firstInViewport.textContent.trim()).toBe(component.items.at(itemIdx));
            expect(lastInViewport).toBeTruthy();
        });

        xit('should scrollTo the middle while recreating itemSize function on every render', async () => {
            component.recreateItemSizeOnEachRender = true;
            fixture.detectChanges();
            const itemIdx = component.items.length / 2;
            scroller.scrollTo({ top: scrollerDiv.scrollHeight / 2 });
            const scroll$ = fromEvent(scrollerDiv, 'scroll').pipe(
                tap(() => scrollerDiv.dispatchEvent(new Event('scroll'))),
                debounceTime(100),
                first()
            );
            await lastValueFrom(scroll$);

            const { firstInViewport, lastInViewport } = getBoundaryViewportItems(fixture, scrollerDiv);

            expect(firstInViewport.textContent.trim()).toBe(component.items.at(itemIdx));
            expect(lastInViewport).toBeTruthy();

            // issues here
            // we scroll the first time, calculate the segment based on first in viewport
            // we then set content based on first outside of viewport
            // between these calls we have jumps calculations
            // jumps then trigger new scrolls, but that way in 3 cycles or so we would stop
            // then we initialize new positions on each render and after few renders it should work
        });
    });

    describe('initPositions', () => {
        const getItems = (len: number = 5) => Array.from({ length: len }, (_, idx) => `Item #${idx}`);
        it('should create positions with default values', () => {
            const positions = initPositions({ items: getItems(), scrollerEl: { scrollTop: 0 }, getItemSize: () => 50, viewportSize: 200 });

            expect(positions.positions).toEqual([
                { size: 40, pos: 0 },
                { size: 40, pos: 40 },
                { size: 40, pos: 80 },
                { size: 40, pos: 120 },
                { size: 40, pos: 160 }
            ]);
        });

        it('should calculate real positions', () => {
            const positions = initPositions({ items: getItems(), scrollerEl: { scrollTop: 0 }, getItemSize: () => 50, viewportSize: 200 });
            positions.updateByIndex(-1);

            expect(positions.positions).toEqual([
                { size: 50, pos: 0 },
                { size: 50, pos: 50 },
                { size: 50, pos: 100 },
                { size: 50, pos: 150 },
                { size: 50, pos: 200 }
            ]);
        });

        it('should calculate real positions and adjust leftover positions from top down', () => {
            const positions = initPositions({ items: getItems(), scrollerEl: { scrollTop: 0 }, getItemSize: () => 200, viewportSize: 200 });
            positions.updateByIndex(1);

            expect(positions.positions).toEqual([
                { size: 200, pos: 0 },
                { size: 200, pos: 200 },
                { size: 200, pos: 400 },
                { size: 40, pos: 600 },
                { size: 40, pos: 640 }
            ]);
        });

        it('should calculate real positions and adjust leftover positions from bottom up', () => {
            const positions = initPositions({ items: getItems(), scrollerEl: { scrollTop: 0 }, getItemSize: () => 200, viewportSize: 200 });
            positions.updateByIndex(-1);

            expect(positions.positions).toEqual([
                { size: 40, pos: 0 },
                { size: 40, pos: 40 },
                { size: 40, pos: 80 },
                { size: 200, pos: 120 },
                { size: 200, pos: 320 }
            ]);
        });

        it('should calculate correct jumps', () => {
            let actualJump: number;
            const scrollerEl = { scrollTop: 0 };
            const positions = initPositions({ items: getItems(100), scrollerEl, getItemSize: () => 200, viewportSize: 200, onChange: ({ jump }) => (actualJump = jump) });
            const itemIdx = 50;
            const positionBefore = positions.positions.at(itemIdx).pos;
            scrollerEl.scrollTop = positionBefore;
            positions.at(25);
            const expectedJump = positions.positions.at(itemIdx).pos - positionBefore;

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
});
