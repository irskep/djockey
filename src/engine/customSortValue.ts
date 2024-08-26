export class CustomSortValue {
  public value: number | null;

  constructor(frontMatter: Record<string, unknown>) {
    if (Object.keys(frontMatter).includes("order")) {
      this.value = frontMatter.order! as number;
    } else {
      this.value = null;
    }
  }

  isComparable(other: CustomSortValue): boolean {
    return this.value != null || other.value != null;
  }

  compareTo(other: CustomSortValue): number {
    if (this.value == null && other.value == null) return 0; // call isComparable first!

    if (this.value == null) {
      return other.compareTo(this) * -1;
    }

    if (other.value != null) {
      if (this.value >= 0 && other.value >= 0) {
        return this.value - other.value; // ordinary sort if both non-negative
      } else if (this.value < 0 && other.value < 0) {
        return this.value - other.value; // ordinary sort if both negative
      } else if (this.value >= 0) {
        return -1; // I am non-negative, so I go first
      } else {
        return 1; // I am negative, so the other goes first
      }
    } else {
      if (this.value >= 0) {
        return -1; // I have an order and I come first
      } else {
        return 1; // I have an order but I come after everything else
      }
    }
  }
}
