interface Column {
    name: string;
    width: number;
}

interface ColumnValue {
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
    private style: HTMLStyleElement;
    private columns: Column[];
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

    constructor(vTable: HTMLDivElement, columns: Column[], rowCount: number, rowHeight: number, getValue: getValueCallback) {
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
        let leftPos = 0;
        for (let i = 0; i < this.columns.length; i++) {
            let col = this.columns[i];
            let item = this.cellPool.rent();
            let cell = item.value.element;
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

        this.tableCells.onscroll = () => {
            //console.log('scroll', this.tableCells.scrollLeft, this.tableCells.scrollTop);

            // sync scroll headers
            if (this.tableHeaders.scrollLeft !== this.tableCells.scrollLeft) {
                this.tableHeaders.scrollLeft = this.tableCells.scrollLeft;
            }

            this.updateCells();
        }

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

    private visibleCells: VTableCellInfo[] = [];
    private visibleCellsSwap: VTableCellInfo[] = [];
    private hiddenCells: VTableCellInfo[] = [];
    private visibleStartRow: number = -1;
    private visibleEndRow: number = -1;

    private updateCells() {
        let top = this.tableCells.scrollTop;
        let left = this.tableCells.scrollLeft;
        let width = this.tableCells.clientWidth;
        let height = this.tableCells.clientHeight;
        let bottom = top + height;
        let right = left + width;

        let startRow = Math.floor(top / this.rowHeight);
        let endRow = Math.floor(bottom / this.rowHeight);
        if (endRow >= this.rowCount) {
            endRow = this.rowCount - 1;
        }

        // initialized?
        if (this.visibleStartRow !== -1) {
            if (this.visibleStartRow < startRow || endRow < this.visibleEndRow) {
                for (let i = 0; i < this.visibleCells.length; i++) {
                    let info = this.visibleCells[i];
                    if (info.row < startRow || endRow < info.row) {
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

            // up startRow
            if (startRow < this.visibleStartRow) {
                for (let r = startRow; r < this.visibleStartRow && r <= endRow; r++) {
                    for (let c = 0; c < this.columnValues.length; c++) {
                        this.updateCell(r, c);
                    }
                }
            }

            // down endRow
            if (this.visibleEndRow < endRow) {
                for (let r = endRow; r > this.visibleEndRow && r >= startRow; r--) {
                    for (let c = 0; c < this.columnValues.length; c++) {
                        this.updateCell(r, c);
                    }
                }
            }
        } else {
            // all create
            for (let r = startRow; r <= endRow; r++) {
                for (let c = 0; c < this.columnValues.length; c++) {
                    this.updateCell(r, c);
                }
            }
        }

        // clear hidden cells
        for (let i = 0; i < this.hiddenCells.length; i++) {
            this.tableCells.removeChild(this.hiddenCells[i].element);
            this.cellPool.returnById(this.hiddenCells[i].id);
        }

        this.hiddenCells.length = 0;

        let vc = this.visibleCells;
        this.visibleCells = this.visibleCellsSwap;
        this.visibleCellsSwap = vc;
        vc.length = 0;


        this.visibleStartRow = startRow;
        this.visibleEndRow = endRow;
    }

    private updateCell(r: number, c: number) {
        let reuse = this.hiddenCells.length > 0;
        let info = reuse ? this.hiddenCells.pop() : this.cellPool.rent().value;
        let cell = this.SetCellInfo(info, r, c);
        this.visibleCellsSwap.push(info);
        if (!reuse) {
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
        this.tableCells.style.height = this._height - this.rowHeight + 'px';
        this.updateCells();
    }

    private updateCss() {
        let css = '';
        let offset = 0;

        // for (let i = 0; i < this.columns.length; i++) {
        //     let column = this.columns[i];
        //     css += '.column' + i + '{width:' + column.width + 'px;left:' + offset + 'px}';
        //     offset += column.width;
        // }

        // for (let i = 0; i < this.rowCount; i++) {
        //     css += '.row' + i + "{height:25px;top:" + (i * this.rowHeight) + "px} ";
        // }

        this.style.innerHTML = css;
    }
}

let vTableDiv = <HTMLDivElement>document.getElementById("vtable");
let vTable = new VTable(vTableDiv, [
    { width: 100, name: 'abc' },
    { width: 200, name: 'xyz' },
    { width: 50, name: '123' },
], 10000, 25, (r, c) => {
    return r + '-' + c;
});

function resize() { vTable.height = window.innerHeight - 25; }

window.onresize = resize;
resize();
