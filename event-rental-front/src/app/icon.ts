import { Component, input } from '@angular/core';

@Component({
  selector: 'app-icon',
  template: `<svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.65"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    @for (path of paths[name()] || paths['box']; track $index) {
      <path [attr.d]="path" />
    }
  </svg>`,
  styles: [
    ':host{display:inline-flex;width:24px;height:24px;flex-shrink:0}svg{width:100%;height:100%}',
  ],
})
export class IconComponent {
  readonly name = input('box');
  readonly paths: Record<string, string[]> = {
    home: ['m3 10 9-7 9 7', 'M5 9v11h5v-6h4v6h5V9'],
    dashboard: ['M3 3h7v7H3z M14 3h7v4h-7z M14 11h7v10h-7z M3 14h7v7H3z'],
    calendar: [
      'M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z',
      'M7 3v4 M17 3v4 M3 11h18 M8 15h2 M14 15h2 M8 18h2',
    ],
    box: ['m12 3 9 5v9l-9 5-9-5V8Z', 'm3 8 9 5 9-5 M12 13v9 M7.5 5.5l9 5'],
    users: [
      'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M17 4a4 4 0 0 1 0 7 M22 21v-2a4 4 0 0 0-3-3.87',
    ],
    arrow: ['M5 12h14 m-5-5 5 5-5 5'],
    eye: [
      'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z',
      'M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
    ],
    edit: ['m16 3 5 5-12 12-6 1 1-6Z', 'm13 6 5 5'],
    chevron: ['m9 5 7 7-7 7'],
    trash: ['M3 6h18 M9 6V3h6v3 M5 6l1 15h12l1-15 M10 10v7 M14 10v7'],
    bell: ['M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9 M10 21h4'],
    spark: ['m12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5Z'],
  };
}
