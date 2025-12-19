import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head, usePage, router } from "@inertiajs/react";
import { useState } from "react";

export default function Consigned({ tableData, tableFilters, nextConsignedNo }) {
    const props = usePage().props;
    const [mainSearchQuery, setMainSearchQuery] = useState("");
    const [isImporting, setIsImporting] = useState(false);
    const [viewDetailsModal, setViewDetailsModal] = useState(false);
    const [selectedConsigned, setSelectedConsigned] = useState(null);
    const [editingDetails, setEditingDetails] = useState(false);
    const [editableDetails, setEditableDetails] = useState([]);
    const [addQuantityModal, setAddQuantityModal] = useState(false);
    const [quantitySearchQuery, setQuantitySearchQuery] = useState("");
    const [filteredConsignedItems, setFilteredConsignedItems] = useState([]);
    const [quantityInputs, setQuantityInputs] = useState({});
    const [isAddingQuantity, setIsAddingQuantity] = useState(false);
    const [addDetailsModal, setAddDetailsModal] = useState(false);
    const [deleteConfirmModal, setDeleteConfirmModal] = useState(false);
    const [detailToDelete, setDetailToDelete] = useState(null);
    const [deleteConfirmText, setDeleteConfirmText] = useState('');
    const [deleteConsignedModal, setDeleteConsignedModal] = useState(false);
    const [consignedToDelete, setConsignedToDelete] = useState(null);
    const [deleteConsignedConfirmText, setDeleteConsignedConfirmText] = useState('');
    const [historyModal, setHistoryModal] = useState(false);
    const [historyType, setHistoryType] = useState('');
    const [historyData, setHistoryData] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [selectedDetailForHistory, setSelectedDetailForHistory] = useState(null);

    const getActionLabel = (action) => {
        const labels = {
            'created': 'Created',
            'updated': 'Updated',
            'deleted': 'Deleted',
            'quantity_added': 'Quantity Added',
            'detail_created': 'Detail Created',
            'detail_updated': 'Detail Updated',
            'detail_deleted': 'Detail Deleted'
        };
        return labels[action] || action;
    };

    const getActionColor = (action) => {
        const colors = {
            'created': '#10B981', // green
            'updated': '#3B82F6', // blue
            'deleted': '#EF4444', // red
            'quantity_added': '#8B5CF6', // purple
            'detail_created': '#10B981', // green
            'detail_updated': '#3B82F6', // blue
            'detail_deleted': '#EF4444'  // red
        };
        return colors[action] || '#6B7280'; // default gray
    };

    const openConsignedHistory = async (consigned) => {
    setHistoryType('consigned');
    setSelectedConsigned(consigned);
    setHistoryLoading(true);
    setHistoryModal(true);
    
    try {
            const response = await fetch(route('consigned.history', consigned.id));
            const data = await response.json();
            setHistoryData(data);
        } catch (error) {
            console.error('Error fetching consigned history:', error);
            setHistoryData([]);
        } finally {
            setHistoryLoading(false);
        }
    };

    const openDetailHistory = async (detail) => {
        setHistoryType('detail');
        setSelectedDetailForHistory(detail);
        setHistoryLoading(true);
        setHistoryModal(true);
        
        try {
            const response = await fetch(route('consigned.getDetailHistory', detail.id));
            const data = await response.json();
            setHistoryData(data.history || []);
        } catch (error) {
            console.error('Error fetching detail history:', error);
            setHistoryData([]);
        } finally {
            setHistoryLoading(false);
        }
    };

    const closeHistoryModal = () => {
        setHistoryModal(false);
        setHistoryType('');
        setHistoryData([]);
        setSelectedDetailForHistory(null);
        setHistoryLoading(false);
    };

    const [editingRow, setEditingRow] = useState(null);
    const [editFormData, setEditFormData] = useState({
        mat_description: '',
        category: ''
    });

    const openDeleteConsignedModal = (consigned) => {
        setConsignedToDelete(consigned);
        setDeleteConsignedConfirmText('');
        setDeleteConsignedModal(true);
    };

    const closeDeleteConsignedModal = () => {
        setDeleteConsignedModal(false);
        setConsignedToDelete(null);
        setDeleteConsignedConfirmText('');
    };

    const handleConfirmDeleteConsigned = () => {
        if (deleteConsignedConfirmText.toLowerCase() !== 'confirm') {
            alert('Please type "confirm" to delete this item');
            return;
        }

        setIsSaving(true);

        router.delete(route('consigned.destroy', consignedToDelete.id), {
            onSuccess: () => {
                closeDeleteConsignedModal();
                setIsSaving(false);
                alert('Consigned item and all related details deleted successfully!');
            },
            onError: (errors) => {
                console.error('Error deleting consigned item:', errors);
                setIsSaving(false);
                alert('Failed to delete item. Please try again.');
            }
        });
    };

    const openDeleteConfirmModal = (detail) => {
        setDetailToDelete(detail);
        setDeleteConfirmText('');
        setDeleteConfirmModal(true);
    };

    const closeDeleteConfirmModal = () => {
        setDeleteConfirmModal(false);
        setDetailToDelete(null);
        setDeleteConfirmText('');
    };

    const handleConfirmDelete = () => {
        if (deleteConfirmText.toLowerCase() !== 'confirm') {
            alert('Please type "confirm" to delete this item');
            return;
        }

        setIsSaving(true);

        router.delete(route('consigned.deleteDetail', detailToDelete.id), {
            onSuccess: () => {
                // Remove from editableDetails state
                setEditableDetails(editableDetails.filter(d => d.id !== detailToDelete.id));
                
                // Update selectedConsigned state
                setSelectedConsigned({
                    ...selectedConsigned,
                    details: selectedConsigned.details.filter(d => d.id !== detailToDelete.id)
                });
                
                closeDeleteConfirmModal();
                setIsSaving(false);
                alert('Detail deleted successfully!');
            },
            onError: (errors) => {
                console.error('Error deleting detail:', errors);
                setIsSaving(false);
                alert('Failed to delete detail. Please try again.');
            }
        });
    };

    const openAddQuantityModal = () => {
        setAddQuantityModal(true);
        setQuantitySearchQuery("");
        setFilteredConsignedItems([]);
        setQuantityInputs({});
    };

    const closeAddQuantityModal = () => {
        setAddQuantityModal(false);
        setQuantitySearchQuery("");
        setFilteredConsignedItems([]);
        setQuantityInputs({});
    };

    const handleQuantitySearch = (e) => {
        const query = e.target.value;
        setQuantitySearchQuery(query);
        
        if (query.trim().length >= 2) {
            // Create an array to store all matching detail rows
            const matchingDetails = [];
            
            consignedItems.forEach(item => {
                // Check if the main description matches
                const descMatches = item.mat_description?.toLowerCase().includes(query.toLowerCase());
                
                // If item has details, check each detail
                if (item.details && item.details.length > 0) {
                    item.details.forEach(detail => {
                        const detailMatches = 
                            detail.item_code?.toLowerCase().includes(query.toLowerCase()) ||
                            detail.supplier?.toLowerCase().includes(query.toLowerCase()) ||
                            descMatches;
                        
                        if (detailMatches) {
                            matchingDetails.push({
                                id: item.id,
                                detailId: detail.id,
                                consigned_no: item.consigned_no,
                                mat_description: item.mat_description,
                                category: item.category,
                                item_code: detail.item_code,
                                supplier: detail.supplier,
                                expiration: detail.expiration,
                                uom: detail.uom,
                                qty: detail.qty,
                                bin_location: detail.bin_location
                            });
                        }
                    });
                }
            });
            
            setFilteredConsignedItems(matchingDetails);
        } else {
            setFilteredConsignedItems([]);
        }
    };

    const handleQuantityInputChange = (detailId, value) => {
        setQuantityInputs(prev => ({
            ...prev,
            [detailId]: value
        }));
    };

    const handleSaveQuantities = () => {
        const itemsToUpdate = Object.entries(quantityInputs)
            .filter(([detailId, qty]) => qty && parseFloat(qty) > 0)
            .map(([detailId, qty]) => ({
                detail_id: parseInt(detailId),
                quantity_to_add: parseFloat(qty)
            }));

        if (itemsToUpdate.length === 0) {
            alert('Please enter at least one quantity to add');
            return;
        }

        setIsAddingQuantity(true);

        router.post(route('consigned.addQuantity'), {
            items: itemsToUpdate
        }, {
            onSuccess: () => {
                closeAddQuantityModal();
                setIsAddingQuantity(false);
                alert('Quantities updated successfully!');
            },
            onError: (errors) => {
                console.error('Error adding quantities:', errors);
                setIsAddingQuantity(false);
                alert('Failed to update quantities. Please try again.');
            }
        });
    };

    const [newDetailData, setNewDetailData] = useState({
        item_code: '',
        supplier: '',
        expiration: '',
        uom: '',
        qty: '',
        qty_per_box: '',
        minimum: '',
        maximum: '',
        price: '',
        bin_location: ''
    });

    // Multi-step Modal State
    const [modalStep, setModalStep] = useState(0);
    const [newItem, setNewItem] = useState({
        description: '',
        category: ''
    });
    const [consignedDetails, setConsignedDetails] = useState({
        item_code: '',
        supplier: '',
        expiration: '',
        uom: '',
        qty: '',
        qty_per_box: '',
        minimum: '',
        maximum: '',
        price: '',
        bin_location: ''
    });

    const [addedItems, setAddedItems] = useState([]);
    const [isSaving, setIsSaving] = useState(false);
    const [tempConsignedNo, setTempConsignedNo] = useState('');
    
    const consignedItems = tableData?.data || [];
    const pagination = tableData?.pagination || {
        from: 0,
        to: 0,
        total: 0,
        current_page: 1,
        last_page: 1,
        per_page: 10
    };

    const handleImport = () => {
        document.getElementById('excel-file-input').click();
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setIsImporting(true);
            setTimeout(() => setIsImporting(false), 2000);
        }
    };

    const handleClearSearch = () => {
        setMainSearchQuery("");
        router.get(route('consigned'), {
            search: "",
            page: 1
        }, {
            preserveState: true,
            preserveScroll: true
        });
    };

    const handleSearch = (e) => {
        const query = e.target.value;
        setMainSearchQuery(query);
        
        if (query.length >= 3 || query.length === 0) {
            router.get(route('consigned'), {
                search: query,
                page: 1
            }, {
                preserveState: true,
                preserveScroll: true
            });
        }
    };

    const handlePerPageChange = (e) => {
        router.get(route('consigned'), {
            per_page: e.target.value,
            search: mainSearchQuery,
            page: 1
        }, {
            preserveState: true,
            preserveScroll: true
        });
    };

    const [rowSelections, setRowSelections] = useState(
        consignedItems.reduce((acc, item) => {
            acc[item.id] = item.selected_itemcode ?? "";
            return acc;
        }, {})
    );

    const openAddItemModal = () => {
        setNewItem({ description: '', category: '' });
        setConsignedDetails({
            item_code: '',
            supplier: '',
            expiration: '',
            uom: '',
            qty: '',
            qty_per_box: '',
            minimum: '',
            maximum: '',
            price: '',
            bin_location: ''
        });
        setAddedItems([]);
        setTempConsignedNo(nextConsignedNo);
        setModalStep(1);
    };

    const closeModal = () => {
        setModalStep(0);
        setNewItem({ description: '', category: '' });
        setConsignedDetails({
            item_code: '',
            supplier: '',
            expiration: '',
            uom: '',
            qty: '',
            qty_per_box: '',
            minimum: '',
            maximum: '',
            price: '',
            bin_location: ''
        });
        setAddedItems([]);
    };

    const handleNextToDetails = () => {
        if (!newItem.description.trim()) {
            alert('Please enter a description');
            return;
        }
        setModalStep(2);
    };

    const handleBackToItemInfo = () => {
        setModalStep(1);
    };

    const handleAddItemToTable = () => {
        if (!consignedDetails.item_code.trim() || !consignedDetails.supplier.trim() || !consignedDetails.qty) {
            alert('Please fill in Item Code, Supplier, and Quantity');
            return;
        }

        const newItemData = {
            id: Date.now(),
            ...consignedDetails
        };

        setAddedItems([...addedItems, newItemData]);
        
        setConsignedDetails({
            item_code: '',
            supplier: '',
            expiration: '',
            uom: '',
            qty: '',
            qty_per_box: '',
            minimum: '',
            maximum: '',
            price: '',
            bin_location: ''
        });
    };

    const handleRemoveItem = (id) => {
        setAddedItems(addedItems.filter(item => item.id !== id));
    };

    const handleSaveConsignedItem = () => {
        if (addedItems.length === 0) {
            alert('Please add at least one item to the table');
            return;
        }

        setIsSaving(true);

        router.post(route('consigned.store'), {
            mat_description: newItem.description,
            category: newItem.category,
            items: addedItems
        }, {
            onSuccess: () => {
                closeModal();
                setIsSaving(false);
            },
            onError: (errors) => {
                console.error('Error creating item:', errors);
                setIsSaving(false);
            }
        });
    };

    const openAddDetailsModal = () => {
        setNewDetailData({
            item_code: '',
            supplier: '',
            expiration: '',
            uom: '',
            qty: '',
            qty_per_box: '',
            minimum: '',
            maximum: '',
            price: '',
            bin_location: ''
        });
        setAddDetailsModal(true);
    };

    const closeAddDetailsModal = () => {
        setAddDetailsModal(false);
        setNewDetailData({
            item_code: '',
            supplier: '',
            expiration: '',
            uom: '',
            qty: '',
            qty_per_box: '',
            minimum: '',
            maximum: '',
            price: '',
            bin_location: ''
        });
    };

    const handleSaveNewDetail = () => {
        if (!newDetailData.item_code.trim() || !newDetailData.supplier.trim() || !newDetailData.qty || !newDetailData.uom.trim()) {
            alert('Please fill in all required fields (Item Code, Supplier, UOM, and Quantity)');
            return;
        }

        setIsSaving(true);

        router.put(route('consigned.updateDetails', selectedConsigned.id), {
            details: [
                ...editableDetails.filter(d => !d.isNew).map(detail => ({
                    id: detail.id,
                    item_code: detail.item_code,
                    supplier: detail.supplier,
                    expiration: detail.expiration || null,
                    uom: detail.uom || '',
                    bin_location: detail.bin_location || null,
                    qty: detail.qty,
                    qty_per_box: detail.qty_per_box || null,
                    minimum: detail.minimum || null,
                    maximum: detail.maximum || null,
                    price: detail.price || null
                })),
                {
                    item_code: newDetailData.item_code,
                    supplier: newDetailData.supplier,
                    expiration: newDetailData.expiration || null,
                    uom: newDetailData.uom || '',
                    bin_location: newDetailData.bin_location || null,
                    qty: newDetailData.qty,
                    qty_per_box: newDetailData.qty_per_box || null,
                    minimum: newDetailData.minimum || null,
                    maximum: newDetailData.maximum || null,
                    price: newDetailData.price || null
                }
            ]
        }, {
            onSuccess: () => {
                // Create the new detail object with temporary ID
                const newDetail = {
                    id: Date.now(), // Temporary ID
                    item_code: newDetailData.item_code,
                    supplier: newDetailData.supplier,
                    expiration: newDetailData.expiration || null,
                    uom: newDetailData.uom || '',
                    bin_location: newDetailData.bin_location || null,
                    qty: newDetailData.qty,
                    qty_per_box: newDetailData.qty_per_box || null,
                    minimum: newDetailData.minimum || null,
                    maximum: newDetailData.maximum || null,
                    price: newDetailData.price || null,
                    isNew: false
                };
                
                // Update editableDetails state
                setEditableDetails([...editableDetails, newDetail]);
                
                // Update selectedConsigned state
                setSelectedConsigned({
                    ...selectedConsigned,
                    details: [...(selectedConsigned.details || []), newDetail]
                });
                
                closeAddDetailsModal();
                setIsSaving(false);
                alert('Detail added successfully!');
            },
            onError: (errors) => {
                console.error('Error adding detail:', errors);
                setIsSaving(false);
                alert('Failed to add detail. Please try again.');
            }
        });
    };

    // Add these handler functions
    const handleDetailChange = (index, field, value) => {
        const updatedDetails = [...editableDetails];
        updatedDetails[index][field] = value;
        setEditableDetails(updatedDetails);
    };

    const handleRemoveDetail = (index) => {
        const detail = editableDetails[index];
        // Only allow deletion of new rows (not existing records)
        if (detail.isNew) {
            const updatedDetails = [...editableDetails];
            updatedDetails.splice(index, 1);
            setEditableDetails(updatedDetails);
        }
    };

