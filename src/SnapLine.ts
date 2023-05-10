interface SnapLineOption {
  /**
   * 最小间隔, 会自定吸附到辅助线上
   * @default 3
   */
  gap?: number;
  /**
   * 不设置辅助线默认样式
   */
  noStyle?: boolean;
  /**
   * 要显示的对齐线
   */
  lines?: LineType[];
  /**
   * 检查到对齐线的钩子
   */
  onSnap?: (e: {
    snaps: Snaps;
    direction: Direction;
    lineType: LineType;
    target: HTMLElement;
    targetRect: DOMRect;
  }) => void;
}

type LineType = 'ht' | 'hc' | 'hb' | 'vl' | 'vc' | 'vr';

interface LineToken {
  handle: {
    show: () => void;
    hide: () => void;
    isShow: () => boolean;
  };
  target: HTMLDivElement;
  type: LineType;
}

interface SnapToken {
  handle: {};
  target: HTMLElement;
  value: number;
  direction: Direction;
  type: LineType;
  rect: DOMRect;
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
    getValue: (dragRect: DOMRect, condition: boolean) => {
      return dragRect[condition ? 'top' : 'bottom'];
    },
    getStyleProp() {
      return 'top';
    },
    getStyleValue(dragRect: DOMRect, token: SnapToken, condition: boolean) {
      return condition ? token.value : token.value - dragRect.height;
    },
  },
  {
    comparison: 'l',
    getValue(dragRect: DOMRect, condition: boolean) {
      return dragRect[condition ? 'left' : 'right'];
    },
    getStyleProp() {
      return 'left';
    },
    getStyleValue(dragRect: DOMRect, token: SnapToken, condition: boolean) {
      return condition ? token.value : token.value - dragRect.width;
    },
  },
  {
    comparison: 'h',
    getValue(dragRect: DOMRect, condition: boolean) {
      return condition
        ? dragRect.top + dragRect.height / 2
        : dragRect.left + dragRect.width / 2;
    },
    getStyleProp(condition: boolean) {
      return condition ? 'top' : 'left';
    },
    getStyleValue(dragRect: DOMRect, token: SnapToken, condition: boolean) {
      return condition
        ? token.value - dragRect.height / 2
        : token.value - dragRect.width / 2;
    },
  },
];

const nearestConfigs = {
  h: [
    {
      getDistance(token: SnapToken, targetRect: DOMRect) {
        return targetRect.left - token.rect.right;
      },
      getPosition(token: SnapToken, targetRect: DOMRect) {
        return token.rect.right;
      },
    },
    {
      getDistance(token: SnapToken, targetRect: DOMRect) {
        return token.rect.left - targetRect.right;
      },
      getPosition(token: SnapToken, targetRect: DOMRect) {
        return targetRect.right;
      },
    },
  ],
  v: [
    {
      getDistance(token: SnapToken, targetRect: DOMRect) {
        return targetRect.top - token.rect.bottom;
      },
      getPosition(token: SnapToken, targetRect: DOMRect) {
        return token.rect.bottom;
      },
    },
    {
      getDistance(token: SnapToken, targetRect: DOMRect) {
        return token.rect.top - targetRect.bottom;
      },
      getPosition(token: SnapToken, targetRect: DOMRect) {
        return targetRect.bottom;
      },
    },
  ],
};

const LINES: LineType[] = ['ht', 'hc', 'hb', 'vl', 'vc', 'vr'];

class SnapLine {
  option: HasDef<SnapLineOption, 'gap' | 'lines'> = {
    gap: 3,
    lines: LINES,
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
    this.option.lines!.forEach((lineType) => {
      const node = document.createElement('div');
      lines[lineType as keyof typeof lines] = {
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
        type: lineType,
      };
      node.classList.add('snap-line', `snap-line-${lineType}`);
      node.dataset.direction = lineType[0];
      if (!this.option.noStyle) {
        node.style.cssText = `display:none;opacity:0.7;position:absolute;background:#4DAEFF;z-index:1000;pointer-events:none;${
          lineType[0] === 'h'
            ? 'width:100%;height:1px;left:0;transform:translateY(-1px);'
            : 'width:1px;height:100%;top:0;transform:translateX(-1px);'
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
      const rect = node.getBoundingClientRect();
      const { top, bottom, left, right, height, width } = rect;

      [
        // h
        top,
        top + height / 2,
        bottom,
        // v
        left,
        left + width / 2,
        right,
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
          type: LINES[index],
          rect,
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
      let dragRect = dragNode.getBoundingClientRect();
      const showLines: string[] = [];
      [
        ['hb', 'ht'],
        ['vr', 'vl'],
        ['hc', 'vc'],
      ].map((group, index) => {
        const config = checkConfigs[index];
        group.forEach((o) => {
          const lineType = o as LineType;
          const condition =
            lineType.charAt(index > 1 ? 0 : 1) === config.comparison;
          const direction = lineType.charAt(0) as Direction;
          const originValue = config.getValue(dragRect, condition);
          let tokens = this.searchNearly(originValue, this.grid![direction]);
          if (!tokens) return dragNode.classList.remove(`snap-active`);
          tokens = tokens.filter((t) => t.target !== dragNode);
          if (!tokens.length) return dragNode.classList.remove(`snap-active`);
          if (this.option.onSnap) {
            setTimeout(() => {
              this.option.onSnap!({
                snaps: tokens,
                direction,
                lineType,
                target: dragNode,
                targetRect: dragRect,
              });
            }, 1);
          }
          dragNode.classList.add(`snap-active`);
          tokens.forEach((token) => {
            if (showLines.includes(lineType)) return;
            const prop = config.getStyleProp(condition);
            const value = config.getStyleValue(dragRect, token, condition);
            const line = this.lines[lineType];
            if (line == null) return;
            // @ts-ignore
            dragNode.style[prop] = `${value}px`;
            dragRect = dragNode.getBoundingClientRect();
            // @ts-ignore
            line!.target.style[prop] = `${token.value}px`;
            line!.handle.show();
            showLines.push(lineType);
          });
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

  /**
   * 销毁
   */
  destroy() {
    for (const [_, v] of Object.entries(this.lines)) {
      v.target.remove();
    }
    this.uncheck();
  }

  /**
   * 最近的点
   */
  nearest({
    snaps: tokens,
    direction,
    targetRect,
    lineType,
  }: {
    snaps: Snaps;
    direction: Direction;
    lineType: LineType;
    target: HTMLElement;
    targetRect: DOMRect;
  }) {
    const container = this.lines[lineType]?.target;
    if (container == null) return;
    let mins: {
      distance: number;
      token: SnapToken | null;
      config: (typeof nearestConfigs.h)[0] | null;
    }[] = [
      { distance: Infinity, token: null, config: null },
      { distance: Infinity, token: null, config: null },
    ];
    tokens.forEach((token) => {
      nearestConfigs[direction].forEach((t, ti) => {
        const distance = t.getDistance(token, targetRect);
        if (distance > 0 && distance < mins[ti].distance) {
          mins[ti] = { distance, token, config: t };
        }
      });
    });
    return [mins, container];
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
