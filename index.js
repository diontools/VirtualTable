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
    function VTable(vTable, headerHeight, columns, rowCount, rowHeight, getValue) {
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
        this.visibleStartColumn = -1;
        this.visibleEndColumn = -1;
        this.vTable = vTable;
        this.headerHeight = headerHeight;
        this.columns = columns;
        this.rowCount = rowCount;
        this.rowHeight = rowHeight;
        this.getValue = getValue;
        vTable.className = 'v-table';
        vTable.innerHTML = '';
        this.tableHeaders = document.createElement('div');
        this.tableHeaders.className = 'v-table-headers';
        this.tableHeaders.style.height = this.headerHeight + 'px';
        this.columnValues = [];
        var leftPos = 0;
        for (var i = 0; i < this.columns.length; i++) {
            var col = this.columns[i];
            var cell = document.createElement('div');
            cell.className = 'cell hrow';
            cell.style.left = leftPos + 'px';
            cell.style.width = col.width + 'px';
            cell.style.height = this.headerHeight + 'px';
            cell.textContent = col.name;
            this.columnValues.push({ name: col.name, width: col.width, left: leftPos });
            this.tableHeaders.appendChild(cell);
            leftPos += col.width;
        }
        this.tableCells = document.createElement('div');
        this.tableCells.className = 'v-table-cells';
        this.placement = document.createElement('div');
        this.placement.className = 'v-table-cells-placemant';
        this.placement.style.height = rowHeight * rowCount + 'px';
        this.placement.style.width = leftPos + 'px';
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
        this.updateCells();
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
        var startColumn = 0;
        for (var i = 0; i < this.columnValues.length; i++) {
            var v = this.columnValues[i];
            if (left < v.left + v.width) {
                startColumn = i;
                break;
            }
        }
        var endColumn = -1;
        for (var i = startColumn; i < this.columnValues.length; i++) {
            var v = this.columnValues[i];
            if (right < v.left + v.width) {
                endColumn = i;
                break;
            }
        }
        if (endColumn === -1) {
            endColumn = this.columnValues.length - 1;
        }
        if (endRow >= this.rowCount) {
            endRow = this.rowCount - 1;
        }
        // initialized?
        if (this.visibleStartRow === -1) {
            // all create
            for (var r = startRow; r <= endRow; r++) {
                for (var c = startColumn; c <= endColumn; c++) {
                    this.updateCell(r, c);
                }
            }
        }
        else {
            if (this.visibleStartRow < startRow || endRow < this.visibleEndRow || this.visibleStartColumn < startColumn || endColumn < this.visibleEndColumn) {
                for (var i = 0; i < this.visibleCells.length; i++) {
                    var info = this.visibleCells[i];
                    if (info.row < startRow || endRow < info.row || info.column < startColumn || endColumn < info.column) {
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
            var processedStartRow = startRow;
            var processedEndRow = endRow;
            // up startRow
            if (startRow < this.visibleStartRow) {
                console.log('up');
                for (var r = startRow; r < this.visibleStartRow && r <= endRow; r++) {
                    for (var c = startColumn; c <= endColumn; c++) {
                        this.updateCell(r, c);
                    }
                }
                processedStartRow = this.visibleStartRow < endRow ? this.visibleStartRow : endRow;
            }
            // down endRow
            if (this.visibleEndRow < endRow) {
                console.log('down');
                for (var r = endRow; r > this.visibleEndRow && r >= startRow; r--) {
                    for (var c = startColumn; c <= endColumn; c++) {
                        this.updateCell(r, c);
                    }
                }
                processedEndRow = this.visibleEndRow > startRow ? this.visibleEndRow : startRow;
            }
            // left
            if (startColumn < this.visibleStartColumn) {
                console.log('left');
                for (var c = startColumn; c < this.visibleStartColumn && c <= endColumn; c++) {
                    for (var r = processedStartRow; r <= processedEndRow; r++) {
                        this.updateCell(r, c);
                    }
                }
            }
            // right
            if (this.visibleEndColumn < endColumn) {
                console.log('right');
                for (var c = endColumn; c > this.visibleEndColumn && c >= startColumn; c--) {
                    for (var r = processedStartRow; r <= processedEndRow; r++) {
                        this.updateCell(r, c);
                    }
                }
            }
        }
        var vc = this.visibleCells;
        this.visibleCells = this.visibleCellsSwap;
        this.visibleCellsSwap = vc;
        vc.length = 0;
        this.visibleStartRow = startRow;
        this.visibleEndRow = endRow;
        this.visibleStartColumn = startColumn;
        this.visibleEndColumn = endColumn;
    };
    VTable.prototype.updateCell = function (r, c) {
        var reuse = this.hiddenCells.length > 0;
        var info = reuse ? this.hiddenCells.pop() : this.cellPool.rent().value;
        var cell = this.SetCellInfo(info, r, c);
        this.visibleCellsSwap.push(info);
        if (!reuse) {
            console.log('appendChild', r, c);
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
        this.tableCells.style.height = this._height - this.headerHeight + 'px';
        var scrollbarWidth = this.vTable.clientWidth - this.tableCells.clientWidth;
        this.tableHeaders.style.marginRight = scrollbarWidth + 'px';
        this.updateCells();
    };
    return VTable;
}());
var columns = [];
for (var i = 0; i < 10; i++) {
    columns.push({ width: Math.floor(Math.random() * 50 + 50), name: i.toString() });
}
var vTableDiv = document.getElementById("vtable");
var vTable = new VTable(vTableDiv, 100, columns /*[
    { width: 100, name: 'abc' },
    { width: 200, name: 'xyz' },
    { width: 50, name: '123' },
]*/, 10, 25, function (r, c) {
    return r + '-' + c;
});
function resize() { vTable.height = window.innerHeight - 20; }
window.onresize = resize;
resize();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFtQkE7SUFLSSxjQUFZLE9BQTBCO1FBSjlCLFVBQUssR0FBa0IsRUFBRSxDQUFDO1FBQzFCLGdCQUFXLEdBQWtCLEVBQUUsQ0FBQztRQUlwQyxJQUFJLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQztJQUMzQixDQUFDO0lBRU0sbUJBQUksR0FBWDtRQUNJLElBQUksSUFBSSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO1lBQzdCLElBQUksS0FBSyxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsR0FBRyxFQUFFLENBQUM7WUFDbkMsS0FBSyxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUM7WUFDckIsT0FBTyxLQUFLLENBQUM7U0FDaEI7UUFFRCxJQUFJLElBQUksR0FBZ0I7WUFDcEIsRUFBRSxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTTtZQUNyQixLQUFLLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQztZQUN0QyxPQUFPLEVBQUUsSUFBSTtTQUNoQixDQUFDO1FBRUYsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDdEIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxhQUFhLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ3BDLE9BQU8sSUFBSSxDQUFDO0lBQ2hCLENBQUM7SUFFTSxxQkFBTSxHQUFiLFVBQWMsSUFBaUI7UUFDM0IsSUFBSSxDQUFDLE9BQU8sR0FBRyxLQUFLLENBQUM7UUFDckIsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDaEMsQ0FBQztJQUVNLHlCQUFVLEdBQWpCLFVBQWtCLEVBQVU7UUFDeEIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxD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