const handleSaveEditableDetails = () => {
    // Validate required fields
    const invalidRows = editableDetails.filter(detail => 
        !detail.item_code.trim() || 
        !detail.supplier.trim() || 
        !detail.qty ||
        !detail.uom.trim()  // Add UOM validation
    );

    if (invalidRows.length > 0) {
        alert('Please fill in all required fields (Item Code, Supplier, UOM, and Quantity) for all rows.');
        return;
    }

    setIsSaving(true);

    router.put(route('consigned.updateDetails', selectedConsigned.id), {
        details: editableDetails.map(detail => ({
            id: detail.isNew ? undefined : detail.id,
            item_code: detail.item_code,
            supplier: detail.supplier,
            expiration: detail.expiration || null,
            uom: detail.uom || '',  // Add UOM field
            bin_location: detail.bin_location || null,
            qty: detail.qty,
            qty_per_box: detail.qty_per_box || null,
            minimum: detail.minimum || null,
            maximum: detail.maximum || null,
            price: detail.price || null
        }))
    }, {
        onSuccess: () => {
            // Update the selected consigned data with new details
            const updatedConsigned = {
                ...selectedConsigned,
                details: editableDetails.filter(d => !d.isNew).map(detail => ({
                    id: detail.id,
                    item_code: detail.item_code,
                    supplier: detail.supplier,
                    expiration: detail.expiration,
                    uom: detail.uom,  // Add UOM
                    bin_location: detail.bin_location,
                    qty: detail.qty,
                    qty_per_box: detail.qty_per_box,
                    minimum: detail.minimum,
                    maximum: detail.maximum,
                    price: detail.price
                }))
            };
            
            setSelectedConsigned(updatedConsigned);
            setEditingDetails(false);
            setIsSaving(false);
            alert('Details updated successfully!');
        },
        onError: (errors) => {
            console.error('Error updating details:', errors);
            setIsSaving(false);
            alert('Failed to update details. Please try again.');
        }
    });
};

