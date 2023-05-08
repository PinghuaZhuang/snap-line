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
    direction: Direction;
}
type NonUndefined<A> = A extends undefined ? never : A;
type HasDef<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;
type Direction = 'v' | 'h';
type Snaps = SnapToken[];
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
    generateGrid(elementsOrSelect: NodeList | string, sort?: boolean): NonUndefined<typeof this.grid>;
    check(dragNode: HTMLElement, elementsOrSelect?: NodeList | string): void;
    uncheck(): void;
    destroy(): void;
    nearAxis(axis: number): number[];
    isNearly(dragValue: number, targetValue: number): boolean;
    searchNearly(dragValue: number, arr: Snaps): Snaps;
    static querySelectorAll(elementsOrSelect: NodeList | string): NodeList;
}
export default SnapLine;
