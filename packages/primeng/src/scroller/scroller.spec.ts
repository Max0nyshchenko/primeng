import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { initPositions, Scroller } from './scroller';
import { By } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';

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
class Wrapper {
    items = Array.from({ length: 1000 }).map((_, i) => `Item #${i}`);
    itemSize = 50;
}

fdescribe('Scroller', () => {
    let fixture: ComponentFixture<Wrapper>;
    let component: Wrapper;
    let scroller: Scroller;
    let scrollerDiv: HTMLDivElement;
    const getRenderedItems = () =>
        fixture.debugElement
            .queryAll(By.css('.p-virtualscroller-content div'))
            .map((x) => x.nativeElement)
            .filter((x) => x instanceof HTMLElement);
    const findByBoundingClientRect = (items: HTMLElement[], predicate: (itemRect: DOMRect, viewportRect: DOMRect, index: number) => boolean) => {
        return items.find((x, i) => predicate(x.getBoundingClientRect(), scrollerDiv.getBoundingClientRect(), i));
    };
    beforeEach(async () => {
        await TestBed.configureTestingModule({ imports: [Wrapper] }).compileComponents();
        fixture = TestBed.createComponent(Wrapper);
        component = fixture.componentInstance;
        fixture.autoDetectChanges();
        scroller = fixture.debugElement.query(By.directive(Scroller)).componentInstance;
        scrollerDiv = scroller.elementViewChild.nativeElement;
    });

    describe('scrollToIndex', () => {
        describe('itemSize-50', () => {
            it('to last index', () => {
                scroller.scrollToIndex(scroller.items.length - 1);
                scrollerDiv.dispatchEvent(new Event('scroll'));

                const renderedItems = getRenderedItems();
                const firstInViewport = findByBoundingClientRect(renderedItems, (itemRect, viewportRect) => itemRect.top <= viewportRect.top && itemRect.bottom > viewportRect.top);
                const lastInViewport = findByBoundingClientRect(renderedItems, (itemRect, viewportRect) => itemRect.bottom === viewportRect.bottom);

                expect(scroller.last).toBe(scroller.items.length);
                expect(firstInViewport).toBeTruthy();
                expect(lastInViewport.textContent.trim()).toBe(component.items.at(-1));
            });

            it('to middle index', () => {
                scroller.scrollToIndex(scroller.items.length / 2);
                scrollerDiv.dispatchEvent(new Event('scroll'));

                const renderedItems = getRenderedItems();
                const firstInViewport = renderedItems.find((x) => {
                    const itemRect = x.getBoundingClientRect();
                    const viewportRect = scrollerDiv.getBoundingClientRect();
                    return itemRect.top < viewportRect.top;
                });
                const lastInViewport = renderedItems.find((x) => {
                    const itemRect = x.getBoundingClientRect();
                    const viewportRect = scrollerDiv.getBoundingClientRect();
                    return itemRect.bottom > viewportRect.bottom;
                });

                expect(scroller.first).not.toBe(0);
                expect(firstInViewport).toBeTruthy();
                expect(lastInViewport).toBeTruthy();
            });
        });

        describe('itemSize-5', () => {
            it('to last index', () => {
                component.itemSize = 5;
                fixture.detectChanges();
                scroller.scrollToIndex(scroller.items.length - 1);
                scrollerDiv.dispatchEvent(new Event('scroll'));

                const renderedItems = getRenderedItems();
                const firstInViewport = renderedItems.find((x) => {
                    const itemRect = x.getBoundingClientRect();
                    const viewportRect = scrollerDiv.getBoundingClientRect();
                    return itemRect.top <= viewportRect.top && itemRect.bottom > viewportRect.top;
                });
                const lastInViewport = renderedItems.find((x, i) => {
                    const itemRect = x.getBoundingClientRect();
                    const viewportRect = scrollerDiv.getBoundingClientRect();
                    return itemRect.bottom === viewportRect.bottom && i === renderedItems.length - 1;
                });

                expect(scroller.last).toBe(scroller.items.length);
                expect(firstInViewport).toBeTruthy();
                expect(lastInViewport.textContent.trim()).toBe(component.items.at(-1));
            });

            it('to middle index', () => {
                component.itemSize = 5;
                fixture.detectChanges();
                scroller.scrollToIndex(scroller.items.length / 2);
                scrollerDiv.dispatchEvent(new Event('scroll'));

                const renderedItems = getRenderedItems();
                const firstInViewport = renderedItems.find((x) => {
                    const itemRect = x.getBoundingClientRect();
                    const viewportRect = scrollerDiv.getBoundingClientRect();
                    return itemRect.top < viewportRect.top;
                });
                const lastInViewport = renderedItems.find((x) => {
                    const itemRect = x.getBoundingClientRect();
                    const viewportRect = scrollerDiv.getBoundingClientRect();
                    return itemRect.bottom > viewportRect.bottom;
                });

                expect(scroller.first).not.toBe(0);
                expect(firstInViewport).toBeTruthy();
                expect(lastInViewport).toBeTruthy();
            });
        });
    });

    describe('user scrolling', () => {
        describe('itemSize-50', () => {
            it('to the bottom', () => {
                scroller.scrollTo({ top: scroller._poss.totalSize() });
                scrollerDiv.dispatchEvent(new Event('scroll'));

                const renderedItems = getRenderedItems();
                const firstInViewport = renderedItems.find((x) => {
                    const itemRect = x.getBoundingClientRect();
                    const viewportRect = scrollerDiv.getBoundingClientRect();
                    return itemRect.top < viewportRect.top;
                });
                const lastInViewport = renderedItems.find((x) => {
                    const itemRect = x.getBoundingClientRect();
                    const viewportRect = scrollerDiv.getBoundingClientRect();
                    return itemRect.bottom === viewportRect.bottom;
                });

                expect(scroller.last).toBe(scroller.items.length);
                expect(firstInViewport).toBeTruthy();
                expect(lastInViewport.textContent.trim()).toBe(component.items.at(-1));
            });

            it('to the middle', () => {
                scroller.scrollTo({ top: scroller._poss.totalSize() / 2 });
                scrollerDiv.dispatchEvent(new Event('scroll'));

                const renderedItems = getRenderedItems();
                const firstInViewport = renderedItems.find((x) => {
                    const itemRect = x.getBoundingClientRect();
                    const viewportRect = scrollerDiv.getBoundingClientRect();
                    return itemRect.top < viewportRect.top;
                });
                const lastInViewport = renderedItems.find((x) => {
                    const itemRect = x.getBoundingClientRect();
                    const viewportRect = scrollerDiv.getBoundingClientRect();
                    return itemRect.bottom > viewportRect.bottom;
                });

                expect(scroller.first).not.toBe(0);
                expect(firstInViewport).toBeTruthy();
                expect(lastInViewport).toBeTruthy();
            });
        });
    });
});

