/** Система непересекающихся множеств (union-find) по целым индексам 0..n-1. */

export class UnionFind {
  private readonly parent: number[];
  private readonly size: number[];

  constructor(n: number) {
    this.parent = Array.from({ length: n }, (_, i) => i);
    this.size = new Array<number>(n).fill(1);
  }

  /** Корень множества. Итеративно, со сжатием путей. */
  find(i: number): number {
    let root = i;
    while (this.parent[root] !== root) root = this.parent[root] as number;
    let cur = i;
    while (this.parent[cur] !== root) {
      const next = this.parent[cur] as number;
      this.parent[cur] = root;
      cur = next;
    }
    return root;
  }

  /** Объединяет множества. Возвращает true, если они были разными. */
  union(a: number, b: number): boolean {
    let ra = this.find(a);
    let rb = this.find(b);
    if (ra === rb) return false;
    if ((this.size[ra] as number) < (this.size[rb] as number)) [ra, rb] = [rb, ra];
    this.parent[rb] = ra;
    this.size[ra] = (this.size[ra] as number) + (this.size[rb] as number);
    return true;
  }

  connected(a: number, b: number): boolean {
    return this.find(a) === this.find(b);
  }
}
