// tsc .\src\SnapLine.ts --target es5 --module es6 --lib es2017,dom --removeComments --sourceMap --declaration
interface SnapLineOption {
  /**
   * 小与该间隔, 会自定吸附到辅助线上
   * @default 10
   */
  gap?: number;
  /**
   * @default false
   */
  static?: boolean;
  /**
   * 不设置辅助线默认样式
   */
  noStyle?: boolean;
  // lines?: ("xt" | "xc" | "xb" | "yl" | "yc" | "yr")[];
  // lineStyle
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

const checkConfigs = [
  {
    comparison: 't',
    getValue: (dragRect: DOMRect, direction: boolean) => {
      return dragRect[direction ? 'top' : 'bottom'];
    },
    getStyleProp() {
      return 'top';
    },
    getStyleValue(dragRect: DOMRect, token: SnapToken, direction: boolean) {
      return direction ? token.value : token.value - dragRect.height;
    },
  },
  {
    comparison: 'l',
    getValue(dragRect: DOMRect, direction: boolean) {
      return dragRect[direction ? 'left' : 'right'];
    },
    getStyleProp() {
      return 'left';
    },
    getStyleValue(dragRect: DOMRect, token: SnapToken, direction: boolean) {
      return direction ? token.value : token.value - dragRect.width;
    },
  },
  {
    comparison: 'h',
    getValue(dragRect: DOMRect, direction: boolean) {
      return direction
        ? dragRect.top + dragRect.height / 2
        : dragRect.left + dragRect.width / 2;
    },
    getStyleProp(direction: boolean) {
      return direction ? 'top' : 'left';
    },
    getStyleValue(dragRect: DOMRect, token: SnapToken, direction: boolean) {
      return direction
        ? token.value - dragRect.height / 2
        : token.value - dragRect.width / 2;
    },
  },
];

class SnapLine {
  option: HasDef<SnapLineOption, 'gap' /*  | "lines" */> = {
    gap: 10,
    // lines: ['xt', 'xb', 'xc', 'yl', 'yr', 'yc'],
  };
  /**
   * h: 水平线. v: 垂直线
   */
  lines!: {
    ht: LineToken;
    hc: LineToken;
    hb: LineToken;
    vl: LineToken;
    vc: LineToken;
    vr: LineToken;
  };
  /**
   * 对齐线的网格
   */
  grid?: Grid | null;

  constructor(option?: SnapLineOption) {
    Object.assign(this.option, option);
    this.createLines();
  }

  /**
   * 创建对齐辅助线
   */
  createLines(): typeof this.lines {
    const lines: Partial<typeof this.lines> = {
      ht: undefined,
      hc: undefined,
      hb: undefined,
      vl: undefined,
      vc: undefined,
      vr: undefined,
    };

    // 置入参考线
    for (let p in lines) {
      const node = document.createElement('div');
      lines[p as keyof typeof lines] = {
        handle: {
          show() {
            node.style.display = 'block';
          },
          hide() {
            node.style.display = 'none';
          },
          isShow() {
            return node.style.display !== 'none';
          },
        },
        target: node,
      };
      node.classList.add('snap-line', `snap-line-${p}`);
      node.style.cssText = `opacity:0.7;position:absolute;background:#4DAEFF;z-index:1000;pointer-events:none;${
        p[0] === 'h'
          ? 'width:100%;height:1px;left:0;transform:translateY(-1px);display:none;'
          : 'width:1px;height:100%;top:0;transform:translateX(-1px);display:none;'
      }`;
      document.body.appendChild(node);
    }
    return (this.lines = lines as Required<typeof lines>);
  }

  /**
   * 创建对齐线的网格, 可以减少计算量
   */
  generateGrid(
    elementsOrSelect: NodeList | string,
    // static: boolean = false,
  ): NonUndefined<typeof this.grid> {
    const nodeList = SnapLine.querySelectorAll(elementsOrSelect);
    const grid: typeof this.grid = (this.grid = {
      h: {},
      v: {},
    });
    nodeList.forEach((node) => {
      if (!(node instanceof HTMLElement)) {
        console.log(123);
        return;
      }
      const { top, bottom, left, right, height, width } =
        node.getBoundingClientRect();

      [
        // h
        top,
        bottom,
        top + height / 2,
        // v
        left,
        right,
        left + width / 2,
      ].forEach((value, index) => {
        const axies = this.nearAxis(value);
        const direction = index > 2 ? 'v' : 'h';
        axies.forEach((axis) => {
          _generateGrid(axis, value, direction, grid, node);
        });
      });
    });
    return grid;
  }