describe('initPositions', () => {
    const getItems = (len: number = 5) => Array.from({ length: len }, (_, idx) => `Item #${idx}`);
    it('should create positions with default values', () => {
        const positions = initPositions({ items: getItems(), getItemSize: () => 50, viewportSize: 200 });

        expect(positions.positions).toEqual([
            { size: 40, pos: 0 },
            { size: 40, pos: 40 },
            { size: 40, pos: 80 },
            { size: 40, pos: 120 },
            { size: 40, pos: 160 }
        ]);
    });

    it('should calculate real positions', () => {
        const positions = initPositions({ items: getItems(), getItemSize: () => 50, viewportSize: 200 });
        positions.updateByIndex(-1);

        expect(positions.positions).toEqual([
            { size: 50, pos: 0 },
            { size: 50, pos: 50 },
            { size: 50, pos: 100 },
            { size: 50, pos: 150 },
            { size: 50, pos: 200 }
        ]);
    });

    it('should calculate real positions and adjust leftover positions', () => {
        const positions = initPositions({ items: getItems(), getItemSize: () => 200, viewportSize: 200 });
        positions.updateByIndex(1);

        expect(positions.positions).toEqual([
            { size: 200, pos: 0 },
            { size: 200, pos: 200 },
            { size: 200, pos: 400 },
            { size: 40, pos: 600 },
            { size: 40, pos: 640 }
        ]);
    });
});
