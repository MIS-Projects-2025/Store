import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head } from "@inertiajs/react";
import { useState } from "react";
import { router } from "@inertiajs/react";

export default function Dashboard({ 
    lowConsumables = {}, 
    lowSupplies = {},
    filters = {}
}) {
    const [activeTab, setActiveTab] = useState(filters?.tab || "tab1");
    
    // Extract data from paginated response
    const consumablesData = lowConsumables.data || [];
    const suppliesData = lowSupplies.data || [];
    
    // Pagination metadata
    const consumablesCurrentPage = lowConsumables.current_page || 1;
    const suppliesCurrentPage = lowSupplies.current_page || 1;
    
    const consumablesLastPage = lowConsumables.last_page || 1;
    const suppliesLastPage = lowSupplies.last_page || 1;
    
    const consumablesFrom = lowConsumables.from || 0;
    const suppliesFrom = lowSupplies.from || 0;
    
    const consumablesTo = lowConsumables.to || 0;
    const suppliesTo = lowSupplies.to || 0;
    
    const consumablesTotal = lowConsumables.total || 0;
    const suppliesTotal = lowSupplies.total || 0;

    const cards = [
        {
            title: "CONSUMABLE",
            borderColor: "border-green-500",
        },
        {
            title: "SUPPLIES",
            borderColor: "border-yellow-400",
        },
        {
            title: "CONSIGNED",
            borderColor: "border-blue-500",
        },
    ];

    // Handle tab change
    const handleTabChange = (tab) => {
        setActiveTab(tab);
        router.get(route('dashboard'), {
            tab: tab,
            consumables_page: tab === "tab1" ? consumablesCurrentPage : 1,
            supplies_page: tab === "tab2" ? suppliesCurrentPage : 1,
        }, {
            preserveState: true,
            preserveScroll: true
        });
    };

    // Handle page change
    const handlePageChange = (page, type) => {
        if (type === 'consumables') {
            router.get(route('dashboard'), {
                tab: 'tab1',
                consumables_page: page,
                supplies_page: suppliesCurrentPage,
            }, {
                preserveState: true,
                preserveScroll: true
            });
        } else {
            router.get(route('dashboard'), {
                tab: 'tab2',
                consumables_page: consumablesCurrentPage,
                supplies_page: page,
            }, {
                preserveState: true,
                preserveScroll: true
            });
        }
    };

    // Calculate page range for pagination
    const getPageRange = (currentPage, lastPage) => {
        const delta = 2;
        const range = [];
        const rangeWithDots = [];
        let l;

        for (let i = 1; i <= lastPage; i++) {
            if (i === 1 || i === lastPage || (i >= currentPage - delta && i <= currentPage + delta)) {
                range.push(i);
            }
        }

        range.forEach((i) => {
            if (l) {
                if (i - l === 2) {
                    rangeWithDots.push(l + 1);
                } else if (i - l !== 1) {
                    rangeWithDots.push('...');
                }
            }
            rangeWithDots.push(i);
            l = i;
        });

        return rangeWithDots;
    };

    // Pagination component
    const Pagination = ({ currentPage, lastPage, from, to, total, type }) => {
        if (lastPage <= 1) return null;
        
        const pageRange = getPageRange(currentPage, lastPage);
        
        return (
            <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-4">
                {/* Results Info */}
                <div className="text-sm text-gray-600">
                    Showing {from} to {to} of {total} items
                </div>
                
                {/* Pagination Controls */}
                <div className="flex items-center gap-1">
                    {/* First Page */}
                    <button
                        onClick={() => handlePageChange(1, type)}
                        disabled={currentPage === 1}
                        className="btn btn-sm btn-ghost"
                        title="First Page"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M15.707 15.707a1 1 0 01-1.414 0l-5-5a1 1 0 010-1.414l5-5a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 010 1.414zm-6 0a1 1 0 01-1.414 0l-5-5a1 1 0 010-1.414l5-5a1 1 0 011.414 1.414L5.414 10l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                        </svg>
                    </button>
                    
                    {/* Previous Page */}
                    <button
                        onClick={() => handlePageChange(currentPage - 1, type)}
                        disabled={currentPage === 1}
                        className="btn btn-sm btn-ghost"
                        title="Previous Page"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                    </button>
                    
                    {/* Page Numbers */}
                    <div className="flex items-center gap-1">
                        {pageRange.map((page, index) => (
                            page === '...' ? (
                                <span key={`dots-${index}`} className="px-2">...</span>
                            ) : (
                                <button
                                    key={page}
                                    onClick={() => handlePageChange(page, type)}
                                    className={`btn btn-sm ${currentPage === page ? 'btn-primary' : 'btn-ghost'}`}
                                >
                                    {page}
                                </button>
                            )
                        ))}
                    </div>
                    
                    {/* Next Page */}
                    <button
                        onClick={() => handlePageChange(currentPage + 1, type)}
                        disabled={currentPage === lastPage}
                        className="btn btn-sm btn-ghost"
                        title="Next Page"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                        </svg>
                    </button>
                    
                    {/* Last Page */}
                    <button
                        onClick={() => handlePageChange(lastPage, type)}
                        disabled={currentPage === lastPage}
                        className="btn btn-sm btn-ghost"
                        title="Last Page"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10.293 15.707a1 1 0 010-1.414L14.586 10l-4.293-4.293a1 1 0 111.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                            <path fillRule="evenodd" d="M4.293 15.707a1 1 0 010-1.414L8.586 10 4.293 5.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                        </svg>
                    </button>
                </div>
            </div>
        );
    };

    return (
        <AuthenticatedLayout>
            <Head title="Dashboard" />
            
            <div className="py-6">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                        {cards.map((card, index) => (
                            <div
                                key={index}
                                className={`bg-white rounded-lg shadow-md overflow-hidden border-t-4 ${card.borderColor}`}
                            >
                                <div className="p-6">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-sm font-semibold text-gray-600 tracking-wide">
                                            {card.title}
                                        </h3>
                                        <div className="bg-gray-200 p-3 rounded-full">
                                            <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                {index === 0 && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />}
                                                {index === 1 && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />}
                                                {index === 2 && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />}
                                            </svg>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-gray-100 px-6 py-3 flex items-center justify-between hover:bg-gray-200 cursor-pointer transition-colors">
                                    <span className="text-sm text-gray-700">More info</span>
                                    <div className="bg-gray-700 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                                        →
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Tabbed Card with Data Tables */}
                    <div className="card bg-base-100 shadow-xl">
                        <div className="card-body">
                            <h2 className="card-title mb-4">List of Low Materials</h2>
                            
                            {/* DaisyUI Tabs */}
                            <div role="tablist" className="tabs tabs-bordered">
                                <a 
                                    role="tab" 
                                    className={`tab ${activeTab === "tab1" ? "tab-active" : ""}`}
                                    onClick={() => handleTabChange("tab1")}
                                >
                                    Consumables ({consumablesTotal})
                                </a>
                                <a 
                                    role="tab" 
                                    className={`tab ${activeTab === "tab2" ? "tab-active" : ""}`}
                                    onClick={() => handleTabChange("tab2")}
                                >
                                    Supplies ({suppliesTotal})
                                </a>
                            </div>

                            {/* Tab Content */}
                            <div className="mt-6">
                                {activeTab === "tab1" && (
                                    <>
                                        <div className="overflow-x-auto">
                                            <table className="table table-zebra">
                                                <thead>
                                                    <tr>
                                                        <th>Item Code</th>
                                                        <th>Material Description</th>
                                                        <th>Quantity</th>
                                                        <th>Minimum</th>
                                                        <th>UOM</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {consumablesData.length > 0 ? (
                                                        consumablesData.map((item) => (
                                                            <tr key={item.id}>
                                                                <td>{item.Itemcode}</td>
                                                                <td>{item.mat_description}</td>
                                                                <td>
                                                                    <span className={`${
                                                                        item.qty <= item.minimum / 2 
                                                                            ? 'text-red-600 font-bold' 
                                                                            : 'text-yellow-600 font-semibold'
                                                                    }`}>
                                                                        {parseFloat(item.qty).toFixed(2)}
                                                                    </span>
                                                                </td>
                                                                <td>{parseFloat(item.minimum).toFixed(2)}</td>
                                                                <td>{item.uom}</td>
                                                            </tr>
                                                        ))
                                                    ) : (
                                                        <tr>
                                                            <td colSpan="5" className="text-center text-gray-500">
                                                                No low stock items found
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                        
                                        {/* Consumables Pagination */}
                                        <Pagination
                                            currentPage={consumablesCurrentPage}
                                            lastPage={consumablesLastPage}
                                            from={consumablesFrom}
                                            to={consumablesTo}
                                            total={consumablesTotal}
                                            type="consumables"
                                        />
                                    </>
                                )}

                                {activeTab === "tab2" && (
                                    <>
                                        <div className="overflow-x-auto">
                                            <table className="table table-zebra">
                                                <thead>
                                                    <tr>
                                                        <th>Item Code</th>
                                                        <th>Material Description</th>
                                                        <th>Quantity</th>
                                                        <th>Minimum</th>
                                                        <th>UOM</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {suppliesData.length > 0 ? (
                                                        suppliesData.map((item) => (
                                                            <tr key={item.id}>
                                                                <td>{item.itemcode}</td>
                                                                <td>{item.material_description}</td>
                                                                <td>
                                                                    <span className={`${
                                                                        item.qty <= item.minimum / 2 
                                                                            ? 'text-red-600 font-bold' 
                                                                            : 'text-yellow-600 font-semibold'
                                                                    }`}>
                                                                        {parseFloat(item.qty).toFixed(2)}
                                                                    </span>
                                                                </td>
                                                                <td>{parseFloat(item.minimum).toFixed(2)}</td>
                                                                <td>{item.uom}</td>
                                                            </tr>
                                                        ))
                                                    ) : (
                                                        <tr>
                                                            <td colSpan="5" className="text-center text-gray-500">
                                                                No low stock items found
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                        
                                        {/* Supplies Pagination */}
                                        <Pagination
                                            currentPage={suppliesCurrentPage}
                                            lastPage={suppliesLastPage}
                                            from={suppliesFrom}
                                            to={suppliesTo}
                                            total={suppliesTotal}
                                            type="supplies"
                                        />
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}