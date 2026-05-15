import { useState, useMemo } from "react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head, usePage } from "@inertiajs/react";

// ─── CSV Export ────────────────────────────────────────────────────────────────
const exportToCSV = (data, filename) => {
    if (!data || data.length === 0) { alert("No data to export!"); return; }
    const headers = Object.keys(data[0]);
    const textColumns = ['itemCode', 'employeeId', 'employeeNo', 'mrsNo', 'serial'];
    const csvContent = [
        headers.join(","),
        ...data.map(row =>
            headers.map(header => {
                const raw = row[header] !== null && row[header] !== undefined ? String(row[header]) : "";
                const looksLikeScientific = /^\d+[eE]\d+$/i.test(raw);
                const hasLeadingZero = /^0\d+/.test(raw);
                const isLongNumber = /^\d{10,}$/.test(raw);
                const isTextColumn = textColumns.includes(header);
                if (isTextColumn || looksLikeScientific || hasLeadingZero || isLongNumber)
                    return `="${raw.replace(/"/g, '""')}"`;
                const needsQuoting = raw.includes(",") || raw.includes('"') || raw.includes("\n");
                return needsQuoting ? `"${raw.replace(/"/g, '""')}"` : raw;
            }).join(",")
        )
    ].join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.setAttribute("href", URL.createObjectURL(blob));
    link.setAttribute("download", `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

// ─── Helpers ───────────────────────────────────────────────────────────────────
const getWeekNumber = (date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    const yearStart = new Date(d.getFullYear(), 0, 1);
    return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
};

const getMonthName = (month) =>
    ['January','February','March','April','May','June','July','August','September','October','November','December'][month - 1] || '';

const sortByMrsNoDesc = (data) =>
    [...data].sort((a, b) => {
        const numA = parseInt((a.mrsNo || '').replace(/\D/g, ''), 10) || 0;
        const numB = parseInt((b.mrsNo || '').replace(/\D/g, ''), 10) || 0;
        return numB - numA;
    });

const applySearch = (data, searchTerm) => {
    if (!searchTerm.trim()) return data;
    const lower = searchTerm.toLowerCase();
    return data.filter(row =>
        Object.values(row).some(val =>
            val !== null && val !== undefined && String(val).toLowerCase().includes(lower)
        )
    );
};

// ─── SHARED UI COMPONENTS ──────────────────────────────────────────────────────

const SearchBar = ({ value, onChange, placeholder = "Search..." }) => (
    <div className="relative w-full max-w-sm">
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
        </div>
        <input
            type="text"
            className="input input-bordered input-sm w-full pl-9 pr-8"
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
        />
        {value && (
            <button
                className="absolute inset-y-0 right-0 flex items-center pr-3 opacity-40 hover:opacity-100"
                onClick={() => onChange("")}
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        )}
    </div>
);

const CardWrap = ({ children }) => (
    <div className="border border-base-content/20 rounded-lg">
        <div className="p-6">{children}</div>
    </div>
);

const CardHeader = ({ title, totalItems, originalCount, searchKey, searchTerms, onExport, exportDisabled }) => (
    <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold">{title}</h3>
        <div className="flex items-center gap-4">
            <span className="text-sm opacity-60">
                {searchTerms[searchKey]
                    ? `Showing ${totalItems} of ${originalCount} items`
                    : `Total items: ${totalItems}`}
            </span>
            <button onClick={onExport} className="btn btn-sm btn-outline" disabled={exportDisabled}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export CSV
            </button>
        </div>
    </div>
);

const FilterControls = ({
    filterType, setFilterType,
    selectedYear, setSelectedYear,
    selectedMonth, setSelectedMonth,
    selectedWeek, setSelectedWeek,
    availableYears, availableMonths, availableWeeks
}) => (
    <div className="flex flex-wrap gap-4 items-center mb-4 p-4 border border-base-content/20 rounded-lg">
        <div className="form-control">
            <label className="label"><span className="label-text font-semibold">Filter by:</span></label>
            <select className="select select-bordered select-sm w-40" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                <option value="all">All Time</option>
                <option value="year">Year</option>
                <option value="month">Month</option>
                <option value="week">Week</option>
            </select>
        </div>
        {filterType === 'year' && (
            <div className="form-control">
                <label className="label"><span className="label-text">Select Year:</span></label>
                <select className="select select-bordered select-sm w-32" value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}>
                    <option value="">All Years</option>
                    {availableYears.map(year => <option key={year} value={year}>{year}</option>)}
                </select>
            </div>
        )}
        {filterType === 'month' && (
            <>
                <div className="form-control">
                    <label className="label"><span className="label-text">Select Year:</span></label>
                    <select className="select select-bordered select-sm w-32" value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}>
                        <option value="">Select Year</option>
                        {availableYears.map(year => <option key={year} value={year}>{year}</option>)}
                    </select>
                </div>
                {selectedYear && (
                    <div className="form-control">
                        <label className="label"><span className="label-text">Select Month:</span></label>
                        <select className="select select-bordered select-sm w-40" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} disabled={!selectedYear}>
                            <option value="">All Months</option>
                            {availableMonths.map(month => <option key={month.value} value={month.value}>{month.label}</option>)}
                        </select>
                    </div>
                )}
            </>
        )}
        {filterType === 'week' && (
            <>
                <div className="form-control">
                    <label className="label"><span className="label-text">Select Year:</span></label>
                    <select className="select select-bordered select-sm w-32" value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}>
                        <option value="">Select Year</option>
                        {availableYears.map(year => <option key={year} value={year}>{year}</option>)}
                    </select>
                </div>
                {selectedYear && (
                    <div className="form-control">
                        <label className="label"><span className="label-text">Select Week:</span></label>
                        <select className="select select-bordered select-sm w-32" value={selectedWeek} onChange={(e) => setSelectedWeek(e.target.value)} disabled={!selectedYear}>
                            <option value="">All Weeks</option>
                            {availableWeeks.map(week => <option key={week.value} value={week.value}>Week {week.value} ({week.label})</option>)}
                        </select>
                    </div>
                )}
            </>
        )}
        <div className="flex items-end">
            <button
                onClick={() => { setFilterType('all'); setSelectedYear(''); setSelectedMonth(''); setSelectedWeek(''); }}
                className="btn btn-sm btn-ghost"
            >
                Clear Filters
            </button>
        </div>
    </div>
);

const Pagination = ({ currentPage, totalPages, onPageChange }) => {
    const getPageNumbers = () => {
        const pages = [];
        const maxVisible = 5;
        if (totalPages <= maxVisible) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else if (currentPage <= 3) {
            for (let i = 1; i <= 4; i++) pages.push(i);
            pages.push('...'); pages.push(totalPages);
        } else if (currentPage >= totalPages - 2) {
            pages.push(1); pages.push('...');
            for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
        } else {
            pages.push(1); pages.push('...');
            pages.push(currentPage - 1); pages.push(currentPage); pages.push(currentPage + 1);
            pages.push('...'); pages.push(totalPages);
        }
        return pages;
    };

    return (
        <div className="flex justify-center items-center gap-2 mt-4">
            <button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1} className="btn btn-sm btn-outline">Previous</button>
            {getPageNumbers().map((page, idx) =>
                page === '...' ? (
                    <span key={`ellipsis-${idx}`} className="px-2">...</span>
                ) : (
                    <button key={page} onClick={() => onPageChange(page)}
                        className={`btn btn-sm ${currentPage === page ? 'btn-active' : 'btn-outline'}`}
                    >{page}</button>
                )
            )}
            <button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages} className="btn btn-sm btn-outline">Next</button>
            <span className="ml-4 text-sm opacity-60">Page {currentPage} of {totalPages}</span>
        </div>
    );
};

// ─── Action badge config ───────────────────────────────────────────────────────
const ACTION_LABELS = {
    issued:         { label: 'Issued',      badge: 'badge-error' },
    returned:       { label: 'Returned',    badge: 'badge-success' },
    quantity_added: { label: 'Stock Added', badge: 'badge-info' },
    updated:        { label: 'Updated',     badge: 'badge-warning' },
    no_action:      { label: 'No Action',   badge: 'badge-ghost opacity-40' },  // ← add this

};

// ─── Main Export Component ─────────────────────────────────────────────────────
export default function Export({ tableData }) {
    const [activeMainTab, setActiveMainTab] = useState("consumable");
    const [activeSubTabs, setActiveSubTabs] = useState({
        consumable: "inventory", supplies: "inventory", consigned: "inventory",
    });

    const [currentPages, setCurrentPages] = useState({
        consumable_inventory: 1, consumable_issuance: 1, consumable_return: 1,
        supplies_inventory: 1,   supplies_issuance: 1,   supplies_return: 1,
        consigned_inventory: 1,  consigned_inventoryHistory: 1,
        consigned_inventoryHistory_historyPage: 1,
        consigned_issuance: 1,   consigned_return: 1,
    });

    const [searchTerms, setSearchTerms] = useState({
        consumable_inventory: '', consumable_issuance: '', consumable_return: '',
        supplies_inventory: '',   supplies_issuance: '',   supplies_return: '',
        consigned_inventory: '',  consigned_inventoryHistory: '',
        consigned_inventoryHistory_history: '',
        consigned_issuance: '',   consigned_return: '',
    });

    const [filterStates, setFilterStates] = useState({
        consumable_issuance:        { filterType: 'all', selectedYear: '', selectedMonth: '', selectedWeek: '' },
        consumable_return:          { filterType: 'all', selectedYear: '', selectedMonth: '', selectedWeek: '' },
        supplies_issuance:          { filterType: 'all', selectedYear: '', selectedMonth: '', selectedWeek: '' },
        supplies_return:            { filterType: 'all', selectedYear: '', selectedMonth: '', selectedWeek: '' },
        consigned_inventoryHistory: { filterType: 'all', selectedYear: '', selectedMonth: '', selectedWeek: '', selectedDay: '' },
        consigned_issuance:         { filterType: 'all', selectedYear: '', selectedMonth: '', selectedWeek: '' },
        consigned_return:           { filterType: 'all', selectedYear: '', selectedMonth: '', selectedWeek: '' },
    });

    // ── Inventory History: selected items (Set of itemCodes) ─────────────────
    const [selectedHistoryItems, setSelectedHistoryItems] = useState(new Set());

    const itemsPerPage = 10;

    const updateSearchTerm = (tableKey, value) => {
        setSearchTerms(prev => ({ ...prev, [tableKey]: value }));
        setCurrentPages(prev => ({ ...prev, [tableKey]: 1 }));
    };

    const updateFilterState = (tableKey, updates) => {
        setFilterStates(prev => ({ ...prev, [tableKey]: { ...prev[tableKey], ...updates } }));
        setCurrentPages(prev => ({ ...prev, [tableKey]: 1 }));
    };

    const getFilteredData = (data, tableKey) => {
        const filters = filterStates[tableKey];
        if (filters.filterType === 'all' || !data.length) return data;
        return data.filter(item => {
            if (!item.orderDate) return false;
            const date  = new Date(item.orderDate);
            const year  = date.getFullYear().toString();
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const week  = getWeekNumber(date).toString().padStart(2, '0');
            if (filters.filterType === 'year'  && filters.selectedYear) return year === filters.selectedYear;
            if (filters.filterType === 'month' && filters.selectedYear)
                return year === filters.selectedYear && (!filters.selectedMonth || month === filters.selectedMonth);
            if (filters.filterType === 'week'  && filters.selectedYear)
                return year === filters.selectedYear && (!filters.selectedWeek || week === filters.selectedWeek);
            if (filters.filterType === 'day' && filters.selectedDay)
                return item.snapshotDate === filters.selectedDay;
            return true;
        });
    };

    const getAvailableFilters = (data) => {
        const yearsSet = new Set(), monthsSet = new Set(), weeksSet = new Set();
        data.forEach(item => {
            if (item.orderDate) {
                const date  = new Date(item.orderDate);
                const year  = date.getFullYear();
                const month = date.getMonth() + 1;
                const week  = getWeekNumber(date);
                yearsSet.add(year);
                monthsSet.add(`${year}-${month.toString().padStart(2, '0')}`);
                weeksSet.add(`${year}-${week.toString().padStart(2, '0')}`);
            }
        });
        const years  = Array.from(yearsSet).sort((a, b) => b - a);
        const months = Array.from(monthsSet).sort((a, b) => b.localeCompare(a)).map(s => {
            const [year, month] = s.split('-');
            return { value: month, label: `${getMonthName(parseInt(month))} ${year}` };
        });
        const weeks = Array.from(weeksSet).sort((a, b) => b.localeCompare(a)).map(s => {
            const [year, week] = s.split('-');
            return { value: week, label: `Year ${year}, Week ${week}` };
        });
        return { years, months, weeks };
    };

    const getAvailableHistoryFilters = (data) => {
        const yearsSet = new Set(), monthsSet = new Set(), weeksSet = new Set();
        data.forEach(item => {
            (item.snapshots || []).forEach(snapshot => {
                if (snapshot.snapshotDate) {
                    const date  = new Date(snapshot.snapshotDate);
                    const year  = date.getFullYear();
                    const month = date.getMonth() + 1;
                    const week  = getWeekNumber(date);
                    yearsSet.add(year);
                    monthsSet.add(`${year}-${month.toString().padStart(2, '0')}`);
                    weeksSet.add(`${year}-${week.toString().padStart(2, '0')}`);
                }
            });
        });
        const years  = Array.from(yearsSet).sort((a, b) => b - a);
        const months = Array.from(monthsSet).sort((a, b) => b.localeCompare(a)).map(s => {
            const [year, month] = s.split('-');
            return { value: month, label: `${getMonthName(parseInt(month))} ${year}` };
        });
        const weeks = Array.from(weeksSet).sort((a, b) => b.localeCompare(a)).map(s => {
            const [year, week] = s.split('-');
            return { value: week, label: `Year ${year}, Week ${week}` };
        });
        return { years, months, weeks };
    };

    const getPaginatedData = (data, pageKey) => {
        const page  = currentPages[pageKey] || 1;
        const start = (page - 1) * itemsPerPage;
        return {
            data:        data.slice(start, start + itemsPerPage),
            totalPages:  Math.ceil(data.length / itemsPerPage) || 1,
            currentPage: page,
            totalItems:  data.length,
        };
    };

    const handlePageChange = (pageKey, newPage) =>
        setCurrentPages(prev => ({ ...prev, [pageKey]: newPage }));

    const handleExportCSV = (originalData, filteredData, hasActiveFilter, filename) =>
        exportToCSV(hasActiveFilter ? filteredData : originalData, filename);

    const handleSubTabChange = (subTabId) =>
        setActiveSubTabs(prev => ({ ...prev, [activeMainTab]: subTabId }));

    const mainTabs = [
        { id: "consumable", label: "Consumable and Spare parts" },
        { id: "supplies",   label: "Supplies" },
        { id: "consigned",  label: "Consigned" },
    ];

    const subTabs = [
        { id: "inventory",        label: "Inventory" },
        { id: "inventoryHistory", label: "Inventory History" },
        { id: "issuance",         label: "Issuance" },
        { id: "return",           label: "Return" },
    ];

    const currentSubTab  = activeSubTabs[activeMainTab];
    const mainTabLabel   = mainTabs.find(t => t.id === activeMainTab)?.label;
    const subTabLabel    = subTabs.find(t => t.id === currentSubTab)?.label;
    const title          = `${mainTabLabel} - ${subTabLabel}`;

    const consumableInventoryData = tableData?.consumable?.inventory || [];
    const consumableIssuanceData  = tableData?.consumable?.issuance  || [];
    const consumableReturnData    = tableData?.consumable?.return    || [];
    const suppliesInventoryData   = tableData?.supplies?.inventory   || [];
    const suppliesIssuanceData    = tableData?.supplies?.issuance    || [];
    const suppliesReturnData      = tableData?.supplies?.return      || [];
    const consignedInventoryData  = tableData?.consigned?.inventory  || [];
    const consignedIssuanceData   = tableData?.consigned?.issuance   || [];
    const consignedReturnData     = tableData?.consigned?.return     || [];
    const consignedInventoryHistoryData = tableData?.consigned?.inventoryHistory || [];

    const { consignedIssuedWeeklyMap, weekLabels } = useMemo(() => {
    const getRange = (daysAgoStart, daysAgoEnd) => {
        const start = new Date();
        start.setDate(start.getDate() - daysAgoStart);
        start.setHours(0, 0, 0, 0);
        const end = new Date();
        end.setDate(end.getDate() - daysAgoEnd);
        end.setHours(23, 59, 59, 999);
        return { start, end };
    };

    const weekRanges = [
        { key: 'w1', ...getRange(29, 22) },
        { key: 'w2', ...getRange(21, 15) },
        { key: 'w3', ...getRange(14, 8)  },
        { key: 'w4', ...getRange(7, 0)   },
    ];

    const fmt = (d) => {
        const mo = (d.getMonth() + 1).toString().padStart(2, '0');
        const dy = d.getDate().toString().padStart(2, '0');
        return `${mo}/${dy}`;
    };

    const labels = weekRanges.map((w, i) =>
        `W${i + 1} (${fmt(w.start)}–${fmt(w.end)})`
    );

    const map = {};
    consignedIssuanceData.forEach(item => {
        if (!item.orderDate || !item.itemCode) return;
        const date = new Date(item.orderDate);
        const qty  = Number(item.issuedQuantity) || 0;
        if (!map[item.itemCode]) map[item.itemCode] = { w1: 0, w2: 0, w3: 0, w4: 0 };
        for (const { key, start, end } of weekRanges) {
            if (date >= start && date <= end) {
                map[item.itemCode][key] += qty;
                break;
            }
        }
    });

    return { consignedIssuedWeeklyMap: map, weekLabels: labels };
}, [consignedIssuanceData]);

    const renderContent = () => {

        // ===== CONSUMABLE INVENTORY =====
        if (activeMainTab === "consumable" && currentSubTab === "inventory") {
            const tableKey     = 'consumable_inventory';
            const searchedData = applySearch(consumableInventoryData, searchTerms[tableKey]);
            const { data, totalPages, currentPage, totalItems } = getPaginatedData(searchedData, tableKey);
            return (
                <CardWrap>
                    <CardHeader title={title} totalItems={totalItems} originalCount={consumableInventoryData.length}
                        searchKey={tableKey} searchTerms={searchTerms}
                        onExport={() => handleExportCSV(consumableInventoryData, searchedData, !!searchTerms[tableKey], 'consumable_inventory')}
                        exportDisabled={consumableInventoryData.length === 0} />
                    <div className="mb-4">
                        <SearchBar value={searchTerms[tableKey]} onChange={(val) => updateSearchTerm(tableKey, val)} placeholder="Search by item code, description, category..." />
                    </div>
                    <div className="overflow-x-auto">
                        <table className="table table-zebra [&_th]:border-y [&_th]:border-base-content/20 [&_td]:border-y [&_td]:border-base-content/20">
                            <thead><tr><th>Item Code</th><th>Material Description</th><th>Long Description</th><th>Serial</th><th>Category</th><th>Bin Location</th><th>Quantity</th><th>UOM</th><th>Maximum</th><th>Minimum</th></tr></thead>
                            <tbody>
                                {data.length > 0 ? data.map((item, index) => (
                                    <tr key={index}>
                                        <td className="font-semibold">{item.itemCode}</td>
                                        <td>{item.materialDescription}</td>
                                        <td>{item.detailedDescription}</td>
                                        <td>{item.serial}</td>
                                        <td><span className="badge badge-outline badge-sm">{item.category}</span></td>
                                        <td>{item.binLocation}</td>
                                        <td><span className={`font-bold ${item.quantity <= item.minimum ? "text-error" : item.quantity <= item.minimum * 1.5 ? "text-warning" : ""}`}>{item.quantity}</span></td>
                                        <td>{item.uom}</td>
                                        <td>{item.maximum}</td>
                                        <td>{item.minimum}</td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan="10" className="text-center opacity-50">{searchTerms[tableKey] ? `No results for "${searchTerms[tableKey]}"` : 'No inventory data available'}</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    {totalPages > 1 && <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={(page) => handlePageChange(tableKey, page)} />}
                </CardWrap>
            );
        }

        // ===== CONSUMABLE ISSUANCE =====
        if (activeMainTab === "consumable" && currentSubTab === "issuance") {
            const tableKey = 'consumable_issuance';
            const filters  = filterStates[tableKey];
            const availableFilters = getAvailableFilters(consumableIssuanceData);
            const filteredData = getFilteredData(consumableIssuanceData, tableKey);
            const searchedData = applySearch(sortByMrsNoDesc(filteredData), searchTerms[tableKey]);
            const { data, totalPages, currentPage, totalItems } = getPaginatedData(searchedData, tableKey);
            const hasActiveFilter = filters.filterType !== 'all' || !!searchTerms[tableKey];
            return (
                <CardWrap>
                    <CardHeader title={title} totalItems={totalItems} originalCount={consumableIssuanceData.length}
                        searchKey={tableKey} searchTerms={searchTerms}
                        onExport={() => handleExportCSV(consumableIssuanceData, searchedData, hasActiveFilter, 'consumable_issuance')}
                        exportDisabled={consumableIssuanceData.length === 0} />
                    <FilterControls filterType={filters.filterType} setFilterType={(v) => updateFilterState(tableKey, { filterType: v })}
                        selectedYear={filters.selectedYear} setSelectedYear={(v) => updateFilterState(tableKey, { selectedYear: v, selectedMonth: '', selectedWeek: '' })}
                        selectedMonth={filters.selectedMonth} setSelectedMonth={(v) => updateFilterState(tableKey, { selectedMonth: v })}
                        selectedWeek={filters.selectedWeek} setSelectedWeek={(v) => updateFilterState(tableKey, { selectedWeek: v })}
                        availableYears={availableFilters.years} availableMonths={availableFilters.months} availableWeeks={availableFilters.weeks} />
                    <div className="mb-4">
                        <SearchBar value={searchTerms[tableKey]} onChange={(val) => updateSearchTerm(tableKey, val)} placeholder="Search by employee, MRS no, item code..." />
                    </div>
                    <div className="overflow-x-auto">
                        <table className="table table-zebra [&_th]:border-y [&_th]:border-base-content/20 [&_td]:border-y [&_td]:border-base-content/20">
                            <thead>
                                <tr>
                                    <th>Order Date</th><th>Employee ID</th><th>Employee Name</th>
                                    <th>Department</th><th>Prodline</th><th>Machine No</th>
                                    <th>MRS No</th><th>Issued By</th><th>Item Code</th>
                                    <th>Material Description</th><th>Long Description</th><th>Serial</th>
                                    <th>Quantity</th><th>Request Qty</th><th>Issued Qty</th><th>Remarks</th><th>SOH</th><th>Delivered At</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.length > 0 ? data.map((item, index) => (
                                    <tr key={index}>
                                        <td className="whitespace-nowrap">{item.orderDate}</td>
                                        <td className="font-semibold">{item.employeeId}</td>
                                        <td>{item.employeeName}</td>
                                        <td><span className="badge badge-outline badge-sm">{item.department}</span></td>
                                        <td>{item.prodline}</td>
                                        <td>{item.machineNo || '—'}</td>
                                        <td className="font-mono">{item.mrsNo}</td>
                                        <td>{item.issuedBy}</td>
                                        <td className="font-semibold">{item.itemCode}</td>
                                        <td>{item.materialDescription}</td>
                                        <td>{item.detailedDescription}</td>
                                        <td>{item.serial}</td>
                                        <td className="text-center font-bold">{item.quantity}</td>
                                        <td className="text-center">{item.requestQuantity}</td>
                                        <td className="text-center"><span className={`font-bold ${item.issuedQuantity < item.requestQuantity ? "text-warning" : ""}`}>{item.issuedQuantity}</span></td>
                                        <td className="text-sm italic opacity-70">{item.remarks}</td>
                                        <td className="text-center"><span className="font-bold">{item.soh ?? '—'}</span></td>
                                        <td className="whitespace-nowrap">{item.deliveredAt}</td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan="18" className="text-center opacity-50">{searchTerms[tableKey] ? `No results for "${searchTerms[tableKey]}"` : `No issuance data available${filters.filterType !== 'all' ? ' for selected filter' : ''}`}</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    {totalPages > 1 && <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={(page) => handlePageChange(tableKey, page)} />}
                </CardWrap>
            );
        }

        // ===== CONSUMABLE RETURN =====
        if (activeMainTab === "consumable" && currentSubTab === "return") {
            const tableKey = 'consumable_return';
            const filters  = filterStates[tableKey];
            const availableFilters = getAvailableFilters(consumableReturnData);
            const filteredData = getFilteredData(consumableReturnData, tableKey);
            const searchedData = applySearch(sortByMrsNoDesc(filteredData), searchTerms[tableKey]);
            const { data, totalPages, currentPage, totalItems } = getPaginatedData(searchedData, tableKey);
            const hasActiveFilter = filters.filterType !== 'all' || !!searchTerms[tableKey];
            return (
                <CardWrap>
                    <CardHeader title={title} totalItems={totalItems} originalCount={consumableReturnData.length}
                        searchKey={tableKey} searchTerms={searchTerms}
                        onExport={() => handleExportCSV(consumableReturnData, searchedData, hasActiveFilter, 'consumable_return')}
                        exportDisabled={consumableReturnData.length === 0} />
                    <FilterControls filterType={filters.filterType} setFilterType={(v) => updateFilterState(tableKey, { filterType: v })}
                        selectedYear={filters.selectedYear} setSelectedYear={(v) => updateFilterState(tableKey, { selectedYear: v, selectedMonth: '', selectedWeek: '' })}
                        selectedMonth={filters.selectedMonth} setSelectedMonth={(v) => updateFilterState(tableKey, { selectedMonth: v })}
                        selectedWeek={filters.selectedWeek} setSelectedWeek={(v) => updateFilterState(tableKey, { selectedWeek: v })}
                        availableYears={availableFilters.years} availableMonths={availableFilters.months} availableWeeks={availableFilters.weeks} />
                    <div className="mb-4">
                        <SearchBar value={searchTerms[tableKey]} onChange={(val) => updateSearchTerm(tableKey, val)} placeholder="Search by MRS no, requestor, item code..." />
                    </div>
                    <div className="overflow-x-auto">
                        <table className="table table-zebra [&_th]:border-y [&_th]:border-base-content/20 [&_td]:border-y [&_td]:border-base-content/20">
                            <thead>
                                <tr>
                                    <th>Return Date</th><th>MRS No</th><th>Return Requestor</th>
                                    <th>Machine No</th><th>Return Handler</th><th>Item Code</th>
                                    <th>Material Description</th><th>Quantity</th><th>Old Quantity</th><th>Issued Quantity</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.length > 0 ? data.map((item, index) => (
                                    <tr key={index}>
                                        <td className="whitespace-nowrap">{item.orderDate}</td>
                                        <td className="font-mono">{item.mrsNo}</td>
                                        <td className="font-semibold">{item.employeeName}</td>
                                        <td>{item.machineNo || '—'}</td>
                                        <td>{item.issuedBy}</td>
                                        <td className="font-semibold">{item.itemCode}</td>
                                        <td>{item.materialDescription}</td>
                                        <td className="text-center font-bold">{item.quantity}</td>
                                        <td className="text-center">{item.requestQuantity}</td>
                                        <td className="text-center"><span className={`font-bold ${item.issuedQuantity < item.requestQuantity ? "text-warning" : ""}`}>{item.issuedQuantity}</span></td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan="10" className="text-center opacity-50">{searchTerms[tableKey] ? `No results for "${searchTerms[tableKey]}"` : `No return data available${filters.filterType !== 'all' ? ' for selected filter' : ''}`}</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    {totalPages > 1 && <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={(page) => handlePageChange(tableKey, page)} />}
                </CardWrap>
            );
        }

        // ===== SUPPLIES INVENTORY =====
        if (activeMainTab === "supplies" && currentSubTab === "inventory") {
            const tableKey     = 'supplies_inventory';
            const searchedData = applySearch(suppliesInventoryData, searchTerms[tableKey]);
            const { data, totalPages, currentPage, totalItems } = getPaginatedData(searchedData, tableKey);
            return (
                <CardWrap>
                    <CardHeader title={title} totalItems={totalItems} originalCount={suppliesInventoryData.length}
                        searchKey={tableKey} searchTerms={searchTerms}
                        onExport={() => handleExportCSV(suppliesInventoryData, searchedData, !!searchTerms[tableKey], 'supplies_inventory')}
                        exportDisabled={suppliesInventoryData.length === 0} />
                    <div className="mb-4">
                        <SearchBar value={searchTerms[tableKey]} onChange={(val) => updateSearchTerm(tableKey, val)} placeholder="Search by item code, description..." />
                    </div>
                    <div className="overflow-x-auto">
                        <table className="table table-zebra [&_th]:border-y [&_th]:border-base-content/20 [&_td]:border-y [&_td]:border-base-content/20">
                            <thead><tr><th>Item Code</th><th>Material Description</th><th>Long Description</th><th>Quantity</th><th>UOM</th><th>Minimum</th><th>Maximum</th><th>Price</th></tr></thead>
                            <tbody>
                                {data.length > 0 ? data.map((item, index) => (
                                    <tr key={index}>
                                        <td className="font-semibold">{item.itemCode}</td>
                                        <td>{item.materialDescription}</td>
                                        <td>{item.detailedDescription}</td>
                                        <td><span className={`font-bold ${item.quantity <= item.minimum ? "text-error" : item.quantity <= item.minimum * 1.5 ? "text-warning" : ""}`}>{item.quantity}</span></td>
                                        <td>{item.uom}</td>
                                        <td>{item.minimum}</td>
                                        <td>{item.maximum}</td>
                                        <td className="font-semibold">{typeof item.price === 'number' ? `₱${item.price.toFixed(2)}` : item.price || '₱0.00'}</td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan="8" className="text-center opacity-50">{searchTerms[tableKey] ? `No results for "${searchTerms[tableKey]}"` : 'No supplies inventory data available'}</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    {totalPages > 1 && <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={(page) => handlePageChange(tableKey, page)} />}
                </CardWrap>
            );
        }

        // ===== SUPPLIES ISSUANCE =====
        if (activeMainTab === "supplies" && currentSubTab === "issuance") {
            const tableKey = 'supplies_issuance';
            const filters  = filterStates[tableKey];
            const availableFilters = getAvailableFilters(suppliesIssuanceData);
            const filteredData = getFilteredData(suppliesIssuanceData, tableKey);
            const searchedData = applySearch(sortByMrsNoDesc(filteredData), searchTerms[tableKey]);
            const { data, totalPages, currentPage, totalItems } = getPaginatedData(searchedData, tableKey);
            const hasActiveFilter = filters.filterType !== 'all' || !!searchTerms[tableKey];
            return (
                <CardWrap>
                    <CardHeader title={title} totalItems={totalItems} originalCount={suppliesIssuanceData.length}
                        searchKey={tableKey} searchTerms={searchTerms}
                        onExport={() => handleExportCSV(suppliesIssuanceData, searchedData, hasActiveFilter, 'supplies_issuance')}
                        exportDisabled={suppliesIssuanceData.length === 0} />
                    <FilterControls filterType={filters.filterType} setFilterType={(v) => updateFilterState(tableKey, { filterType: v })}
                        selectedYear={filters.selectedYear} setSelectedYear={(v) => updateFilterState(tableKey, { selectedYear: v, selectedMonth: '', selectedWeek: '' })}
                        selectedMonth={filters.selectedMonth} setSelectedMonth={(v) => updateFilterState(tableKey, { selectedMonth: v })}
                        selectedWeek={filters.selectedWeek} setSelectedWeek={(v) => updateFilterState(tableKey, { selectedWeek: v })}
                        availableYears={availableFilters.years} availableMonths={availableFilters.months} availableWeeks={availableFilters.weeks} />
                    <div className="mb-4">
                        <SearchBar value={searchTerms[tableKey]} onChange={(val) => updateSearchTerm(tableKey, val)} placeholder="Search by employee, MRS no, item code..." />
                    </div>
                    <div className="overflow-x-auto">
                        <table className="table table-zebra [&_th]:border-y [&_th]:border-base-content/20 [&_td]:border-y [&_td]:border-base-content/20">
                            <thead>
                                <tr>
                                    <th>Order Date</th><th>Employee ID</th><th>Employee Name</th>
                                    <th>Department</th><th>Prodline</th><th>Machine No</th>
                                    <th>MRS No</th><th>Issued By</th><th>Item Code</th>
                                    <th>Material Description</th><th>Long Description</th>
                                    <th>Quantity</th><th>Request Qty</th><th>Issued Qty</th><th>Remarks</th><th>SOH</th><th>Delivered At</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.length > 0 ? data.map((item, index) => (
                                    <tr key={index}>
                                        <td className="whitespace-nowrap">{item.orderDate}</td>
                                        <td className="font-semibold">{item.employeeId}</td>
                                        <td>{item.employeeName}</td>
                                        <td><span className="badge badge-outline badge-sm">{item.department}</span></td>
                                        <td>{item.prodline}</td>
                                        <td>{item.machineNo || '—'}</td>
                                        <td className="font-mono">{item.mrsNo}</td>
                                        <td>{item.issuedBy}</td>
                                        <td className="font-semibold">{item.itemCode}</td>
                                        <td>{item.materialDescription}</td>
                                        <td>{item.detailedDescription}</td>
                                        <td className="text-center font-bold">{item.quantity}</td>
                                        <td className="text-center">{item.requestQuantity}</td>
                                        <td className="text-center"><span className={`font-bold ${item.issuedQuantity < item.requestQuantity ? "text-warning" : ""}`}>{item.issuedQuantity}</span></td>
                                        <td className="text-sm italic opacity-70">{item.remarks}</td>
                                        <td className="text-center"><span className="font-bold">{item.soh ?? '—'}</span></td>
                                        <td className="whitespace-nowrap">{item.deliveredAt}</td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan="17" className="text-center opacity-50">{searchTerms[tableKey] ? `No results for "${searchTerms[tableKey]}"` : `No supplies issuance data available${filters.filterType !== 'all' ? ' for selected filter' : ''}`}</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    {totalPages > 1 && <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={(page) => handlePageChange(tableKey, page)} />}
                </CardWrap>
            );
        }

        // ===== SUPPLIES RETURN =====
        if (activeMainTab === "supplies" && currentSubTab === "return") {
            const tableKey = 'supplies_return';
            const filters  = filterStates[tableKey];
            const availableFilters = getAvailableFilters(suppliesReturnData);
            const filteredData = getFilteredData(suppliesReturnData, tableKey);
            const searchedData = applySearch(sortByMrsNoDesc(filteredData), searchTerms[tableKey]);
            const { data, totalPages, currentPage, totalItems } = getPaginatedData(searchedData, tableKey);
            const hasActiveFilter = filters.filterType !== 'all' || !!searchTerms[tableKey];
            return (
                <CardWrap>
                    <CardHeader title={title} totalItems={totalItems} originalCount={suppliesReturnData.length}
                        searchKey={tableKey} searchTerms={searchTerms}
                        onExport={() => handleExportCSV(suppliesReturnData, searchedData, hasActiveFilter, 'supplies_return')}
                        exportDisabled={suppliesReturnData.length === 0} />
                    <FilterControls filterType={filters.filterType} setFilterType={(v) => updateFilterState(tableKey, { filterType: v })}
                        selectedYear={filters.selectedYear} setSelectedYear={(v) => updateFilterState(tableKey, { selectedYear: v, selectedMonth: '', selectedWeek: '' })}
                        selectedMonth={filters.selectedMonth} setSelectedMonth={(v) => updateFilterState(tableKey, { selectedMonth: v })}
                        selectedWeek={filters.selectedWeek} setSelectedWeek={(v) => updateFilterState(tableKey, { selectedWeek: v })}
                        availableYears={availableFilters.years} availableMonths={availableFilters.months} availableWeeks={availableFilters.weeks} />
                    <div className="mb-4">
                        <SearchBar value={searchTerms[tableKey]} onChange={(val) => updateSearchTerm(tableKey, val)} placeholder="Search by MRS no, requestor, item code..." />
                    </div>
                    <div className="overflow-x-auto">
                        <table className="table table-zebra [&_th]:border-y [&_th]:border-base-content/20 [&_td]:border-y [&_td]:border-base-content/20">
                            <thead>
                                <tr>
                                    <th>Return Date</th><th>MRS No</th><th>Return Requestor</th>
                                    <th>Machine No</th><th>Return Handler</th><th>Item Code</th>
                                    <th>Material Description</th><th>Quantity</th><th>Old Quantity</th><th>Issued Quantity</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.length > 0 ? data.map((item, index) => (
                                    <tr key={index}>
                                        <td className="whitespace-nowrap">{item.orderDate}</td>
                                        <td className="font-mono">{item.mrsNo}</td>
                                        <td className="font-semibold">{item.employeeName}</td>
                                        <td>{item.machineNo || '—'}</td>
                                        <td>{item.issuedBy}</td>
                                        <td className="font-semibold">{item.itemCode}</td>
                                        <td>{item.materialDescription}</td>
                                        <td className="text-center font-bold">{item.quantity}</td>
                                        <td className="text-center">{item.requestQuantity}</td>
                                        <td className="text-center"><span className={`font-bold ${item.issuedQuantity < item.requestQuantity ? "text-warning" : ""}`}>{item.issuedQuantity}</span></td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan="10" className="text-center opacity-50">{searchTerms[tableKey] ? `No results for "${searchTerms[tableKey]}"` : `No supplies return data available${filters.filterType !== 'all' ? ' for selected filter' : ''}`}</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    {totalPages > 1 && <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={(page) => handlePageChange(tableKey, page)} />}
                </CardWrap>
            );
        }

        // ===== CONSIGNED INVENTORY =====
        if (activeMainTab === "consigned" && currentSubTab === "inventory") {
            const tableKey     = 'consigned_inventory';
            const searchedData = applySearch(consignedInventoryData, searchTerms[tableKey]);
            const { data, totalPages, currentPage, totalItems } = getPaginatedData(searchedData, tableKey);
            return (
                <CardWrap>
                    <CardHeader title={title} totalItems={totalItems} originalCount={consignedInventoryData.length}
                        searchKey={tableKey} searchTerms={searchTerms}
                        onExport={() => {
    const today = new Date();
    const source = searchTerms[tableKey] ? searchedData : consignedInventoryData;
    const enriched = source.map(item => {
        const w = consignedIssuedWeeklyMap[item.itemCode];
        const w1 = w?.w1 || 0;
        const w2 = w?.w2 || 0;
        const w3 = w?.w3 || 0;
        const w4 = w?.w4 || 0;
        const total30d = w1 + w2 + w3 + w4;
        const expirationDate   = item.expiration ? new Date(item.expiration) : null;
        const isExpired        = expirationDate && expirationDate < today;
        const isNearExpiration = expirationDate && expirationDate >= today
            && expirationDate <= new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
        const healthStatus =
            item.minimum == null || item.quantity == null ? '—'
            : item.quantity <= item.minimum        ? 'Critical'
            : item.quantity <= item.minimum + 5    ? 'Low Stock'
            : 'Normal';
        return {
            itemCode:            item.itemCode,
            materialDescription: item.materialDescription,
            category:            item.category,
            supplier:            item.supplier,
            [weekLabels[0]]:     w1,
            [weekLabels[1]]:     w2,
            [weekLabels[2]]:     w3,
            [weekLabels[3]]:     w4,
            'Total (30d)':       total30d,
            quantity:            item.quantity,
            qtyPerBox:           item.qtyPerBox,
            uom:                 item.uom,
            binLocation:         item.binLocation,
            minimum:             item.minimum,
            maximum:             item.maximum,
            price:               item.price,
            expiration:          item.expiration || 'No expiry',
            expirationStatus:    isExpired ? 'Expired' : isNearExpiration ? 'Near Expiry' : 'OK',
            healthStatus:        healthStatus,
        };
    });
    exportToCSV(enriched, 'consigned_inventory');
}}
                        exportDisabled={consignedInventoryData.length === 0} />
                    <div className="mb-4">
                        <SearchBar value={searchTerms[tableKey]} onChange={(val) => updateSearchTerm(tableKey, val)} placeholder="Search by item code, supplier, category..." />
                    </div>
                    <div className="overflow-x-auto">
                        <table className="table table-zebra [&_th]:border-y [&_th]:border-base-content/20 [&_td]:border-y [&_td]:border-base-content/20">
<thead><tr><th>Item Code</th><th>Material Description</th><th>Category</th><th>Supplier</th><th className="text-center">{weekLabels[0]}</th><th className="text-center">{weekLabels[1]}</th><th className="text-center">{weekLabels[2]}</th><th className="text-center">{weekLabels[3]}</th><th className="text-center">Total (30d)</th><th>Quantity</th><th>Qty per Box</th><th>UOM</th><th>Bin Location</th><th>Minimum</th><th>Maximum</th><th>Price</th><th>Expiration</th><th className="text-center">Health Status</th></tr></thead>
                            <tbody>
                                {data.length > 0 ? data.map((item, index) => {
                                    const today = new Date();
                                    const expirationDate   = item.expiration ? new Date(item.expiration) : null;
                                    const isExpired        = expirationDate && expirationDate < today;
                                    const isNearExpiration = expirationDate && expirationDate >= today && expirationDate <= new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
                                    return (
                                        <tr key={index}>
                                            <td className="font-semibold">{item.itemCode}</td>
                                            <td>{item.materialDescription}</td>
                                            <td><span className="badge badge-outline badge-sm">{item.category}</span></td>
                                            <td><span className="badge badge-outline badge-sm">{item.supplier}</span></td>
                                            {(['w1','w2','w3','w4']).map(wk => {
                                                const val = consignedIssuedWeeklyMap[item.itemCode]?.[wk] || 0;
                                                return (
                                                    <td key={wk} className="text-center">
                                                        <span className={`font-bold ${val > 0 ? 'text-warning' : 'opacity-40'}`}>
                                                            {val}
                                                        </span>
                                                    </td>
                                                );
                                            })}
                                            <td className="text-center">
                                                {(() => {
                                                    const w = consignedIssuedWeeklyMap[item.itemCode];
                                                    const total = w ? w.w1 + w.w2 + w.w3 + w.w4 : 0;
                                                    return (
                                                        <span className={`font-bold ${total > 0 ? 'text-error' : 'opacity-40'}`}>
                                                            {total}
                                                        </span>
                                                    );
                                                })()}
                                            </td>
                                            <td><span className={`font-bold ${item.quantity <= item.minimum ? "text-error" : item.quantity <= item.minimum * 1.5 ? "text-warning" : ""}`}>{item.quantity}</span></td>
                                            <td>{item.qtyPerBox || 'N/A'}</td>
                                            <td>{item.uom}</td>
                                            <td>{item.binLocation}</td>
                                            <td>{item.minimum}</td>
                                            <td>{item.maximum}</td>
                                            <td className="font-semibold">{typeof item.price === 'number' ? `₱${item.price.toFixed(2)}` : item.price || '₱0.00'}</td>
                                            <td>
                                                <span className={`font-medium ${isExpired ? "text-error" : isNearExpiration ? "text-warning" : ""}`}>
                                                    {item.expiration || 'No expiry'}
                                                    {isExpired && <span className="text-xs ml-1">(Expired)</span>}
                                                    {isNearExpiration && <span className="text-xs ml-1">(Near expiry)</span>}
                                                </span>
                                            </td>
                                            <td className="text-center">
                                                {(() => {
                                                    const qty = item.quantity;
                                                    const min = item.minimum;
                                                    if (min == null || qty == null)
                                                        return <span className="opacity-40 text-xs">—</span>;
                                                    if (qty <= min)
                                                        return <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-700 border border-red-300 whitespace-nowrap">Critical</span>;
                                                    if (qty <= min + 5)
                                                        return <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-yellow-100 text-yellow-700 border border-yellow-300 whitespace-nowrap">Low Stock</span>;
                                                    return <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-green-100 text-green-700 border border-green-300 whitespace-nowrap">Normal</span>;
                                                })()}
                                            </td>
                                        </tr>
                                    );
                                }) : (
                                    <tr><td colSpan="18" className="text-center opacity-50">{searchTerms[tableKey] ? `No results for "${searchTerms[tableKey]}"` : 'No consigned inventory data available'}</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    {totalPages > 1 && <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={(page) => handlePageChange(tableKey, page)} />}
                </CardWrap>
            );
        }

        // ===== CONSIGNED INVENTORY HISTORY (NEW UI) =====
        if (activeMainTab === "consigned" && currentSubTab === "inventoryHistory") {
            const tableKey    = 'consigned_inventoryHistory';
            const histPageKey = 'consigned_inventoryHistory_historyPage';
            const histSearchKey = 'consigned_inventoryHistory_history';
            const filters     = filterStates[tableKey];
            const availableFilters = getAvailableHistoryFilters(consignedInventoryHistoryData);
            const allItems    = consignedInventoryHistoryData;

            // ── Build flat action rows for selected items filtered by date ──────
            const buildActionRows = (items) => {
    const rows = [];

    items.forEach(item => {
        let snapshots = [...(item.snapshots || [])];
        if (!snapshots.length) return;

        // Sort ascending for fill logic
        const sorted = [...snapshots].sort((a, b) =>
            new Date(a.snapshotDate + ' ' + a.snapshotTime) - new Date(b.snapshotDate + ' ' + b.snapshotTime)
        );

        // Determine date range from current filter
        let rangeStart = null;
        let rangeEnd   = null;
        const f = filters;

        if (f.filterType === 'day' && f.selectedDay) {
            rangeStart = new Date(f.selectedDay);
            rangeEnd   = new Date(f.selectedDay);
        } else if (f.filterType === 'year' && f.selectedYear) {
            rangeStart = new Date(`${f.selectedYear}-01-01`);
            rangeEnd   = new Date(`${f.selectedYear}-12-31`);
        } else if (f.filterType === 'month' && f.selectedYear && f.selectedMonth) {
            const y = parseInt(f.selectedYear);
            const m = parseInt(f.selectedMonth);
            rangeStart = new Date(y, m - 1, 1);
            rangeEnd   = new Date(y, m, 0); // last day of month
        } else if (f.filterType === 'week' && f.selectedYear && f.selectedWeek) {
            // ISO week: find the Monday of that week
            const jan4 = new Date(parseInt(f.selectedYear), 0, 4);
            const mondayOfWeek1 = new Date(jan4);
            mondayOfWeek1.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7));
            rangeStart = new Date(mondayOfWeek1);
            rangeStart.setDate(mondayOfWeek1.getDate() + (parseInt(f.selectedWeek) - 1) * 7);
            rangeEnd   = new Date(rangeStart);
            rangeEnd.setDate(rangeStart.getDate() + 6);
        }

        if (!rangeStart || !rangeEnd) {
            // No date fill for "all time" — just push real rows
            sorted.forEach(s => rows.push({
                user:                s.user || '—',
                snapshotDate:        s.snapshotDate,
                snapshotTime:        s.snapshotTime,
                itemCode:            item.itemCode,
                materialDescription: item.materialDescription,
                action:              s.action,
                oldQty:              s.oldQty ?? '—',
                qty:                 s.qty,
            }));
            return;
        }

// Helper: date string to comparable key
const toKey = (d) => d.toISOString().split('T')[0];

// The earliest date this item has ANY history (its "creation" floor)
const itemBirthDate = sorted[0].snapshotDate;

// Today's date ceiling — don't show future dates
const todayKey = toKey(new Date());

// Build every day in range, clamped to [itemBirthDate, today]
const allDates = [];
const cur = new Date(rangeStart);
while (cur <= rangeEnd) {
    const key = toKey(new Date(cur));
    if (key >= itemBirthDate && key <= todayKey) {
        allDates.push(key);
    }
    cur.setDate(cur.getDate() + 1);
}

// Group real snapshots by date
const snapshotsByDate = {};
sorted.forEach(s => {
    if (!snapshotsByDate[s.snapshotDate]) snapshotsByDate[s.snapshotDate] = [];
    snapshotsByDate[s.snapshotDate].push(s);
});

// Find the last known qty BEFORE the range starts (carry-in),
// only from dates >= itemBirthDate
let carryQty = null;
sorted.forEach(s => {
    if (s.snapshotDate >= itemBirthDate && s.snapshotDate < toKey(rangeStart)) {
        carryQty = s.qty;
    }
});

// If rangeStart is on or before birth date, no carry-in applies
if (toKey(rangeStart) <= itemBirthDate) carryQty = null;

allDates.forEach(dateKey => {
    if (snapshotsByDate[dateKey]) {
        // Real actions on this date
        snapshotsByDate[dateKey].forEach(s => {
            rows.push({
                user:                s.user || '—',
                snapshotDate:        s.snapshotDate,
                snapshotTime:        s.snapshotTime,
                itemCode:            item.itemCode,
                materialDescription: item.materialDescription,
                action:              s.action,
                oldQty:              s.oldQty ?? carryQty ?? '—',
                qty:                 s.qty,
            });
            carryQty = s.qty;
        });
    } else {
        // No action — only fill if qty is already established
        if (carryQty !== null) {
            rows.push({
                user:                '—',
                snapshotDate:        dateKey,
                snapshotTime:        '—',
                itemCode:            item.itemCode,
                materialDescription: item.materialDescription,
                action:              'no_action',
                oldQty:              carryQty,
                qty:                 carryQty,
            });
        }
    }
});
    });

    
    return rows.sort((a, b) => {
        // 1st: item code ascending
        if (a.itemCode < b.itemCode) return -1;
        if (a.itemCode > b.itemCode) return 1;
        // 2nd: date ascending
        if (a.snapshotDate < b.snapshotDate) return -1;
        if (a.snapshotDate > b.snapshotDate) return 1;
        // 3rd: time ascending (no-action rows go first within the day)
        const tA = a.snapshotTime === '—' ? '00:00:00' : a.snapshotTime;
        const tB = b.snapshotTime === '—' ? '00:00:00' : b.snapshotTime;
        return tA.localeCompare(tB);
    });
};

            // Items list (left panel)
            const searchedItems = applySearch(allItems, searchTerms[tableKey]);
            const { data: pagedItems, totalPages: itemTotalPages, currentPage: itemCurrentPage, totalItems: itemTotalCount }
                = getPaginatedData(searchedItems, tableKey);

            // History rows for selected items
            const selectedItems = allItems.filter(i => selectedHistoryItems.has(i.itemCode));
            const historyRows   = buildActionRows(selectedItems);
            const searchedRows  = applySearch(historyRows, searchTerms[histSearchKey] || '');
            const { data: pagedRows, totalPages: rowTotalPages, currentPage: rowCurrentPage, totalItems: rowTotalCount }
                = getPaginatedData(searchedRows, histPageKey);

            const someSelected      = selectedHistoryItems.size > 0;
            const allOnPageSelected = pagedItems.length > 0 && pagedItems.every(i => selectedHistoryItems.has(i.itemCode));

            const toggleItem = (itemCode) => {
                setSelectedHistoryItems(prev => {
                    const next = new Set(prev);
                    if (next.has(itemCode)) next.delete(itemCode); else next.add(itemCode);
                    return next;
                });
                setCurrentPages(prev => ({ ...prev, [histPageKey]: 1 }));
            };

            const togglePageAll = () => {
                setSelectedHistoryItems(prev => {
                    const next = new Set(prev);
                    if (allOnPageSelected) { pagedItems.forEach(i => next.delete(i.itemCode)); }
                    else { pagedItems.forEach(i => next.add(i.itemCode)); }
                    return next;
                });
            };

            const selectAll = () => setSelectedHistoryItems(new Set(searchedItems.map(i => i.itemCode)));
            const clearAll  = () => {
                setSelectedHistoryItems(new Set());
                setCurrentPages(prev => ({ ...prev, [histPageKey]: 1 }));
            };

            const handleExportHistory = () => {
                const exportData = searchedRows.map(r => ({
                    user:                r.user,
                    date:                r.snapshotDate,
                    time:                r.snapshotTime,
                    itemCode:            r.itemCode,
                    materialDescription: r.materialDescription,
                    action:              ACTION_LABELS[r.action]?.label || r.action,
                    quantity:            r.oldQty,
                    newQuantity:         r.qty,
                }));
                exportToCSV(exportData, 'consigned_inventory_history');
            };

            // Selected items preview label
            const selectedCodes = [...selectedHistoryItems];
            const previewLabel  = selectedCodes.length === 0 ? '' :
                selectedCodes.slice(0, 2).join(', ') + (selectedCodes.length > 2 ? ` +${selectedCodes.length - 2} more` : '');

            return (
                <CardWrap>
                    {/* ── Header ── */}
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold">{title}</h3>
                        <div className="flex items-center gap-4">
                            {someSelected && (
                                <span className="text-sm opacity-60">
                                    {selectedHistoryItems.size} item{selectedHistoryItems.size !== 1 ? 's' : ''} selected
                                    {rowTotalCount > 0 && ` · ${rowTotalCount} record${rowTotalCount !== 1 ? 's' : ''}`}
                                </span>
                            )}
                            <button onClick={handleExportHistory} className="btn btn-sm btn-outline" disabled={searchedRows.length === 0}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                Export CSV
                            </button>
                        </div>
                    </div>

                    {/* ── Date Filter ── */}
                    <div className="flex flex-wrap gap-4 items-center mb-4 p-4 border border-base-content/20 rounded-lg">
                        <div className="form-control">
                            <label className="label"><span className="label-text font-semibold">Filter by:</span></label>
                            <select className="select select-bordered select-sm w-40" value={filters.filterType}
                                onChange={(e) => updateFilterState(tableKey, { filterType: e.target.value, selectedYear: '', selectedMonth: '', selectedWeek: '', selectedDay: '' })}>
                                <option value="all">All Time</option>
                                <option value="year">Year</option>
                                <option value="month">Month</option>
                                <option value="week">Week</option>
                                <option value="day">Day</option>
                            </select>
                        </div>
                        {filters.filterType === 'year' && (
                            <div className="form-control">
                                <label className="label"><span className="label-text">Year:</span></label>
                                <select className="select select-bordered select-sm w-32" value={filters.selectedYear}
                                    onChange={(e) => updateFilterState(tableKey, { selectedYear: e.target.value })}>
                                    <option value="">All Years</option>
                                    {availableFilters.years.map(y => <option key={y} value={y}>{y}</option>)}
                                </select>
                            </div>
                        )}
                        {filters.filterType === 'month' && (<>
                            <div className="form-control">
                                <label className="label"><span className="label-text">Year:</span></label>
                                <select className="select select-bordered select-sm w-32" value={filters.selectedYear}
                                    onChange={(e) => updateFilterState(tableKey, { selectedYear: e.target.value, selectedMonth: '' })}>
                                    <option value="">Select Year</option>
                                    {availableFilters.years.map(y => <option key={y} value={y}>{y}</option>)}
                                </select>
                            </div>
                            {filters.selectedYear && (
                                <div className="form-control">
                                    <label className="label"><span className="label-text">Month:</span></label>
                                    <select className="select select-bordered select-sm w-40" value={filters.selectedMonth}
                                        onChange={(e) => updateFilterState(tableKey, { selectedMonth: e.target.value })}>
                                        <option value="">All Months</option>
                                        {availableFilters.months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                                    </select>
                                </div>
                            )}
                        </>)}
                        {filters.filterType === 'week' && (<>
                            <div className="form-control">
                                <label className="label"><span className="label-text">Year:</span></label>
                                <select className="select select-bordered select-sm w-32" value={filters.selectedYear}
                                    onChange={(e) => updateFilterState(tableKey, { selectedYear: e.target.value, selectedWeek: '' })}>
                                    <option value="">Select Year</option>
                                    {availableFilters.years.map(y => <option key={y} value={y}>{y}</option>)}
                                </select>
                            </div>
                            {filters.selectedYear && (
                                <div className="form-control">
                                    <label className="label"><span className="label-text">Week:</span></label>
                                    <select className="select select-bordered select-sm w-32" value={filters.selectedWeek}
                                        onChange={(e) => updateFilterState(tableKey, { selectedWeek: e.target.value })}>
                                        <option value="">All Weeks</option>
                                        {availableFilters.weeks.map(w => <option key={w.value} value={w.value}>Week {w.value} ({w.label})</option>)}
                                    </select>
                                </div>
                            )}
                        </>)}
                        {filters.filterType === 'day' && (
                            <div className="form-control">
                                <label className="label"><span className="label-text">Date:</span></label>
                                <input type="date" className="input input-bordered input-sm w-44"
                                    value={filters.selectedDay}
                                    onChange={(e) => updateFilterState(tableKey, { selectedDay: e.target.value })} />
                            </div>
                        )}
                        <div className="flex items-end">
                            <button onClick={() => updateFilterState(tableKey, { filterType: 'all', selectedYear: '', selectedMonth: '', selectedWeek: '', selectedDay: '' })}
                                className="btn btn-sm btn-ghost">Clear Filters</button>
                        </div>
                    </div>

                    {/* ── Two-panel layout ── */}
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

                        {/* LEFT: Item selector */}
                        <div className="lg:col-span-2 border border-base-content/20 rounded-lg p-3 flex flex-col gap-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-semibold opacity-70 uppercase tracking-wide">
                                    Select Items
                                </span>
                                <div className="flex gap-1">
                                    <button onClick={selectAll} className="btn btn-xs btn-ghost">Select All</button>
                                    <button onClick={clearAll} className="btn btn-xs btn-ghost text-error" disabled={!someSelected}>Clear</button>
                                </div>
                            </div>

                            <SearchBar
                                value={searchTerms[tableKey]}
                                onChange={(val) => updateSearchTerm(tableKey, val)}
                                placeholder="Search items..."
                            />

                            <div className="overflow-x-auto">
                                <table className="table table-sm table-zebra [&_th]:border-y [&_th]:border-base-content/20 [&_td]:border-y [&_td]:border-base-content/20">
                                    <thead>
                                        <tr>
                                            <th className="w-8">
                                                <input type="checkbox" className="checkbox checkbox-sm"
                                                    checked={allOnPageSelected}
                                                    onChange={togglePageAll} />
                                            </th>
                                            <th>Item Code</th>
                                            <th>Description</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pagedItems.length > 0 ? pagedItems.map((item, idx) => (
                                            <tr key={idx}
                                                className={`cursor-pointer hover:bg-base-200 ${selectedHistoryItems.has(item.itemCode) ? 'bg-primary/10' : ''}`}
                                                onClick={() => toggleItem(item.itemCode)}
                                            >
                                                <td onClick={e => e.stopPropagation()}>
                                                    <input type="checkbox" className="checkbox checkbox-sm checkbox-primary"
                                                        checked={selectedHistoryItems.has(item.itemCode)}
                                                        onChange={() => toggleItem(item.itemCode)} />
                                                </td>
                                                <td className="font-semibold text-xs">{item.itemCode}</td>
                                                <td className="text-xs">{item.materialDescription}</td>
                                            </tr>
                                        )) : (
                                            <tr><td colSpan="3" className="text-center opacity-50 text-xs py-4">No items found</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {itemTotalPages > 1 && (
                                <Pagination currentPage={itemCurrentPage} totalPages={itemTotalPages}
                                    onPageChange={(p) => handlePageChange(tableKey, p)} />
                            )}
                            <div className="text-xs opacity-50 text-center">{itemTotalCount} items total</div>
                        </div>

                        {/* RIGHT: History table */}
                        <div className="lg:col-span-3 border border-base-content/20 rounded-lg p-3 flex flex-col gap-3">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                                <span className="text-sm font-semibold opacity-70 uppercase tracking-wide">
                                    {someSelected
                                        ? `History — ${previewLabel}`
                                        : 'History'}
                                </span>
                                {rowTotalCount > 0 && (
                                    <span className="text-xs opacity-50">{rowTotalCount} record{rowTotalCount !== 1 ? 's' : ''}</span>
                                )}
                            </div>

                            <SearchBar
                                value={searchTerms[histSearchKey] || ''}
                                onChange={(val) => {
                                    setSearchTerms(prev => ({ ...prev, [histSearchKey]: val }));
                                    setCurrentPages(prev => ({ ...prev, [histPageKey]: 1 }));
                                }}
                                placeholder="Search history records..."
                            />

                            {!someSelected ? (
                                <div className="flex flex-col items-center justify-center py-16 opacity-40">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                    </svg>
                                    <p className="text-sm">Select one or more items on the left to view their history</p>
                                </div>
                            ) : (
                                <>
                                    <div className="overflow-x-auto">
                                        <table className="table table-sm table-zebra [&_th]:border-y [&_th]:border-base-content/20 [&_td]:border-y [&_td]:border-base-content/20">
                                            <thead>
                                                <tr>
                                                    <th>User</th>
                                                    <th>Date</th>
                                                    <th>Time</th>
                                                    <th>Item Code</th>
                                                    <th>Material Description</th>
                                                    <th>Action</th>
                                                    <th className="text-center">Old Qty</th>
                                                    <th className="text-center">New Qty</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {pagedRows.length > 0 ? pagedRows.map((row, idx) => {
                                                    const actionInfo = ACTION_LABELS[row.action] || { label: row.action, badge: 'badge-ghost' };
                                                    return (
                                                        <tr key={idx}>
                                                            <td className="text-xs font-medium">{row.user}</td>
                                                            <td className="whitespace-nowrap text-xs">{row.snapshotDate}</td>
                                                            <td className="whitespace-nowrap text-xs opacity-70">{row.snapshotTime}</td>
                                                            <td className="font-semibold text-xs">{row.itemCode}</td>
                                                            <td className="text-xs">{row.materialDescription}</td>
                                                            <td>
                                                                <span className={`badge badge-sm badge-outline ${actionInfo.badge}`}>
                                                                    {actionInfo.label}
                                                                </span>
                                                            </td>
                                                            <td className="text-center text-xs opacity-70">{row.oldQty}</td>
                                                            <td className="text-center font-bold text-xs">{row.qty}</td>
                                                        </tr>
                                                    );
                                                }) : (
                                                    <tr>
                                                        <td colSpan="8" className="text-center opacity-50 text-xs py-8">
                                                            {searchTerms[histSearchKey]
                                                                ? `No results for "${searchTerms[histSearchKey]}"`
                                                                : filters.filterType !== 'all'
                                                                ? 'No history for selected items in this period'
                                                                : 'No history records for selected items'}
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                    {rowTotalPages > 1 && (
                                        <Pagination currentPage={rowCurrentPage} totalPages={rowTotalPages}
                                            onPageChange={(p) => handlePageChange(histPageKey, p)} />
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </CardWrap>
            );
        }

        // ===== CONSIGNED ISSUANCE =====
        if (activeMainTab === "consigned" && currentSubTab === "issuance") {
            const tableKey = 'consigned_issuance';
            const filters  = filterStates[tableKey];
            const availableFilters = getAvailableFilters(consignedIssuanceData);
            const filteredData = getFilteredData(consignedIssuanceData, tableKey);
            const searchedData = applySearch(sortByMrsNoDesc(filteredData), searchTerms[tableKey]);
            const { data, totalPages, currentPage, totalItems } = getPaginatedData(searchedData, tableKey);
            const hasActiveFilter = filters.filterType !== 'all' || !!searchTerms[tableKey] || !!filters.selectedDay;
            return (
                <CardWrap>
                    <CardHeader title={title} totalItems={totalItems} originalCount={consignedIssuanceData.length}
                        searchKey={tableKey} searchTerms={searchTerms}
                        onExport={() => handleExportCSV(consignedIssuanceData, searchedData, hasActiveFilter, 'consigned_issuance')}
                        exportDisabled={consignedIssuanceData.length === 0} />
                    <FilterControls filterType={filters.filterType} setFilterType={(v) => updateFilterState(tableKey, { filterType: v })}
                        selectedYear={filters.selectedYear} setSelectedYear={(v) => updateFilterState(tableKey, { selectedYear: v, selectedMonth: '', selectedWeek: '' })}
                        selectedMonth={filters.selectedMonth} setSelectedMonth={(v) => updateFilterState(tableKey, { selectedMonth: v })}
                        selectedWeek={filters.selectedWeek} setSelectedWeek={(v) => updateFilterState(tableKey, { selectedWeek: v })}
                        availableYears={availableFilters.years} availableMonths={availableFilters.months} availableWeeks={availableFilters.weeks} />
                    <div className="mb-4">
                        <SearchBar value={searchTerms[tableKey]} onChange={(val) => updateSearchTerm(tableKey, val)} placeholder="Search by employee, MRS no, supplier..." />
                    </div>
                    <div className="overflow-x-auto">
                        <table className="table table-zebra [&_th]:border-y [&_th]:border-base-content/20 [&_td]:border-y [&_td]:border-base-content/20">
                            <thead>
                                <tr>
                                    <th>Order Date</th><th>Employee No</th><th>Factory</th><th>Station</th>
                                    <th>MRS No</th><th>Issued By</th><th>Item Code</th><th>Material Description</th>
                                    <th>Supplier</th><th>Expiration</th><th>Bin Location</th><th>UOM</th>
                                    <th>Qty per Box</th><th>Quantity</th><th>Request Qty</th><th>Issued Qty</th><th>Remarks</th><th>SOH</th><th>Delivered At</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.length > 0 ? data.map((item, index) => {
                                    const today = new Date();
                                    const expirationDate   = item.expiration ? new Date(item.expiration) : null;
                                    const isExpired        = expirationDate && expirationDate < today;
                                    const isNearExpiration = expirationDate && expirationDate >= today && expirationDate <= new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
                                    return (
                                        <tr key={index}>
                                            <td className="whitespace-nowrap">{item.orderDate}</td>
                                            <td className="font-semibold">{item.employeeNo}</td>
                                            <td><span className="badge badge-outline badge-sm">{item.factory}</span></td>
                                            <td>{item.station}</td>
                                            <td className="font-mono">{item.mrsNo}</td>
                                            <td>{item.issuedBy}</td>
                                            <td className="font-semibold">{item.itemCode}</td>
                                            <td>{item.materialDescription}</td>
                                            <td><span className="badge badge-outline badge-sm">{item.supplier}</span></td>
                                            <td><span className={`font-medium ${isExpired ? "text-error" : isNearExpiration ? "text-warning" : ""}`}>{item.expiration || 'No expiry'}</span></td>
                                            <td>{item.binLocation}</td>
                                            <td>{item.uom}</td>
                                            <td>{item.qtyPerBox || 'N/A'}</td>
                                            <td className="text-center font-bold">{item.quantity}</td>
                                            <td className="text-center">{item.requestQuantity}</td>
                                            <td className="text-center"><span className={`font-bold ${item.issuedQuantity < item.requestQuantity ? "text-warning" : ""}`}>{item.issuedQuantity}</span></td>
                                            <td className="text-sm italic opacity-70">{item.remarks}</td>
                                            <td className="text-center"><span className="font-bold">{item.soh ?? '—'}</span></td>
                                            <td className="whitespace-nowrap">{item.deliveredAt}</td>
                                        </tr>
                                    );
                                }) : (
                                    <tr><td colSpan="19" className="text-center opacity-50">{searchTerms[tableKey] ? `No results for "${searchTerms[tableKey]}"` : `No consigned issuance data available${filters.filterType !== 'all' ? ' for selected filter' : ''}`}</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    {totalPages > 1 && <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={(page) => handlePageChange(tableKey, page)} />}
                </CardWrap>
            );
        }

        // ===== CONSIGNED RETURN =====
        if (activeMainTab === "consigned" && currentSubTab === "return") {
            const tableKey = 'consigned_return';
            const filters  = filterStates[tableKey];
            const availableFilters = getAvailableFilters(consignedReturnData);
            const filteredData = getFilteredData(consignedReturnData, tableKey);
            const searchedData = applySearch(sortByMrsNoDesc(filteredData), searchTerms[tableKey]);
            const { data, totalPages, currentPage, totalItems } = getPaginatedData(searchedData, tableKey);
            const hasActiveFilter = filters.filterType !== 'all' || !!searchTerms[tableKey];
            return (
                <CardWrap>
                    <CardHeader title={title} totalItems={totalItems} originalCount={consignedReturnData.length}
                        searchKey={tableKey} searchTerms={searchTerms}
                        onExport={() => handleExportCSV(consignedReturnData, searchedData, hasActiveFilter, 'consigned_return')}
                        exportDisabled={consignedReturnData.length === 0} />
                    <FilterControls filterType={filters.filterType} setFilterType={(v) => updateFilterState(tableKey, { filterType: v })}
                        selectedYear={filters.selectedYear} setSelectedYear={(v) => updateFilterState(tableKey, { selectedYear: v, selectedMonth: '', selectedWeek: '' })}
                        selectedMonth={filters.selectedMonth} setSelectedMonth={(v) => updateFilterState(tableKey, { selectedMonth: v })}
                        selectedWeek={filters.selectedWeek} setSelectedWeek={(v) => updateFilterState(tableKey, { selectedWeek: v })}
                        availableYears={availableFilters.years} availableMonths={availableFilters.months} availableWeeks={availableFilters.weeks} />
                    <div className="mb-4">
                        <SearchBar value={searchTerms[tableKey]} onChange={(val) => updateSearchTerm(tableKey, val)} placeholder="Search by MRS no, requestor, item code..." />
                    </div>
                    <div className="overflow-x-auto">
                        <table className="table table-zebra [&_th]:border-y [&_th]:border-base-content/20 [&_td]:border-y [&_td]:border-base-content/20">
                            <thead>
                                <tr>
                                    <th>Return Date</th><th>MRS No</th><th>Return Requestor</th><th>Return Handler</th>
                                    <th>Item Code</th><th>Material Description</th>
                                    <th>Quantity</th><th>Old Quantity</th><th>Issued Quantity</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.length > 0 ? data.map((item, index) => (
                                    <tr key={index}>
                                        <td className="whitespace-nowrap">{item.orderDate}</td>
                                        <td className="font-mono">{item.mrsNo}</td>
                                        <td className="font-semibold">{item.employeeNo}</td>
                                        <td>{item.issuedBy}</td>
                                        <td className="font-semibold">{item.itemCode}</td>
                                        <td>{item.materialDescription}</td>
                                        <td className="text-center font-bold">{item.quantity}</td>
                                        <td className="text-center">{item.requestQuantity}</td>
                                        <td className="text-center"><span className={`font-bold ${item.issuedQuantity < item.requestQuantity ? "text-warning" : ""}`}>{item.issuedQuantity}</span></td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan="9" className="text-center opacity-50">{searchTerms[tableKey] ? `No results for "${searchTerms[tableKey]}"` : `No consigned return data available${filters.filterType !== 'all' ? ' for selected filter' : ''}`}</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    {totalPages > 1 && <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={(page) => handlePageChange(tableKey, page)} />}
                </CardWrap>
            );
        }

        return (
            <div className="border border-base-content/20 rounded-lg p-6">
                <h3 className="text-lg font-bold">{mainTabLabel} - {subTabLabel}</h3>
                <p className="opacity-70 mt-2">Content for {mainTabLabel} / {subTabLabel} will be displayed here.</p>
            </div>
        );
    };

    return (
        <AuthenticatedLayout>
            <Head title="Export" />
            <div className="space-y-6">
                <h1 className="text-2xl font-bold">Export</h1>

                {/* Main Tabs */}
                <div className="flex gap-2">
                    {mainTabs.map(tab => {
                        const isActive = activeMainTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveMainTab(tab.id)}
                                className={`px-5 py-2 rounded-lg font-semibold border-2 transition-all duration-200 ${
                                    isActive
                                        ? 'bg-base-content text-base-100 border-base-content'
                                        : 'bg-transparent text-base-content border-base-content/30 hover:border-base-content/70'
                                }`}
                            >
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* Sub Tabs */}
                <div role="tablist" className="tabs tabs-lifted">
                    {subTabs.map(tab => (
                        <button
                            key={tab.id}
                            role="tab"
                            onClick={() => handleSubTabChange(tab.id)}
                            className={`tab ${activeSubTabs[activeMainTab] === tab.id ? "tab-active [--tab-bg:hsl(var(--b1))] [--tab-border-color:hsl(var(--b3))]" : ""}`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                {renderContent()}
            </div>
        </AuthenticatedLayout>
    );
}