const handleEditClick = (consigned) => {
    setEditingRow(consigned.id);
    setEditFormData({
        mat_description: consigned.mat_description,
        category: consigned.category || ''
    });
};

const handleCancelEdit = () => {
    setEditingRow(null);
    setEditFormData({
        mat_description: '',
        category: ''
    });
};

const handleSaveEdit = (consignedId) => {
    if (!editFormData.mat_description.trim()) {
        alert('Description is required');
        return;
    }

    setIsSaving(true);

    router.put(route('consigned.update', consignedId), {
        mat_description: editFormData.mat_description,
        category: editFormData.category
    }, {
        onSuccess: () => {
            setEditingRow(null);
            setEditFormData({
                mat_description: '',
                category: ''
            });
            setIsSaving(false);
            alert('Item updated successfully!');
        },
        onError: (errors) => {
            console.error('Error updating item:', errors);
            setIsSaving(false);
            alert('Failed to update item. Please try again.');
        }
    });
};


    return (
        <AuthenticatedLayout>
            <Head title="Consigned" />

            <div className="space-y-6">
                {/* Header with Title and Buttons */}
                <div className="flex justify-between items-center">
                    <h1 className="text-2xl font-bold">Consigned</h1>
                    
                    <div className="flex gap-2">
                        <button 
                            className="btn btn-info"
                            disabled={isImporting}
                            onClick={handleImport}
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
                            onChange={handleFileChange}
                        />

                        <button 
                            className="btn btn-secondary"
                            onClick={openAddQuantityModal}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                            </svg>
                            Add Quantity
                        </button>

                        <button 
                            className="btn btn-primary"
                            onClick={openAddItemModal}
                        >
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
                            placeholder="Search consigned items..." 
                            className="input input-bordered w-full md:w-64"
                            value={mainSearchQuery}
                            onChange={handleSearch}
                        />
                        {mainSearchQuery && (
                            <button 
                                className="btn btn-ghost btn-circle"
                                title="Clear search"
                                onClick={handleClearSearch}
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
                                value={pagination.per_page}
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
                            Showing {pagination.from} to {pagination.to} of {pagination.total} entries
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
                                <th>Supplier</th>
                                <th>Category</th>
                                <th className="text-center">Action</th>
                            </tr>
                        </thead>
                            <tbody>
                                {consignedItems.length > 0 ? (
                                    consignedItems.map((consigned) => {
                                        const itemToSupplier = consigned.details?.reduce((acc, detail) => {
                                            acc[detail.item_code] = detail.supplier;
                                            return acc;
                                        }, {}) || {};

                                        const selectedItemCode = rowSelections[consigned.id];
                                        const isEditing = editingRow === consigned.id;

                                        return (
                                            <tr key={consigned.id}>
                                                <td>
                                                    <select
                                                        className="select select-bordered select-sm w-full px-2 h-9"
                                                        value={selectedItemCode}
                                                        onChange={(e) => {
                                                            const newItemCode = e.target.value;
                                                            const newSupplier = itemToSupplier[newItemCode] ?? "";

                                                            setRowSelections((prev) => ({
                                                                ...prev,
                                                                [consigned.id]: newItemCode,
                                                            }));

                                                            router.put(route('consigned.updateItem', consigned.id), {
                                                                selected_itemcode: newItemCode,
                                                                selected_supplier: newSupplier,
                                                            });
                                                        }}
                                                        disabled={isEditing}
                                                    >
                                                        <option value="">Select Item Code</option>
                                                        {consigned.item_codes?.map(code => (
                                                            <option key={code} value={code}>
                                                                {code}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </td>
                                                <td>
                                                    {isEditing ? (
                                                        <input
                                                            type="text"
                                                            className="input input-bordered input-sm w-full"
                                                            value={editFormData.mat_description}
                                                            onChange={(e) => setEditFormData({
                                                                ...editFormData,
                                                                mat_description: e.target.value
                                                            })}
                                                            placeholder="Description"
                                                        />
                                                    ) : (
                                                        consigned.mat_description
                                                    )}
                                                </td>
                                                <td>
                                                    {rowSelections[consigned.id]
                                                        ? itemToSupplier[rowSelections[consigned.id]] ?? "-"
                                                        : "-"}
                                                </td>
                                                <td>
                                                    {isEditing ? (
                                                        <input
                                                            type="text"
                                                            className="input input-bordered input-sm w-full"
                                                            value={editFormData.category}
                                                            onChange={(e) => setEditFormData({
                                                                ...editFormData,
                                                                category: e.target.value
                                                            })}
                                                            placeholder="Category"
                                                        />
                                                    ) : (
                                                        consigned.category ?? '-'
                                                    )}
                                                </td>
                                                <td className="text-center">
                                                    <div className="flex gap-2 justify-center">
                                                        {isEditing ? (
                                                            <>
                                                                <button 
                                                                    className="btn btn-sm btn-success" 
                                                                    title="Save"
                                                                    onClick={() => handleSaveEdit(consigned.id)}
                                                                    disabled={isSaving}
                                                                >
                                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                                    </svg>
                                                                </button>
                                                                <button 
                                                                    className="btn btn-sm btn-ghost" 
                                                                    title="Cancel"
                                                                    onClick={handleCancelEdit}
                                                                    disabled={isSaving}
                                                                >
                                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                                                    </svg>
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <button 
                                                                    className="btn btn-sm btn-ghost" 
                                                                    title="View Details"
                                                                    onClick={() => {
                                                                        setSelectedConsigned(consigned);
                                                                        setViewDetailsModal(true);
                                                                        setEditingDetails(false);
                                                                        if (consigned.details) {
                                                                            setEditableDetails([...consigned.details.map(detail => ({
                                                                                ...detail,
                                                                                isNew: false
                                                                            }))]);
                                                                        } else {
                                                                            setEditableDetails([]);
                                                                        }
                                                                    }}
                                                                >
                                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                                        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                                                        <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                                                                    </svg>
                                                                </button>
                                                                <button className="btn btn-sm btn-ghost" title="View History" onClick={() => openConsignedHistory(consigned)}>
                                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                                                    </svg>
                                                                </button>
                                                                <button 
                                                                    className="btn btn-sm btn-ghost" 
                                                                    title="Edit"
                                                                    onClick={() => handleEditClick(consigned)}
                                                                >
                                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                                                    </svg>
                                                                </button>
                                                                <button 
                                                                    className="btn btn-sm btn-ghost text-error" 
                                                                    title="Delete"
                                                                    onClick={() => openDeleteConsignedModal(consigned)}
                                                                >
                                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                                                    </svg>
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan="5" className="text-center py-8 text-gray-500">
                                            No consigned items found
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {pagination.last_page > 1 && (
                    <div className="flex justify-center">
                        <div className="join">
                            <button 
                                className="join-item btn btn-sm"
                                disabled={pagination.current_page === 1}
                                onClick={() => router.get(route('consigned'), {
                                    page: pagination.current_page - 1,
                                    per_page: pagination.per_page,
                                    search: mainSearchQuery
                                }, { preserveState: true, preserveScroll: true })}
                            >
                                «
                            </button>
                            
                            {[...Array(pagination.last_page)].map((_, i) => {
                                const page = i + 1;
                                if (
                                    page === 1 || 
                                    page === pagination.last_page || 
                                    (page >= pagination.current_page - 1 && page <= pagination.current_page + 1)
                                ) {
                                    return (
                                        <button
                                            key={page}
                                            className={`join-item btn btn-sm ${page === pagination.current_page ? 'btn-active' : ''}`}
                                            onClick={() => router.get(route('consigned'), {
                                                page: page,
                                                per_page: pagination.per_page,
                                                search: mainSearchQuery
                                            }, { preserveState: true, preserveScroll: true })}
                                        >
                                            {page}
                                        </button>
                                    );
                                } else if (
                                    page === pagination.current_page - 2 || 
                                    page === pagination.current_page + 2
                                ) {
                                    return <span key={page} className="join-item btn btn-sm btn-disabled">...</span>;
                                }
                                return null;
                            })}
                            
                            <button 
                                className="join-item btn btn-sm"
                                disabled={pagination.current_page === pagination.last_page}
                                onClick={() => router.get(route('consigned'), {
                                    page: pagination.current_page + 1,
                                    per_page: pagination.per_page,
                                    search: mainSearchQuery
                                }, { preserveState: true, preserveScroll: true })}
                            >
                                »
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Step 1: Add Item Modal */}
            {modalStep === 1 && (
                <div className="modal modal-open">
                    <div className="modal-box">
                        <h3 className="font-bold text-lg mb-4">Add New Item</h3>
                        
                        <div className="space-y-4">
                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text">Description <span className="text-error">*</span></span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="Enter item description"
                                    className="input input-bordered w-full"
                                    value={newItem.description}
                                    onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                                />
                            </div>

                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text">Category</span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="Enter category (optional)"
                                    className="input input-bordered w-full"
                                    value={newItem.category}
                                    onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="modal-action">
                            <button 
                                className="btn btn-ghost" 
                                onClick={closeModal}
                            >
                                Cancel
                            </button>
                            <button 
                                className="btn btn-primary"
                                onClick={handleNextToDetails}
                                disabled={!newItem.description.trim()}
                            >
                                Next
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                            </button>
                        </div>
                    </div>
                    <div className="modal-backdrop" onClick={closeModal}></div>
                </div>
            )}

            {/* Step 2: Add Consigned Details Modal */}
            {modalStep === 2 && (
                <div className="modal modal-open">
                    <div className="modal-box max-w-6xl max-h-[95vh] w-[95vw] flex flex-col p-0">
                        <div className="px-6 pt-6 pb-4 border-b bg-base-100 sticky top-0 z-10">
                            <h3 className="font-bold text-xl">Add Consigned Details</h3>
                        </div>

                        <div className="flex-1 overflow-y-auto px-6 py-4">
                            <div className="card bg-gradient-to-r from-primary/10 to-secondary/10 border border-base-300 mb-6">
                                <div className="card-body p-4">
                                    <div className="flex items-center gap-2 mb-3">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" viewBox="0 0 20 20" fill="currentColor">
                                            <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                                            <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                                        </svg>
                                        <h4 className="font-semibold text-base">Item Information</h4>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div className="space-y-1">
                                            <p className="text-xs font-medium text-base-content/60 uppercase">Consigned No</p>
                                            <p className="font-semibold text-sm text-primary">{nextConsignedNo}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-xs font-medium text-base-content/60 uppercase">Description</p>
                                            <p className="font-semibold text-sm">{newItem.description}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-xs font-medium text-base-content/60 uppercase">Category</p>
                                            <p className="font-semibold text-sm">{newItem.category || '-'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                        <div className="form-control">
                                            <label className="label py-1">
                                                <span className="label-text font-medium text-sm">
                                                    Item Code <span className="text-error">*</span>
                                                </span>
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="Enter item code"
                                                className="input input-bordered w-full"
                                                value={consignedDetails.item_code}
                                                onChange={(e) => setConsignedDetails({ ...consignedDetails, item_code: e.target.value })}
                                            />
                                        </div>

                                        <div className="form-control">
                                            <label className="label py-1">
                                                <span className="label-text font-medium text-sm">
                                                    Supplier <span className="text-error">*</span>
                                                </span>
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="Enter supplier name"
                                                className="input input-bordered w-full"
                                                value={consignedDetails.supplier}
                                                onChange={(e) => setConsignedDetails({ ...consignedDetails, supplier: e.target.value })}
                                            />
                                        </div>

                                        <div className="form-control">
                                            <label className="label py-1">
                                                <span className="label-text font-medium text-sm">Expiration Date</span>
                                            </label>
                                            <input
                                                type="date"
                                                className="input input-bordered w-full"
                                                value={consignedDetails.expiration}
                                                onChange={(e) => setConsignedDetails({ ...consignedDetails, expiration: e.target.value })}
                                            />
                                        </div>

                                        <div className="form-control">
                                            <label className="label py-1">
                                                <span className="label-text font-medium text-sm">Unit of Measure</span>
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="e.g., PCS, BOX, KG"
                                                className="input input-bordered w-full"
                                                value={consignedDetails.uom}
                                                onChange={(e) => setConsignedDetails({ ...consignedDetails, uom: e.target.value })}
                                            />
                                        </div>

                                        <div className="form-control">
                                            <label className="label py-1">
                                                <span className="label-text font-medium text-sm">Bin Location</span>
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="e.g., A-01-05"
                                                className="input input-bordered w-full"
                                                value={consignedDetails.bin_location}
                                                onChange={(e) => setConsignedDetails({ ...consignedDetails, bin_location: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                        <div className="form-control">
                                            <label className="label py-1">
                                                <span className="label-text font-medium text-sm">
                                                    Quantity <span className="text-error">*</span>
                                                </span>
                                            </label>
                                            <input
                                                type="number"
                                                placeholder="0"
                                                className="input input-bordered w-full"
                                                value={consignedDetails.qty}
                                                onChange={(e) => setConsignedDetails({ ...consignedDetails, qty: e.target.value })}
                                            />
                                        </div>

                                        <div className="form-control">
                                            <label className="label py-1">
                                                <span className="label-text font-medium text-sm">Qty Per Box</span>
                                            </label>
                                            <input
                                                type="number"
                                                placeholder="0"
                                                className="input input-bordered w-full"
                                                value={consignedDetails.qty_per_box}
                                                onChange={(e) => setConsignedDetails({ ...consignedDetails, qty_per_box: e.target.value })}
                                />
                            </div>

                            {/* Minimum */}
                            <div className="form-control">
                                <label className="label py-1">
                                    <span className="label-text font-medium text-sm">Minimum Stock</span>
                                </label>
                                <input
                                    type="number"
                                    placeholder="0"
                                    className="input input-bordered w-full"
                                    value={consignedDetails.minimum}
                                    onChange={(e) => setConsignedDetails({ ...consignedDetails, minimum: e.target.value })}
                                />
                            </div>

                            {/* Maximum */}
                            <div className="form-control">
                                <label className="label py-1">
                                    <span className="label-text font-medium text-sm">Maximum Stock</span>
                                </label>
                                <input
                                    type="number"
                                    placeholder="0"
                                    className="input input-bordered w-full"
                                    value={consignedDetails.maximum}
                                    onChange={(e) => setConsignedDetails({ ...consignedDetails, maximum: e.target.value })}
                                />
                            </div>

                            {/* Price */}
                            <div className="form-control">
                                <label className="label py-1">
                                    <span className="label-text font-medium text-sm">Price</span>
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    placeholder="0.00"
                                    className="input input-bordered w-full"
                                    value={consignedDetails.price}
                                    onChange={(e) => setConsignedDetails({ ...consignedDetails, price: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="divider my-6">
                        <div className="flex items-center gap-2">
                            <span>Added Items</span>
                            <span className="badge badge-primary">{addedItems.length}</span>
                        </div>
                    </div>

                    {/* Add to Table Button */}
                    <div className="flex justify-end mb-4">
                        <button 
                            className="btn btn-secondary btn-sm gap-2"
                            onClick={handleAddItemToTable}
                            disabled={!consignedDetails.item_code.trim() || !consignedDetails.supplier.trim() || !consignedDetails.qty}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                            </svg>
                            Add to Table
                        </button>
                    </div>

                    {/* Data Table */}
                    <div className="overflow-x-auto border rounded-lg">
                        <table className="table table-sm w-full">
                            <thead>
                                <tr className="bg-base-200">
                                    <th className="text-xs font-semibold">Consigned No</th>
                                    <th className="text-xs font-semibold">Item Code</th>
                                    <th className="text-xs font-semibold">Supplier</th>
                                    <th className="text-xs font-semibold">Expiration</th>
                                    <th className="text-xs font-semibold">UOM</th>
                                    <th className="text-xs font-semibold">Bin Location</th>
                                    <th className="text-xs font-semibold text-right">Qty</th>
                                    <th className="text-xs font-semibold text-right">Qty/Box</th>
                                    <th className="text-xs font-semibold text-right">Min</th>
                                    <th className="text-xs font-semibold text-right">Max</th>
                                    <th className="text-xs font-semibold text-right">Price</th>
                                    <th className="text-xs font-semibold text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {addedItems.length > 0 ? (
                                    addedItems.map((item, index) => (
                                        <tr key={item.id} className="hover">
                                            <td className="text-sm">{tempConsignedNo}</td>
                                            <td className="text-sm font-medium">{item.item_code}</td>
                                            <td className="text-sm">{item.supplier}</td>
                                            <td className="text-sm">{item.expiration || '-'}</td>
                                            <td className="text-sm">{item.uom || '-'}</td>
                                            <td className="text-sm">{item.bin_location || '-'}</td>
                                            <td className="text-sm text-right">{item.qty}</td>
                                            <td className="text-sm text-right">{item.qty_per_box || '-'}</td>
                                            <td className="text-sm text-right">{item.minimum || '-'}</td>
                                            <td className="text-sm text-right">{item.maximum || '-'}</td>
                                            <td className="text-sm text-right">{item.price || '-'}</td>
                                            <td className="text-center">
                                                <button 
                                                    className="btn btn-ghost btn-xs text-error"
                                                    onClick={() => handleRemoveItem(item.id)}
                                                    title="Remove item"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                                    </svg>
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="12" className="text-center py-8 text-gray-500 text-sm">
                                            No items added yet. Fill in the fields above and click "Add to Table"
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Modal Footer - Fixed */}
            <div className="px-6 py-4 border-t bg-base-100 sticky bottom-0 z-10">
                <div className="flex justify-between items-center">
                    <button 
                        className="btn btn-ghost gap-2" 
                        onClick={handleBackToItemInfo}
                        disabled={isSaving}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                        </svg>
                        Back
                    </button>
                    <div className="flex gap-3">
                        <button 
                            className="btn btn-ghost"
                            onClick={closeModal}
                            disabled={isSaving}
                        >
                            Cancel
                        </button>
                        <button 
                            className="btn btn-primary gap-2"
                            onClick={handleSaveConsignedItem}
                            disabled={isSaving || addedItems.length === 0}
                        >
                            {isSaving ? (
                                <>
                                    <span className="loading loading-spinner loading-sm"></span>
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                    Save {addedItems.length} Item{addedItems.length !== 1 ? 's' : ''}
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
        <div className="modal-backdrop bg-black/50" onClick={closeModal}></div>
    </div>
)}


{/* View Details Modal */}
{viewDetailsModal && selectedConsigned && (
    <div className="modal modal-open">
        <div className="modal-box max-w-6xl max-h-[95vh] w-[95vw] flex flex-col p-0">
            <div className="px-6 pt-6 pb-4 border-b bg-base-100 sticky top-0 z-10">
                <h3 className="font-bold text-xl">View Item Details</h3>
                <button 
                    className="btn btn-sm btn-circle btn-ghost absolute right-4 top-4"
                    onClick={() => setViewDetailsModal(false)}
                >
                    ✕
                </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
                {/* Card with Consigned No, Description, and Category */}
                <div className="card bg-gradient-to-r from-primary/10 to-secondary/10 border border-base-300 mb-6">
                    <div className="card-body p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                                <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                            </svg>
                            <h4 className="font-semibold text-base">Item Information</h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-base-content/60 uppercase">Consigned No</p>
                                <p className="font-semibold text-sm text-primary">
                                    {selectedConsigned.consigned_no}
                                </p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-base-content/60 uppercase">Description</p>
                                <p className="font-semibold text-sm">{selectedConsigned.mat_description}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-base-content/60 uppercase">Category</p>
                                <p className="font-semibold text-sm">{selectedConsigned.category || '-'}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Consigned Details Header with Buttons */}
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-2">
                        <h4 className="font-bold text-lg">Consigned Details</h4>
                        <span className="badge badge-primary">
                            {editableDetails.length || 0} items
                        </span>
                    </div>
                    <div className="flex gap-2">
                        {!editingDetails ? (
                            <>
                                <button 
                                    className="btn btn-primary btn-sm gap-2"
                                    onClick={openAddDetailsModal}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                                    </svg>
                                    Add Details
                                </button>
                                <button 
                                    className="btn btn-secondary btn-sm gap-2"
                                    onClick={() => setEditingDetails(true)}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                    </svg>
                                    Edit Details
                                </button>
                            </>
                        ) : (
                            <div className="flex gap-2">
                                <button 
                                    className="btn btn-success btn-sm gap-2"
                                    onClick={handleSaveEditableDetails}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                    Save Changes
                                </button>
                                <button 
                                    className="btn btn-ghost btn-sm gap-2"
                                    onClick={() => {
                                        setEditingDetails(false);
                                        // Reset to original data
                                        if (selectedConsigned.details) {
                                            setEditableDetails([...selectedConsigned.details.map(detail => ({
                                                ...detail,
                                                isNew: false
                                            }))]);
                                        }
                                    }}
                                >
                                    Cancel
                                </button>
                            </div>
                        )}
                    </div>
                </div>

{/* Data Table for Consigned Details */}
<div className="overflow-x-auto border rounded-lg">
    <table className="table table-sm w-full">
        <thead>
            <tr className="bg-base-200">
                <th className="text-xs font-semibold">Item Code</th>
                <th className="text-xs font-semibold">Supplier</th>
                <th className="text-xs font-semibold">Expiration Date</th>
                <th className="text-xs font-semibold">UOM</th>
                <th className="text-xs font-semibold">Bin Location</th>
                <th className="text-xs font-semibold text-right">Qty</th>
                <th className="text-xs font-semibold text-right">Qty per Box</th>
                <th className="text-xs font-semibold text-right">Min</th>
                <th className="text-xs font-semibold text-right">Max</th>
                <th className="text-xs font-semibold text-right">Price</th>
                <th className="text-xs font-semibold text-center">Actions</th>
            </tr>
        </thead>
        <tbody>
            {editableDetails.length > 0 ? (
                editableDetails.map((detail, index) => (
                    <tr key={detail.id} className="hover">
                        <td>
                            {editingDetails ? (
                                <input
                                    type="text"
                                    className="input input-bordered input-sm w-full"
                                    value={detail.item_code}
                                    onChange={(e) => handleDetailChange(index, 'item_code', e.target.value)}
                                    placeholder="Item Code"
                                />
                            ) : (
                                <span className="text-sm font-medium">{detail.item_code}</span>
                            )}
                        </td>
                        <td>
                            {editingDetails ? (
                                <input
                                    type="text"
                                    className="input input-bordered input-sm w-full"
                                    value={detail.supplier}
                                    onChange={(e) => handleDetailChange(index, 'supplier', e.target.value)}
                                    placeholder="Supplier"
                                />
                            ) : (
                                <span className="text-sm">{detail.supplier}</span>
                            )}
                        </td>
                        <td>
                            {editingDetails ? (
                                <input
                                    type="date"
                                    className="input input-bordered input-sm w-full"
                                    value={detail.expiration || ''}
                                    onChange={(e) => handleDetailChange(index, 'expiration', e.target.value)}
                                />
                            ) : (
                                <span className="text-sm">
                                    {detail.expiration 
                                        ? new Date(detail.expiration).toLocaleDateString('en-US', {
                                            year: 'numeric',
                                            month: 'short',
                                            day: 'numeric'
                                          })
                                        : '-'}
                                </span>
                            )}
                        </td>
                        <td>
                            {editingDetails ? (
                                <input
                                    type="text"
                                    className="input input-bordered input-sm w-full"
                                    value={detail.uom || ''}
                                    onChange={(e) => handleDetailChange(index, 'uom', e.target.value)}
                                    placeholder="UOM"
                                />
                            ) : (
                                <span className="text-sm">{detail.uom || '-'}</span>
                            )}
                        </td>
                        <td>
                            {editingDetails ? (
                                <input
                                    type="text"
                                    className="input input-bordered input-sm w-full"
                                    value={detail.bin_location}
                                    onChange={(e) => handleDetailChange(index, 'bin_location', e.target.value)}
                                    placeholder="Bin Location"
                                />
                            ) : (
                                <span className="text-sm">{detail.bin_location || '-'}</span>
                            )}
                        </td>
                        <td className="text-right">
                            {editingDetails ? (
                                <input
                                    type="number"
                                    className="input input-bordered input-sm w-full text-right"
                                    value={detail.qty}
                                    onChange={(e) => handleDetailChange(index, 'qty', e.target.value)}
                                    placeholder="0"
                                />
                            ) : (
                                <span className="text-sm">{detail.qty}</span>
                            )}
                        </td>
                        <td className="text-right">
                            {editingDetails ? (
                                <input
                                    type="number"
                                    className="input input-bordered input-sm w-full text-right"
                                    value={detail.qty_per_box}
                                    onChange={(e) => handleDetailChange(index, 'qty_per_box', e.target.value)}
                                    placeholder="0"
                                />
                            ) : (
                                <span className="text-sm">{detail.qty_per_box || '-'}</span>
                            )}
                        </td>
                        <td className="text-right">
                            {editingDetails ? (
                                <input
                                    type="number"
                                    className="input input-bordered input-sm w-full text-right"
                                    value={detail.minimum}
                                    onChange={(e) => handleDetailChange(index, 'minimum', e.target.value)}
                                    placeholder="0"
                                />
                            ) : (
                                <span className="text-sm">{detail.minimum || '-'}</span>
                            )}
                        </td>
                        <td className="text-right">
                            {editingDetails ? (
                                <input
                                    type="number"
                                    className="input input-bordered input-sm w-full text-right"
                                    value={detail.maximum}
                                    onChange={(e) => handleDetailChange(index, 'maximum', e.target.value)}
                                    placeholder="0"
                                />
                            ) : (
                                <span className="text-sm">{detail.maximum || '-'}</span>
                            )}
                        </td>
                        <td className="text-right">
                            {editingDetails ? (
                                <input
                                    type="number"
                                    step="0.01"
                                    className="input input-bordered input-sm w-full text-right"
                                    value={detail.price}
                                    onChange={(e) => handleDetailChange(index, 'price', e.target.value)}
                                    placeholder="0.00"
                                />
                            ) : (
                                <span className="text-sm">{detail.price || '-'}</span>
                            )}
                        </td>
                        <td>
                            <button className="btn btn-sm btn-ghost" title="View History" onClick={() => openDetailHistory(detail)}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                </svg>
                            </button>
                            <button 
                                className="btn btn-sm btn-ghost text-error" 
                                title="Delete"
                                onClick={() => openDeleteConfirmModal(detail)}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                            </button>
                        </td>
                    </tr>
                ))
            ) : (
                <tr>
                    <td colSpan={editingDetails ? 11 : 10} className="text-center py-8 text-gray-500 text-sm">
                        No consigned details found for this item
                    </td>
                </tr>
            )}
        </tbody>
    </table>
</div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t bg-base-100 sticky bottom-0 z-10">
                <div className="flex justify-end">
                    <button 
                        className="btn btn-ghost"
                        onClick={() => setViewDetailsModal(false)}
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
        <div className="modal-backdrop bg-black/50" onClick={() => setViewDetailsModal(false)}></div>
    </div>
)}
{/* Add Details Modal */}
{addDetailsModal && selectedConsigned && (
    <div className="modal modal-open">
        <div className="modal-box max-w-4xl">
            <h3 className="font-bold text-xl mb-4">Add New Detail</h3>
            <button 
                className="btn btn-sm btn-circle btn-ghost absolute right-4 top-4"
                onClick={closeAddDetailsModal}
            >
                ✕
            </button>

            <div className="mb-4 p-4 bg-base-200 rounded-lg">
                <p className="text-sm"><span className="font-semibold">Consigned No:</span> {selectedConsigned.consigned_no}</p>
                <p className="text-sm"><span className="font-semibold">Description:</span> {selectedConsigned.mat_description}</p>
            </div>

            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="form-control">
                        <label className="label">
                            <span className="label-text font-medium">Item Code <span className="text-error">*</span></span>
                        </label>
                        <input
                            type="text"
                            placeholder="Enter item code"
                            className="input input-bordered w-full"
                            value={newDetailData.item_code}
                            onChange={(e) => setNewDetailData({ ...newDetailData, item_code: e.target.value })}
                        />
                    </div>

                    <div className="form-control">
                        <label className="label">
                            <span className="label-text font-medium">Supplier <span className="text-error">*</span></span>
                        </label>
                        <input
                            type="text"
                            placeholder="Enter supplier name"
                            className="input input-bordered w-full"
                            value={newDetailData.supplier}
                            onChange={(e) => setNewDetailData({ ...newDetailData, supplier: e.target.value })}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="form-control">
                        <label className="label">
                            <span className="label-text font-medium">Unit of Measure <span className="text-error">*</span></span>
                        </label>
                        <input
                            type="text"
                            placeholder="e.g., PCS, BOX, KG"
                            className="input input-bordered w-full"
                            value={newDetailData.uom}
                            onChange={(e) => setNewDetailData({ ...newDetailData, uom: e.target.value })}
                        />
                    </div>

                    <div className="form-control">
                        <label className="label">
                            <span className="label-text font-medium">Quantity <span className="text-error">*</span></span>
                        </label>
                        <input
                            type="number"
                            placeholder="0"
                            className="input input-bordered w-full"
                            value={newDetailData.qty}
                            onChange={(e) => setNewDetailData({ ...newDetailData, qty: e.target.value })}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="form-control">
                        <label className="label">
                            <span className="label-text font-medium">Expiration Date</span>
                        </label>
                        <input
                            type="date"
                            className="input input-bordered w-full"
                            value={newDetailData.expiration}
                            onChange={(e) => setNewDetailData({ ...newDetailData, expiration: e.target.value })}
                        />
                    </div>

                    <div className="form-control">
                        <label className="label">
                            <span className="label-text font-medium">Bin Location</span>
                        </label>
                        <input
                            type="text"
                            placeholder="e.g., A-01-05"
                            className="input input-bordered w-full"
                            value={newDetailData.bin_location}
                            onChange={(e) => setNewDetailData({ ...newDetailData, bin_location: e.target.value })}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="form-control">
                        <label className="label">
                            <span className="label-text font-medium">Qty Per Box</span>
                        </label>
                        <input
                            type="number"
                            placeholder="0"
                            className="input input-bordered w-full"
                            value={newDetailData.qty_per_box}
                            onChange={(e) => setNewDetailData({ ...newDetailData, qty_per_box: e.target.value })}
                        />
                    </div>

                    <div className="form-control">
                        <label className="label">
                            <span className="label-text font-medium">Price</span>
                        </label>
                        <input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            className="input input-bordered w-full"
                            value={newDetailData.price}
                            onChange={(e) => setNewDetailData({ ...newDetailData, price: e.target.value })}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="form-control">
                        <label className="label">
                            <span className="label-text font-medium">Minimum Stock</span>
                        </label>
                        <input
                            type="number"
                            placeholder="0"
                            className="input input-bordered w-full"
                            value={newDetailData.minimum}
                            onChange={(e) => setNewDetailData({ ...newDetailData, minimum: e.target.value })}
                        />
                    </div>

                    <div className="form-control">
                        <label className="label">
                            <span className="label-text font-medium">Maximum Stock</span>
                        </label>
                        <input
                            type="number"
                            placeholder="0"
                            className="input input-bordered w-full"
                            value={newDetailData.maximum}
                            onChange={(e) => setNewDetailData({ ...newDetailData, maximum: e.target.value })}
                        />
                    </div>
                </div>
            </div>

            <div className="modal-action">
                <button 
                    className="btn btn-ghost"
                    onClick={closeAddDetailsModal}
                    disabled={isSaving}
                >
                    Cancel
                </button>
                <button 
                    className="btn btn-primary"
                    onClick={handleSaveNewDetail}
                    disabled={isSaving || !newDetailData.item_code.trim() || !newDetailData.supplier.trim() || !newDetailData.qty || !newDetailData.uom.trim()}
                >
                    {isSaving ? (
                        <>
                            <span className="loading loading-spinner loading-sm"></span>
                            Saving...
                        </>
                    ) : (
                        <>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            Save Detail
                        </>
                    )}
                </button>
            </div>
        </div>
        <div className="modal-backdrop bg-black/50" onClick={closeAddDetailsModal}></div>
    </div>
)}

{/* Add Quantity Modal */}
{addQuantityModal && (
    <div className="modal modal-open">
        <div className="modal-box max-w-5xl max-h-[90vh] flex flex-col p-0">
            <div className="px-6 pt-6 pb-4 border-b bg-base-100 sticky top-0 z-10">
                <h3 className="font-bold text-xl">Add Quantity</h3>
                <button 
                    className="btn btn-sm btn-circle btn-ghost absolute right-4 top-4"
                    onClick={closeAddQuantityModal}
                >
                    ✕
                </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
                {/* Search Input */}
                <div className="form-control mb-4">
                    <label className="label">
                        <span className="label-text font-medium">Search Select Item</span>
                    </label>
                    <input
                        type="text"
                        placeholder="Search by item code, description, or supplier..."
                        className="input input-bordered w-full"
                        value={quantitySearchQuery}
                        onChange={handleQuantitySearch}
                    />
                    <label className="label">
                        <span className="label-text-alt text-info">
                            Type at least 2 characters to search
                        </span>
                    </label>
                </div>

                {/* Data Table */}
                <div className="overflow-x-auto border rounded-lg">
                    <table className="table table-sm w-full">
                        <thead>
                            <tr className="bg-base-200">
                                <th className="text-xs font-semibold">Consigned No</th>
                                <th className="text-xs font-semibold">Item Code</th>
                                <th className="text-xs font-semibold">Description</th>
                                <th className="text-xs font-semibold">Supplier</th>
                                <th className="text-xs font-semibold">Expiration</th>
                                <th className="text-xs font-semibold text-right">Current Qty</th>
                                <th className="text-xs font-semibold w-32">Add Quantity</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredConsignedItems.length > 0 ? (
                                filteredConsignedItems.map((detail) => (
                                    <tr key={`${detail.id}-${detail.detailId}`} className="hover">
                                        <td className="text-sm font-medium text-primary">
                                            {detail.consigned_no}
                                        </td>
                                        <td className="text-sm font-medium">
                                            {detail.item_code || '-'}
                                        </td>
                                        <td className="text-sm">
                                            {detail.mat_description}
                                        </td>
                                        <td className="text-sm">
                                            {detail.supplier || '-'}
                                        </td>
                                        <td className="text-sm">
                                            {detail.expiration 
                                                ? new Date(detail.expiration).toLocaleDateString('en-US', {
                                                    year: 'numeric',
                                                    month: 'short',
                                                    day: 'numeric'
                                                })
                                                : '-'}
                                        </td>
                                        <td className="text-sm text-right">
                                            {detail.qty || 0}
                                        </td>
                                        <td>
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                placeholder="0"
                                                className="input input-bordered input-sm w-full"
                                                value={quantityInputs[detail.detailId] || ''}
                                                onChange={(e) => handleQuantityInputChange(detail.detailId, e.target.value)}
                                            />
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="7" className="text-center py-8 text-gray-500 text-sm">
                                        {quantitySearchQuery.trim().length >= 2 
                                            ? 'No items found matching your search'
                                            : 'Enter search terms to find items'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t bg-base-100 sticky bottom-0 z-10">
                <div className="flex justify-end gap-3">
                    <button 
                        className="btn btn-ghost"
                        onClick={closeAddQuantityModal}
                        disabled={isAddingQuantity}
                    >
                        Cancel
                    </button>
                    <button 
                        className="btn btn-primary gap-2"
                        onClick={handleSaveQuantities}
                        disabled={isAddingQuantity || Object.keys(quantityInputs).length === 0}
                    >
                        {isAddingQuantity ? (
                            <>
                                <span className="loading loading-spinner loading-sm"></span>
                                Saving...
                            </>
                        ) : (
                            <>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                                Save Quantities
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
        <div className="modal-backdrop bg-black/50" onClick={closeAddQuantityModal}></div>
    </div>
)}

{/* Delete Confirmation Modal */}
{deleteConfirmModal && detailToDelete && (
    <div className="modal modal-open">
        <div className="modal-box">
            <h3 className="font-bold text-lg text-error mb-4">Confirm Delete</h3>
            
            <div className="alert alert-warning mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>This action cannot be undone!</span>
            </div>

            <div className="space-y-3 mb-4">
                <p className="text-sm"><strong>Item Code:</strong> {detailToDelete.item_code}</p>
                <p className="text-sm"><strong>Supplier:</strong> {detailToDelete.supplier}</p>
                <p className="text-sm"><strong>Quantity:</strong> {detailToDelete.qty}</p>
            </div>

            <div className="form-control mb-4">
                <label className="label">
                    <span className="label-text">Type <span className="font-bold text-error">confirm</span> to delete this detail</span>
                </label>
                <input
                    type="text"
                    placeholder="Type 'confirm' here"
                    className="input input-bordered w-full"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    autoFocus
                />
            </div>

            <div className="modal-action">
                <button 
                    className="btn btn-ghost"
                    onClick={closeDeleteConfirmModal}
                    disabled={isSaving}
                >
                    Cancel
                </button>
                <button 
                    className="btn btn-error"
                    onClick={handleConfirmDelete}
                    disabled={isSaving || deleteConfirmText.toLowerCase() !== 'confirm'}
                >
                    {isSaving ? (
                        <>
                            <span className="loading loading-spinner loading-sm"></span>
                            Deleting...
                        </>
                    ) : (
                        <>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            Delete Detail
                        </>
                    )}
                </button>
            </div>
        </div>
        <div className="modal-backdrop bg-black/50" onClick={closeDeleteConfirmModal}></div>
    </div>
)}

{/* Delete Consigned Confirmation Modal */}
{deleteConsignedModal && consignedToDelete && (
    <div className="modal modal-open">
        <div className="modal-box">
            <h3 className="font-bold text-lg text-error mb-4">Confirm Delete Consigned Item</h3>
            
            <div className="alert alert-error mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                    <div className="font-bold">Warning: This will delete all related data!</div>
                    <div className="text-sm">All consigned details associated with this item will be permanently deleted.</div>
                </div>
            </div>

            <div className="space-y-3 mb-4 bg-base-200 p-4 rounded-lg">
                <div className="flex justify-between">
                    <span className="font-semibold">Consigned No:</span>
                    <span className="text-primary font-bold">{consignedToDelete.consigned_no}</span>
                </div>
                <div className="flex justify-between">
                    <span className="font-semibold">Description:</span>
                    <span>{consignedToDelete.mat_description}</span>
                </div>
                <div className="flex justify-between">
                    <span className="font-semibold">Category:</span>
                    <span>{consignedToDelete.category || '-'}</span>
                </div>
                <div className="flex justify-between">
                    <span className="font-semibold">Total Details:</span>
                    <span className="badge badge-warning">{consignedToDelete.details?.length || 0} records</span>
                </div>
            </div>

            <div className="form-control mb-4">
                <label className="label">
                    <span className="label-text">Type <span className="font-bold text-error">confirm</span> to delete this consigned item and all its details</span>
                </label>
                <input
                    type="text"
                    placeholder="Type 'confirm' here"
                    className="input input-bordered w-full"
                    value={deleteConsignedConfirmText}
                    onChange={(e) => setDeleteConsignedConfirmText(e.target.value)}
                    autoFocus
                />
            </div>

            <div className="modal-action">
                <button 
                    className="btn btn-ghost"
                    onClick={closeDeleteConsignedModal}
                    disabled={isSaving}
                >
                    Cancel
                </button>
                <button 
                    className="btn btn-error"
                    onClick={handleConfirmDeleteConsigned}
                    disabled={isSaving || deleteConsignedConfirmText.toLowerCase() !== 'confirm'}
                >
                    {isSaving ? (
                        <>
                            <span className="loading loading-spinner loading-sm"></span>
                            Deleting...
                        </>
                    ) : (
                        <>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            Delete Consigned Item
                        </>
                    )}
                </button>
            </div>
        </div>
        <div className="modal-backdrop bg-black/50" onClick={closeDeleteConsignedModal}></div>
    </div>
)}
{/* History Modal */}
{historyModal && (
    <div className="modal modal-open">
        <div className="modal-box max-w-5xl max-h-[90vh] w-[95vw] flex flex-col p-0">
            <div className="px-6 pt-6 pb-4 border-b bg-base-100 sticky top-0 z-10">
                <h3 className="font-bold text-xl">
                    {historyType === 'consigned' ? 'Consigned History' : 'Consigned Detail History'}
                </h3>
                {historyType === 'consigned' && selectedConsigned && (
                    <div className="mt-2 text-sm">
                        <p><span className="font-semibold">Consigned No:</span> {selectedConsigned.consigned_no}</p>
                        <p><span className="font-semibold">Description:</span> {selectedConsigned.mat_description}</p>
                    </div>
                )}
                {historyType === 'detail' && selectedDetailForHistory && (
                    <div className="mt-2 text-sm">
                        <p><span className="font-semibold">Item Code:</span> {selectedDetailForHistory.item_code}</p>
                        <p><span className="font-semibold">Supplier:</span> {selectedDetailForHistory.supplier}</p>
                        <p><span className="font-semibold">Consigned No:</span> {selectedConsigned?.consigned_no}</p>
                    </div>
                )}
                <button 
                    className="btn btn-sm btn-circle btn-ghost absolute right-4 top-4"
                    onClick={closeHistoryModal}
                >
                    ✕
                </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
                {historyLoading ? (
                    <div className="flex justify-center items-center h-64">
                        <span className="loading loading-spinner loading-lg"></span>
                        <span className="ml-3">Loading history...</span>
                    </div>
                ) : historyData.length > 0 ? (
                    <div className="space-y-4">
                        {historyData.map((record, index) => (
                            <div key={index} className="card bg-base-100 border shadow-sm">
                                <div className="card-body p-4">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className="badge badge-sm" style={{
                                                backgroundColor: getActionColor(record.action),
                                                color: 'white'
                                            }}>
                                                {getActionLabel(record.action)}
                                            </span>
                                            <span className="text-xs text-gray-500">
                                                {new Date(record.created_at).toLocaleString()}
                                            </span>
                                        </div>
                                        <div className="text-sm font-medium">
                                            User: {record.user_name || 'System'}
                                        </div>
                                    </div>
                                    
                                    {record.changes && record.changes.length > 0 && (
                                        <div className="mt-2">
                                            <p className="text-sm font-semibold mb-1">Changes:</p>
                                            <ul className="list-disc list-inside text-sm space-y-1">
                                                {record.changes.map((change, i) => (
                                                    <li key={i} className="text-gray-700">{change}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                    
                                    {(record.old_values || record.new_values) && (
                                        <div className="grid grid-cols-2 gap-4 mt-3">
                                            {record.old_values && Object.keys(record.old_values).length > 0 && (
                                                <div>
                                                    <p className="text-sm font-semibold mb-1 text-error">Old Values:</p>
                                                    {Object.entries(record.old_values).map(([key, value]) => (
                                                        <p key={key} className="text-xs">
                                                            <span className="font-medium">{key}:</span> {value !== null ? value.toString() : 'null'}
                                                        </p>
                                                    ))}
                                                </div>
                                            )}
                                            {record.new_values && Object.keys(record.new_values).length > 0 && (
                                                <div>
                                                    <p className="text-sm font-semibold mb-1 text-success">New Values:</p>
                                                    {Object.entries(record.new_values).map(([key, value]) => (
                                                        <p key={key} className="text-xs">
                                                            <span className="font-medium">{key}:</span> {value !== null ? value.toString() : 'null'}
                                                        </p>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    
                                    {historyType === 'detail' && record.consigned_no && (
                                        <div className="mt-2 pt-2 border-t">
                                            <p className="text-xs text-gray-500">
                                                Consigned No: <span className="font-medium">{record.consigned_no}</span>
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-64">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-gray-500">No history records found</p>
                    </div>
                )}
            </div>

            <div className="px-6 py-4 border-t bg-base-100 sticky bottom-0 z-10">
                <div className="flex justify-between items-center">
                    <div className="text-sm text-gray-500">
                        Showing {historyData.length} history records
                    </div>
                    <div className="flex gap-3">
                        <button 
                            className="btn btn-ghost btn-sm"
                            onClick={closeHistoryModal}
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
        <div className="modal-backdrop bg-black/50" onClick={closeHistoryModal}></div>
    </div>
)}
        </AuthenticatedLayout>
    );
}