  check(dragNode: HTMLElement, elementsOrSelect?: NodeList | string) {
    if (elementsOrSelect == null && this.grid == null) {
      throw new Error(`找不到对齐线`);
    }
    Object.entries(this.lines).forEach(([_, lineToken]) => lineToken.handle.hide());
    const dragRect = dragNode.getBoundingClientRect();
    if (elementsOrSelect == null) {
      const showLines: string[] = [];
      const handleMap: Record<
        string,
        {
          token: SnapToken;
          lineKey: string;
          prop: string;
          value: number;
        }[]
      > = {};
      [
        ['bhb', 'thb', 'tht', 'bht'],
        ['tvr', 'bvr', 'bvl', 'tvl'],
        ['chc', 'cvc'],
      ].map((o, index) => {
        const config = checkConfigs[index];
        o.forEach((condition) => {
          const lineKey = condition.slice(condition.length - 2);
          const direction =
            condition.charAt(index > 1 ? 1 : 2) === config.comparison;
          const originValue = config.getValue(dragRect, direction);
          const tokens = this.isNearlyWithSnaps(
            originValue,
            this.grid![condition.charAt(1) as 'h' | 'v'],
          );
          if (tokens) {
            for (const i in tokens) {
              const token = tokens[i];
              if (
                token.target === dragNode || showLines.includes(lineKey)
              )
                continue;
              const prop = config.getStyleProp(direction);
              const value = config.getStyleValue(dragRect, token, direction);
              console.log('value', lineKey, '|', value, token.value, '|', Math.abs(token.value - value), '|', originValue, token, this.grid!.h);
              // @ts-ignore
              dragNode.style[prop] = `${value}px`;
              // const handle = {
              //   token,
              //   lineKey,
              //   prop,
              //   value,
              // };
              // if (handleMap[prop]) {
              //   handleMap[prop].push(handle);
              // } else {
              //   handleMap[prop] = [handle];
              // }
              if (Math.abs(token.value - originValue) <= this.option.gap) {
                // @ts-ignore
                this.lines[lineKey].target.style[prop] = `${token.value}px`;
                // @ts-ignore
                this.lines[lineKey].handle.show();
                showLines.push(lineKey);
              }
              break;
            }
          }
        });
      });

      console.log('showLines', showLines.join(','));

      // Object.entries(handleMap).forEach(([direction, handles]) => {
      //   let minHandles = handles;
      //   if (handles.length > 1) {
      //     // 取最接近的值
      //     minBy(minHandles, (o) => Math.abs(o.token.value - o.value));
      //   }
      //   console.log('minHandles', minHandles);
      //   minHandles.forEach((handle) => {
      //     const { lineKey, prop, token, value } = handle;
      //     dragNode.style[prop] = `${value}px`;
      //     this.lines[lineKey].target.style[prop] = `${token.value}px`;
      //     this.lines[lineKey].handle.show();
      //   });
      // });

      // 隐藏多余的辅助线
      // Object.entries(this.lines).forEach(([key, lineToken]) => {
      //   !showLines.includes(key) && lineToken.handle.hide();
      // });
    } else {
      this.generateGrid(elementsOrSelect);
      this.check(dragNode);
    }
  }

  uncheck() {
    this.grid = null;
    Object.values(this.lines).forEach((item) => item.handle.hide());
    Array.from(document.querySelectorAll('.snap-line-active')).forEach((item) =>
      item.classList.remove('snap-line-active'),
    );
  }

  destroy() {
    for (const [_, v] of Object.entries(this.lines)) {
      v.target.remove();
    }
    this.uncheck();
  }

  /**
   * 获取最近的轴线
   */
  nearAxis(axis: number) {
    const { gap } = this.option;
    const remainder = axis % gap;
    if (remainder === 0) return [axis - gap, axis, axis + gap];
    const mul = Math.floor(axis / gap);
    return [mul * gap, (mul + 1) * gap];
  }

  /**
   * 判断是否处于附近
   */
  isNearly(dragValue: number, targetValue: number) {
    const { gap } = this.option;
    return Math.abs(dragValue - targetValue) <= gap;
  }

  /**
   * 判断是否处于附近
   */
  isNearlyWithSnaps(dragValue: number, snaps: Snaps) {
    const { gap } = this.option;
    const remainder = dragValue % gap;
    return snaps[
      (Math.floor(dragValue / gap) + (remainder > gap / 2 ? 1 : 0)) * gap
    ] as SnapToken[] | undefined;
  }

  static querySelectorAll(elementsOrSelect: NodeList | string) {
    if (typeof elementsOrSelect === 'string') {
      return document.querySelectorAll(elementsOrSelect);
    }
    return elementsOrSelect;
  }
}

function _generateGrid(
  axis: number,
  value: number,
  direction: 'v' | 'h',
  grid: Grid,
  node: HTMLElement,
) {
  const target = grid[direction][axis];
  const token = {
    handle: {},
    target: node,
    value,
    axis,
  };
  if (target) {
    target.push(token);
  } else {
    grid[direction][axis] = [token];
  }
}

function minBy<T>(array: T[], iteratee: (o: T) => number | void) {
  let result: T | void = undefined;
  if (array == null) {
    return result;
  }
  let computed: number | undefined = undefined;
  for (const value of array) {
    const current = iteratee(value);

    if (
      current != null &&
      (computed === undefined ? current === current : current < computed)
    ) {
      computed = current as number;
      result = value;
    }
  }
  return result;
}

export default SnapLine;
