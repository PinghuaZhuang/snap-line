interface SnapLineOption {
  /**
   * 小与该间隔, 会自定吸附到辅助线上
   * @default 10
   */
  gap?: number;
  /**
   * 不设置辅助线默认样式
   */
  noStyle?: boolean;
  /**
   * 要显示的对齐线
   */
  lines?: LineKeyType[];
}

type LineKeyType = 'xt' | 'xc' | 'xb' | 'yl' | 'yc' | 'yr';

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
    lines: ['xt', 'xb', 'xc', 'yl', 'yr', 'yc'],
  };
  /**
   * h: 水平线. v: 垂直线
   */
  lines!: {
    ht?: LineToken;
    hc?: LineToken;
    hb?: LineToken;
    vl?: LineToken;
    vc?: LineToken;
    vr?: LineToken;
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
    const lines: Partial<typeof this.lines> = {};

    // 置入参考线
    this.option.lines!.forEach((lineKey) => {
      const node = document.createElement('div');
      lines[lineKey as keyof typeof lines] = {
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
      node.classList.add('snap-line', `snap-line-${lineKey}`);
      if (!this.option.noStyle) {
        node.style.cssText = `opacity:0.7;position:absolute;background:#4DAEFF;z-index:1000;pointer-events:none;${
          lineKey[0] === 'h'
            ? 'width:100%;height:1px;left:0;transform:translateY(-1px);display:none;'
            : 'width:1px;height:100%;top:0;transform:translateX(-1px);display:none;'
        }`;
      }
      document.body.append(node);
    });
    return (this.lines = lines as Required<typeof lines>);
  }

  /**
   * 创建所有需要对比的所有元素的边界
   */
  generateGrid(
    elementsOrSelect: NodeList | string,
  ): NonUndefined<typeof this.grid> {
    const nodeList = SnapLine.querySelectorAll(elementsOrSelect);
    const grid: typeof this.grid = (this.grid = {
      h: [],
      v: [],
    });
    let max = -Infinity;
    nodeList.forEach((node) => {
      if (!(node instanceof HTMLElement)) {
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
        const direction: Direction = index > 2 ? 'v' : 'h';
        const target = grid[direction];
        if (value > max) {
          max = value;
        }
        const token = {
          handle: {},
          target: node,
          value,
          direction,
        };
        target.push(token);
      });
    });
    return grid;
  }

  /**
   * 检查是否显示对齐线
   */
  check(dragNode: HTMLElement, elementsOrSelect?: NodeList | string) {
    if (elementsOrSelect == null && this.grid == null) {
      throw new Error(`找不到对齐线`);
    }
    if (elementsOrSelect == null) {
      const showLines: string[] = [];
      [
        ['bhb', 'thb', 'tht', 'bht'],
        ['tvr', 'bvr', 'bvl', 'tvl'],
        ['chc', 'cvc'],
      ].map((o, index) => {
        const config = checkConfigs[index];
        o.forEach((condition) => {
          const dragRect = dragNode.getBoundingClientRect();
          const lineKey = condition.slice(
            condition.length - 2,
          ) as keyof typeof this.lines;
          const direction =
            condition.charAt(index > 1 ? 1 : 2) === config.comparison;
          const originValue = config.getValue(dragRect, direction);
          const tokens = this.searchNearly(
            originValue,
            this.grid![condition.charAt(1) as Direction],
          );
          if (tokens) {
            tokens.forEach((token) => {
              if (token.target === dragNode || showLines.includes(lineKey))
                return;
              const prop = config.getStyleProp(direction);
              const value = config.getStyleValue(dragRect, token, direction);
              // @ts-ignore
              dragNode.style[prop] = `${value}px`;
              // @ts-ignore
              this.lines[lineKey]!.target.style[prop] = `${token.value}px`;
              this.lines[lineKey]!.handle.show();
              showLines.push(lineKey);
            });
          }
        });
      });

      // 隐藏多余的辅助线
      Object.entries(this.lines).forEach(([key, lineToken]) => {
        !showLines.includes(key) && lineToken.handle.hide();
      });
    } else {
      this.generateGrid(elementsOrSelect);
      this.check(dragNode);
    }
  }

  /**
   * 关闭对齐线
   */
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
    return [(remainder > gap / 2 ? 1 : 0 + mul) * gap];
  }

  /**
   * 判断是否处于附近
   */
  isNearly(dragValue: number, targetValue: number) {
    const { gap } = this.option;
    return Math.abs(dragValue - targetValue) <= gap;
  }

  /**
   * 查找附近的元素
   */
  searchNearly(dragValue: number, arr: Snaps) {
    let i = 0;
    let len = arr.length;
    const result: Snaps = [];
    for (; i < len; i++) {
      if (this.isNearly(dragValue, arr[i].value)) {
        result.push(arr[i]);
      }
    }
    return result;
  }

  static querySelectorAll(elementsOrSelect: NodeList | string) {
    if (typeof elementsOrSelect === 'string') {
      return document.querySelectorAll(elementsOrSelect);
    }
    return elementsOrSelect;
  }
}

export default SnapLine;
