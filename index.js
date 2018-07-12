var Pool = /** @class */ (function () {
    function Pool(creator) {
        this.items = [];
        this.usableItems = [];
        this.creator = creator;
    }
    Pool.prototype.rent = function () {
        if (this.usableItems.length > 0) {
            var reuse = this.usableItems.pop();
            reuse.isUsing = true;
            return reuse;
        }
        var item = {
            id: this.items.length,
            value: this.creator(this.items.length),
            isUsing: true
        };
        this.items.push(item);
        console.log('create-cell', item.id);
        return item;
    };
    Pool.prototype.return = function (item) {
        item.isUsing = false;
        this.usableItems.push(item);
    };
    Pool.prototype.returnById = function (id) {
        this.return(this.items[id]);
    };
    return Pool;
}());
var VTable = /** @class */ (function () {
    function VTable(vTable, columns, rowCount, rowHeight, getValue) {
        var _this = this;
        this._height = 100;
        this.cellPool = new Pool(function (id) {
            return {
                id: id,
                element: document.createElement('div'),
                row: 0,
                column: 0,
                top: 0,
                left: 0,
                width: 0,
                height: 0,
            };
        });
        this.visibleCells = [];
        this.visibleCellsSwap = [];
        this.hiddenCells = [];
        this.visibleStartRow = -1;
        this.visibleEndRow = -1;
        this.vTable = vTable;
        this.columns = columns;
        this.rowCount = rowCount;
        this.rowHeight = rowHeight;
        this.getValue = getValue;
        vTable.className = 'v-table';
        vTable.innerHTML = '';
        this.tableHeaders = document.createElement('div');
        this.tableHeaders.className = 'v-table-headers';
        this.tableHeaders.style.marginRight = '17px';
        this.columnValues = [];
        var leftPos = 0;
        for (var i = 0; i < this.columns.length; i++) {
            var col = this.columns[i];
            var item = this.cellPool.rent();
            var cell = item.value.element;
            cell.className = 'cell hrow';
            cell.style.left = leftPos + 'px';
            cell.style.width = col.width + 'px';
            cell.style.height = this.rowHeight + 'px';
            cell.textContent = col.name;
            this.columnValues.push({ width: col.width, left: leftPos });
            this.tableHeaders.appendChild(cell);
            leftPos += col.width;
        }
        this.tableCells = document.createElement('div');
        this.tableCells.className = 'v-table-cells';
        this.placement = document.createElement('div');
        this.placement.className = 'v-table-cells-placemant';
        this.placement.style.height = rowHeight * rowCount + 'px';
        this.tableCells.appendChild(this.placement);
        vTable.appendChild(this.tableHeaders);
        vTable.appendChild(this.tableCells);
        this.tableCells.onscroll = function () {
            //console.log('scroll', this.tableCells.scrollLeft, this.tableCells.scrollTop);
            // sync scroll headers
            if (_this.tableHeaders.scrollLeft !== _this.tableCells.scrollLeft) {
                _this.tableHeaders.scrollLeft = _this.tableCells.scrollLeft;
            }
            _this.updateCells();
        };
        // for (let r = 0; r < this.rowCount; r++) {
        //     for (let c = 0; c < this.columnValues.length; c++) {
        //         let item = this.cellPool.rent();
        //         let cell = this.SetCellInfo(item.value, r, c);
        //         this.tableCells.appendChild(cell);
        //     }
        // }
        this.updateCells();
        // let a = <HTMLDivElement>cells.getElementsByClassName('cell')[0];
        // a.style.zIndex = '10';
        // function A() {
        //     a.style.top = Math.random() * 100 + 'px';
        //     setTimeout(A, 100);
        // }
        // A();
    }
    Object.defineProperty(VTable.prototype, "height", {
        get: function () { return this._height; },
        set: function (value) {
            if (this._height !== value) {
                this._height = value;
                this.resize();
            }
        },
        enumerable: true,
        configurable: true
    });
    VTable.prototype.updateCells = function () {
        var top = this.tableCells.scrollTop;
        var left = this.tableCells.scrollLeft;
        var width = this.tableCells.clientWidth;
        var height = this.tableCells.clientHeight;
        var bottom = top + height;
        var right = left + width;
        var startRow = Math.floor(top / this.rowHeight);
        var endRow = Math.floor(bottom / this.rowHeight);
        if (endRow >= this.rowCount) {
            endRow = this.rowCount - 1;
        }
        // initialized?
        if (this.visibleStartRow !== -1) {
            if (this.visibleStartRow < startRow || endRow < this.visibleEndRow) {
                for (var i = 0; i < this.visibleCells.length; i++) {
                    var info = this.visibleCells[i];
                    if (info.row < startRow || endRow < info.row) {
                        // out of range
                        this.hiddenCells.push(info);
                    }
                    else {
                        // visible
                        this.visibleCellsSwap.push(info);
                    }
                }
            }
            else {
                // all visible
                for (var i = 0; i < this.visibleCells.length; i++) {
                    this.visibleCellsSwap.push(this.visibleCells[i]);
                }
            }
            // up startRow
            if (startRow < this.visibleStartRow) {
                for (var r = startRow; r < this.visibleStartRow && r <= endRow; r++) {
                    for (var c = 0; c < this.columnValues.length; c++) {
                        this.updateCell(r, c);
                    }
                }
            }
            // down endRow
            if (this.visibleEndRow < endRow) {
                for (var r = endRow; r > this.visibleEndRow && r >= startRow; r--) {
                    for (var c = 0; c < this.columnValues.length; c++) {
                        this.updateCell(r, c);
                    }
                }
            }
        }
        else {
            // all create
            for (var r = startRow; r <= endRow; r++) {
                for (var c = 0; c < this.columnValues.length; c++) {
                    this.updateCell(r, c);
                }
            }
        }
        // clear hidden cells
        for (var i = 0; i < this.hiddenCells.length; i++) {
            this.tableCells.removeChild(this.hiddenCells[i].element);
            this.cellPool.returnById(this.hiddenCells[i].id);
        }
        this.hiddenCells.length = 0;
        var vc = this.visibleCells;
        this.visibleCells = this.visibleCellsSwap;
        this.visibleCellsSwap = vc;
        vc.length = 0;
        this.visibleStartRow = startRow;
        this.visibleEndRow = endRow;
    };
    VTable.prototype.updateCell = function (r, c) {
        var reuse = this.hiddenCells.length > 0;
        var info = reuse ? this.hiddenCells.pop() : this.cellPool.rent().value;
        var cell = this.SetCellInfo(info, r, c);
        this.visibleCellsSwap.push(info);
        if (!reuse) {
            this.tableCells.appendChild(cell);
        }
    };
    VTable.prototype.SetCellInfo = function (info, r, c) {
        info.row = r;
        info.column = c;
        info.top = this.rowHeight * r;
        info.left = this.columnValues[c].left;
        info.width = this.columnValues[c].width;
        info.height = this.rowHeight;
        var cell = info.element;
        cell.className = "cell";
        cell.style.top = info.top + 'px';
        cell.style.left = info.left + 'px';
        cell.style.width = info.width + 'px';
        cell.style.height = info.height + 'px';
        cell.textContent = this.getValue(r, c);
        return cell;
    };
    VTable.prototype.resize = function () {
        this.vTable.style.height = this._height + 'px';
        this.tableCells.style.height = this._height - this.rowHeight + 'px';
        this.updateCells();
    };
    VTable.prototype.updateCss = function () {
        var css = '';
        var offset = 0;
        // for (let i = 0; i < this.columns.length; i++) {
        //     let column = this.columns[i];
        //     css += '.column' + i + '{width:' + column.width + 'px;left:' + offset + 'px}';
        //     offset += column.width;
        // }
        // for (let i = 0; i < this.rowCount; i++) {
        //     css += '.row' + i + "{height:25px;top:" + (i * this.rowHeight) + "px} ";
        // }
        this.style.innerHTML = css;
    };
    return VTable;
}());
var vTableDiv = document.getElementById("vtable");
var vTable = new VTable(vTableDiv, [
    { width: 100, name: 'abc' },
    { width: 200, name: 'xyz' },
    { width: 50, name: '123' },
], 10000, 25, function (r, c) {
    return r + '-' + c;
});
function resize() { vTable.height = window.innerHeight - 25; }
window.onresize = resize;
resize();
//# sourceMappingURL=index.js.map