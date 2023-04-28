var checkConfigs = [
    {
        comparison: 't',
        getValue: function (dragRect, direction) {
            return dragRect[direction ? 'top' : 'bottom'];
        },
        getStyleProp: function () {
            return 'top';
        },
        getStyleValue: function (dragRect, token, direction) {
            return direction ? token.value : token.value - dragRect.height;
        },
    },
    {
        comparison: 'l',
        getValue: function (dragRect, direction) {
            return dragRect[direction ? 'left' : 'right'];
        },
        getStyleProp: function () {
            return 'left';
        },
        getStyleValue: function (dragRect, token, direction) {
            return direction ? token.value : token.value - dragRect.width;
        },
    },
    {
        comparison: 'h',
        getValue: function (dragRect, direction) {
            return direction
                ? dragRect.top + dragRect.height / 2
                : dragRect.left + dragRect.width / 2;
        },
        getStyleProp: function (direction) {
            return direction ? 'top' : 'left';
        },
        getStyleValue: function (dragRect, token, direction) {
            return direction
                ? token.value - dragRect.height / 2
                : token.value - dragRect.width / 2;
        },
    },
];
var SnapLine = (function () {
    function SnapLine(option) {
        this.option = {
            gap: 10,
        };
        Object.assign(this.option, option);
        this.createLines();
    }
    SnapLine.prototype.createLines = function () {
        var lines = {
            ht: undefined,
            hc: undefined,
            hb: undefined,
            vl: undefined,
            vc: undefined,
            vr: undefined,
        };
        var _loop_1 = function (p) {
            var node = document.createElement('div');
            lines[p] = {
                handle: {
                    show: function () {
                        node.style.display = 'block';
                    },
                    hide: function () {
                        node.style.display = 'none';
                    },
                    isShow: function () {
                        return node.style.display !== 'none';
                    },
                },
                target: node,
            };
            node.classList.add('snap-line', "snap-line-".concat(p));
            node.style.cssText = "opacity:0.7;position:absolute;background:#4DAEFF;z-index:1000;pointer-events:none;".concat(p[0] === 'h'
                ? 'width:100%;height:1px;left:0;transform:translateY(-1px);display:none;'
                : 'width:1px;height:100%;top:0;transform:translateX(-1px);display:none;');
            document.body.appendChild(node);
        };
        for (var p in lines) {
            _loop_1(p);
        }
        return (this.lines = lines);
    };
    SnapLine.prototype.generateGrid = function (elementsOrSelect) {
        var _this = this;
        var nodeList = SnapLine.querySelectorAll(elementsOrSelect);
        var grid = (this.grid = {
            h: {},
            v: {},
        });
        nodeList.forEach(function (node) {
            if (!(node instanceof HTMLElement)) {
                console.log(123);
                return;
            }
            var _a = node.getBoundingClientRect(), top = _a.top, bottom = _a.bottom, left = _a.left, right = _a.right, height = _a.height, width = _a.width;
            [
                top,
                bottom,
                top + height / 2,
                left,
                right,
                left + width / 2,
            ].forEach(function (value, index) {
                var axies = _this.nearAxis(value);
                var direction = index > 2 ? 'v' : 'h';
                axies.forEach(function (axis) {
                    _generateGrid(axis, value, direction, grid, node);
                });
            });
        });
        return grid;
    };
    SnapLine.prototype.check = function (dragNode, elementsOrSelect) {
        var _this = this;
        if (elementsOrSelect == null && this.grid == null) {
            throw new Error("\u627E\u4E0D\u5230\u5BF9\u9F50\u7EBF");
        }
        Object.entries(this.lines).forEach(function (_a) {
            var _ = _a[0], lineToken = _a[1];
            return lineToken.handle.hide();
        });
        var dragRect = dragNode.getBoundingClientRect();
        if (elementsOrSelect == null) {
            var showLines_1 = [];
            var handleMap = {};
            [
                ['bhb', 'thb', 'tht', 'bht'],
                ['tvr', 'bvr', 'bvl', 'tvl'],
                ['chc', 'cvc'],
            ].map(function (o, index) {
                var config = checkConfigs[index];
                o.forEach(function (condition) {
                    var lineKey = condition.slice(condition.length - 2);
                    var direction = condition.charAt(index > 1 ? 1 : 2) === config.comparison;
                    var originValue = config.getValue(dragRect, direction);
                    var tokens = _this.isNearlyWithSnaps(originValue, _this.grid[condition.charAt(1)]);
                    if (tokens) {
                        for (var i in tokens) {
                            var token = tokens[i];
                            if (token.target === dragNode || showLines_1.includes(lineKey))
                                continue;
                            var prop = config.getStyleProp(direction);
                            var value = config.getStyleValue(dragRect, token, direction);
                            console.log('value', lineKey, '|', value, token.value, '|', Math.abs(token.value - value), '|', originValue, token, _this.grid.h);
                            dragNode.style[prop] = "".concat(value, "px");
                            if (Math.abs(token.value - originValue) <= _this.option.gap) {
                                _this.lines[lineKey].target.style[prop] = "".concat(token.value, "px");
                                _this.lines[lineKey].handle.show();
                                showLines_1.push(lineKey);
                            }
                            break;
                        }
                    }
                });
            });
            console.log('showLines', showLines_1.join(','));
        }
        else {
            this.generateGrid(elementsOrSelect);
            this.check(dragNode);
        }
    };
    SnapLine.prototype.uncheck = function () {
        this.grid = null;
        Object.values(this.lines).forEach(function (item) { return item.handle.hide(); });
        Array.from(document.querySelectorAll('.snap-line-active')).forEach(function (item) {
            return item.classList.remove('snap-line-active');
        });
    };
    SnapLine.prototype.destroy = function () {
        for (var _i = 0, _a = Object.entries(this.lines); _i < _a.length; _i++) {
            var _b = _a[_i], _ = _b[0], v = _b[1];
            v.target.remove();
        }
        this.uncheck();
    };
    SnapLine.prototype.nearAxis = function (axis) {
        var gap = this.option.gap;
        var remainder = axis % gap;
        if (remainder === 0)
            return [axis - gap, axis, axis + gap];
        var mul = Math.floor(axis / gap);
        return [mul * gap, (mul + 1) * gap];
    };
    SnapLine.prototype.isNearly = function (dragValue, targetValue) {
        var gap = this.option.gap;
        return Math.abs(dragValue - targetValue) <= gap;
    };
    SnapLine.prototype.isNearlyWithSnaps = function (dragValue, snaps) {
        var gap = this.option.gap;
        var remainder = dragValue % gap;
        return snaps[(Math.floor(dragValue / gap) + (remainder > gap / 2 ? 1 : 0)) * gap];
    };
    SnapLine.querySelectorAll = function (elementsOrSelect) {
        if (typeof elementsOrSelect === 'string') {
            return document.querySelectorAll(elementsOrSelect);
        }
        return elementsOrSelect;
    };
    return SnapLine;
}());
function _generateGrid(axis, value, direction, grid, node) {
    var target = grid[direction][axis];
    var token = {
        handle: {},
        target: node,
        value: value,
        axis: axis,
    };
    if (target) {
        target.push(token);
    }
    else {
        grid[direction][axis] = [token];
    }
}
function minBy(array, iteratee) {
    var result = undefined;
    if (array == null) {
        return result;
    }
    var computed = undefined;
    for (var _i = 0, array_1 = array; _i < array_1.length; _i++) {
        var value = array_1[_i];
        var current = iteratee(value);
        if (current != null &&
            (computed === undefined ? current === current : current < computed)) {
            computed = current;
            result = value;
        }
    }
    return result;
}
export default SnapLine;
//# sourceMappingURL=SnapLine.js.map