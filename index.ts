interface VTableColumn {
    name: string;
    width: number;
}

interface ColumnValue {
    name: string;
    width: number;
    left: number;
}

interface getValueCallback { (rowIndex: number, columnIndex: number): string }

interface PoolItem<T> {
    id: number;
    value: T;
    isUsing: boolean;
}

class Pool<T> {
    private items: PoolItem<T>[] = [];
    private usableItems: PoolItem<T>[] = [];
    private creator: (id: number) => T;

    constructor(creator: (id: number) => T) {
        this.creator = creator;
    }

    public rent(): PoolItem<T> {
        if (this.usableItems.length > 0) {
            let reuse = this.usableItems.pop();
            reuse.isUsing = true;
            return reuse;
        }

        let item: PoolItem<T> = {
            id: this.items.length,
            value: this.creator(this.items.length),
            isUsing: true
        };

        this.items.push(item);
        console.log('create-cell', item.id);
        return item;
    }

    public return(item: PoolItem<T>) {
        item.isUsing = false;
        this.usableItems.push(item);
    }

    public returnById(id: number) {
        this.return(this.items[id]);
    }
}

interface VTableCellInfo {
    id: number;
    element: HTMLDivElement;
    row: number;
    column: number;
    top: number;
    left: number;
    width: number;
    height: number;
}

class VTable {
    private vTable: HTMLDivElement;
    private tableHeaders: HTMLDivElement;
    private tableCells: HTMLDivElement;
    private placement: HTMLDivElement;
    private headerHeight: number;
    private columns: VTableColumn[];
    private rowCount: number;
    private rowHeight: number;
    private getValue: getValueCallback;

    private _height: number = 100;
    public get height() { return this._height; }
    public set height(value: number) {
        if (this._height !== value) {
            this._height = value;
            this.resize();
        }
    }

    private columnValues: ColumnValue[];

