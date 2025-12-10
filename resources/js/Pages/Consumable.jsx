import { Head, usePage, router } from "@inertiajs/react";
import { useState, useMemo, useRef } from "react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import axios from "axios";

export default function Consumable({ consumables, filters }) {
    const props = usePage().props;
    
    // Pagination states from server
    const currentPage = consumables.current_page || 1;
    const lastPage = consumables.last_page || 1;
    const perPage = consumables.per_page || 10;
    const total = consumables.total || 0;
    const from = consumables.from || 0;
    const to = consumables.to || 0;
    
    const [searchQuery, setSearchQuery] = useState(filters?.search || "");
    const [searchTimeout, setSearchTimeout] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isAddQuantityModalOpen, setIsAddQuantityModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [itemSearchQuery, setItemSearchQuery] = useState("");
    const [showDropdown, setShowDropdown] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [deletingItem, setDeletingItem] = useState(null);
    const [deleteConfirmation, setDeleteConfirmation] = useState("");
    const [selectedItemHistory, setSelectedItemHistory] = useState(null);
    const [historyData, setHistoryData] = useState([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const [importFile, setImportFile] = useState(null);
    const [isImporting, setIsImporting] = useState(false);
    const fileInputRef = useRef(null);
    const [allItemsForSearch, setAllItemsForSearch] = useState([]);
    const [isLoadingAllItems, setIsLoadingAllItems] = useState(false);
    

    // Handle search with debouncing
    const handleSearchChange = (e) => {
        const value = e.target.value;
        setSearchQuery(value);
        
        // Clear previous timeout
        if (searchTimeout) {
            clearTimeout(searchTimeout);
        }
        
        // Set new timeout for debouncing
        const timeout = setTimeout(() => {
            router.get(route('consumable'), {
                search: value,
                page: 1,
                per_page: perPage
            }, {
                preserveState: true,
                preserveScroll: true
            });
        }, 500);
        
        setSearchTimeout(timeout);
    };

    // Handle page change
    const handlePageChange = (page) => {
        if (page >= 1 && page <= lastPage) {
            router.get(route('consumable'), {
                page: page,
                per_page: perPage,
                search: searchQuery
            }, {
                preserveState: true,
                preserveScroll: true
            });
        }
    };

    // Handle per page change
    const handlePerPageChange = (e) => {
        const newPerPage = parseInt(e.target.value);
        router.get(route('consumable'), {
            page: 1,
            per_page: newPerPage,
            search: searchQuery
        }, {
            preserveState: true,
            preserveScroll: true
        });
    };

    // Calculate pagination range
    const getPageRange = () => {
        const delta = 2;
        const range = [];
        const rangeWithDots = [];
        let l;

        for (let i = 1; i <= consumables.last_page; i++) {
            if (i === 1 || i === consumables.last_page || (i >= consumables.current_page - delta && i <= consumables.current_page + delta)) {
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

    const handleCloseHistoryModal = () => {
        setIsHistoryModalOpen(false);
        setSelectedItemHistory(null);
        setHistoryData([]);
    };

    const handleImportClick = () => {
        setIsImportModalOpen(true);
    };

    const handleCloseImportModal = () => {
        setIsImportModalOpen(false);
        setImportFile(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            const validTypes = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 
                              'application/vnd.ms-excel', 
                              'text/csv'];
            if (!validTypes.includes(file.type)) {
                alert('Please select a valid Excel or CSV file');
                e.target.value = '';
                return;
            }
            
            if (file.size > 10 * 1024 * 1024) {
                alert('File size must be less than 10MB');
                e.target.value = '';
                return;
            }
            
            setImportFile(file);
        }
    };

    const handleImportSubmit = (e) => {
        e.preventDefault();
        
        if (!importFile) {
            alert('Please select a file to import');
            return;
        }

        setIsImporting(true);
        
        const formData = new FormData();
        formData.append('file', importFile);

        router.post(route('consumable.import.process'), formData, {
            forceFormData: true,
            onSuccess: () => {
                handleCloseImportModal();
                setIsImporting(false);
            },
            onError: (errors) => {
                console.error('Import errors:', errors);
                setIsImporting(false);
            }
        });
    };

    const handleDownloadTemplate = () => {
        window.location.href = route('consumable.template');
    };

    const [formData, setFormData] = useState({
        Itemcode: "",
        mat_description: "",
        Long_description: "",
        Bin_location: "",
        supplier: "",
        category: "",
        qty: "",
        uom: "",
        maximum: "",
        minimum: ""
    });
    
    const [editFormData, setEditFormData] = useState({
        Itemcode: "",
        mat_description: "",
        Long_description: "",
        Bin_location: "",
        supplier: "",
        category: "",
        qty: "",
        uom: "",
        maximum: "",
        minimum: ""
    });
    
    const [addQuantityData, setAddQuantityData] = useState({
        items: []
    });

    // Get all consumables for dropdown (not paginated)
    const allConsumables = consumables.data || [];

const filteredItems = useMemo(() => {
    return allItemsForSearch.filter(item =>
        item.Itemcode.toLowerCase().includes(itemSearchQuery.toLowerCase()) ||
        item.mat_description.toLowerCase().includes(itemSearchQuery.toLowerCase())
    );
}, [allItemsForSearch, itemSearchQuery]);

    const handleAddItem = () => {
        setIsModalOpen(true);
    };

const handleAddQuantity = async () => {
    setIsAddQuantityModalOpen(true);
    
    // Fetch all items for search dropdown
    setIsLoadingAllItems(true);
    try {
        const response = await axios.get(route('consumable.getAllForDropdown'));
        setAllItemsForSearch(response.data);
    } catch (error) {
        console.error('Error fetching items:', error);
        setAllItemsForSearch([]);
    } finally {
        setIsLoadingAllItems(false);
    }
};

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setFormData({
            Itemcode: "",
            mat_description: "",
            Long_description: "",
            Bin_location: "",
            supplier: "",
            category: "",
            qty: "",
            uom: "",
            maximum: "",
            minimum: ""
        });
    };

    const handleCloseEditModal = () => {
        setIsEditModalOpen(false);
        setEditingItem(null);
        setEditFormData({
            Itemcode: "",
            mat_description: "",
            Long_description: "",
            Bin_location: "",
            supplier: "",
            category: "",
            qty: "",
            uom: "",
            maximum: "",
            minimum: ""
        });
    };

    const handleCloseDeleteModal = () => {
        setIsDeleteModalOpen(false);
        setDeletingItem(null);
        setDeleteConfirmation("");
    };

    const handleCloseAddQuantityModal = () => {
        setIsAddQuantityModalOpen(false);
        setItemSearchQuery("");
        setShowDropdown(false);
        setAddQuantityData({
            items: []
        });
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
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

    const handleItemSelect = (item) => {
        setAddQuantityData({
            itemId: item.id,
            Itemcode: item.Itemcode,
            currentQuantity: parseFloat(item.qty),
            addAmount: ""
        });
        setItemSearchQuery(`${item.Itemcode} - ${item.mat_description}`);
        setShowDropdown(false);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        router.post(route('consumable.store'), formData, {
            onSuccess: () => {
                handleCloseModal();
            },
            onError: (errors) => {
                console.error('Validation errors:', errors);
            }
        });
    };

    const handleEditSubmit = (e) => {
        e.preventDefault();
        router.put(route('consumable.update', editingItem.id), editFormData, {
            onSuccess: () => {
                handleCloseEditModal();
            },
            onError: (errors) => {
                console.error('Validation errors:', errors);
            }
        });
    };

    const handleAddQuantitySubmit = (e) => {
        e.preventDefault();
        const addAmount = parseFloat(addQuantityData.addAmount);
        
        router.post(route('consumable.addQuantity'), {
            itemId: addQuantityData.itemId,
            addAmount: addAmount
        }, {
            onSuccess: () => {
                handleCloseAddQuantityModal();
            },
            onError: (errors) => {
                console.error('Error adding quantity:', errors);
            }
        });
    };

    const handleEdit = (id) => {
        const itemToEdit = allConsumables.find(item => item.id === id);
        if (itemToEdit) {
            setEditingItem(itemToEdit);
            setEditFormData({
                Itemcode: itemToEdit.Itemcode,
                mat_description: itemToEdit.mat_description,
                Long_description: itemToEdit.Long_description,
                Bin_location: itemToEdit.Bin_location,
                supplier: itemToEdit.supplier,
                category: itemToEdit.category,
                qty: itemToEdit.qty,
                uom: itemToEdit.uom,
                maximum: itemToEdit.maximum,
                minimum: itemToEdit.minimum
            });
            setIsEditModalOpen(true);
        }
    };

    const handleDelete = (id) => {
        const itemToDelete = allConsumables.find(item => item.id === id);
        if (itemToDelete) {
            setDeletingItem(itemToDelete);
            setIsDeleteModalOpen(true);
        }
    };

    const handleViewHistory = async (id) => {
        setIsLoadingHistory(true);
        setIsHistoryModalOpen(true);
        
        try {
            const item = allConsumables.find(item => item.id === id);
            setSelectedItemHistory(item);
            
            const response = await axios.get(route('consumable.history', id));
            setHistoryData(response.data);
        } catch (error) {
            console.error('Error fetching history:', error);
        } finally {
            setIsLoadingHistory(false);
        }
    };

    const handleConfirmDelete = (e) => {
        e.preventDefault();
        
        if (deleteConfirmation === "CONFIRM") {
            router.delete(route('consumable.destroy', deletingItem.id), {
                onSuccess: () => {
                    handleCloseDeleteModal();
                },
                onError: (errors) => {
                    console.error('Error deleting item:', errors);
                }
            });
        }
    };

    const selectedItem = allConsumables.find(item => item.id === addQuantityData.itemId);
    const newQuantity = addQuantityData.addAmount ? 
        addQuantityData.currentQuantity + parseFloat(addQuantityData.addAmount) : 
        addQuantityData.currentQuantity;
    const exceedsMaximum = selectedItem && newQuantity > parseFloat(selectedItem.maximum);

    return (
        <AuthenticatedLayout>
            <Head title="Consumable" />

            <div className="space-y-6">
                {/* Header with Title and Buttons */}
                <div className="flex justify-between items-center">
                    <h1 className="text-2xl font-bold">Consumable</h1>
                    <div className="flex gap-2">
                        <button onClick={handleImportClick} className="btn btn-info">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                            </svg>
                            Import Excel
                        </button>
                        <button onClick={handleAddQuantity} className="btn btn-secondary">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM14 11a1 1 0 011 1v1h1a1 1 0 110 2h-1v1a1 1 0 11-2 0v-1h-1a1 1 0 110-2h1v-1a1 1 0 011-1z" />
                            </svg>
                            Add Quantity
                        </button>
                        <button onClick={handleAddItem} className="btn btn-primary">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                            </svg>
                            Add Item
                        </button>
                    </div>
                </div>

                {/* Search Bar and Items Per Page */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex gap-2 w-full md:w-auto">
                        <input
                            type="text"
                            placeholder="Search consumables..."
                            className="input input-bordered w-full md:w-64"
                            value={searchQuery}
                            onChange={handleSearchChange}
                        />
                        {searchQuery && (
                            <button 
                                className="btn btn-ghost btn-circle"
                                onClick={() => {
                                    setSearchQuery("");
                                    router.get(route('consumable'), {
                                        page: 1,
                                        per_page: perPage,
                                        search: ""
                                    }, {
                                        preserveState: true,
                                        preserveScroll: true
                                    });
                                }}
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
                                onChange={handlePerPageChange}
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
                                <th>Item Code</th>
                                <th>Description</th>
                                <th>Long Description</th>
                                <th className="text-center">Location</th>
                                <th className="text-center">Qty</th>
                                <th className="text-center">UOM</th>
                                <th className="text-center">Max</th>
                                <th className="text-center">Min</th>
                                <th className="text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {consumables.data && consumables.data.length > 0 ? (
                                consumables.data.map((item) => (
                                    <tr key={item.id}>
                                        <td className="font-semibold">{item.Itemcode}</td>
                                        <td>{item.mat_description}</td>
                                        <td>{item.Long_description}</td>
                                        <td className="text-center">
                                            <span className="badge badge-outline">{item.Bin_location}</span>
                                        </td>
                                        <td className="text-center">
                                            <span className={`font-semibold ${parseFloat(item.qty) < parseFloat(item.minimum) ? 'text-error' : 'text-success'}`}>
                                                {parseFloat(item.qty).toFixed(2)}
                                            </span>
                                        </td>
                                        <td className="text-center">{item.uom}</td>
                                        <td className="text-center">{parseFloat(item.maximum).toFixed(2)}</td>
                                        <td className="text-center">{parseFloat(item.minimum).toFixed(2)}</td>
                                        <td className="text-center">
                                            <div className="flex gap-2 justify-center">
                                                <button
                                                    onClick={() => handleViewHistory(item.id)}
                                                    className="btn btn-sm btn-ghost"
                                                    title="View History"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                                    </svg>
                                                </button>
                                                <button
                                                    onClick={() => handleEdit(item.id)}
                                                    className="btn btn-sm btn-ghost"
                                                    title="Edit"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                                    </svg>
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(item.id)}
                                                    className="btn btn-sm btn-ghost text-error"
                                                    title="Delete"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="9" className="text-center py-8 text-base-content/60">
                                        No consumables found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                {consumables.last_page > 1 && (
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                        {/* Results Info */}
                        <div className="text-sm text-base-content/60">
                            Showing {consumables.from || 0} to {consumables.to || 0} of {consumables.total} items
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

                        {/* Page numbers - you can keep your getPageRange function */}
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
            )}
            </div>
            {/* Import Modal */}
            {isImportModalOpen && (
                <div className="modal modal-open">
                    <div className="modal-box max-w-lg">
                        <h3 className="font-bold text-lg mb-4">Import Consumables from Excel</h3>
                        
                        <div className="alert alert-info mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                            <div className="text-sm">
                                <p className="font-semibold mb-1">Excel Format Requirements:</p>
                                <ul className="list-disc list-inside text-xs space-y-1">
                                    <li>First row must contain column headers</li>
                                    <li>Required columns: Itemcode, mat_description, Long_description, Bin_location, supplier, category, qty, uom, minimum, maximum</li>
                                    <li>Duplicate item codes will be skipped</li>
                                    <li>Maximum file size: 10MB</li>
                                </ul>
                            </div>
                        </div>

                        <form onSubmit={handleImportSubmit}>
                            <div className="form-control mb-4">
                                <label className="label">
                                    <span className="label-text font-semibold">Download Template</span>
                                </label>
                                <button 
                                    type="button"
                                    onClick={handleDownloadTemplate}
                                    className="btn btn-sm btn-outline"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                    Download Excel Template
                                </button>
                            </div>

                            <div className="form-control mb-4">
                                <label className="label">
                                    <span className="label-text font-semibold">Select Excel File</span>
                                </label>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    onChange={handleFileSelect}
                                    accept=".xlsx,.xls,.csv"
                                    className="file-input file-input-bordered w-full"
                                    required
                                />
                                {importFile && (
                                    <label className="label">
                                        <span className="label-text-alt text-success">
                                            Selected: {importFile.name} ({(importFile.size / 1024).toFixed(2)} KB)
                                        </span>
                                    </label>
                                )}
                            </div>

                            <div className="modal-action">
                                <button
                                    type="button"
                                    onClick={handleCloseImportModal}
                                    className="btn btn-ghost"
                                    disabled={isImporting}
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    className="btn btn-primary"
                                    disabled={!importFile || isImporting}
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
                                            Import File
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                    <div className="modal-backdrop" onClick={handleCloseImportModal}></div>
                </div>
            )}

            {/* Add Material Modal */}
            {isModalOpen && (
                <div className="modal modal-open">
                    <div className="modal-box max-w-2xl">
                        <h3 className="font-bold text-lg mb-4">Add Material</h3>
                        <form onSubmit={handleSubmit}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                                {/* Item Code */}
                                <div className="form-control">
                                    <label className="label pb-1">
                                        <span className="label-text font-semibold">Item Code</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="Itemcode"
                                        value={formData.Itemcode}
                                        onChange={handleInputChange}
                                        className="input input-bordered w-full"
                                        required
                                    />
                                </div>

                                {/* Description */}
                                <div className="form-control">
                                    <label className="label pb-1">
                                        <span className="label-text font-semibold">Description</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="mat_description"
                                        value={formData.mat_description}
                                        onChange={handleInputChange}
                                        className="input input-bordered w-full"
                                        required
                                    />
                                </div>

                                {/* Long Description */}
                                <div className="form-control">
                                    <label className="label pb-1">
                                        <span className="label-text font-semibold">
                                            Long Description
                                        </span>
                                    </label>
                                    <input
                                        name="Long_description"
                                        value={formData.Long_description}
                                        onChange={handleInputChange}
                                        className="input input-bordered w-full"
                                        required
                                    />
                                </div>

                                {/* Bin Location */}
                                <div className="form-control">
                                    <label className="label pb-1">
                                        <span className="label-text font-semibold">Bin Location</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="Bin_location"
                                        value={formData.Bin_location}
                                        onChange={handleInputChange}
                                        className="input input-bordered w-full"
                                        required
                                    />
                                </div>

                                {/* Supplier */}
                                <div className="form-control">
                                    <label className="label pb-1">
                                        <span className="label-text font-semibold">Supplier</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="supplier"
                                        value={formData.supplier}
                                        onChange={handleInputChange}
                                        className="input input-bordered w-full"
                                        required
                                    />
                                </div>

                                {/* Category */}
                                <div className="form-control">
                                    <label className="label pb-1">
                                        <span className="label-text font-semibold">Category</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="category"
                                        value={formData.category}
                                        onChange={handleInputChange}
                                        className="input input-bordered w-full"
                                        required
                                    />
                                </div>

                                {/* Quantity */}
                                <div className="form-control">
                                    <label className="label pb-1">
                                        <span className="label-text font-semibold">Quantity</span>
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        name="qty"
                                        value={formData.qty}
                                        onChange={handleInputChange}
                                        className="input input-bordered w-full"
                                        min="0"
                                        required
                                    />
                                </div>

                                {/* UOM */}
                                <div className="form-control">
                                    <label className="label pb-1">
                                        <span className="label-text font-semibold">UOM</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="uom"
                                        value={formData.uom}
                                        onChange={handleInputChange}
                                        className="input input-bordered w-full"
                                        placeholder="e.g., pcs, kg, L"
                                        required
                                    />
                                </div>

                                {/* Maximum */}
                                <div className="form-control">
                                    <label className="label pb-1">
                                        <span className="label-text font-semibold">Maximum</span>
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        name="maximum"
                                        value={formData.maximum}
                                        onChange={handleInputChange}
                                        className="input input-bordered w-full"
                                        min="0"
                                        required
                                    />
                                </div>

                                {/* Minimum */}
                                <div className="form-control">
                                    <label className="label pb-1">
                                        <span className="label-text font-semibold">Minimum</span>
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        name="minimum"
                                        value={formData.minimum}
                                        onChange={handleInputChange}
                                        className="input input-bordered w-full"
                                        min="0"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Modal Actions */}
                            <div className="modal-action">
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    className="btn btn-ghost"
                                >
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    Save Material
                                </button>
                            </div>
                        </form>
                    </div>
                    <div className="modal-backdrop" onClick={handleCloseModal}></div>
                </div>
            )}

            {/* Edit Material Modal */}
            {isEditModalOpen && (
                <div className="modal modal-open">
                    <div className="modal-box max-w-2xl">
                        <h3 className="font-bold text-lg mb-4">Edit Material</h3>
                        <form onSubmit={handleEditSubmit}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                                {/* Item Code - Disabled */}
                                <div className="form-control">
                                    <label className="label pb-1">
                                        <span className="label-text font-semibold">Item Code</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="Itemcode"
                                        value={editFormData.Itemcode}
                                        className="input input-bordered w-full bg-base-200"
                                        disabled
                                    />
                                </div>

                                {/* Description */}
                                <div className="form-control">
                                    <label className="label pb-1">
                                        <span className="label-text font-semibold">Description</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="mat_description"
                                        value={editFormData.mat_description}
                                        onChange={handleEditInputChange}
                                        className="input input-bordered w-full"
                                        required
                                    />
                                </div>

                                {/* Long Description*/}
                                <div className="form-control">
                                    <label className="label pb-1">
                                        <span className="label-text font-semibold">
                                            Long Description
                                        </span>
                                    </label>
                                    <input
                                        name="Long_description"
                                        value={editFormData.Long_description}
                                        onChange={handleEditInputChange}
                                        className="input input-bordered w-full"
                                        required
                                    />
                                </div>

                                {/* Bin Location */}
                                <div className="form-control">
                                    <label className="label pb-1">
                                        <span className="label-text font-semibold">Bin Location</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="Bin_location"
                                        value={editFormData.Bin_location}
                                        onChange={handleEditInputChange}
                                        className="input input-bordered w-full"
                                        required
                                    />
                                </div>

                                {/* Supplier */}
                                <div className="form-control">
                                    <label className="label pb-1">
                                        <span className="label-text font-semibold">Supplier</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="supplier"
                                        value={editFormData.supplier}
                                        onChange={handleEditInputChange}
                                        className="input input-bordered w-full"
                                        required
                                    />
                                </div>

                                {/* Category */}
                                <div className="form-control">
                                    <label className="label pb-1">
                                        <span className="label-text font-semibold">Category</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="category"
                                        value={editFormData.category}
                                        onChange={handleEditInputChange}
                                        className="input input-bordered w-full"
                                        required
                                    />
                                </div>

                                {/* Quantity - Disabled */}
                                <div className="form-control">
                                    <label className="label pb-1">
                                        <span className="label-text font-semibold">Quantity</span>
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        name="qty"
                                        value={parseFloat(editFormData.qty).toFixed(2)}
                                        className="input input-bordered w-full bg-base-200"
                                        disabled
                                    />
                                    <label className="label">
                                        <span className="label-text-alt text-info">Use "Add Quantity" to modify quantity</span>
                                    </label>
                                </div>

                                {/* UOM */}
                                <div className="form-control">
                                    <label className="label pb-1">
                                        <span className="label-text font-semibold">UOM</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="uom"
                                        value={editFormData.uom}
                                        onChange={handleEditInputChange}
                                        className="input input-bordered w-full"
                                        placeholder="e.g., pcs, kg, L"
                                        required
                                    />
                                </div>

                                {/* Maximum */}
                                <div className="form-control">
                                    <label className="label pb-1">
                                        <span className="label-text font-semibold">Maximum</span>
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        name="maximum"
                                        value={editFormData.maximum}
                                        onChange={handleEditInputChange}
                                        className="input input-bordered w-full"
                                        min="0"
                                        required
                                    />
                                </div>

                                {/* Minimum */}
                                <div className="form-control">
                                    <label className="label pb-1">
                                        <span className="label-text font-semibold">Minimum</span>
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        name="minimum"
                                        value={editFormData.minimum}
                                        onChange={handleEditInputChange}
                                        className="input input-bordered w-full"
                                        min="0"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Modal Actions */}
                            <div className="modal-action">
                                <button
                                    type="button"
                                    onClick={handleCloseEditModal}
                                    className="btn btn-ghost"
                                >
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    Update Material
                                </button>
                            </div>
                        </form>
                    </div>
                    <div className="modal-backdrop" onClick={handleCloseEditModal}></div>
                </div>
            )}

{/* Batch Add Quantity Modal */}
{isAddQuantityModalOpen && (
    <div className="modal modal-open">
        <div className="modal-box max-w-4xl">
            <h3 className="font-bold text-lg mb-4">Add Quantity (Batch)</h3>
            
            {/* Search and Add Items */}
            <div className="form-control mb-4">
                <label className="label">
                    <span className="label-text font-semibold">Search Items</span>
                </label>
                <div className="relative">
                    <input
                        type="text"
                        value={itemSearchQuery}
                        onChange={(e) => {
                            setItemSearchQuery(e.target.value);
                            setShowDropdown(true);
                        }}
                        onFocus={() => setShowDropdown(true)}
                        placeholder="Search by item code or description..."
                        className="input input-bordered w-full"
                        autoComplete="off"
                    />
                    
                    {showDropdown && filteredItems.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-base-100 border border-base-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                            {filteredItems
                                .filter(item => !addQuantityData.items?.some(i => i.id === item.id))
                                .map((item) => (
                                <div
                                    key={item.id}
                                    onClick={() => {
                                        const newItems = addQuantityData.items || [];
                                        setAddQuantityData({
                                            ...addQuantityData,
                                            items: [...newItems, {
                                                id: item.id,
                                                Itemcode: item.Itemcode,
                                                mat_description: item.mat_description,
                                                currentQuantity: parseFloat(item.qty),
                                                addAmount: "",
                                                uom: item.uom,
                                                maximum: parseFloat(item.maximum),
                                                minimum: parseFloat(item.minimum)
                                            }]
                                        });
                                        setItemSearchQuery("");
                                        setShowDropdown(false);
                                    }}
                                    className="px-4 py-3 cursor-pointer hover:bg-base-200 border-b border-base-300 last:border-b-0"
                                >
                                    <div className="font-semibold text-sm">{item.Itemcode}</div>
                                    <div className="text-xs text-base-content/60">{item.mat_description}</div>
                                    <div className="flex gap-2 mt-1">
                                        <span className="badge badge-sm badge-outline">{item.category}</span>
                                        <span className="text-xs text-base-content/60">
                                            Current: {parseFloat(item.qty).toFixed(2)} {item.uom}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Selected Items Table */}
            {addQuantityData.items && addQuantityData.items.length > 0 && (
                <div className="overflow-x-auto mb-4 border border-base-300 rounded-lg">
                    <table className="table table-sm w-full">
                        <thead>
                            <tr>
                                <th>Item Code</th>
                                <th>Description</th>
                                <th>Current Qty</th>
                                <th>Add Amount</th>
                                <th>New Qty</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {addQuantityData.items.map((item, index) => {
                                const newQty = item.addAmount ? 
                                    item.currentQuantity + parseFloat(item.addAmount) : 
                                    item.currentQuantity;
                                const exceedsMax = newQty > item.maximum;
                                
                                return (
                                    <tr key={item.id}>
                                        <td className="font-semibold">{item.Itemcode}</td>
                                        <td className="text-sm">{item.mat_description}</td>
                                        <td className="text-sm">
                                            {item.currentQuantity.toFixed(2)} {item.uom}
                                        </td>
                                        <td>
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={item.addAmount}
                                                onChange={(e) => {
                                                    const newItems = [...addQuantityData.items];
                                                    newItems[index].addAmount = e.target.value;
                                                    setAddQuantityData({
                                                        ...addQuantityData,
                                                        items: newItems
                                                    });
                                                }}
                                                className="input input-bordered input-sm w-24"
                                                min="0.01"
                                                placeholder="0.00"
                                            />
                                        </td>
                                        <td>
                                            <span className={`font-semibold text-sm ${exceedsMax ? 'text-warning' : 'text-success'}`}>
                                                {newQty.toFixed(2)} {item.uom}
                                                {exceedsMax && (
                                                    <span className="ml-1 text-xs">⚠️</span>
                                                )}
                                            </span>
                                        </td>
                                        <td>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const newItems = addQuantityData.items.filter((_, i) => i !== index);
                                                    setAddQuantityData({
                                                        ...addQuantityData,
                                                        items: newItems
                                                    });
                                                }}
                                                className="btn btn-ghost btn-xs text-error"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                                </svg>
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

                    {addQuantityData.items && addQuantityData.items.length === 0 && (
                        <div className="alert alert-info">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                            <span>Search and select items above to add quantities</span>
                        </div>
                    )}

                    {/* Summary */}
                    {addQuantityData.items && addQuantityData.items.length > 0 && (
                        <div className="alert alert-success mb-4">
                            <div>
                                <div className="font-semibold">
                                    Ready to update {addQuantityData.items.filter(i => i.addAmount > 0).length} items
                                </div>
                                <div className="text-sm">
                                    {addQuantityData.items.some(i => {
                                        const newQty = i.addAmount ? i.currentQuantity + parseFloat(i.addAmount) : i.currentQuantity;
                                        return newQty > i.maximum;
                                    }) && (
                                        <span className="text-warning">⚠️ Some items will exceed maximum limits</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Modal Actions */}
                    <div className="modal-action">
                        <button
                            type="button"
                            onClick={handleCloseAddQuantityModal}
                            className="btn btn-ghost"
                        >
                            Cancel
                        </button>
                        <button 
                            type="button"
                            onClick={() => {
                                // Submit all items at once
                                const itemsToUpdate = addQuantityData.items.filter(i => i.addAmount > 0);
                                
                                if (itemsToUpdate.length === 0) {
                                    alert("Please enter quantities to add");
                                    return;
                                }

                                router.post(route('consumable.batchAddQuantity'), {
                                    items: itemsToUpdate.map(i => ({
                                        itemId: i.id,
                                        addAmount: parseFloat(i.addAmount)
                                    }))
                                }, {
                                    onSuccess: () => {
                                        handleCloseAddQuantityModal();
                                    },
                                    onError: (errors) => {
                                        console.error('Error adding quantities:', errors);
                                    }
                                });
                            }}
                            className="btn btn-primary"
                            disabled={!addQuantityData.items || addQuantityData.items.filter(i => i.addAmount > 0).length === 0}
                        >
                            Update All ({addQuantityData.items?.filter(i => i.addAmount > 0).length || 0})
                        </button>
                    </div>
                </div>
                <div className="modal-backdrop" onClick={handleCloseAddQuantityModal}></div>
            </div>
        )}

            {/* Delete Confirmation Modal */}
            {isDeleteModalOpen && deletingItem && (
                <div className="modal modal-open">
                    <div className="modal-box">
                        <h3 className="font-bold text-lg mb-4 text-error">Delete Confirmation</h3>
                        
                        <div className="alert alert-warning mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <span>Warning: This action cannot be undone!</span>
                        </div>

                        <div className="bg-base-200 p-4 rounded-lg mb-4">
                            <p className="text-sm font-semibold mb-2">You are about to delete:</p>
                            <div className="space-y-1 text-sm">
                                <div><span className="font-semibold">Item Code:</span> {deletingItem.Itemcode}</div>
                                <div><span className="font-semibold">Description:</span> {deletingItem.mat_description}</div>
                                <div><span className="font-semibold">Category:</span> {deletingItem.category}</div>
                                <div><span className="font-semibold">Current Quantity:</span> {parseFloat(deletingItem.qty).toFixed(2)} {deletingItem.uom}</div>
                            </div>
                        </div>

                        <form onSubmit={handleConfirmDelete}>
                            <div className="form-control mb-4">
                                <label className="label">
                                    <span className="label-text font-semibold">
                                        Type <span className="text-error font-bold">CONFIRM</span> to delete this item
                                    </span>
                                </label>
                                <input
                                    type="text"
                                    value={deleteConfirmation}
                                    onChange={(e) => setDeleteConfirmation(e.target.value)}
                                    className="input input-bordered w-full"
                                    placeholder="Type CONFIRM here"
                                    autoComplete="off"
                                />
                            </div>

                            {deleteConfirmation && deleteConfirmation !== "CONFIRM" && (
                                <div className="alert alert-error mb-4">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span>Please type "CONFIRM" exactly as shown</span>
                                </div>
                            )}

                            {/* Modal Actions */}
                            <div className="modal-action">
                                <button
                                    type="button"
                                    onClick={handleCloseDeleteModal}
                                    className="btn btn-ghost"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    className="btn btn-error"
                                    disabled={deleteConfirmation !== "CONFIRM"}
                                >
                                    Delete Item
                                </button>
                            </div>
                        </form>
                    </div>
                    <div className="modal-backdrop" onClick={handleCloseDeleteModal}></div>
                </div>
            )}
            {/* NEW: History Modal */}
{isHistoryModalOpen && (
    <div className="modal modal-open">
        <div className="modal-box max-w-4xl max-h-[80vh]">
            <h3 className="font-bold text-lg mb-4">
                History for {selectedItemHistory?.Itemcode} - {selectedItemHistory?.mat_description}
            </h3>
            
            {isLoadingHistory ? (
                <div className="flex justify-center py-8">
                    <span className="loading loading-spinner loading-lg"></span>
                </div>
            ) : historyData.length > 0 ? (
                <div className="overflow-y-auto max-h-[60vh]">
                    <div className="space-y-4">
                        {historyData.map((record, index) => (
                            <div key={index} className="border border-base-300 rounded-lg p-4">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <span className={`badge ${
                                            record.action === 'created' ? 'badge-success' :
                                            record.action === 'updated' ? 'badge-info' :
                                            record.action === 'quantity_added' ? 'badge-primary' :
                                            'badge-error'
                                        } badge-sm`}>
                                            {record.action.replace('_', ' ')}
                                        </span>
                                        <span className="ml-2 text-sm text-base-content/60">
                                            {new Date(record.created_at).toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="text-sm">
                                        By: <span className="font-semibold">{record.user_name}</span> (ID: {record.user_id})
                                    </div>
                                </div>
                                
                                {record.changes && (
                                    <div className="mt-2">
                                        <div className="text-sm font-semibold mb-1">Changes:</div>
                                        <ul className="text-sm space-y-1">
                                            {record.changes.map((change, idx) => (
                                                <li key={idx} className="bg-base-200 px-2 py-1 rounded">
                                                    {change}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="text-center py-8 text-base-content/60">
                    No history found for this item.
                </div>
            )}
            
            <div className="modal-action">
                <button
                    type="button"
                    onClick={handleCloseHistoryModal}
                    className="btn btn-ghost"
                >
                    Close
                </button>
            </div>
        </div>
        <div className="modal-backdrop" onClick={handleCloseHistoryModal}></div>
    </div>
)}
        </AuthenticatedLayout>
    );
}