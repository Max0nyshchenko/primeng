import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Scroller } from './scroller';
import { By } from '@angular/platform-browser';

@Component({
    template: `
        <p-virtualscroller [items]="items" [itemSize]="itemSize" scrollHeight="200px" styleClass="border border-surface" [style]="{ width: '200px', height: '200px' }">
            <ng-template #item let-item let-options="options">
                <div class="flex items-center p-2" [ngClass]="{ 'bg-surface-100 dark:bg-surface-700': options.odd }" style="height: {{ itemSize }}px;">
                    {{ item }}
                </div>
            </ng-template>
        </p-virtualscroller>
    `,
    imports: [Scroller]
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
    beforeEach(async () => {
        await TestBed.configureTestingModule({ imports: [Wrapper] }).compileComponents();
        fixture = TestBed.createComponent(Wrapper);
        component = fixture.componentInstance;
        fixture.autoDetectChanges();
        scroller = fixture.debugElement.query(By.directive(Scroller)).componentInstance;
        scroller = fixture.debugElement.query(By.directive(Scroller)).nativeElement;
    });

    describe('scrollToIndex', () => {
        it('to last index', () => {
            scroller.scrollToIndex(scroller.items.length - 1);
            scrollerDiv.dispatchEvent(new Event('scroll'));

            const renderedItems = getRenderedItems();
            const firstInViewport = renderedItems.find((x) => {
                const itemRect = x.getBoundingClientRect();
                const viewportRect = scrollerDiv.getBoundingClientRect();
                return itemRect.top <= viewportRect.top && itemRect.bottom > viewportRect.top;
            });
            const lastInViewport = renderedItems.find((x) => {
                const itemRect = x.getBoundingClientRect();
                const viewportRect = scrollerDiv.getBoundingClientRect();
                return itemRect.bottom === viewportRect.bottom;
            });

            expect(scroller.last).toBe(scroller.items.length - 1);
            expect(firstInViewport).toBeTruthy();
            expect(lastInViewport).toBeTruthy();
        });
    });
});