    private cellPool = new Pool<VTableCellInfo>(id => {
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

    constructor(vTable: HTMLDivElement, headerHeight: number, columns: VTableColumn[], rowCount: number, rowHeight: number, getValue: getValueCallback) {
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
        let leftPos = 0;
        for (let i = 0; i < this.columns.length; i++) {
            let col = this.columns[i];
            let cell = document.createElement('div');
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

        this.tableCells.onscroll = () => {
            //console.log('scroll', this.tableCells.scrollLeft, this.tableCells.scrollTop);

            // sync scroll headers
            if (this.tableHeaders.scrollLeft !== this.tableCells.scrollLeft) {
                this.tableHeaders.scrollLeft = this.tableCells.scrollLeft;
            }

            this.updateCells();
        }

        this.updateCells();
    }

    private visibleCells: VTableCellInfo[] = [];
    private visibleCellsSwap: VTableCellInfo[] = [];
    private hiddenCells: VTableCellInfo[] = [];
    private visibleStartRow: number = -1;
    private visibleEndRow: number = -1;
    private visibleStartColumn: number = -1;
    private visibleEndColumn: number = -1;

    private updateCells() {
        let top = this.tableCells.scrollTop;
        let left = this.tableCells.scrollLeft;
        let width = this.tableCells.clientWidth;
        let height = this.tableCells.clientHeight;
        let bottom = top + height;
        let right = left + width;

        let startRow = Math.floor(top / this.rowHeight);
        let endRow = Math.floor(bottom / this.rowHeight);
        let startColumn = 0;
        for (let i = 0; i < this.columnValues.length; i++) {
            let v = this.columnValues[i];
            if (left < v.left + v.width) {
                startColumn = i;
                break;
            }
        }

        let endColumn = -1;
        for (let i = startColumn; i < this.columnValues.length; i++) {
            let v = this.columnValues[i];
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
            for (let r = startRow; r <= endRow; r++) {
                for (let c = startColumn; c <= endColumn; c++) {
                    this.updateCell(r, c);
                }
            }
        } else {
            if (this.visibleStartRow < startRow || endRow < this.visibleEndRow || this.visibleStartColumn < startColumn || endColumn < this.visibleEndColumn) {
                for (let i = 0; i < this.visibleCells.length; i++) {
                    let info = this.visibleCells[i];
                    if (info.row < startRow || endRow < info.row || info.column < startColumn || endColumn < info.column) {
                        // out of range
                        this.hiddenCells.push(info);
                    } else {
                        // visible
                        this.visibleCellsSwap.push(info);
                    }
                }
            } else {
                // all visible
                for (let i = 0; i < this.visibleCells.length; i++) {
                    this.visibleCellsSwap.push(this.visibleCells[i]);
                }
            }

            let processedStartRow = startRow;
            let processedEndRow = endRow;

            // up startRow
            if (startRow < this.visibleStartRow) {
                console.log('up');
                for (let r = startRow; r < this.visibleStartRow && r <= endRow; r++) {
                    for (let c = startColumn; c <= endColumn; c++) {
                        this.updateCell(r, c);
                    }
                }
                processedStartRow = this.visibleStartRow < endRow ? this.visibleStartRow : endRow;
            }

            // down endRow
            if (this.visibleEndRow < endRow) {
                console.log('down');
                for (let r = endRow; r > this.visibleEndRow && r >= startRow; r--) {
                    for (let c = startColumn; c <= endColumn; c++) {
                        this.updateCell(r, c);
                    }
                }
                processedEndRow = this.visibleEndRow > startRow ? this.visibleEndRow : startRow;
            }

            // left
            if (startColumn < this.visibleStartColumn) {
                console.log('left');
                for (let c = startColumn; c < this.visibleStartColumn && c <= endColumn; c++) {
                    for (let r = processedStartRow; r <= processedEndRow; r++) {
                        this.updateCell(r, c);
                    }
                }
            }

            // right
            if (this.visibleEndColumn < endColumn) {
                console.log('right');
                for (let c = endColumn; c > this.visibleEndColumn && c >= startColumn; c--) {
                    for (let r = processedStartRow; r <= processedEndRow; r++) {
                        this.updateCell(r, c);
                    }
                }
            }
        }

        let vc = this.visibleCells;
        this.visibleCells = this.visibleCellsSwap;
        this.visibleCellsSwap = vc;
        vc.length = 0;


        this.visibleStartRow = startRow;
        this.visibleEndRow = endRow;
        this.visibleStartColumn = startColumn;
        this.visibleEndColumn = endColumn;
    }

    private updateCell(r: number, c: number) {
        let reuse = this.hiddenCells.length > 0;
        let info = reuse ? this.hiddenCells.pop() : this.cellPool.rent().value;
        let cell = this.SetCellInfo(info, r, c);
        this.visibleCellsSwap.push(info);
        if (!reuse) {
            console.log('appendChild', r, c);
            this.tableCells.appendChild(cell);
        }
    }

    private SetCellInfo(info: VTableCellInfo, r: number, c: number) {
        info.row = r;
        info.column = c;
        info.top = this.rowHeight * r;
        info.left = this.columnValues[c].left;
        info.width = this.columnValues[c].width;
        info.height = this.rowHeight;
        let cell = info.element;
        cell.className = "cell";
        cell.style.top = info.top + 'px';
        cell.style.left = info.left + 'px';
        cell.style.width = info.width + 'px';
        cell.style.height = info.height + 'px';
        cell.textContent = this.getValue(r, c);
        return cell;
    }

    private resize() {
        this.vTable.style.height = this._height + 'px';
        this.tableCells.style.height = this._height - this.headerHeight + 'px';
        let scrollbarWidth = this.vTable.clientWidth - this.tableCells.clientWidth;
        this.tableHeaders.style.marginRight = scrollbarWidth + 'px';
        this.updateCells();
    }
}

let columns: VTableColumn[] = [];
for (let i = 0; i < 10; i++) {
    columns.push({ width: Math.floor(Math.random() * 50 + 50), name: i.toString() });
}

let vTableDiv = <HTMLDivElement>document.getElementById("vtable");
let vTable = new VTable(vTableDiv, 100, columns /*[
    { width: 100, name: 'abc' },
    { width: 200, name: 'xyz' },
    { width: 50, name: '123' },
]*/, 10, 25, (r, c) => {
        return r + '-' + c;
    });

function resize() { vTable.height = window.innerHeight - 20; }

window.onresize = resize;
resize();
