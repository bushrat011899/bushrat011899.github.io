/**
 * Sorts a table based on the provided header cell element.
 * @param {HTMLTableCellElement} headerElement 
 */
export function sortTable(headerElement: HTMLTableCellElement) {
    const headerRow = headerElement.parentElement as HTMLTableRowElement;
    
    const tableHeader = headerRow.parentElement as HTMLTableSectionElement;

    const table = tableHeader.parentElement as HTMLTableElement;

    const column = Array.from(headerRow.children).indexOf(headerElement);

    table.toggleAttribute("ascending");

    const ascending = table.hasAttribute("ascending");

    let switching = true;

    while (switching) {
        let i = 1;
        switching = false;
        let shouldSwitch = false;
        const rows = table.rows;

        for (i = 1; i < (rows.length - 1); i++) {
            shouldSwitch = false;
            
            const x = rows[i].getElementsByTagName("td")[column];
            const y = rows[i + 1].getElementsByTagName("td")[column];

            const xSort = (x as any).sortProperty ?? x.textContent.toLowerCase();
            const ySort = (y as any).sortProperty ?? y.textContent.toLowerCase();

            if (ascending ? xSort > ySort : xSort < ySort) {
                shouldSwitch = true;
                break;
            }
        }

        if (shouldSwitch) {
            rows[i].parentNode.insertBefore(rows[i + 1], rows[i]);
            switching = true;
        }
    }
}