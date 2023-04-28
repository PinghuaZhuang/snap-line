interface SnapLineOption {
    gap?: number;
    static?: boolean;
    noStyle?: boolean;
}
interface LineToken {
    handle: {
        show: () => void;
        hide: () => void;
        isShow: () => boolean;
    };
    target: HTMLDivElement;
}
interface SnapToken {
    handle: {};
    target: HTMLElement;
    value: number;
    axis: number;
}
type NonUndefined<A> = A extends undefined ? never : A;
type HasDef<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;
type Snaps = Record<string, SnapToken[]>;
type Grid = {
    h: Snaps;
    v: Snaps;
};
declare class SnapLine {
    option: HasDef<SnapLineOption, 'gap'>;
    lines: {
        ht: LineToken;
        hc: LineToken;
        hb: LineToken;
        vl: LineToken;
        vc: LineToken;
        vr: LineToken;
    };
    grid?: Grid | null;
    constructor(option?: SnapLineOption);
    createLines(): typeof this.lines;
    generateGrid(elementsOrSelect: NodeList | string): NonUndefined<typeof this.grid>;
    check(dragNode: HTMLElement, elementsOrSelect?: NodeList | string): void;
    uncheck(): void;
    destroy(): void;
    nearAxis(axis: number): number[];
    isNearly(dragValue: number, targetValue: number): boolean;
    isNearlyWithSnaps(dragValue: number, snaps: Snaps): SnapToken[];
    static querySelectorAll(elementsOrSelect: NodeList | string): NodeList;
}
export default SnapLine;
