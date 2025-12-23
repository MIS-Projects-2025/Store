import { useState, useEffect, useMemo } from "react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head, usePage } from "@inertiajs/react";

// CSV Export Helper Function
const exportToCSV = (data, filename) => {
  if (!data || data.length === 0) {
    alert("No data to export!");
    return;
  }

  // Get headers from the first object
  const headers = Object.keys(data[0]);
  
  // Convert data to CSV format
  const csvContent = [
    headers.join(","), // Header row
    ...data.map(row => 
      headers.map(header => {
        // Escape quotes and wrap in quotes if contains comma, quote, or newline
        const cell = row[header] !== null ? String(row[header]) : "";
        return cell.includes(",") || cell.includes('"') || cell.includes("\n") 
          ? `"${cell.replace(/"/g, '""')}"` 
          : cell;
      }).join(",")
    )
  ].join("\n");

  // Create blob and download
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = "hidden";
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Helper function to get week number from date
const getWeekNumber = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return weekNo;
};

// Helper function to get month name
const getMonthName = (month) => {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[month - 1] || '';
};

// Filter Component
const FilterControls = ({ 
  filterType, 
  setFilterType, 
  selectedYear, 
  setSelectedYear, 
  selectedMonth, 
  setSelectedMonth, 
  selectedWeek, 
  setSelectedWeek,
  availableYears,
  availableMonths,
  availableWeeks
}) => {
  return (
    <div className="flex flex-wrap gap-4 items-center mb-4 p-4 bg-base-200 rounded-lg">
      <div className="form-control">
        <label className="label">
          <span className="label-text font-semibold">Filter by:</span>
        </label>
        <select 
          className="select select-bordered select-sm w-40"
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
        >
          <option value="all">All Time</option>
          <option value="year">Year</option>
          <option value="month">Month</option>
          <option value="week">Week</option>
        </select>
      </div>

      {filterType === 'year' && (
        <div className="form-control">
          <label className="label">
            <span className="label-text">Select Year:</span>
          </label>
          <select 
            className="select select-bordered select-sm w-32"
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
          >
            <option value="">All Years</option>
            {availableYears.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      )}

      {filterType === 'month' && (
        <>
          <div className="form-control">
            <label className="label">
              <span className="label-text">Select Year:</span>
            </label>
            <select 
              className="select select-bordered select-sm w-32"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
            >
              <option value="">Select Year</option>
              {availableYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
          
          {selectedYear && (
            <div className="form-control">
              <label className="label">
                <span className="label-text">Select Month:</span>
              </label>
              <select 
                className="select select-bordered select-sm w-40"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                disabled={!selectedYear}
              >
                <option value="">All Months</option>
                {availableMonths.map(month => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </>
      )}

      {filterType === 'week' && (
        <>
          <div className="form-control">
            <label className="label">
              <span className="label-text">Select Year:</span>
            </label>
            <select 
              className="select select-bordered select-sm w-32"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
            >
              <option value="">Select Year</option>
              {availableYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
          
          {selectedYear && (
            <div className="form-control">
              <label className="label">
                <span className="label-text">Select Week:</span>
              </label>
              <select 
                className="select select-bordered select-sm w-32"
                value={selectedWeek}
                onChange={(e) => setSelectedWeek(e.target.value)}
                disabled={!selectedYear}
              >
                <option value="">All Weeks</option>
                {availableWeeks.map(week => (
                  <option key={week.value} value={week.value}>
                    Week {week.value} ({week.label})
                  </option>
                ))}
              </select>
            </div>
          )}
        </>
      )}

      <div className="flex items-end">
        <button
          onClick={() => {
            setFilterType('all');
            setSelectedYear('');
            setSelectedMonth('');
            setSelectedWeek('');
          }}
          className="btn btn-sm btn-ghost"
        >
          Clear Filters
        </button>
      </div>
    </div>
  );
};

// Pagination Component
const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        pages.push(currentPage - 1);
        pages.push(currentPage);
        pages.push(currentPage + 1);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  return (
    <div className="flex justify-center items-center gap-2 mt-4">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="btn btn-sm btn-outline"
      >
        Previous
      </button>
      
      {getPageNumbers().map((page, idx) => (
        page === '...' ? (
          <span key={`ellipsis-${idx}`} className="px-2">...</span>
        ) : (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`btn btn-sm ${currentPage === page ? 'btn-primary' : 'btn-outline'}`}
          >
            {page}
          </button>
        )
      ))}
      
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="btn btn-sm btn-outline"
      >
        Next
      </button>
      
      <span className="ml-4 text-sm">
        Page {currentPage} of {totalPages}
      </span>
    </div>
  );
};

export default function Export({ tableData, tableFilters }) {
    const props = usePage().props;
    const [activeMainTab, setActiveMainTab] = useState("consumable");
    const [activeSubTabs, setActiveSubTabs] = useState({
        consumable: "inventory",
        supplies: "inventory",
        consigned: "inventory"
    });

    // Pagination state for each table
    const [currentPages, setCurrentPages] = useState({
        consumable_inventory: 1,
        consumable_issuance: 1,
        consumable_return: 1,
        supplies_inventory: 1,
        supplies_issuance: 1,
        supplies_return: 1,
        consigned_inventory: 1,
        consigned_issuance: 1,
        consigned_return: 1,
    });
    
    // Filter states for each issuance/return table
    const [filterStates, setFilterStates] = useState({
        consumable_issuance: {
            filterType: 'all',
            selectedYear: '',
            selectedMonth: '',
            selectedWeek: ''
        },
        consumable_return: {
            filterType: 'all',
            selectedYear: '',
            selectedMonth: '',
            selectedWeek: ''
        },
        supplies_issuance: {
            filterType: 'all',
            selectedYear: '',
            selectedMonth: '',
            selectedWeek: ''
        },
        supplies_return: {
            filterType: 'all',
            selectedYear: '',
            selectedMonth: '',
            selectedWeek: ''
        },
        consigned_issuance: {
            filterType: 'all',
            selectedYear: '',
            selectedMonth: '',
            selectedWeek: ''
        },
        consigned_return: {
            filterType: 'all',
            selectedYear: '',
            selectedMonth: '',
            selectedWeek: ''
        }
    });
    
    const itemsPerPage = 10;

    // Update filter state for current table
    const updateFilterState = (tableKey, updates) => {
        setFilterStates(prev => ({
            ...prev,
            [tableKey]: { ...prev[tableKey], ...updates }
        }));
        // Reset to first page when filter changes
        setCurrentPages(prev => ({
            ...prev,
            [tableKey]: 1
        }));
    };

    // Get filtered data for issuance/return tables
    const getFilteredData = (data, tableKey) => {
        const filters = filterStates[tableKey];
        
        if (filters.filterType === 'all' || !data.length) {
            return data;
        }

        return data.filter(item => {
            if (!item.orderDate) return false;
            
            const date = new Date(item.orderDate);
            const year = date.getFullYear().toString();
            const month = (date.getMonth() + 1).toString();
            const week = getWeekNumber(date).toString();
            
            if (filters.filterType === 'year' && filters.selectedYear) {
                return year === filters.selectedYear;
            }
            
            if (filters.filterType === 'month' && filters.selectedYear) {
                const yearMatches = year === filters.selectedYear;
                const monthMatches = !filters.selectedMonth || month === filters.selectedMonth;
                return yearMatches && monthMatches;
            }
            
            if (filters.filterType === 'week' && filters.selectedYear) {
                const yearMatches = year === filters.selectedYear;
                const weekMatches = !filters.selectedWeek || week === filters.selectedWeek;
                return yearMatches && weekMatches;
            }
            
            return true;
        });
    };

    // Get available years, months, weeks from data
    const getAvailableFilters = (data) => {
        const yearsSet = new Set();
        const monthsSet = new Set();
        const weeksSet = new Set();
        
        data.forEach(item => {
            if (item.orderDate) {
                const date = new Date(item.orderDate);
                const year = date.getFullYear();
                const month = date.getMonth() + 1;
                const week = getWeekNumber(date);
                
                yearsSet.add(year);
                monthsSet.add(`${year}-${month.toString().padStart(2, '0')}`);
                weeksSet.add(`${year}-${week.toString().padStart(2, '0')}`);
            }
        });
        
        const years = Array.from(yearsSet).sort((a, b) => b - a);
        
        const months = Array.from(monthsSet)
            .sort((a, b) => b.localeCompare(a))
            .map(monthStr => {
                const [year, month] = monthStr.split('-');
                return {
                    value: month,
                    label: `${getMonthName(parseInt(month))} ${year}`
                };
            });
        
        const weeks = Array.from(weeksSet)
            .sort((a, b) => b.localeCompare(a))
            .map(weekStr => {
                const [year, week] = weekStr.split('-');
                return {
                    value: week,
                    label: `Year ${year}, Week ${week}`
                };
            });
        
        return { years, months, weeks };
    };

    // Get paginated data
    const getPaginatedData = (data, pageKey) => {
        const page = currentPages[pageKey];
        const start = (page - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        return {
            data: data.slice(start, end),
            totalPages: Math.ceil(data.length / itemsPerPage),
            currentPage: page,
            totalItems: data.length
        };
    };

    // Handle page change
    const handlePageChange = (pageKey, newPage) => {
        setCurrentPages(prev => ({
            ...prev,
            [pageKey]: newPage
        }));
    };

    // Handle CSV Export (with current filters applied)
    const handleExportCSV = (originalData, filteredData, filename) => {
        const exportData = filteredData.length > 0 ? filteredData : originalData;
        exportToCSV(exportData, filename);
    };

    const mainTabs = [
        { id: "consumable", label: "Consumable and Spare parts" },
        { id: "supplies", label: "Supplies" },
        { id: "consigned", label: "Consigned" }
    ];

    const subTabs = [
        { id: "inventory", label: "Inventory" },
        { id: "issuance", label: "Issuance" },
        { id: "return", label: "Return" }
    ];

    const handleSubTabChange = (subTabId) => {
        setActiveSubTabs(prev => ({
            ...prev,
            [activeMainTab]: subTabId
        }));
    };

    const renderContent = () => {
        const currentSubTab = activeSubTabs[activeMainTab];
        const mainTabLabel = mainTabs.find(t => t.id === activeMainTab)?.label;
        const subTabLabel = subTabs.find(t => t.id === currentSubTab)?.label;

        // Get supplies data from props
        const consumableInventoryData = tableData?.consumable?.inventory || [];
        const consumableIssuanceData = tableData?.consumable?.issuance || [];
        const consumableReturnData = tableData?.consumable?.return || [];
        const suppliesInventoryData = tableData?.supplies?.inventory || [];
        const suppliesIssuanceData = tableData?.supplies?.issuance || [];
        const suppliesReturnData = tableData?.supplies?.return || [];
        const consignedInventoryData = tableData?.consigned?.inventory || [];
        const consignedIssuanceData = tableData?.consigned?.issuance || [];
        const consignedReturnData = tableData?.consigned?.return || [];

        // ===== CONSUMABLE SECTION =====
        // Render consumable inventory table
        if (activeMainTab === "consumable" && currentSubTab === "inventory") {
            const { data, totalPages, currentPage, totalItems } = getPaginatedData(
                consumableInventoryData,
                'consumable_inventory'
            );

            return (
                <div className="card bg-base-100 shadow-xl">
                    <div className="card-body">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="card-title">{mainTabLabel} - {subTabLabel}</h3>
                            <div className="flex items-center gap-4">
                                <span className="text-sm text-base-content/60">Total items: {totalItems}</span>
                                <button
                                    onClick={() => handleExportCSV(consumableInventoryData, consumableInventoryData, 'consumable_inventory')}
                                    className="btn btn-sm btn-success"
                                    disabled={consumableInventoryData.length === 0}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    Export CSV
                                </button>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="table table-zebra table-sm">
                                <thead>
                                    <tr>
                                        <th>Item Code</th>
                                        <th>Material Description</th>
                                        <th>Detailed Description</th>
                                        <th>Serial</th>
                                        <th>Category</th>
                                        <th>Bin Location</th>
                                        <th>Quantity</th>
                                        <th>UOM</th>
                                        <th>Maximum</th>
                                        <th>Minimum</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.length > 0 ? (
                                        data.map((item, index) => (
                                            <tr key={index}>
                                                <td className="font-semibold">{item.itemCode}</td>
                                                <td>{item.materialDescription}</td>
                                                <td>{item.detailedDescription}</td>
                                                <td>{item.serial}</td>
                                                <td>
                                                    <span className="badge badge-outline badge-sm">{item.category}</span>
                                                </td>
                                                <td>{item.binLocation}</td>
                                                <td>
                                                    <span className={`font-bold ${
                                                        item.quantity <= item.minimum ? "text-error" : 
                                                        item.quantity <= item.minimum * 1.5 ? "text-warning" : 
                                                        "text-success"
                                                    }`}>
                                                        {item.quantity}
                                                    </span>
                                                </td>
                                                <td>{item.uom}</td>
                                                <td>{item.maximum}</td>
                                                <td>{item.minimum}</td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="10" className="text-center text-base-content/60">
                                                No inventory data available
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        {totalPages > 1 && (
                            <Pagination
                                currentPage={currentPage}
                                totalPages={totalPages}
                                onPageChange={(page) => handlePageChange('consumable_inventory', page)}
                            />
                        )}
                    </div>
                </div>
            );
        }

        // Render consumable issuance table
        if (activeMainTab === "consumable" && currentSubTab === "issuance") {
            const tableKey = 'consumable_issuance';
            const filters = filterStates[tableKey];
            const availableFilters = getAvailableFilters(consumableIssuanceData);
            const filteredData = getFilteredData(consumableIssuanceData, tableKey);
            const { data, totalPages, currentPage, totalItems } = getPaginatedData(
                filteredData,
                tableKey
            );

            return (
                <div className="card bg-base-100 shadow-xl">
                    <div className="card-body">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="card-title">{mainTabLabel} - {subTabLabel}</h3>
                            <div className="flex items-center gap-4">
                                <span className="text-sm text-base-content/60">
                                    Showing {filteredData.length} of {consumableIssuanceData.length} items
                                </span>
                                <button
                                    onClick={() => handleExportCSV(consumableIssuanceData, filteredData, 'consumable_issuance')}
                                    className="btn btn-sm btn-success"
                                    disabled={consumableIssuanceData.length === 0}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    Export CSV
                                </button>
                            </div>
                        </div>
                        
                        <FilterControls
                            filterType={filters.filterType}
                            setFilterType={(value) => updateFilterState(tableKey, { filterType: value })}
                            selectedYear={filters.selectedYear}
                            setSelectedYear={(value) => updateFilterState(tableKey, { selectedYear: value, selectedMonth: '', selectedWeek: '' })}
                            selectedMonth={filters.selectedMonth}
                            setSelectedMonth={(value) => updateFilterState(tableKey, { selectedMonth: value })}
                            selectedWeek={filters.selectedWeek}
                            setSelectedWeek={(value) => updateFilterState(tableKey, { selectedWeek: value })}
                            availableYears={availableFilters.years}
                            availableMonths={availableFilters.months}
                            availableWeeks={availableFilters.weeks}
                        />
                        
                        <div className="overflow-x-auto">
                            <table className="table table-zebra table-sm">
                                <thead>
                                    <tr>
                                        <th>Order Date</th>
                                        <th>Employee ID</th>
                                        <th>Employee Name</th>
                                        <th>Department</th>
                                        <th>Prodline</th>
                                        <th>MRS No</th>
                                        <th>Issued By</th>
                                        <th>Item Code</th>
                                        <th>Material Description</th>
                                        <th>Detailed Description</th>
                                        <th>Serial</th>
                                        <th>Request Qty</th>
                                        <th>Issued Qty</th>
                                        <th>Remarks</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.length > 0 ? (
                                        data.map((item, index) => (
                                            <tr key={index}>
                                                <td className="whitespace-nowrap">{item.orderDate}</td>
                                                <td className="font-semibold">{item.employeeId}</td>
                                                <td>{item.employeeName}</td>
                                                <td>
                                                    <span className="badge badge-ghost badge-sm">{item.department}</span>
                                                </td>
                                                <td>{item.prodline}</td>
                                                <td className="font-mono">{item.mrsNo}</td>
                                                <td>{item.issuedBy}</td>
                                                <td className="font-semibold">{item.itemCode}</td>
                                                <td>{item.materialDescription}</td>
                                                <td>{item.detailedDescription}</td>
                                                <td>{item.serial}</td>
                                                <td className="text-center">{item.requestQuantity}</td>
                                                <td className="text-center">
                                                    <span className={`font-bold ${
                                                        item.issuedQuantity < item.requestQuantity ? "text-warning" : "text-success"
                                                    }`}>
                                                        {item.issuedQuantity}
                                                    </span>
                                                </td>
                                                <td className="text-sm italic text-base-content/70">{item.remarks}</td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="14" className="text-center text-base-content/60">
                                                No issuance data available {filters.filterType !== 'all' && 'for selected filter'}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        {totalPages > 1 && (
                            <Pagination
                                currentPage={currentPage}
                                totalPages={totalPages}
                                onPageChange={(page) => handlePageChange(tableKey, page)}
                            />
                        )}
                    </div>
                </div>
            );
        }

        // Render consumable return table
        if (activeMainTab === "consumable" && currentSubTab === "return") {
            const tableKey = 'consumable_return';
            const filters = filterStates[tableKey];
            const availableFilters = getAvailableFilters(consumableReturnData);
            const filteredData = getFilteredData(consumableReturnData, tableKey);
            const { data, totalPages, currentPage, totalItems } = getPaginatedData(
                filteredData,
                tableKey
            );

            return (
                <div className="card bg-base-100 shadow-xl">
                    <div className="card-body">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="card-title">{mainTabLabel} - {subTabLabel}</h3>
                            <div className="flex items-center gap-4">
                                <span className="text-sm text-base-content/60">
                                    Showing {filteredData.length} of {consumableReturnData.length} items
                                </span>
                                <button
                                    onClick={() => handleExportCSV(consumableReturnData, filteredData, 'consumable_return')}
                                    className="btn btn-sm btn-success"
                                    disabled={consumableReturnData.length === 0}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    Export CSV
                                </button>
                            </div>
                        </div>
                        
                        <FilterControls
                            filterType={filters.filterType}
                            setFilterType={(value) => updateFilterState(tableKey, { filterType: value })}
                            selectedYear={filters.selectedYear}
                            setSelectedYear={(value) => updateFilterState(tableKey, { selectedYear: value, selectedMonth: '', selectedWeek: '' })}
                            selectedMonth={filters.selectedMonth}
                            setSelectedMonth={(value) => updateFilterState(tableKey, { selectedMonth: value })}
                            selectedWeek={filters.selectedWeek}
                            setSelectedWeek={(value) => updateFilterState(tableKey, { selectedWeek: value })}
                            availableYears={availableFilters.years}
                            availableMonths={availableFilters.months}
                            availableWeeks={availableFilters.weeks}
                        />
                        
                        <div className="overflow-x-auto">
                            <table className="table table-zebra table-sm">
                                <thead>
                                    <tr>
                                        <th>Return Date</th>
                                        <th>MRS No</th>
                                        <th>Return Requestor</th>
                                        <th>Return Handler</th>
                                        <th>Item Code</th>
                                        <th>Material Description</th>
                                        <th>Old Quantity</th>
                                        <th>Issued Quantity</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.length > 0 ? (
                                        data.map((item, index) => (
                                            <tr key={index}>
                                                <td className="whitespace-nowrap">{item.orderDate}</td>
                                                <td className="font-mono">{item.mrsNo}</td>
                                                <td className="font-semibold">{item.employeeName}</td>
                                                <td>{item.issuedBy}</td>
                                                <td className="font-semibold">{item.itemCode}</td>
                                                <td>{item.materialDescription}</td>
                                                <td className="text-center">{item.requestQuantity}</td>
                                                <td className="text-center">
                                                    <span className={`font-bold ${
                                                        item.issuedQuantity < item.requestQuantity ? "text-warning" : "text-info"
                                                    }`}>
                                                        {item.issuedQuantity}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="8" className="text-center text-base-content/60">
                                                No return data available {filters.filterType !== 'all' && 'for selected filter'}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        {totalPages > 1 && (
                            <Pagination
                                currentPage={currentPage}
                                totalPages={totalPages}
                                onPageChange={(page) => handlePageChange(tableKey, page)}
                            />
                        )}
                    </div>
                </div>
            );
        }

        // ===== SUPPLIES SECTION =====
        // Render supplies inventory table
        if (activeMainTab === "supplies" && currentSubTab === "inventory") {
            const { data, totalPages, currentPage, totalItems } = getPaginatedData(
                suppliesInventoryData,
                'supplies_inventory'
            );

            return (
                <div className="card bg-base-100 shadow-xl">
                    <div className="card-body">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="card-title">{mainTabLabel} - {subTabLabel}</h3>
                            <div className="flex items-center gap-4">
                                <span className="text-sm text-base-content/60">Total items: {totalItems}</span>
                                <button
                                    onClick={() => handleExportCSV(suppliesInventoryData, suppliesInventoryData, 'supplies_inventory')}
                                    className="btn btn-sm btn-success"
                                    disabled={suppliesInventoryData.length === 0}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    Export CSV
                                </button>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="table table-zebra table-sm">
                                <thead>
                                    <tr>
                                        <th>Item Code</th>
                                        <th>Material Description</th>
                                        <th>Detailed Description</th>
                                        <th>Quantity</th>
                                        <th>UOM</th>
                                        <th>Minimum</th>
                                        <th>Maximum</th>
                                        <th>Price</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.length > 0 ? (
                                        data.map((item, index) => (
                                            <tr key={index}>
                                                <td className="font-semibold">{item.itemCode}</td>
                                                <td>{item.materialDescription}</td>
                                                <td>{item.detailedDescription}</td>
                                                <td>
                                                    <span className={`font-bold ${
                                                        item.quantity <= item.minimum ? "text-error" : 
                                                        item.quantity <= item.minimum * 1.5 ? "text-warning" : 
                                                        "text-success"
                                                    }`}>
                                                        {item.quantity}
                                                    </span>
                                                </td>
                                                <td>{item.uom}</td>
                                                <td>{item.minimum}</td>
                                                <td>{item.maximum}</td>
                                                <td>
                                                    <span className="text-success font-semibold">
                                                        {typeof item.price === 'number' ? 
                                                            `₱${item.price.toFixed(2)}` : 
                                                            item.price || '₱0.00'
                                                        }
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="8" className="text-center text-base-content/60">
                                                No supplies inventory data available
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        {totalPages > 1 && (
                            <Pagination
                                currentPage={currentPage}
                                totalPages={totalPages}
                                onPageChange={(page) => handlePageChange('supplies_inventory', page)}
                            />
                        )}
                    </div>
                </div>
            );
        }

        // Render supplies issuance table
        if (activeMainTab === "supplies" && currentSubTab === "issuance") {
            const tableKey = 'supplies_issuance';
            const filters = filterStates[tableKey];
            const availableFilters = getAvailableFilters(suppliesIssuanceData);
            const filteredData = getFilteredData(suppliesIssuanceData, tableKey);
            const { data, totalPages, currentPage, totalItems } = getPaginatedData(
                filteredData,
                tableKey
            );

            return (
                <div className="card bg-base-100 shadow-xl">
                    <div className="card-body">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="card-title">{mainTabLabel} - {subTabLabel}</h3>
                            <div className="flex items-center gap-4">
                                <span className="text-sm text-base-content/60">
                                    Showing {filteredData.length} of {suppliesIssuanceData.length} items
                                </span>
                                <button
                                    onClick={() => handleExportCSV(suppliesIssuanceData, filteredData, 'supplies_issuance')}
                                    className="btn btn-sm btn-success"
                                    disabled={suppliesIssuanceData.length === 0}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    Export CSV
                                </button>
                            </div>
                        </div>
                        
                        <FilterControls
                            filterType={filters.filterType}
                            setFilterType={(value) => updateFilterState(tableKey, { filterType: value })}
                            selectedYear={filters.selectedYear}
                            setSelectedYear={(value) => updateFilterState(tableKey, { selectedYear: value, selectedMonth: '', selectedWeek: '' })}
                            selectedMonth={filters.selectedMonth}
                            setSelectedMonth={(value) => updateFilterState(tableKey, { selectedMonth: value })}
                            selectedWeek={filters.selectedWeek}
                            setSelectedWeek={(value) => updateFilterState(tableKey, { selectedWeek: value })}
                            availableYears={availableFilters.years}
                            availableMonths={availableFilters.months}
                            availableWeeks={availableFilters.weeks}
                        />
                        
                        <div className="overflow-x-auto">
                            <table className="table table-zebra table-sm">
                                <thead>
                                    <tr>
                                        <th>Order Date</th>
                                        <th>Employee ID</th>
                                        <th>Employee Name</th>
                                        <th>Department</th>
                                        <th>Prodline</th>
                                        <th>MRS No</th>
                                        <th>Issued By</th>
                                        <th>Item Code</th>
                                        <th>Material Description</th>
                                        <th>Detailed Description</th>
                                        <th>Request Qty</th>
                                        <th>Issued Qty</th>
                                        <th>Remarks</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.length > 0 ? (
                                        data.map((item, index) => (
                                            <tr key={index}>
                                                <td className="whitespace-nowrap">{item.orderDate}</td>
                                                <td className="font-semibold">{item.employeeId}</td>
                                                <td>{item.employeeName}</td>
                                                <td>
                                                    <span className="badge badge-ghost badge-sm">{item.department}</span>
                                                </td>
                                                <td>{item.prodline}</td>
                                                <td className="font-mono">{item.mrsNo}</td>
                                                <td>{item.issuedBy}</td>
                                                <td className="font-semibold">{item.itemCode}</td>
                                                <td>{item.materialDescription}</td>
                                                <td>{item.detailedDescription}</td>
                                                <td className="text-center">{item.requestQuantity}</td>
                                                <td className="text-center">
                                                    <span className={`font-bold ${
                                                        item.issuedQuantity < item.requestQuantity ? "text-warning" : "text-success"
                                                    }`}>
                                                        {item.issuedQuantity}
                                                    </span>
                                                </td>
                                                <td className="text-sm italic text-base-content/70">{item.remarks}</td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="13" className="text-center text-base-content/60">
                                                No supplies issuance data available {filters.filterType !== 'all' && 'for selected filter'}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        {totalPages > 1 && (
                            <Pagination
                                currentPage={currentPage}
                                totalPages={totalPages}
                                onPageChange={(page) => handlePageChange(tableKey, page)}
                            />
                        )}
                    </div>
                </div>
            );
        }

        // Render supplies return table
        if (activeMainTab === "supplies" && currentSubTab === "return") {
            const tableKey = 'supplies_return';
            const filters = filterStates[tableKey];
            const availableFilters = getAvailableFilters(suppliesReturnData);
            const filteredData = getFilteredData(suppliesReturnData, tableKey);
            const { data, totalPages, currentPage, totalItems } = getPaginatedData(
                filteredData,
                tableKey
            );

            return (
                <div className="card bg-base-100 shadow-xl">
                    <div className="card-body">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="card-title">{mainTabLabel} - {subTabLabel}</h3>
                            <div className="flex items-center gap-4">
                                <span className="text-sm text-base-content/60">
                                    Showing {filteredData.length} of {suppliesReturnData.length} items
                                </span>
                                <button
                                    onClick={() => handleExportCSV(suppliesReturnData, filteredData, 'supplies_return')}
                                    className="btn btn-sm btn-success"
                                    disabled={suppliesReturnData.length === 0}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    Export CSV
                                </button>
                            </div>
                        </div>
                        
                        <FilterControls
                            filterType={filters.filterType}
                            setFilterType={(value) => updateFilterState(tableKey, { filterType: value })}
                            selectedYear={filters.selectedYear}
                            setSelectedYear={(value) => updateFilterState(tableKey, { selectedYear: value, selectedMonth: '', selectedWeek: '' })}
                            selectedMonth={filters.selectedMonth}
                            setSelectedMonth={(value) => updateFilterState(tableKey, { selectedMonth: value })}
                            selectedWeek={filters.selectedWeek}
                            setSelectedWeek={(value) => updateFilterState(tableKey, { selectedWeek: value })}
                            availableYears={availableFilters.years}
                            availableMonths={availableFilters.months}
                            availableWeeks={availableFilters.weeks}
                        />
                        
                        <div className="overflow-x-auto">
                            <table className="table table-zebra table-sm">
                                <thead>
                                    <tr>
                                        <th>Return Date</th>
                                        <th>MRS No</th>
                                        <th>Return Requestor</th>
                                        <th>Return Handler</th>
                                        <th>Item Code</th>
                                        <th>Material Description</th>
                                        <th>Old Quantity</th>
                                        <th>Issued Quantity</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.length > 0 ? (
                                        data.map((item, index) => (
                                            <tr key={index}>
                                                <td className="whitespace-nowrap">{item.orderDate}</td>
                                                <td className="font-mono">{item.mrsNo}</td>
                                                <td className="font-semibold">{item.employeeName}</td>
                                                <td>{item.issuedBy}</td>
                                                <td className="font-semibold">{item.itemCode}</td>
                                                <td>{item.materialDescription}</td>
                                                <td className="text-center">{item.requestQuantity}</td>
                                                <td className="text-center">
                                                    <span className={`font-bold ${
                                                        item.issuedQuantity < item.requestQuantity ? "text-warning" : "text-info"
                                                    }`}>
                                                        {item.issuedQuantity}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="8" className="text-center text-base-content/60">
                                                No supplies return data available {filters.filterType !== 'all' && 'for selected filter'}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        {totalPages > 1 && (
                            <Pagination
                                currentPage={currentPage}
                                totalPages={totalPages}
                                onPageChange={(page) => handlePageChange(tableKey, page)}
                            />
                        )}
                    </div>
                </div>
            );
        }

        // Render consigned inventory table
        if (activeMainTab === "consigned" && currentSubTab === "inventory") {
            const { data, totalPages, currentPage, totalItems } = getPaginatedData(
                consignedInventoryData,
                'consigned_inventory'
            );

            return (
                <div className="card bg-base-100 shadow-xl">
                    <div className="card-body">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="card-title">{mainTabLabel} - {subTabLabel}</h3>
                            <div className="flex items-center gap-4">
                                <span className="text-sm text-base-content/60">Total items: {totalItems}</span>
                                <button
                                    onClick={() => handleExportCSV(consignedInventoryData, consignedInventoryData, 'consigned_inventory')}
                                    className="btn btn-sm btn-success"
                                    disabled={consignedInventoryData.length === 0}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    Export CSV
                                </button>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="table table-zebra table-sm">
                                <thead>
                                    <tr>
                                        <th>Item Code</th>
                                        <th>Material Description</th>
                                        <th>Category</th>
                                        <th>Supplier</th>
                                        <th>Quantity</th>
                                        <th>Qty per Box</th>
                                        <th>UOM</th>
                                        <th>Bin Location</th>
                                        <th>Minimum</th>
                                        <th>Maximum</th>
                                        <th>Price</th>
                                        <th>Expiration</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.length > 0 ? (
                                        data.map((item, index) => {
                                            // Check if item is expired or near expiration
                                            const today = new Date();
                                            const expirationDate = item.expiration ? new Date(item.expiration) : null;
                                            const isExpired = expirationDate && expirationDate < today;
                                            const isNearExpiration = expirationDate && 
                                                expirationDate >= today && 
                                                expirationDate <= new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
                                            
                                            return (
                                                <tr key={index}>
                                                    <td className="font-semibold">{item.itemCode}</td>
                                                    <td>{item.materialDescription}</td>
                                                    <td>
                                                        <span className="badge badge-outline badge-sm">
                                                            {item.category}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <span className="badge badge-ghost badge-sm">
                                                            {item.supplier}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <span className={`font-bold ${
                                                            item.quantity <= item.minimum ? "text-error" : 
                                                            item.quantity <= item.minimum * 1.5 ? "text-warning" : 
                                                            "text-success"
                                                        }`}>
                                                            {item.quantity}
                                                        </span>
                                                    </td>
                                                    <td>{item.qtyPerBox || 'N/A'}</td>
                                                    <td>{item.uom}</td>
                                                    <td>{item.binLocation}</td>
                                                    <td>{item.minimum}</td>
                                                    <td>{item.maximum}</td>
                                                    <td>
                                                        <span className="text-success font-semibold">
                                                            {typeof item.price === 'number' ? 
                                                                `₱${item.price.toFixed(2)}` : 
                                                                item.price || '₱0.00'
                                                            }
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <span className={`font-medium ${
                                                            isExpired ? "text-error" :
                                                            isNearExpiration ? "text-warning" :
                                                            "text-success"
                                                        }`}>
                                                            {item.expiration || 'No expiry'}
                                                            {isExpired && <span className="text-xs ml-1">(Expired)</span>}
                                                            {isNearExpiration && <span className="text-xs ml-1">(Near expiry)</span>}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan="12" className="text-center text-base-content/60">
                                                No consigned inventory data available
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        {totalPages > 1 && (
                            <Pagination
                                currentPage={currentPage}
                                totalPages={totalPages}
                                onPageChange={(page) => handlePageChange('consigned_inventory', page)}
                            />
                        )}
                    </div>
                </div>
            );
        }

        // Render consigned issuance table
        if (activeMainTab === "consigned" && currentSubTab === "issuance") {
            const tableKey = 'consigned_issuance';
            const filters = filterStates[tableKey];
            const availableFilters = getAvailableFilters(consignedIssuanceData);
            const filteredData = getFilteredData(consignedIssuanceData, tableKey);
            const { data, totalPages, currentPage, totalItems } = getPaginatedData(
                filteredData,
                tableKey
            );

            return (
                <div className="card bg-base-100 shadow-xl">
                    <div className="card-body">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="card-title">{mainTabLabel} - {subTabLabel}</h3>
                            <div className="flex items-center gap-4">
                                <span className="text-sm text-base-content/60">
                                    Showing {filteredData.length} of {consignedIssuanceData.length} items
                                </span>
                                <button
                                    onClick={() => handleExportCSV(consignedIssuanceData, filteredData, 'consigned_issuance')}
                                    className="btn btn-sm btn-success"
                                    disabled={consignedIssuanceData.length === 0}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    Export CSV
                                </button>
                            </div>
                        </div>
                        
                        <FilterControls
                            filterType={filters.filterType}
                            setFilterType={(value) => updateFilterState(tableKey, { filterType: value })}
                            selectedYear={filters.selectedYear}
                            setSelectedYear={(value) => updateFilterState(tableKey, { selectedYear: value, selectedMonth: '', selectedWeek: '' })}
                            selectedMonth={filters.selectedMonth}
                            setSelectedMonth={(value) => updateFilterState(tableKey, { selectedMonth: value })}
                            selectedWeek={filters.selectedWeek}
                            setSelectedWeek={(value) => updateFilterState(tableKey, { selectedWeek: value })}
                            availableYears={availableFilters.years}
                            availableMonths={availableFilters.months}
                            availableWeeks={availableFilters.weeks}
                        />
                        
                        <div className="overflow-x-auto">
                            <table className="table table-zebra table-sm">
                                <thead>
                                    <tr>
                                        <th>Order Date</th>
                                        <th>Employee No</th>
                                        <th>Factory</th>
                                        <th>Station</th>
                                        <th>MRS No</th>
                                        <th>Issued By</th>
                                        <th>Item Code</th>
                                        <th>Material Description</th>
                                        <th>Supplier</th>
                                        <th>Expiration</th>
                                        <th>Bin Location</th>
                                        <th>UOM</th>
                                        <th>Qty per Box</th>
                                        <th>Request Qty</th>
                                        <th>Issued Qty</th>
                                        <th>Remarks</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.length > 0 ? (
                                        data.map((item, index) => {
                                            // Check expiration status
                                            const today = new Date();
                                            const expirationDate = item.expiration ? new Date(item.expiration) : null;
                                            const isExpired = expirationDate && expirationDate < today;
                                            const isNearExpiration = expirationDate && 
                                                expirationDate >= today && 
                                                expirationDate <= new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
                                            
                                            return (
                                                <tr key={index}>
                                                    <td className="whitespace-nowrap">{item.orderDate}</td>
                                                    <td className="font-semibold">{item.employeeNo}</td>
                                                    <td>
                                                        <span className="badge badge-ghost badge-sm">{item.factory}</span>
                                                    </td>
                                                    <td>{item.station}</td>
                                                    <td className="font-mono">{item.mrsNo}</td>
                                                    <td>{item.issuedBy}</td>
                                                    <td className="font-semibold">{item.itemCode}</td>
                                                    <td>{item.materialDescription}</td>
                                                    <td>
                                                        <span className="badge badge-ghost badge-sm">{item.supplier}</span>
                                                    </td>
                                                    <td>
                                                        <span className={`font-medium ${
                                                            isExpired ? "text-error" :
                                                            isNearExpiration ? "text-warning" :
                                                            "text-success"
                                                        }`}>
                                                            {item.expiration || 'No expiry'}
                                                        </span>
                                                    </td>
                                                    <td>{item.binLocation}</td>
                                                    <td>{item.uom}</td>
                                                    <td>{item.qtyPerBox || 'N/A'}</td>
                                                    <td className="text-center">{item.requestQuantity}</td>
                                                    <td className="text-center">
                                                        <span className={`font-bold ${
                                                            item.issuedQuantity < item.requestQuantity ? "text-warning" : "text-success"
                                                        }`}>
                                                            {item.issuedQuantity}
                                                        </span>
                                                    </td>
                                                    <td className="text-sm italic text-base-content/70">{item.remarks}</td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan="16" className="text-center text-base-content/60">
                                                No consigned issuance data available {filters.filterType !== 'all' && 'for selected filter'}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        {totalPages > 1 && (
                            <Pagination
                                currentPage={currentPage}
                                totalPages={totalPages}
                                onPageChange={(page) => handlePageChange(tableKey, page)}
                            />
                        )}
                    </div>
                </div>
            );
        }

        // Render consigned return table
        if (activeMainTab === "consigned" && currentSubTab === "return") {
            const tableKey = 'consigned_return';
            const filters = filterStates[tableKey];
            const availableFilters = getAvailableFilters(consignedReturnData);
            const filteredData = getFilteredData(consignedReturnData, tableKey);
            const { data, totalPages, currentPage, totalItems } = getPaginatedData(
                filteredData,
                tableKey
            );

            return (
                <div className="card bg-base-100 shadow-xl">
                    <div className="card-body">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="card-title">{mainTabLabel} - {subTabLabel}</h3>
                            <div className="flex items-center gap-4">
                                <span className="text-sm text-base-content/60">
                                    Showing {filteredData.length} of {consignedReturnData.length} items
                                </span>
                                <button
                                    onClick={() => handleExportCSV(consignedReturnData, filteredData, 'consigned_return')}
                                    className="btn btn-sm btn-success"
                                    disabled={consignedReturnData.length === 0}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    Export CSV
                                </button>
                            </div>
                        </div>
                        
                        <FilterControls
                            filterType={filters.filterType}
                            setFilterType={(value) => updateFilterState(tableKey, { filterType: value })}
                            selectedYear={filters.selectedYear}
                            setSelectedYear={(value) => updateFilterState(tableKey, { selectedYear: value, selectedMonth: '', selectedWeek: '' })}
                            selectedMonth={filters.selectedMonth}
                            setSelectedMonth={(value) => updateFilterState(tableKey, { selectedMonth: value })}
                            selectedWeek={filters.selectedWeek}
                            setSelectedWeek={(value) => updateFilterState(tableKey, { selectedWeek: value })}
                            availableYears={availableFilters.years}
                            availableMonths={availableFilters.months}
                            availableWeeks={availableFilters.weeks}
                        />
                        
                        <div className="overflow-x-auto">
                            <table className="table table-zebra table-sm">
                                <thead>
                                    <tr>
                                        <th>Return Date</th>
                                        <th>MRS No</th>
                                        <th>Return Requestor</th>
                                        <th>Return Handler</th>
                                        <th>Item Code</th>
                                        <th>Material Description</th>
                                        <th>Old Quantity</th>
                                        <th>Issued Quantity</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.length > 0 ? (
                                        data.map((item, index) => (
                                            <tr key={index}>
                                                <td className="whitespace-nowrap">{item.orderDate}</td>
                                                <td className="font-mono">{item.mrsNo}</td>
                                                <td className="font-semibold">{item.employeeNo}</td>
                                                <td>{item.issuedBy}</td>
                                                <td className="font-semibold">{item.itemCode}</td>
                                                <td>{item.materialDescription}</td>
                                                <td className="text-center">{item.requestQuantity}</td>
                                                <td className="text-center">
                                                    <span className={`font-bold ${
                                                        item.issuedQuantity < item.requestQuantity ? "text-warning" : "text-info"
                                                    }`}>
                                                        {item.issuedQuantity}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="8" className="text-center text-base-content/60">
                                                No consigned return data available {filters.filterType !== 'all' && 'for selected filter'}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        {totalPages > 1 && (
                            <Pagination
                                currentPage={currentPage}
                                totalPages={totalPages}
                                onPageChange={(page) => handlePageChange(tableKey, page)}
                            />
                        )}
                    </div>
                </div>
            );
        }

        // Default content for other tabs
        return (
            <div className="card bg-base-100 shadow-xl">
                <div className="card-body">
                    <h3 className="card-title">
                        {mainTabLabel} - {subTabLabel}
                    </h3>
                    <p className="text-base-content/70">
                        Content for {mainTabLabel} / {subTabLabel} will be displayed here.
                    </p>
                    <div className="divider"></div>
                    <p className="text-sm text-base-content/60">
                        Add your table data and components here for this section.
                    </p>
                </div>
            </div>
        );
    };

    return (
        <AuthenticatedLayout>
            <Head title="Export" />

            <div className="space-y-6">
                <h1 className="text-2xl font-bold">Export</h1>

                {/* Main Tabs */}
                <div role="tablist" className="tabs tabs-boxed bg-base-200 p-2">
                    {mainTabs.map(tab => (
                        <button
                            key={tab.id}
                            role="tab"
                            onClick={() => setActiveMainTab(tab.id)}
                            className={`tab ${activeMainTab === tab.id ? "tab-active" : ""}`}
                        >
                            {tab.label}
                        </button>
                    ))}
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

                {/* Content Area */}
                {renderContent()}
            </div>
        </AuthenticatedLayout>
    );
}