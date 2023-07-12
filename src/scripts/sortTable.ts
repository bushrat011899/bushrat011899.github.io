export class SortableHTMLTableCellElement extends HTMLTableCellElement {
    static define() {
        customElements.define("hss-table-header-sortable", this, { extends: "th" });
    }

    connectedCallback() {
        this.addEventListener("click", () => this.sort());
    }

    sort() {
        const table = this.closest('table');

        sortTableBody(
            table.getElementsByTagName("tbody")[0],
            Array.from(this.parentNode.children).indexOf(this),
            !table.toggleAttribute("ascending")
        );
    }
}

// Based on https://stackoverflow.com/questions/14267781/sorting-html-table-with-javascript
function sortTableBody(tableBody: HTMLTableSectionElement, column: number, ascending: boolean) {
    Array.from(tableBody.rows)
        .sort((a, b) => compare(
            getCellValue(ascending ? a : b, column),
            getCellValue(ascending ? b : a, column)
        ))
        .forEach(row => tableBody.appendChild(row));
}

function compare(x: number | string, y: number | string) {
    if (typeof x == "number" && typeof y == "number" && !isNaN(x) && !isNaN(y)) return x - y;

    return x.toString().localeCompare(y.toString());
}

function getCellValue(row: HTMLTableRowElement, column: number) {
    const cell = row.children[column];

    return ((c) => (c as any).sortProperty || c.textContent)(cell);
}
