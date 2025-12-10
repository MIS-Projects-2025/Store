import { Head, usePage, router } from "@inertiajs/react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { useState, useEffect, useCallback, useRef } from "react";
import _ from 'lodash';


export default function Supplies({ Supplies, filters }) {
    const { flash } = usePage().props;
    const allSupplies = Supplies.data || [];
    
    // Pagination states from server
    const currentPage = Supplies.current_page || 1;
    const lastPage = Supplies.last_page || 1;
    const perPage = Supplies.per_page || 10;
    const total = Supplies.total || 0;
    const from = Supplies.from || 0;
    const to = Supplies.to || 0;
    
    // Get search from filters or use empty string
    const [mainSearchQuery, setMainSearchQuery] = useState(filters?.search || '');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [isAddQuantityModalOpen, setIsAddQuantityModalOpen] = useState(false);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [showAddDetailForm, setShowAddDetailForm] = useState(false);
    const [showEditForm, setShowEditForm] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [historyData, setHistoryData] = useState([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const [itemDetails, setItemDetails] = useState([]);
    const [isLoadingDetails, setIsLoadingDetails] = useState(false);
    const [editingDetailId, setEditingDetailId] = useState(null);
    const [importFile, setImportFile] = useState(null);
    const [isImporting, setIsImporting] = useState(false);
    const [editFormData, setEditFormData] = useState({
        material_description: "",
        detailed_description: "",
        bin_location: "",
        uom: "",
        minimum: "",
        maximum: "",
        price: ""
    });
    const [modalStep, setModalStep] = useState(1);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedItemsForQuantity, setSelectedItemsForQuantity] = useState([]);
    const [formData, setFormData] = useState({
        itemcode: "",
        material_description: "",
        detailed_description: "",
        bin_location: "",
        quantity: "",
        uom: "",
        minimum: "",
        maximum: "",
        price: ""
    });
    const [detailFormData, setDetailFormData] = useState({
        detailed_description: "",
        bin_location: "",
        quantity: "",
        uom: "",
        minimum: "",
        maximum: "",
        price: ""
    });

    // Show flash messages
    useEffect(() => {
        if (flash?.success) {
            alert(flash.success);
        }
        if (flash?.error) {
            alert(flash.error);
        }
    }, [flash]);

    const handleOpenModal = () => {
        setIsModalOpen(true);
        setModalStep(1);
    };

const handleImportExcel = async () => {
    if (!importFile) {
        alert('Please select an Excel or CSV file to import');
        return;
    }
    
    setIsImporting(true);
    
    const formData = new FormData();
    formData.append('excel_file', importFile);
    
    try {
        // Use Inertia's router.post method which automatically handles CSRF
        router.post(route('supplies.import-excel'), formData, {
            onSuccess: () => {
                alert('Import successful!');
                setImportFile(null);
                setIsImporting(false);
                // You might want to reload or refresh data here
                window.location.reload();
            },
            onError: (errors) => {
                alert(errors?.message || 'Import failed. Please check the file format.');
                setImportFile(null);
                setIsImporting(false);
            },
        });
    } catch (error) {
        console.error('Import error:', error);
        alert('Error importing file: ' + (error.message || 'Please try again'));
        setIsImporting(false);
        setImportFile(null);
    }
};

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setModalStep(1);
        setFormData({
            itemcode: "",
            material_description: "",
            detailed_description: "",
            bin_location: "",
            quantity: "",
            uom: "",
            minimum: "",
            maximum: "",
            price: ""
        });
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleDetailInputChange = (e) => {
        const { name, value } = e.target;
        setDetailFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleEditInputChange = (e) => {
        const { name, value } = e.target;
        setEditFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleNext = (e) => {
        e.preventDefault();
        setModalStep(2);
    };

    const handleBack = () => {
        setModalStep(1);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        router.post(route('supplies.store'), formData, {
            onSuccess: () => {
                handleCloseModal();
            },
        });
    };

const handleViewItem = async (item) => {
    setSelectedItem(item);
    setIsViewModalOpen(true);
    setShowAddDetailForm(false);
    setShowEditForm(false);
    setIsLoadingDetails(true);
    
    try {
        const response = await fetch(route('supplies.details', item.id));
        const data = await response.json();
        setItemDetails(data.details);
    } catch (error) {
        console.error('Failed to fetch details:', error);
        setItemDetails([]);
    } finally {
        setIsLoadingDetails(false);
    }
};

// Update handleCloseViewModal to clear details
const handleCloseViewModal = () => {
    setIsViewModalOpen(false);
    setSelectedItem(null);
    setItemDetails([]);
    setShowAddDetailForm(false);
    setShowEditForm(false);
    setDetailFormData({
        detailed_description: "",
        bin_location: "",
        quantity: "",
        uom: "",
        minimum: "",
        maximum: "",
        price: ""
    });
    setEditFormData({
        material_description: "",
        detailed_description: "",
        bin_location: "",
        uom: "",
        minimum: "",
        maximum: "",
        price: ""
    });
};

    const handleViewHistory = async (item) => {
        setSelectedItem(item);
        setIsHistoryModalOpen(true);
        setIsLoadingHistory(true);
        
        try {
            const response = await fetch(route('supplies.history', item.id));
            const data = await response.json();
            setHistoryData(data);
        } catch (error) {
            console.error('Failed to fetch history:', error);
            setHistoryData([]);
        } finally {
            setIsLoadingHistory(false);
        }
    };

    const handleCloseHistoryModal = () => {
        setIsHistoryModalOpen(false);
        setSelectedItem(null);
        setHistoryData([]);
    };

    const handleShowAddDetailForm = () => {
        setDetailFormData({
            detailed_description: "",
            bin_location: "",
            quantity: "",
            uom: selectedItem.uom || "",
            minimum: "",
            maximum: "",
            price: ""
        });
        setShowAddDetailForm(true);
    };

    const handleCancelAddDetail = () => {
        setShowAddDetailForm(false);
        setDetailFormData({
            detailed_description: "",
            bin_location: "",
            quantity: "",
            uom: "",
            minimum: "",
            maximum: "",
            price: ""
        });
    };

    const handleSubmitDetail = (e) => {
        e.preventDefault();
        router.post(route('supplies.add-detail', selectedItem.id), detailFormData, {
            onSuccess: () => {
                setShowAddDetailForm(false);
                handleCloseViewModal();
            },
        });
    };

const handleShowEditForm = (detail = null) => {
    if (detail) {
        // Editing a specific detail
        setEditingDetailId(detail.detail_id);
        setEditFormData({
            material_description: selectedItem.material_description || "",
            detailed_description: detail.detailed_description || "",
            bin_location: detail.bin_location || "",
            uom: detail.uom || "",
            minimum: detail.minimum || "",
            maximum: detail.maximum || "",
            price: detail.price || ""
        });
    } else {
        // Editing first detail (backward compatibility)
        const firstDetail = itemDetails[0];
        setEditingDetailId(firstDetail?.detail_id || null);
        setEditFormData({
            material_description: selectedItem.material_description || "",
            detailed_description: firstDetail?.detailed_description || "",
            bin_location: firstDetail?.bin_location || "",
            uom: firstDetail?.uom || "",
            minimum: firstDetail?.minimum || "",
            maximum: firstDetail?.maximum || "",
            price: firstDetail?.price || ""
        });
    }
    setShowEditForm(true);
};

// Update handleCancelEdit to clear editingDetailId
const handleCancelEdit = () => {
    setShowEditForm(false);
    setEditingDetailId(null);
    setEditFormData({
        material_description: "",
        detailed_description: "",
        bin_location: "",
        uom: "",
        minimum: "",
        maximum: "",
        price: ""
    });
};

// Update handleSubmitEdit to use the specific detail ID
const handleSubmitEdit = (e) => {
    e.preventDefault();
    router.put(route('supplies.update', selectedItem.id), {
        ...editFormData,
        detail_id: editingDetailId
    }, {
        onSuccess: () => {
            setShowEditForm(false);
            setEditingDetailId(null);
            handleCloseViewModal();
        },
    });
};

    const handleOpenAddQuantityModal = () => {
        setIsAddQuantityModalOpen(true);
    };

    const handleCloseAddQuantityModal = () => {
        setIsAddQuantityModalOpen(false);
        setSearchQuery("");
        setSelectedItemsForQuantity([]);
    };

    const handleSearchChange = (e) => {
        setSearchQuery(e.target.value);
    };

    const handleMainSearchChange = (e) => {
        setMainSearchQuery(e.target.value);
    };

    // Debounced search function
    const debouncedSearch = useCallback(
        _.debounce((searchValue) => {
            router.get(route('supplies'), 
                { search: searchValue, page: 1, per_page: perPage },
                { preserveState: true, replace: true }
            );
        }, 500),
        [perPage]
    );

    useEffect(() => {
        if (mainSearchQuery !== undefined) {
            debouncedSearch(mainSearchQuery);
        }
    }, [mainSearchQuery, debouncedSearch]);

    // Handle items per page change
    const handleItemsPerPageChange = (e) => {
        const newPerPage = parseInt(e.target.value);
        router.get(route('supplies'), 
            { search: mainSearchQuery, page: 1, per_page: newPerPage },
            { preserveState: true, replace: true }
        );
    };

    // Handle page change
    const handlePageChange = (pageNumber) => {
        if (pageNumber >= 1 && pageNumber <= lastPage) {
            router.get(route('supplies'), 
                { search: mainSearchQuery, page: pageNumber, per_page: perPage },
                { preserveState: true, replace: true }
            );
        }
    };

    const handleSelectItem = (item) => {
        const isAlreadySelected = selectedItemsForQuantity.some(
            selectedItem => selectedItem.id === item.id
        );
        
        if (!isAlreadySelected) {
            setSelectedItemsForQuantity([
                ...selectedItemsForQuantity,
                { ...item, addQuantity: "" }
            ]);
        }
        setSearchQuery("");
    };

    const handleAddQuantityChange = (itemId, value) => {
        setSelectedItemsForQuantity(
            selectedItemsForQuantity.map(item =>
                item.id === itemId ? { ...item, addQuantity: value } : item
            )
        );
    };

    const handleRemoveItem = (itemId) => {
        setSelectedItemsForQuantity(
            selectedItemsForQuantity.filter(item => item.id !== itemId)
        );
    };

    const handleSaveQuantity = () => {
        const itemsWithQuantity = selectedItemsForQuantity
            .filter(item => item.addQuantity && parseInt(item.addQuantity) > 0)
            .map(item => ({
                id: item.id,
                quantity: parseInt(item.addQuantity)
            }));
        
        if (itemsWithQuantity.length > 0) {
            router.post(route('supplies.add-quantity'), { items: itemsWithQuantity }, {
                onSuccess: () => {
                    handleCloseAddQuantityModal();
                },
            });
        }
    };

    useEffect(() => {
    if (importFile) {
        handleImportExcel();
    }
}, [importFile]);

    const filteredItems = allSupplies.filter(item => {
        const isAlreadySelected = selectedItemsForQuantity.some(
            selectedItem => selectedItem.id === item.id
        );
        const matchesSearch = item.itemcode.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.material_description.toLowerCase().includes(searchQuery.toLowerCase());
        
        return !isAlreadySelected && matchesSearch;
    });

    return (
        <AuthenticatedLayout>
            <Head title="Supplies" />

            <div className="space-y-6">
                {/* Header with Title and Buttons */}
                <div className="flex justify-between items-center">
                    <h1 className="text-2xl font-bold">Supplies</h1>
                    
                    <div className="flex gap-2">
<button 
    className="btn btn-info"
    onClick={() => document.getElementById('excel-file-input').click()}
    disabled={isImporting}
>
    {isImporting ? (
        <>
            <span className="loading loading-spinner loading-sm mr-2"></span>
            Importing...
        </>
    ) : (
        <>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
            Import Excel
        </>
    )}
</button>


<input
    id="excel-file-input"
    type="file"
    accept=".xlsx,.xls,.csv"
    className="hidden"
    onChange={(e) => {
        if (e.target.files.length > 0) {
            setImportFile(e.target.files[0]);
        }
    }}
/>
                         <button onClick={handleOpenAddQuantityModal} className="btn btn-secondary">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM14 11a1 1 0 011 1v1h1a1 1 0 110 2h-1v1a1 1 0 11-2 0v-1h-1a1 1 0 110-2h1v-1a1 1 0 011-1z" />
                            </svg>
                            Add Quantity
                        </button>
                        <button onClick={handleOpenModal} className="btn btn-primary">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                            </svg>
                            Add Item
                        </button>
                    </div>
                </div>

                {/* Search Bar and Pagination Controls */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex gap-2 w-full md:w-auto">
                        <input 
                            type="text" 
                            placeholder="Search supplies..." 
                            className="input input-bordered w-full md:w-64"
                            value={mainSearchQuery}
                            onChange={handleMainSearchChange}
                        />
                        {mainSearchQuery && (
                            <button 
                                className="btn btn-ghost btn-circle"
                                onClick={() => setMainSearchQuery("")}
                                title="Clear search"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                            </button>
                        )}
                    </div>
                    
                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <div className="flex items-center gap-2">
                            <span className="text-sm">Show</span>
                            <select 
                                className="select select-bordered select-sm"
                                value={perPage}
                                onChange={handleItemsPerPageChange}
                            >
                                <option value="5">5</option>
                                <option value="10">10</option>
                                <option value="25">25</option>
                                <option value="50">50</option>
                                <option value="100">100</option>
                            </select>
                            <span className="text-sm">entries</span>
                        </div>
                        
                        <div className="text-sm">
                            Showing {from} to {to} of {total} entries
                        </div>
                    </div>
                </div>

                {/* Data Table */}
                <div className="overflow-x-auto bg-base-100 rounded-lg shadow">
                    <table className="table table-zebra w-full">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Item Code</th>
                                <th>Material Description</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {allSupplies.length > 0 ? (
                                allSupplies.map((item) => (
                                    <tr key={item.id}>
                                        <td className="font-semibold">{item.id}</td>
                                        <td className="font-semibold">{item.itemcode}</td>
                                        <td>{item.material_description}</td>
                                        <td>
                                            <div className="flex gap-2">
                                                <button
                                                    className="btn btn-sm btn-ghost"
                                                    title="View Details"
                                                    onClick={() => handleViewItem(item)}
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                                        <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                                                    </svg>
                                                </button>
                                                <button
                                                    className="btn btn-sm btn-ghost"
                                                    title="View History"
                                                    onClick={() => handleViewHistory(item)}
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="4" className="text-center py-8 text-base-content/60">
                                        {mainSearchQuery ? `No supplies found matching "${mainSearchQuery}"` : "No Supplies found"}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                                {/* Pagination */}
                {lastPage > 1 && (
                    <div className="flex justify-center items-center gap-2 mt-6">
                        <button
                            className="btn btn-sm btn-ghost"
                            onClick={() => handlePageChange(1)}
                            disabled={currentPage === 1}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M15.707 15.707a1 1 0 01-1.414 0l-5-5a1 1 0 010-1.414l5-5a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 010 1.414zm-6 0a1 1 0 01-1.414 0l-5-5a1 1 0 010-1.414l5-5a1 1 0 011.414 1.414L5.414 10l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                            </svg>
                        </button>
                        
                        <button
                            className="btn btn-sm btn-ghost"
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                        </button>

                        {/* Page numbers */}
                        <div className="flex items-center gap-1">
                            {(() => {
                                const pages = [];
                                const maxVisiblePages = 5;
                                
                                if (lastPage <= maxVisiblePages) {
                                    // Show all pages
                                    for (let i = 1; i <= lastPage; i++) {
                                        pages.push(i);
                                    }
                                } else {
                                    // Show limited pages with ellipsis
                                    if (currentPage <= 3) {
                                        // Near the beginning
                                        for (let i = 1; i <= 4; i++) {
                                            pages.push(i);
                                        }
                                        pages.push('...');
                                        pages.push(lastPage);
                                    } else if (currentPage >= lastPage - 2) {
                                        // Near the end
                                        pages.push(1);
                                        pages.push('...');
                                        for (let i = lastPage - 3; i <= lastPage; i++) {
                                            pages.push(i);
                                        }
                                    } else {
                                        // In the middle
                                        pages.push(1);
                                        pages.push('...');
                                        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
                                            pages.push(i);
                                        }
                                        pages.push('...');
                                        pages.push(lastPage);
                                    }
                                }
                                
                                return pages.map((page, index) => (
                                    page === '...' ? (
                                        <span key={`ellipsis-${index}`} className="px-2">...</span>
                                    ) : (
                                        <button
                                            key={page}
                                            className={`btn btn-sm ${currentPage === page ? 'btn-primary' : 'btn-ghost'}`}
                                            onClick={() => handlePageChange(page)}
                                        >
                                            {page}
                                        </button>
                                    )
                                ));
                            })()}
                        </div>

                        <button
                            className="btn btn-sm btn-ghost"
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === lastPage}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                            </svg>
                        </button>
                        
                        <button
                            className="btn btn-sm btn-ghost"
                            onClick={() => handlePageChange(lastPage)}
                            disabled={currentPage === lastPage}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10.293 15.707a1 1 0 010-1.414L14.586 10l-4.293-4.293a1 1 0 111.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                <path fillRule="evenodd" d="M4.293 15.707a1 1 0 010-1.414L8.586 10 4.293 5.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                            </svg>
                        </button>
                    </div>
                )}
            </div>

            {/* Add Item Modal */}
            {isModalOpen && (
                <div className="modal modal-open">
                    <div className="modal-box">
                        {modalStep === 1 ? (
                            <>
                                <h3 className="font-bold text-lg mb-4">Add New Item - Step 1</h3>
                                
                                <form onSubmit={handleNext}>
                                    <div className="space-y-4">
                                        <div className="form-control">
                                            <label className="label">
                                                <span className="label-text">Item Code</span>
                                            </label>
                                            <input
                                                type="text"
                                                name="itemcode"
                                                placeholder="Enter item code"
                                                className="input input-bordered w-full"
                                                value={formData.itemcode}
                                                onChange={handleInputChange}
                                                required
                                            />
                                        </div>

                                        <div className="form-control">
                                            <label className="label">
                                                <span className="label-text">Material Description</span>
                                            </label>
                                            <textarea
                                                name="material_description"
                                                placeholder="Enter material description"
                                                className="textarea textarea-bordered w-full"
                                                value={formData.material_description}
                                                onChange={handleInputChange}
                                                required
                                                rows="3"
                                            />
                                        </div>
                                    </div>

                                    <div className="modal-action">
                                        <button
                                            type="button"
                                            className="btn btn-ghost"
                                            onClick={handleCloseModal}
                                        >
                                            Cancel
                                        </button>
                                        <button type="submit" className="btn btn-primary">
                                            Next
                                        </button>
                                    </div>
                                </form>
                            </>
                        ) : (
                            <>
                                <h3 className="font-bold text-lg mb-4">Add New Item - Step 2</h3>
                                
                                <form onSubmit={handleSubmit}>
                                    <div className="space-y-4">
                                        <div className="form-control">
                                            <label className="label">
                                                <span className="label-text">Detailed Description</span>
                                            </label>
                                            <textarea
                                                name="detailed_description"
                                                placeholder="Enter detailed description"
                                                className="textarea textarea-bordered w-full"
                                                value={formData.detailed_description}
                                                onChange={handleInputChange}
                                                rows="2"
                                            />
                                        </div>

                                        <div className="form-control">
                                            <label className="label">
                                                <span className="label-text">Bin Location</span>
                                            </label>
                                            <input
                                                type="text"
                                                name="bin_location"
                                                placeholder="Enter bin location"
                                                className="input input-bordered w-full"
                                                value={formData.bin_location}
                                                onChange={handleInputChange}
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="form-control">
                                                <label className="label">
                                                    <span className="label-text">Quantity</span>
                                                </label>
                                                <input
                                                    type="number"
                                                    name="quantity"
                                                    placeholder="0"
                                                    className="input input-bordered w-full"
                                                    value={formData.quantity}
                                                    onChange={handleInputChange}
                                                    required
                                                />
                                            </div>

                                            <div className="form-control">
                                                <label className="label">
                                                    <span className="label-text">UOM</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    name="uom"
                                                    placeholder="Unit of Measure"
                                                    className="input input-bordered w-full"
                                                    value={formData.uom}
                                                    onChange={handleInputChange}
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="form-control">
                                                <label className="label">
                                                    <span className="label-text">Minimum</span>
                                                </label>
                                                <input
                                                    type="number"
                                                    name="minimum"
                                                    placeholder="0"
                                                    className="input input-bordered w-full"
                                                    value={formData.minimum}
                                                    onChange={handleInputChange}
                                                />
                                            </div>

                                            <div className="form-control">
                                                <label className="label">
                                                    <span className="label-text">Maximum</span>
                                                </label>
                                                <input
                                                    type="number"
                                                    name="maximum"
                                                    placeholder="0"
                                                    className="input input-bordered w-full"
                                                    value={formData.maximum}
                                                    onChange={handleInputChange}
                                                />
                                            </div>
                                        </div>

                                        <div className="form-control">
                                            <label className="label">
                                                <span className="label-text">Price</span>
                                            </label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                name="price"
                                                placeholder="0.00"
                                                className="input input-bordered w-full"
                                                value={formData.price}
                                                onChange={handleInputChange}
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="modal-action">
                                        <button
                                            type="button"
                                            className="btn btn-ghost"
                                            onClick={handleBack}
                                        >
                                            Back
                                        </button>
                                        <button type="submit" className="btn btn-primary">
                                            Add Item
                                        </button>
                                    </div>
                                </form>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Add Quantity Modal */}
            {isAddQuantityModalOpen && (
                <div className="modal modal-open">
                    <div className="modal-box max-w-5xl">
                        <h3 className="font-bold text-lg mb-4">Add Quantity</h3>
                        
                        <div className="form-control mb-6">
                            <label className="label">
                                <span className="label-text">Search Item</span>
                            </label>
                            <input
                                type="text"
                                placeholder="Search by item code or description..."
                                className="input input-bordered w-full"
                                value={searchQuery}
                                onChange={handleSearchChange}
                            />
                        </div>

                        {searchQuery && filteredItems.length > 0 && (
                            <div className="mb-6 max-h-48 overflow-y-auto border border-base-300 rounded-lg">
                                {filteredItems.map((item) => (
                                    <div
                                        key={item.id}
                                        className="p-3 hover:bg-base-200 cursor-pointer border-b border-base-300 last:border-b-0"
                                        onClick={() => handleSelectItem(item)}
                                    >
                                        <p className="font-semibold">{item.itemcode}</p>
                                        <p className="text-sm text-base-content/60">{item.material_description}</p>
                                    </div>
                                ))}
                            </div>
                        )}

                        {searchQuery && filteredItems.length === 0 && (
                            <div className="mb-6 p-4 text-center text-base-content/60">
                                No items found or all items already added
                            </div>
                        )}

                        {selectedItemsForQuantity.length > 0 && (
                            <div className="overflow-x-auto">
                                <table className="table table-zebra w-full">
                                    <thead>
                                        <tr>
                                            <th>Item Code</th>
                                            <th>Description</th>
                                            <th>Detailed Description</th>
                                            <th>Current Qty</th>
                                            <th>Add Quantity</th>
                                            <th>New Quantity</th>
                                            <th>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedItemsForQuantity.map((item) => (
                                            <tr key={item.id}>
                                                <td className="font-semibold">{item.itemcode}</td>
                                                <td>{item.material_description}</td>
                                                <td>{item.detailed_description || 'N/A'}</td>
                                                <td>{item.quantity || '0'}</td>
                                                <td>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        placeholder="0"
                                                        className="input input-bordered input-sm w-24"
                                                        value={item.addQuantity}
                                                        onChange={(e) => handleAddQuantityChange(item.id, e.target.value)}
                                                    />
                                                </td>
                                                <td className="font-semibold">
                                                    {parseInt(item.quantity || 0) + parseInt(item.addQuantity || 0)}
                                                </td>
                                                <td>
                                                    <button
                                                        className="btn btn-sm btn-ghost btn-circle"
                                                        onClick={() => handleRemoveItem(item.id)}
                                                        title="Remove"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                                        </svg>
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        <div className="modal-action">
                            <button
                                className="btn btn-ghost"
                                onClick={handleCloseAddQuantityModal}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={handleSaveQuantity}
                                disabled={selectedItemsForQuantity.length === 0 || 
                                    !selectedItemsForQuantity.some(item => item.addQuantity && parseInt(item.addQuantity) > 0)}
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* View Item Modal with Integrated Add Detail */}
            {isViewModalOpen && selectedItem && (
                <div className="modal modal-open">
                    <div className="modal-box max-w-4xl">
                        <h3 className="font-bold text-lg mb-4">Item Information</h3>
                        
                        <div className="bg-base-200 p-4 rounded-lg mb-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-base-content/60">Item Code</p>
                                    <p className="font-semibold">{selectedItem.itemcode}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-base-content/60">Material Description</p>
                                    <p className="font-semibold">{selectedItem.material_description}</p>
                                </div>
                            </div>
                        </div>

{!showAddDetailForm && !showEditForm ? (
    <>
        <div className="flex justify-between items-center mb-4">
            <h4 className="font-semibold">Details</h4>
            <button
                className="btn btn-sm btn-primary"
                onClick={handleShowAddDetailForm}
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Add Detail
            </button>
        </div>

        {isLoadingDetails ? (
            <div className="flex justify-center items-center py-8">
                <span className="loading loading-spinner loading-lg"></span>
            </div>
        ) : (
            <div className="overflow-x-auto">
                <table className="table table-zebra w-full">
                    <thead>
                        <tr>
                            <th>Item Code</th>
                            <th>Detailed Description</th>
                            <th>Bin Location</th>
                            <th>Quantity</th>
                            <th>UOM</th>
                            <th>Minimum</th>
                            <th>Maximum</th>
                            <th>Price</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {itemDetails.length > 0 ? (
                            itemDetails.map((detail) => (
                                <tr key={detail.detail_id}>
                                    <td className="font-semibold">{selectedItem.itemcode}</td>
                                    <td>{detail.detailed_description || 'N/A'}</td>
                                    <td>{detail.bin_location || 'N/A'}</td>
                                    <td>{detail.quantity || '0'}</td>
                                    <td>{detail.uom || 'N/A'}</td>
                                    <td>{detail.minimum || '0'}</td>
                                    <td>{detail.maximum || '0'}</td>
                                    <td>${detail.price || '0.00'}</td>
                                    <td>
                                        <button
                                            className="btn btn-sm btn-ghost"
                                            onClick={() => handleShowEditForm(detail)}
                                            title="Edit Detail"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                            </svg>
                                        </button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="9" className="text-center py-8 text-base-content/60">
                                    No details found for this item
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        )}

        <div className="modal-action">
            <button
                className="btn btn-ghost"
                onClick={handleCloseViewModal}
            >
                Close
            </button>
        </div>
    </>
) : showEditForm ? (
    <>
        <h4 className="font-semibold mb-4">Edit Detail</h4>
        
        {/* Show all details in read-only table */}
        <div className="mb-6">
            <p className="text-sm text-base-content/60 mb-2">All Details for {selectedItem.itemcode}</p>
            <div className="overflow-x-auto border border-base-300 rounded-lg">
                <table className="table table-sm w-full">
                    <thead>
                        <tr>
                            <th>Detailed Description</th>
                            <th>Bin Location</th>
                            <th>Quantity</th>
                            <th>UOM</th>
                            <th>Price</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {itemDetails.map((detail) => (
                            <tr 
                                key={detail.detail_id}
                                className={detail.detail_id === editingDetailId ? 'bg-primary/10' : ''}
                            >
                                <td>{detail.detailed_description || 'N/A'}</td>
                                <td>{detail.bin_location || 'N/A'}</td>
                                <td>{detail.quantity || '0'}</td>
                                <td>{detail.uom || 'N/A'}</td>
                                <td>${detail.price || '0.00'}</td>
                                <td>
                                    {detail.detail_id === editingDetailId && (
                                        <span className="badge badge-primary badge-sm">Editing</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>

        {/* Edit form for selected detail */}
        <form onSubmit={handleSubmitEdit}>
            <div className="space-y-4">
                <div className="form-control">
                    <label className="label">
                        <span className="label-text">Item Code</span>
                    </label>
                    <input
                        type="text"
                        className="input input-bordered w-full bg-base-200"
                        value={selectedItem.itemcode}
                        disabled
                    />
                    <label className="label">
                        <span className="label-text-alt text-base-content/60">Item Code cannot be modified</span>
                    </label>
                </div>

                <div className="form-control">
                    <label className="label">
                        <span className="label-text">Material Description</span>
                    </label>
                    <textarea
                        name="material_description"
                        placeholder="Enter material description"
                        className="textarea textarea-bordered w-full"
                        value={editFormData.material_description}
                        onChange={handleEditInputChange}
                        required
                        rows="3"
                    />
                </div>

                <div className="divider">Detail Information</div>

                <div className="form-control">
                    <label className="label">
                        <span className="label-text">Detailed Description</span>
                    </label>
                    <textarea
                        name="detailed_description"
                        placeholder="Enter detailed description"
                        className="textarea textarea-bordered w-full"
                        value={editFormData.detailed_description}
                        onChange={handleEditInputChange}
                        rows="2"
                    />
                </div>

                <div className="form-control">
                    <label className="label">
                        <span className="label-text">Bin Location</span>
                    </label>
                    <input
                        type="text"
                        name="bin_location"
                        placeholder="Enter bin location"
                        className="input input-bordered w-full"
                        value={editFormData.bin_location}
                        onChange={handleEditInputChange}
                    />
                </div>

                <div className="form-control">
                    <label className="label">
                        <span className="label-text">UOM (Unit of Measure)</span>
                    </label>
                    <input
                        type="text"
                        name="uom"
                        placeholder="Unit of Measure"
                        className="input input-bordered w-full"
                        value={editFormData.uom}
                        onChange={handleEditInputChange}
                        required
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="form-control">
                        <label className="label">
                            <span className="label-text">Minimum</span>
                        </label>
                        <input
                            type="number"
                            name="minimum"
                            placeholder="0"
                            className="input input-bordered w-full"
                            value={editFormData.minimum}
                            onChange={handleEditInputChange}
                        />
                    </div>

                    <div className="form-control">
                        <label className="label">
                            <span className="label-text">Maximum</span>
                        </label>
                        <input
                            type="number"
                            name="maximum"
                            placeholder="0"
                            className="input input-bordered w-full"
                            value={editFormData.maximum}
                            onChange={handleEditInputChange}
                        />
                    </div>
                </div>

                <div className="form-control">
                    <label className="label">
                        <span className="label-text">Price</span>
                    </label>
                    <input
                        type="number"
                        step="0.01"
                        name="price"
                        placeholder="0.00"
                        className="input input-bordered w-full"
                        value={editFormData.price}
                        onChange={handleEditInputChange}
                        required
                    />
                </div>
            </div>

            <div className="modal-action">
                <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={handleCancelEdit}
                >
                    Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                    Save Changes
                </button>
            </div>
        </form>
    </>
) : (
                            <>
                                <h4 className="font-semibold mb-4">Add New Detail</h4>
                                
                                <form onSubmit={handleSubmitDetail}>
                                    <div className="space-y-4">
                                        <div className="form-control">
                                            <label className="label">
                                                <span className="label-text">Detailed Description</span>
                                            </label>
                                            <textarea
                                                name="detailed_description"
                                                placeholder="Enter detailed description"
                                                className="textarea textarea-bordered w-full"
                                                value={detailFormData.detailed_description}
                                                onChange={handleDetailInputChange}
                                                rows="2"
                                            />
                                        </div>

                                        <div className="form-control">
                                            <label className="label">
                                                <span className="label-text">Bin Location</span>
                                            </label>
                                            <input
                                                type="text"
                                                name="bin_location"
                                                placeholder="Enter bin location"
                                                className="input input-bordered w-full"
                                                value={detailFormData.bin_location}
                                                onChange={handleDetailInputChange}
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="form-control">
                                                <label className="label">
                                                    <span className="label-text">Quantity</span>
                                                </label>
                                                <input
                                                    type="number"
                                                    name="quantity"
                                                    placeholder="0"
                                                    className="input input-bordered w-full"
                                                    value={detailFormData.quantity}
                                                    onChange={handleDetailInputChange}
                                                    required
                                                />
                                            </div>

                                            <div className="form-control">
                                                <label className="label">
                                                    <span className="label-text">UOM</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    name="uom"
                                                    placeholder="Unit of Measure"
                                                    className="input input-bordered w-full"
                                                    value={detailFormData.uom}
                                                    onChange={handleDetailInputChange}
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="form-control">
                                                <label className="label">
                                                    <span className="label-text">Minimum</span>
                                                </label>
                                                <input
                                                    type="number"
                                                    name="minimum"
                                                    placeholder="0"
                                                    className="input input-bordered w-full"
                                                    value={detailFormData.minimum}
                                                    onChange={handleDetailInputChange}
                                                />
                                            </div>

                                            <div className="form-control">
                                                <label className="label">
                                                    <span className="label-text">Maximum</span>
                                                </label>
                                                <input
                                                    type="number"
                                                    name="maximum"
                                                    placeholder="0"
                                                    className="input input-bordered w-full"
                                                    value={detailFormData.maximum}
                                                    onChange={handleDetailInputChange}
                                                />
                                            </div>
                                        </div>

                                        <div className="form-control">
                                            <label className="label">
                                                <span className="label-text">Price</span>
                                            </label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                name="price"
                                                placeholder="0.00"
                                                className="input input-bordered w-full"
                                                value={detailFormData.price}
                                                onChange={handleDetailInputChange}
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="modal-action">
                                        <button
                                            type="button"
                                            className="btn btn-ghost"
                                            onClick={handleCancelAddDetail}
                                        >
                                            Cancel
                                        </button>
                                        <button type="submit" className="btn btn-primary">
                                            Add Detail
                                        </button>
                                    </div>
                                </form>
                            </>
                        )}
                    </div>
                </div>
            )}

{/* History Modal */}
{isHistoryModalOpen && selectedItem && (
    <div className="modal modal-open">
        <div className="modal-box max-w-7xl">
            <h3 className="font-bold text-lg mb-4">Item History</h3>
            
            <div className="bg-base-200 p-4 rounded-lg mb-6">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <p className="text-sm text-base-content/60">Item Code</p>
                        <p className="font-semibold">{selectedItem.itemcode}</p>
                    </div>
                    <div>
                        <p className="text-sm text-base-content/60">Material Description</p>
                        <p className="font-semibold">{selectedItem.material_description}</p>
                    </div>
                </div>
            </div>

            {isLoadingHistory ? (
                <div className="flex justify-center items-center py-8">
                    <span className="loading loading-spinner loading-lg"></span>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="table table-zebra w-full">
                        <thead>
                            <tr>
                                <th>Date & Time</th>
                                <th>Action</th>
                                <th>User</th>
                                <th>Details</th>
                                <th>Previous Value</th>
                                <th>New Value</th>
                            </tr>
                        </thead>
                        <tbody>
                            {historyData.length > 0 ? (
                                historyData.map((history) => (
                                    <tr key={history.id}>
                                        <td className="whitespace-nowrap">{history.date}</td>
                                        <td>
                                            <span className={`badge ${
                                                history.action === 'Quantity Added' ? 'badge-success' :
                                                history.action === 'Updated' ? 'badge-info' :
                                                history.action === 'Detail Added' ? 'badge-warning' :
                                                'badge-neutral'
                                            }`}>
                                                {history.action}
                                            </span>
                                        </td>
                                        <td>{history.user}</td>
                                        <td>{history.details}</td>
                                        <td className="text-error">{history.previousValue}</td>
                                        <td className="text-success font-semibold">{history.newValue}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="6" className="text-center py-8 text-base-content/60">
                                        No history records found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            <div className="modal-action">
                <button
                    className="btn btn-ghost"
                    onClick={handleCloseHistoryModal}
                >
                    Close
                </button>
            </div>
        </div>
    </div>
)}

{importFile && (
    <div className="modal modal-open">
        <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">Confirm Import</h3>
            <p className="mb-4">
                You are about to import data from: <strong>{importFile.name}</strong>
            </p>
            <p className="text-sm text-warning mb-4">
                Note: This will create new supplies items. Please ensure the Excel file follows the correct format.
            </p>
            <div className="modal-action">
                <button
                    className="btn btn-ghost"
                    onClick={() => setImportFile(null)}
                >
                    Cancel
                </button>
                <button
                    className="btn btn-primary"
                    onClick={handleImportExcel}
                    disabled={isImporting}
                >
                    {isImporting ? (
                        <>
                            <span className="loading loading-spinner loading-sm mr-2"></span>
                            Importing...
                        </>
                    ) : 'Import'}
                </button>
            </div>
        </div>
    </div>
)}
        </AuthenticatedLayout>
    );
}