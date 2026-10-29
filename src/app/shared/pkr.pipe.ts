import { Pipe, PipeTransform } from '@angular/core';
import { formatPkr } from '../core/utils/format';

@Pipe({ name: 'pkr', standalone: true })
export class PkrPipe implements PipeTransform {
  transform(v: number | null | undefined): string { return formatPkr(v); }
}
