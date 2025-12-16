import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head, usePage, router } from "@inertiajs/react";
import { useState, useEffect } from "react";

export default function Consumable({ tableData, tableFilters }) {
    const props = usePage().props;
    const [isImporting, setIsImporting] = useState(false);
    const [mainSearchQuery, setMainSearchQuery] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSecondModalOpen, setIsSecondModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [viewingItem, setViewingItem] = useState(null);
    const [isAddingToExisting, setIsAddingToExisting] = useState(false);
    const [existingConsumableId, setExistingConsumableId] = useState(null);
    const [isQuantityModalOpen, setIsQuantityModalOpen] = useState(false);
    const [quantitySearchQuery, setQuantitySearchQuery] = useState("");
    const [filteredItems, setFilteredItems] = useState([]);
    const [selectedItem, setSelectedItem] = useState(null);
    const [quantityInput, setQuantityInput] = useState("");
    const [isAddingQuantity, setIsAddingQuantity] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null);
    const [deleteConfirmText, setDeleteConfirmText] = useState("");
    const [isDeleting, setIsDeleting] = useState(false);
    const [selectedItems, setSelectedItems] = useState([]);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [historyData, setHistoryData] = useState([]);
    const [historyItem, setHistoryItem] = useState(null);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const [isDeleteDetailModalOpen, setIsDeleteDetailModalOpen] = useState(false);
    const [detailToDelete, setDetailToDelete] = useState(null);
    const [deleteDetailConfirmText, setDeleteDetailConfirmText] = useState("");
    const [isDeletingDetail, setIsDeletingDetail] = useState(false);
    const [isDetailHistoryModalOpen, setIsDetailHistoryModalOpen] = useState(false);
    const [detailHistoryData, setDetailHistoryData] = useState([]);
    const [detailHistoryItem, setDetailHistoryItem] = useState(null);

    const handleDeleteDetailClick = (detail) => {
        setDetailToDelete(detail);
        setDeleteDetailConfirmText("");
        setIsDeleteDetailModalOpen(true);
    };

    const handleCloseDeleteDetailModal = () => {
        setIsDeleteDetailModalOpen(false);
        setDetailToDelete(null);
        setDeleteDetailConfirmText("");
    };

    const handleConfirmDeleteDetail = () => {
        if (deleteDetailConfirmText !== "CONFIRM") {
            alert("Please type CONFIRM to delete this detail");
            return;
        }

        if (!detailToDelete) return;

        setIsDeletingDetail(true);

        router.delete(route('consumable.destroyDetail', detailToDelete.id), {
            preserveState: true,
            preserveScroll: true,
            onSuccess: () => {
                alert('Detail deleted successfully');
                handleCloseDeleteDetailModal();
                if (viewingItem) {
                    handleView(viewingItem.consumable_id);
                }
            },
            onError: (errors) => {
                console.error('Delete error:', errors);
                alert('Failed to delete detail: ' + (errors.error || 'Unknown error'));
            },
            onFinish: () => {
                setIsDeletingDetail(false);
            }
        });
    };

    const handleViewHistory = async (item) => {
        setHistoryItem(item);
        setIsLoadingHistory(true);
        setIsHistoryModalOpen(true);
        
        try {
            const response = await fetch(route('consumable.history', item.consumable_id), {
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                setHistoryData(data.history || []);
            }
        } catch (error) {
            console.error('Error fetching history:', error);
            alert('Failed to load history');
        } finally {
            setIsLoadingHistory(false);
        }
    };

    const handleCloseHistoryModal = () => {
        setIsHistoryModalOpen(false);
        setHistoryData([]);
        setHistoryItem(null);
    };

    const handleCloseDetailHistoryModal = () => {
        setIsDetailHistoryModalOpen(false);
        setDetailHistoryData([]);
        setDetailHistoryItem(null);
    };

    const handleViewDetailHistory = async (detail) => {
        setDetailHistoryItem(detail);
        setIsLoadingHistory(true);
        setIsDetailHistoryModalOpen(true);
        
        try {
            const response = await fetch(route('consumable.detailHistory', detail.id), {
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                setDetailHistoryData(data.history || []);
            }
        } catch (error) {
            console.error('Error fetching detail history:', error);
            alert('Failed to load detail history');
        } finally {
            setIsLoadingHistory(false);
        }
    };

    const handleDeleteDetail = (detail) => {
        if (!confirm(`Are you sure you want to delete item code: ${detail.item_code}?`)) {
            return;
        }

        router.delete(route('consumable.destroyDetail', detail.id), {
            preserveState: true,
            preserveScroll: true,
            onSuccess: () => {
                alert('Detail deleted successfully');
                if (viewingItem) {
                    handleView(viewingItem.consumable_id);
                }
            },
            onError: (errors) => {
                console.error('Delete error:', errors);
                alert('Failed to delete detail: ' + (errors.error || 'Unknown error'));
            }
        });
    };

    const handleDeleteClick = (item) => {
        setItemToDelete(item);
        setDeleteConfirmText("");
        setIsDeleteModalOpen(true);
    };

    const handleCloseDeleteModal = () => {
        setIsDeleteModalOpen(false);
        setItemToDelete(null);
        setDeleteConfirmText("");
    };

    const handleConfirmDelete = () => {
        if (deleteConfirmText !== "CONFIRM") {
            alert("Please type CONFIRM to delete this item");
            return;
        }

        if (!itemToDelete) return;

        setIsDeleting(true);

        router.delete(route('consumable.destroy', itemToDelete.consumable_id), {
            preserveState: true,
            preserveScroll: true,
            onSuccess: () => {
                alert('Item and all related details deleted successfully');
                handleCloseDeleteModal();
            },
            onError: (errors) => {
                console.error('Delete error:', errors);
                alert('Failed to delete item: ' + (errors.error || 'Unknown error'));
            },
            onFinish: () => {
                setIsDeleting(false);
            }
        });
    };

    const [formData, setFormData] = useState({
        material_description: "",
        category: "",
        uom: "",
        item_code: "",
        detailed_description: "",
        serial: "",
        bin_location: "",
        quantity: "",
        max: "",
        min: "",
        price: ""
    });
    
    const [editingItemId, setEditingItemId] = useState(null);
    const [editFormData, setEditFormData] = useState({
        material_description: "",
        category: "",
        uom: ""
    });
    
    const [isEditing, setIsEditing] = useState(false);
    const [editingDetails, setEditingDetails] = useState([]);
    const [isSaving, setIsSaving] = useState(false);
    
    const consumableItems = tableData?.data || [];
    const pagination = tableData?.pagination || {
        from: 0,
        to: 0,
        total: 0,
        current_page: 1,
        last_page: 1,
        per_page: 10
    };

    useEffect(() => {
        if (viewingItem && viewingItem.details) {
            setEditingDetails([...viewingItem.details.map(detail => ({
                ...detail,
                // Your consumable_details table doesn't have expiration, so removed that
            }))]);
        }
    }, [viewingItem]);

    useEffect(() => {
        if (quantitySearchQuery.trim() === "") {
            setFilteredItems([]);
            return;
        }

        const timeoutId = setTimeout(async () => {
            setIsSearching(true);
            try {
                const response = await fetch(
                    route('consumable.searchDetails') + '?search=' + encodeURIComponent(quantitySearchQuery),
                    {
                        headers: {
                            'Accept': 'application/json',
                            'X-Requested-With': 'XMLHttpRequest'
                        }
                    }
                );
                
                if (response.ok) {
                    const data = await response.json();
                    setFilteredItems(data);
                }
            } catch (error) {
                console.error('Error searching items:', error);
            } finally {
                setIsSearching(false);
            }
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [quantitySearchQuery]);

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
    };

    const handleView = async (consumableId) => {
        try {
            const response = await fetch(route('consumable.show', consumableId), {
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                setViewingItem(data.consumableItem);
                setIsViewModalOpen(true);
                setIsEditing(false);
            }
        } catch (error) {
            console.error('Error fetching item details:', error);
            alert('Failed to load item details');
        }
    };

    const handleCloseViewModal = () => {
        setIsViewModalOpen(false);
        setViewingItem(null);
        setIsEditing(false);
        setEditingDetails([]);
    };

    const handleSearch = (e) => {
        const query = e.target.value;
        setMainSearchQuery(query);
        
        if (query.length >= 3 || query.length === 0) {
            router.get(route('consumable'), {
                search: query,
                page: 1
            }, {
                preserveState: true,
                preserveScroll: true
            });
        }
    };

    const handlePerPageChange = (e) => {
        router.get(route('consumable'), {
            per_page: e.target.value,
            search: mainSearchQuery,
            page: 1
        }, {
            preserveState: true,
            preserveScroll: true
        });
    };

    const handleOpenModal = () => {
        setIsModalOpen(true);
        setIsAddingToExisting(false);
        setExistingConsumableId(null);
        setFormData({
            material_description: "",
            category: "",
            uom: "",
            item_code: "",
            detailed_description: "",
            serial: "",
            bin_location: "",
            quantity: "",
            max: "",
            min: "",
            price: ""
        });
    };

    const handleAddItemToExisting = () => {
        setExistingConsumableId(viewingItem.consumable_id);
        setIsAddingToExisting(true);
        
        setFormData({
            material_description: viewingItem.material_description,
            category: viewingItem.category,
            uom: viewingItem.uom,
            item_code: "",
            detailed_description: "",
            serial: "",
            bin_location: "",
            quantity: "",
            max: "",
            min: "",
            price: ""
        });
        
        setIsViewModalOpen(false);
        setIsSecondModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setFormData({
            material_description: "",
            category: "",
            uom: "",
            item_code: "",
            detailed_description: "",
            serial: "",
            bin_location: "",
            quantity: "",
            max: "",
            min: "",
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

    const handleNext = () => {
        if (!formData.material_description.trim() || !formData.category.trim() || !formData.uom.trim()) {
            alert("Please fill in all required fields");
            return;
        }

        if (isAddingToExisting) {
            setIsModalOpen(false);
            setIsSecondModalOpen(true);
        } else {
            setIsModalOpen(false);
            setIsSecondModalOpen(true);
        }
    };

    const handleCloseSecondModal = () => {
        setIsSecondModalOpen(false);
        setIsAddingToExisting(false);
        setExistingConsumableId(null);
        setFormData({
            material_description: "",
            category: "",
            uom: "",
            item_code: "",
            detailed_description: "",
            serial: "",
            bin_location: "",
            quantity: "",
            max: "",
            min: "",
            price: ""
        });
    };

    const handleSubmit = () => {
        if (isAddingToExisting && existingConsumableId) {
            const detailData = {
                consumable_id: existingConsumableId,
                item_code: formData.item_code,
                detailed_description: formData.detailed_description,
                serial: formData.serial,
                bin_location: formData.bin_location,
                quantity: formData.quantity,
                max: formData.max,
                min: formData.min
            };
            
            router.post(route('consumable.addDetail'), detailData, {
                preserveState: true,
                preserveScroll: true,
                onSuccess: () => {
                    handleCloseSecondModal();
                    if (viewingItem) {
                        handleView(viewingItem.consumable_id);
                        setIsViewModalOpen(true);
                    }
                },
                onError: (errors) => {
                    console.error('Validation errors:', errors);
                    alert('Failed to add detail. Please check the form.');
                }
            });
        } else {
            const mainData = {
                material_description: formData.material_description,
                category: formData.category,
                uom: formData.uom,
                item_code: formData.item_code,
                detailed_description: formData.detailed_description,
                serial: formData.serial,
                bin_location: formData.bin_location,
                quantity: formData.quantity,
                max: formData.max,
                min: formData.min,
                price: formData.price
            };
            
            router.post(route('consumable.store'), mainData, {
                preserveState: true,
                preserveScroll: true,
                onSuccess: () => {
                    handleCloseSecondModal();
                    setFormData({
                        material_description: "",
                        category: "",
                        uom: ""
                    });
                },
                onError: (errors) => {
                    console.error('Validation errors:', errors);
                }
            });
        }
    };

    const handleEditClick = (item) => {
        setEditingItemId(item.consumable_id);
        setEditFormData({
            material_description: item.material_description,
            category: item.category,
            uom: item.uom
        });
    };

    const handleCancelEdit = () => {
        setEditingItemId(null);
        setEditFormData({
            material_description: "",
            category: "",
            uom: ""
        });
    };

    const handleSaveEdit = (item) => {
        if (!editFormData.material_description.trim() || !editFormData.category.trim() || !editFormData.uom.trim()) {
            alert("Please fill in all fields");
            return;
        }

        router.put(route('consumable.update', item.consumable_id), editFormData, {
            preserveState: true,
            preserveScroll: true,
            onSuccess: () => {
                setEditingItemId(null);
                setEditFormData({
                    material_description: "",
                    category: "",
                    uom: ""
                });
            },
            onError: (errors) => {
                console.error('Validation errors:', errors);
                alert('Failed to update item');
            }
        });
    };

    const handleEditInputChange = (e) => {
        const { name, value } = e.target;
        setEditFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleEdit = () => {
        setIsEditing(true);
    };

    const handleCancelEditInModal = () => {
        setIsEditing(false);
        if (viewingItem && viewingItem.details) {
            setEditingDetails([...viewingItem.details]);
        }
    };

    const handleDetailChange = (index, field, value) => {
        setEditingDetails(prev => {
            const newDetails = [...prev];
            newDetails[index] = {
                ...newDetails[index],
                [field]: value
            };
            return newDetails;
        });
    };

const handleBulkSave = async () => {
    if (!editingDetails.length) {
        alert('No details to save');
        return;
    }
    
    setIsSaving(true);
    
    // Prepare the details data - only send the fields that exist in consumable_details table
    const detailsToUpdate = editingDetails.map(detail => ({
        id: detail.id,
        item_code: detail.item_code || '',
        detailed_description: detail.detailed_description || '',
        serial: detail.serial || '',
        bin_location: detail.bin_location || '',
        quantity: parseFloat(detail.quantity) || 0,
        max: parseFloat(detail.max) || 0,
        min: parseFloat(detail.min) || 0
    }));

    console.log('Sending details to update:', detailsToUpdate); // Debug log
    
    router.put(route('consumable.bulkUpdateDetails'), {
        details: detailsToUpdate
    }, {
        preserveState: true,
        preserveScroll: true,
        onSuccess: (page) => {
            console.log('Update successful'); // Debug log
            // Refresh the viewing item to get updated data
            if (viewingItem) {
                handleView(viewingItem.consumable_id);
            }
            setIsEditing(false);
            alert('Details updated successfully!');
        },
        onError: (errors) => {
            console.error('Validation errors:', errors);
            // Show detailed error message
            const errorMessages = Object.entries(errors)
                .map(([key, value]) => `${key}: ${value}`)
                .join('\n');
            alert('Failed to save changes:\n' + errorMessages);
        },
        onFinish: () => {
            setIsSaving(false);
        }
    });
};

    const renderCell = (detail, index, field) => {
        if (!isEditing) {
            switch(field) {
                case 'quantity':
                case 'max':
                case 'min':
                    return detail[field] || '0';
                default:
                    return detail[field] || '-';
            }
        } else {
            const value = editingDetails[index]?.[field] || '';
            
            switch(field) {
                case 'quantity':
                case 'max':
                case 'min':
                    return (
                        <input
                            type="number"
                            step="1"
                            className="input input-bordered input-xs w-full"
                            value={value}
                            onChange={(e) => handleDetailChange(index, field, e.target.value)}
                        />
                    );
                default:
                    return (
                        <input
                            type="text"
                            className="input input-bordered input-xs w-full"
                            value={value}
                            onChange={(e) => handleDetailChange(index, field, e.target.value)}
                        />
                    );
            }
        }
    };

    const handleAddQuantity = async () => {
        if (selectedItems.length === 0) {
            alert("Please add at least one item to the table");
            return;
        }

        const invalidItems = selectedItems.filter(item => !item.quantityToAdd || parseFloat(item.quantityToAdd) <= 0);
        if (invalidItems.length > 0) {
            alert("Please enter valid quantities for all items");
            return;
        }

        setIsAddingQuantity(true);

        router.post(route('consumable.addQuantityBulk'), {
            items: selectedItems.map(item => ({
                detail_id: item.id,
                quantity: parseFloat(item.quantityToAdd)
            }))
        }, {
            preserveState: true,
            preserveScroll: true,
            onSuccess: () => {
                alert(`Successfully updated ${selectedItems.length} item(s)`);
                
                setIsQuantityModalOpen(false);
                setSelectedItems([]);
                setQuantitySearchQuery("");
                setFilteredItems([]);
            },
            onError: (errors) => {
                console.error('Error adding quantities:', errors);
                alert('Failed to add quantities');
            },
            onFinish: () => {
                setIsAddingQuantity(false);
            }
        });
    };

    const handleAddToTable = () => {
        if (!selectedItem) {
            alert("Please select an item first");
            return;
        }

        const exists = selectedItems.find(item => item.id === selectedItem.id);
        if (exists) {
            alert("This item is already in the table");
            return;
        }

        setSelectedItems(prev => [...prev, {
            ...selectedItem,
            quantityToAdd: ""
        }]);

        setSelectedItem(null);
        setQuantitySearchQuery("");
        setFilteredItems([]);
    };

    const handleTableQuantityChange = (itemId, quantity) => {
        setSelectedItems(prev => prev.map(item => 
            item.id === itemId ? { ...item, quantityToAdd: quantity } : item
        ));
    };

    const handleRemoveFromTable = (itemId) => {
        setSelectedItems(prev => prev.filter(item => item.id !== itemId));
    };
    

    return (
        <AuthenticatedLayout>
            <Head title="Consumables and Spare Parts" />

            <div className="space-y-6">
                {/* Header with Title and Buttons */}
                <div className="flex justify-between items-center">
                    <h1 className="text-2xl font-bold">Consumables and Spare Parts</h1>
                    
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
                            onClick={() => setIsQuantityModalOpen(true)}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                            </svg>
                            Add Quantity
                        </button>

                        <button 
                            className="btn btn-primary"
                            onClick={handleOpenModal}
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
                            placeholder="Search consumables..." 
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
                                <th>Material Description</th>
                                <th>Category</th>
                                <th>UOM</th>
                                <th className="text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {consumableItems.length > 0 ? (
                                consumableItems.map((item, index) => (
                                    <tr key={item.consumable_id || index}>
                                        <td>
                                            {editingItemId === item.consumable_id ? (
                                                <input
                                                    type="text"
                                                    name="material_description"
                                                    className="input input-bordered input-sm w-full"
                                                    value={editFormData.material_description}
                                                    onChange={handleEditInputChange}
                                                />
                                            ) : (
                                                item.material_description || '-'
                                            )}
                                        </td>
                                        <td>
                                            {editingItemId === item.consumable_id ? (
                                                <input
                                                    type="text"
                                                    name="category"
                                                    className="input input-bordered input-sm w-full"
                                                    value={editFormData.category}
                                                    onChange={handleEditInputChange}
                                                />
                                            ) : (
                                                item.category || '-'
                                            )}
                                        </td>
                                        <td>
                                            {editingItemId === item.consumable_id ? (
                                                <input
                                                    type="text"
                                                    name="uom"
                                                    className="input input-bordered input-sm w-full"
                                                    value={editFormData.uom}
                                                    onChange={handleEditInputChange}
                                                />
                                            ) : (
                                                item.uom || '-'
                                            )}
                                        </td>
                                        <td className="text-center">
                                            <div className="flex justify-center gap-2">
                                                {editingItemId === item.consumable_id ? (
                                                    <>
                                                        <button 
                                                            className="btn btn-sm btn-success"
                                                            onClick={() => handleSaveEdit(item)}
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 011.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                            </svg>
                                                            Save
                                                        </button>
                                                        <button 
                                                            className="btn btn-sm btn-ghost"
                                                            onClick={handleCancelEdit}
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                                            </svg>
                                                            Cancel
                                                        </button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <div className="flex gap-2 justify-center">
                                                            <button
                                                                className="btn btn-sm btn-ghost"
                                                                title="View Details"
                                                                onClick={() => handleView(item.consumable_id)}
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
                                                            <button
                                                                onClick={() => handleEditClick(item)}
                                                                className="btn btn-sm btn-ghost"
                                                                title="Edit"
                                                            >
                                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                                                </svg>
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteClick(item)}
                                                                className="btn btn-sm btn-ghost text-error"
                                                                title="Delete"
                                                            >
                                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                                                </svg>
                                                            </button>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" className="text-center py-8 text-gray-500">
                                        No consumable items found
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
                                onClick={() => router.get(route('consumable'), {
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
                                            onClick={() => router.get(route('consumable'), {
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
                                onClick={() => router.get(route('consumable'), {
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

            {/* Add Item Modal */}
            {isModalOpen && (
                <div className="modal modal-open">
                    <div className="modal-box">
                        <h3 className="font-bold text-lg mb-4">
                            {isAddingToExisting ? 'Add New Item - Step 1' : 'Add New Item'}
                        </h3>
                        
                        {isAddingToExisting && (
                            <div className="alert alert-info mb-4">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                </svg>
                                <span>Adding detail to consumable ID: {existingConsumableId}</span>
                            </div>
                        )}
                        
                        <div className="space-y-4">
                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text">Material Description *</span>
                                </label>
                                <input 
                                    type="text" 
                                    name="material_description"
                                    placeholder="Enter material description" 
                                    className="input input-bordered w-full"
                                    value={formData.material_description}
                                    onChange={handleInputChange}
                                    disabled={isAddingToExisting}
                                />
                            </div>

                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text">Category *</span>
                                </label>
                                <input 
                                    type="text" 
                                    name="category"
                                    placeholder="Enter category" 
                                    className="input input-bordered w-full"
                                    value={formData.category}
                                    onChange={handleInputChange}
                                    disabled={isAddingToExisting}
                                />
                            </div>

                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text">Unit of Measure (UOM) *</span>
                                </label>
                                <input 
                                    type="text" 
                                    name="uom"
                                    placeholder="e.g., pcs, kg, box" 
                                    className="input input-bordered w-full"
                                    value={formData.uom}
                                    onChange={handleInputChange}
                                    disabled={isAddingToExisting}
                                />
                            </div>
                        </div>

                        <div className="modal-action">
                            <button 
                                className="btn btn-ghost"
                                onClick={handleCloseModal}
                            >
                                Close
                            </button>
                            <button 
                                className="btn btn-primary"
                                onClick={handleNext}
                            >
                                Next
                            </button>
                        </div>
                    </div>
                </div>
            )}

{/* View Item Modal */}
{isViewModalOpen && viewingItem && (
    <div className="modal modal-open">
        <div className="modal-box max-w-6xl">
            <h3 className="font-bold text-lg mb-4">View Item Details</h3>
            
            {/* Item Info Card */}
            <div className="card bg-base-200 shadow-md mb-6">
                <div className="card-body">
                    <h4 className="card-title text-base">Item Info</h4>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-2">
                        <div>
                            <span className="text-sm font-semibold text-gray-600">ID:</span>
                            <p className="text-sm mt-1">{viewingItem.consumable_id || '-'}</p>
                        </div>
                        <div>
                            <span className="text-sm font-semibold text-gray-600">Material Description:</span>
                            <p className="text-sm mt-1">{viewingItem.material_description || '-'}</p>
                        </div>
                        <div>
                            <span className="text-sm font-semibold text-gray-600">Category:</span>
                            <p className="text-sm mt-1">{viewingItem.category || '-'}</p>
                        </div>
                        <div>
                            <span className="text-sm font-semibold text-gray-600">UOM:</span>
                            <p className="text-sm mt-1">{viewingItem.uom || '-'}</p>
                        </div>
                    </div>
                </div>
            </div>
            

            {/* Details Table */}
            <div className="overflow-x-auto">
                <div className="flex justify-between items-center mb-2">
                    <h4 className="font-semibold">Consumable Details</h4>
                    <div className="flex gap-2">
                        <button 
                            className="btn btn-sm btn-primary"
                            onClick={handleAddItemToExisting}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                            </svg>
                            Add Detail
                        </button>
                        
                        {!isEditing ? (
                            <button 
                                className="btn btn-sm btn-secondary"
                                onClick={handleEdit}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                </svg>
                                Edit Details
                            </button>
                        ) : (
                            <>
                                <button 
                                    className="btn btn-sm btn-success"
                                    onClick={handleBulkSave}
                                    disabled={isSaving}
                                >
                                    {isSaving ? (
                                        <>
                                            <span className="loading loading-spinner loading-xs mr-1"></span>
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 011.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                            </svg>
                                            Save All Changes
                                        </>
                                    )}
                                </button>
                                <button 
                                    className="btn btn-sm btn-ghost"
                                    onClick={handleCancelEditInModal}
                                >
                                    Cancel
                                </button>
                            </>
                        )}
                    </div>
                </div>
                <table className="table table-zebra w-full table-sm">
                    <thead>
                        <tr>
                            <th>Item Code</th>
                            <th>Detailed Description</th>
                            <th>Serial</th>
                            <th>Bin Location</th>
                            <th>Qty</th>
                            <th>Max</th>
                            <th>Min</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {editingDetails.length > 0 ? (
                            editingDetails.map((detail, index) => (
                                <tr key={detail.id || index}>
                                    <td>{renderCell(detail, index, 'item_code')}</td>
                                    <td>{renderCell(detail, index, 'detailed_description')}</td>
                                    <td>{renderCell(detail, index, 'serial')}</td>
                                    <td>{renderCell(detail, index, 'bin_location')}</td>
                                    <td>{renderCell(detail, index, 'quantity')}</td>
                                    <td>{renderCell(detail, index, 'max')}</td>
                                    <td>{renderCell(detail, index, 'min')}</td>
                                    <td>
                                        {!isEditing && (
                                            <div className="flex gap-2">
                                                <button
                                                    className="btn btn-sm btn-ghost"
                                                    title="View History"
                                                    onClick={() => handleViewDetailHistory(detail)}
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                                    </svg>
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteDetailClick(detail)}
                                                    className="btn btn-sm btn-ghost text-error"
                                                    title="Delete"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                                    </svg>
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="8" className="text-center py-4 text-gray-500">
                                    No details found
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal Footer */}
            <div className="modal-action">
                <button 
                    className="btn btn-ghost"
                    onClick={handleCloseViewModal}
                >
                    Close
                </button>
            </div>
        </div>
    </div>
)}

            {/* Second Modal - Step 2: Additional Item Details */}
            {isSecondModalOpen && (
                <div className="modal modal-open">
                    <div className="modal-box max-w-2xl">
                        <h3 className="font-bold text-lg mb-4">
                            {isAddingToExisting ? `Add Detail to Item` : 'Add New Item - Step 2'}
                        </h3>
                        
                        {isAddingToExisting && (
                            <div className="alert alert-info mb-4">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                </svg>
                                <div className="text-sm">
                                    <p>Adding new detail to existing consumable:</p>
                                    <p className="font-semibold">ID: {existingConsumableId}</p>
                                    <p className="font-semibold">Material: {formData.material_description}</p>
                                    <p className="font-semibold">Category: {formData.category}</p>
                                </div>
                            </div>
                        )}
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text">Item Code *</span>
                                </label>
                                <input 
                                    type="text" 
                                    name="item_code"
                                    placeholder="Enter item code" 
                                    className="input input-bordered w-full"
                                    value={formData.item_code}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>

                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text">Detailed Description</span>
                                </label>
                                <input 
                                    type="text" 
                                    name="detailed_description"
                                    placeholder="Enter detailed description" 
                                    className="input input-bordered w-full"
                                    value={formData.detailed_description}
                                    onChange={handleInputChange}
                                />
                            </div>

                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text">Serial Number</span>
                                </label>
                                <input 
                                    type="text" 
                                    name="serial"
                                    placeholder="Enter serial number" 
                                    className="input input-bordered w-full"
                                    value={formData.serial}
                                    onChange={handleInputChange}
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

                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text">Quantity *</span>
                                </label>
                                <input 
                                    type="number" 
                                    name="quantity"
                                    placeholder="Enter quantity" 
                                    className="input input-bordered w-full"
                                    value={formData.quantity}
                                    onChange={handleInputChange}
                                    min="0"
                                    step="1"
                                    required
                                />
                            </div>

                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text">Maximum Quantity</span>
                                </label>
                                <input 
                                    type="number" 
                                    name="max"
                                    placeholder="Enter maximum quantity" 
                                    className="input input-bordered w-full"
                                    value={formData.max}
                                    onChange={handleInputChange}
                                    min="0"
                                    step="1"
                                />
                            </div>

                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text">Minimum Quantity</span>
                                </label>
                                <input 
                                    type="number" 
                                    name="min"
                                    placeholder="Enter minimum quantity" 
                                    className="input input-bordered w-full"
                                    value={formData.min}
                                    onChange={handleInputChange}
                                    min="0"
                                    step="1"
                                />
                            </div>

                            {!isAddingToExisting && (
                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text">Price</span>
                                    </label>
                                    <input 
                                        type="number" 
                                        step="0.01"
                                        name="price"
                                        placeholder="Enter price" 
                                        className="input input-bordered w-full"
                                        value={formData.price}
                                        onChange={handleInputChange}
                                        min="0"
                                    />
                                </div>
                            )}
                        </div>

                        <div className="modal-action">
                            {!isAddingToExisting && (
                                <button 
                                    type="button"
                                    className="btn btn-ghost"
                                    onClick={() => {
                                        setIsSecondModalOpen(false);
                                        setIsModalOpen(true);
                                    }}
                                >
                                    Back
                                </button>
                            )}
                            <button 
                                type="button"
                                className="btn btn-ghost"
                                onClick={handleCloseSecondModal}
                            >
                                Cancel
                            </button>
                            <button 
                                type="button"
                                className="btn btn-success"
                                onClick={handleSubmit}
                            >
                                {isAddingToExisting ? 'Add Detail' : 'Submit'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Quantity Modal */}
            {isQuantityModalOpen && (
                <div className="modal modal-open">
                    <div className="modal-box max-w-5xl">
                        <h3 className="font-bold text-lg mb-4">Add Quantity</h3>
                        
                        <div className="space-y-6">
                            <div className="card bg-base-200">
                                <div className="card-body p-4">
                                    <h4 className="font-semibold text-sm mb-2">Search Items</h4>
                                    <div className="form-control">
                                        <label className="label">
                                            <span className="label-text">Search by Item Code or Description</span>
                                        </label>
                                        <input 
                                            type="text" 
                                            placeholder="Enter item code or description..." 
                                            className="input input-bordered w-full"
                                            value={quantitySearchQuery}
                                            onChange={(e) => setQuantitySearchQuery(e.target.value)}
                                        />
                                        
                                        {quantitySearchQuery.trim() !== "" && (
                                            <div className="mt-2 max-h-60 overflow-y-auto border rounded-lg shadow-lg bg-base-100">
                                                {isSearching ? (
                                                    <div className="p-4 text-center">
                                                        <span className="loading loading-spinner loading-sm"></span>
                                                        <span className="ml-2">Searching...</span>
                                                    </div>
                                                ) : filteredItems.length > 0 ? (
                                                    <ul className="menu rounded-box w-full p-0">
                                                        {filteredItems.map((item) => (
                                                            <li key={item.id} className="w-full">
                                                                <button 
                                                                    className={`flex flex-col items-start p-3 hover:bg-base-200 w-full ${selectedItem?.id === item.id ? 'bg-base-200' : ''}`}
                                                                    onClick={() => {
                                                                        setSelectedItem(item);
                                                                        setQuantitySearchQuery(`${item.item_code} - ${item.detailed_description}`);
                                                                        setFilteredItems([]);
                                                                    }}
                                                                >
                                                                    <div className="flex justify-between w-full">
                                                                        <span className="font-medium">{item.item_code}</span>
                                                                        <span className="badge badge-sm">{item.consumable?.material_description}</span>
                                                                    </div>
                                                                    <span className="text-sm text-gray-600">Desc: {item.detailed_description}</span>
                                                                    <span className="text-xs text-gray-500">
                                                                        Category: {item.consumable?.category || '-'}
                                                                    </span>
                                                                    <span className="text-xs text-gray-500">
                                                                        Current Qty: {item.quantity} {item.consumable?.uom} | Bin: {item.bin_location || 'N/A'}
                                                                    </span>
                                                                </button>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                ) : (
                                                    <div className="p-4 text-center text-gray-500">
                                                        No items found matching "{quantitySearchQuery}"
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {selectedItem && (
                                        <div className="mt-4">
                                            <div className="card bg-base-100 border-2 border-primary">
                                                <div className="card-body p-3">
                                                    <div className="flex justify-between items-start">
                                                        <div className="flex-1">
                                                            <h4 className="font-bold text-sm mb-2">Selected Item</h4>
                                                            <div className="grid grid-cols-3 gap-2 text-xs">
                                                                <div>
                                                                    <p className="text-gray-600">Consumable</p>
                                                                    <p className="font-medium">{selectedItem.consumable?.material_description}</p>
                                                                </div>
                                                                <div>
                                                                    <p className="text-gray-600">Item Code</p>
                                                                    <p className="font-medium">{selectedItem.item_code}</p>
                                                                </div>
                                                                <div>
                                                                    <p className="text-gray-600">Description</p>
                                                                    <p className="font-medium">{selectedItem.detailed_description}</p>
                                                                </div>
                                                                <div>
                                                                    <p className="text-gray-600">Current Qty</p>
                                                                    <p className="font-medium">{selectedItem.quantity} {selectedItem.consumable?.uom}</p>
                                                                </div>
                                                                <div className="col-span-2">
                                                                    <p className="text-gray-600">Bin Location</p>
                                                                    <p className="font-medium">{selectedItem.bin_location || 'N/A'}</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <button 
                                                            className="btn btn-primary btn-sm ml-2"
                                                            onClick={handleAddToTable}
                                                        >
                                                            Add to Table
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="card bg-base-200">
                                <div className="card-body p-4">
                                    <div className="flex justify-between items-center mb-2">
                                        <h4 className="font-semibold text-sm">Items to Update ({selectedItems.length})</h4>
                                        {selectedItems.length > 0 && (
                                            <button 
                                                className="btn btn-ghost btn-xs"
                                                onClick={() => setSelectedItems([])}
                                            >
                                                Clear All
                                            </button>
                                        )}
                                    </div>
                                    
                                    {selectedItems.length > 0 ? (
                                        <div className="overflow-x-auto">
                                            <table className="table table-sm w-full">
                                                <thead>
                                                    <tr>
                                                        <th>Consumable</th>
                                                        <th>Item Code</th>
                                                        <th>Description</th>
                                                        <th>Current Qty</th>
                                                        <th>Add Qty</th>
                                                        <th>New Qty</th>
                                                        <th>Action</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {selectedItems.map((item) => {
                                                        const currentQty = parseFloat(item.quantity) || 0;
                                                        const addQty = parseFloat(item.quantityToAdd) || 0;
                                                        const newQty = currentQty + addQty;
                                                        
                                                        return (
                                                            <tr key={item.id}>
                                                                <td className="font-medium">{item.consumable?.material_description}</td>
                                                                <td>{item.item_code}</td>
                                                                <td>{item.detailed_description}</td>
                                                                <td>{currentQty} {item.consumable?.uom}</td>
                                                                <td>
                                                                    <input 
                                                                        type="number" 
                                                                        className="input input-bordered input-xs w-24"
                                                                        placeholder="0"
                                                                        value={item.quantityToAdd}
                                                                        onChange={(e) => handleTableQuantityChange(item.id, e.target.value)}
                                                                        min="0"
                                                                    />
                                                                </td>
                                                                <td>
                                                                    <span className={`font-semibold ${addQty > 0 ? 'text-success' : ''}`}>
                                                                        {newQty.toFixed(2)} {item.consumable?.uom}
                                                                    </span>
                                                                </td>
                                                                <td>
                                                                    <button 
                                                                        className="btn btn-ghost btn-xs text-error"
                                                                        onClick={() => handleRemoveFromTable(item.id)}
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
                                    ) : (
                                        <div className="text-center py-8 text-gray-500">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                                            </svg>
                                            <p>No items added yet</p>
                                            <p className="text-xs mt-1">Search and add items from above</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="modal-action">
                            <button 
                                className="btn btn-ghost"
                                onClick={() => {
                                    setIsQuantityModalOpen(false);
                                    setSelectedItems([]);
                                    setSelectedItem(null);
                                    setQuantitySearchQuery("");
                                    setFilteredItems([]);
                                }}
                            >
                                Cancel
                            </button>
                            <button 
                                className="btn btn-success"
                                onClick={handleAddQuantity}
                                disabled={selectedItems.length === 0 || isAddingQuantity}
                            >
                                {isAddingQuantity ? (
                                    <>
                                        <span className="loading loading-spinner loading-sm mr-2"></span>
                                        Updating...
                                    </>
                                ) : (
                                    <>
                                        Update {selectedItems.length} Item{selectedItems.length !== 1 ? 's' : ''}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {isDeleteModalOpen && itemToDelete && (
                <div className="modal modal-open">
                    <div className="modal-box">
                        <h3 className="font-bold text-lg mb-4 text-error">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 inline-block mr-2" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            Confirm Delete
                        </h3>
                        
                        <div className="alert alert-warning mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <div>
                                <h3 className="font-bold">Warning!</h3>
                                <div className="text-sm">This action cannot be undone. This will permanently delete the item and all its related details.</div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="bg-base-200 p-4 rounded-lg">
                                <p className="text-sm font-semibold mb-2">Item to delete:</p>
                                <div className="space-y-1">
                                    <p className="text-sm"><span className="font-medium">ID:</span> {itemToDelete.consumable_id}</p>
                                    <p className="text-sm"><span className="font-medium">Material:</span> {itemToDelete.material_description}</p>
                                    <p className="text-sm"><span className="font-medium">Category:</span> {itemToDelete.category}</p>
                                </div>
                            </div>

                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text font-semibold">Type <span className="text-error font-bold">CONFIRM</span> to delete:</span>
                                </label>
                                <input 
                                    type="text" 
                                    className={`input input-bordered w-full ${deleteConfirmText === "CONFIRM" ? "input-success" : deleteConfirmText.length > 0 ? "input-error" : ""}`}
                                    placeholder="Type CONFIRM here"
                                    value={deleteConfirmText}
                                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                                    autoFocus
                                />
                                {deleteConfirmText.length > 0 && deleteConfirmText !== "CONFIRM" && (
                                    <label className="label">
                                        <span className="label-text-alt text-error">Must type exactly "CONFIRM" (case-sensitive)</span>
                                    </label>
                                )}
                            </div>
                        </div>

                        <div className="modal-action">
                            <button 
                                className="btn btn-ghost"
                                onClick={handleCloseDeleteModal}
                                disabled={isDeleting}
                            >
                                Cancel
                            </button>
                            <button 
                                className="btn btn-error"
                                onClick={handleConfirmDelete}
                                disabled={deleteConfirmText !== "CONFIRM" || isDeleting}
                            >
                                {isDeleting ? (
                                    <>
                                        <span className="loading loading-spinner loading-sm mr-2"></span>
                                        Deleting...
                                    </>
                                ) : (
                                    <>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                        </svg>
                                        Delete Permanently
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Consumable Item History Modal */}
            {isHistoryModalOpen && historyItem && (
                <div className="modal modal-open">
                    <div className="modal-box max-w-4xl">
                        <h3 className="font-bold text-lg mb-4">History: {historyItem.material_description}</h3>
                        
                        <div className="mb-4 p-3 bg-base-200 rounded">
                            <p className="text-sm"><strong>ID:</strong> {historyItem.consumable_id}</p>
                            <p className="text-sm"><strong>Category:</strong> {historyItem.category}</p>
                            <p className="text-sm"><strong>UOM:</strong> {historyItem.uom}</p>
                        </div>

                        {isLoadingHistory ? (
                            <div className="flex justify-center items-center py-8">
                                <span className="loading loading-spinner loading-lg"></span>
                            </div>
                        ) : historyData.length > 0 ? (
                            <div className="overflow-x-auto max-h-96">
                                <table className="table table-sm w-full">
                                    <thead className="sticky top-0 bg-base-200">
                                        <tr>
                                            <th>Date/Time</th>
                                            <th>Action</th>
                                            <th>User</th>
                                            <th>Changes</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {historyData.map((record, index) => (
                                            <tr key={record.id || index}>
                                                <td className="text-xs">
                                                    {new Date(record.created_at).toLocaleString()}
                                                </td>
                                                <td>
                                                    <span className={`badge badge-sm ${
                                                        record.action === 'created' ? 'badge-success' :
                                                        record.action === 'updated' ? 'badge-warning' :
                                                        'badge-error'
                                                    }`}>
                                                        {record.action}
                                                    </span>
                                                </td>
                                                <td className="text-xs">{record.user_name}</td>
                                                <td className="text-xs">
                                                    {record.action === 'created' && (
                                                        <span className="text-success">Item created</span>
                                                    )}
                                                    {record.action === 'updated' && record.changes && (
                                                        <div className="space-y-1">
                                                            {record.changes.map((field, i) => (
                                                                <div key={i}>
                                                                    <strong>{field}:</strong>
                                                                    <span className="text-error ml-1">
                                                                        {record.old_values?.[field] || 'N/A'}
                                                                    </span>
                                                                    →
                                                                    <span className="text-success ml-1">
                                                                        {record.new_values?.[field] || 'N/A'}
                                                                    </span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                    {record.action === 'deleted' && (
                                                        <span className="text-error">Item deleted</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="text-center py-8 text-gray-500">
                                No history records found
                            </div>
                        )}

                        <div className="modal-action">
                            <button className="btn" onClick={handleCloseHistoryModal}>
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Detail History Modal */}
            {isDetailHistoryModalOpen && detailHistoryItem && (
                <div className="modal modal-open">
                    <div className="modal-box max-w-5xl">
                        <h3 className="font-bold text-lg mb-4">
                            Detail History: {detailHistoryItem.item_code}
                        </h3>
                        
                        <div className="mb-4 p-3 bg-base-200 rounded">
                            <div className="grid grid-cols-2 gap-2 text-sm">
                                <p><strong>Consumable:</strong> {detailHistoryItem.consumable?.material_description}</p>
                                <p><strong>Description:</strong> {detailHistoryItem.detailed_description}</p>
                                <p><strong>Current Qty:</strong> {detailHistoryItem.quantity} {detailHistoryItem.consumable?.uom}</p>
                                <p><strong>Bin Location:</strong> {detailHistoryItem.bin_location || 'N/A'}</p>
                            </div>
                        </div>

                        {isLoadingHistory ? (
                            <div className="flex justify-center items-center py-8">
                                <span className="loading loading-spinner loading-lg"></span>
                            </div>
                        ) : detailHistoryData.length > 0 ? (
                            <div className="overflow-x-auto max-h-96">
                                <table className="table table-sm w-full">
                                    <thead className="sticky top-0 bg-base-200">
                                        <tr>
                                            <th>Date/Time</th>
                                            <th>Action</th>
                                            <th>User</th>
                                            <th>Changes</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {detailHistoryData.map((record, index) => (
                                            <tr key={record.id || index}>
                                                <td className="text-xs">
                                                    {new Date(record.created_at).toLocaleString()}
                                                </td>
                                                <td>
                                                    <span className={`badge badge-sm ${
                                                        record.action === 'created' ? 'badge-success' :
                                                        record.action === 'updated' ? 'badge-warning' :
                                                        'badge-error'
                                                    }`}>
                                                        {record.action}
                                                    </span>
                                                </td>
                                                <td className="text-xs">{record.user_name}</td>
                                                <td className="text-xs">
                                                    {record.action === 'created' && (
                                                        <span className="text-success">Detail created</span>
                                                    )}
                                                    {record.action === 'updated' && record.changes && (
                                                        <div className="space-y-1">
                                                            {record.changes.map((field, i) => (
                                                                <div key={i}>
                                                                    <strong>{field}:</strong>
                                                                    <span className="text-error ml-1">
                                                                        {String(record.old_values?.[field] || 'N/A')}
                                                                    </span>
                                                                    →
                                                                    <span className="text-success ml-1">
                                                                        {String(record.new_values?.[field] || 'N/A')}
                                                                    </span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                    {record.action === 'deleted' && (
                                                        <span className="text-error">Detail deleted</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="text-center py-8 text-gray-500">
                                No history records found
                            </div>
                        )}

                        <div className="modal-action">
                            <button className="btn" onClick={handleCloseDetailHistoryModal}>
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Detail Confirmation Modal */}
            {isDeleteDetailModalOpen && detailToDelete && (
                <div className="modal modal-open">
                    <div className="modal-box">
                        <h3 className="font-bold text-lg mb-4 text-error">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 inline-block mr-2" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            Confirm Delete Detail
                        </h3>
                        
                        <div className="alert alert-warning mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <div>
                                <h3 className="font-bold">Warning!</h3>
                                <div className="text-sm">This action cannot be undone. This will permanently delete this detail.</div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="bg-base-200 p-4 rounded-lg">
                                <p className="text-sm font-semibold mb-2">Detail to delete:</p>
                                <div className="space-y-1">
                                    <p className="text-sm"><span className="font-medium">Consumable:</span> {detailToDelete.consumable?.material_description}</p>
                                    <p className="text-sm"><span className="font-medium">Item Code:</span> {detailToDelete.item_code}</p>
                                    <p className="text-sm"><span className="font-medium">Description:</span> {detailToDelete.detailed_description}</p>
                                    <p className="text-sm"><span className="font-medium">Quantity:</span> {detailToDelete.quantity} {detailToDelete.consumable?.uom}</p>
                                </div>
                            </div>

                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text font-semibold">Type <span className="text-error font-bold">CONFIRM</span> to delete:</span>
                                </label>
                                <input 
                                    type="text" 
                                    className={`input input-bordered w-full ${deleteDetailConfirmText === "CONFIRM" ? "input-success" : deleteDetailConfirmText.length > 0 ? "input-error" : ""}`}
                                    placeholder="Type CONFIRM here"
                                    value={deleteDetailConfirmText}
                                    onChange={(e) => setDeleteDetailConfirmText(e.target.value)}
                                    autoFocus
                                />
                                {deleteDetailConfirmText.length > 0 && deleteDetailConfirmText !== "CONFIRM" && (
                                    <label className="label">
                                        <span className="label-text-alt text-error">Must type exactly "CONFIRM" (case-sensitive)</span>
                                    </label>
                                )}
                            </div>
                        </div>

                        <div className="modal-action">
                            <button 
                                className="btn btn-ghost"
                                onClick={handleCloseDeleteDetailModal}
                                disabled={isDeletingDetail}
                            >
                                Cancel
                            </button>
                            <button 
                                className="btn btn-error"
                                onClick={handleConfirmDeleteDetail}
                                disabled={deleteDetailConfirmText !== "CONFIRM" || isDeletingDetail}
                            >
                                {isDeletingDetail ? (
                                    <>
                                        <span className="loading loading-spinner loading-sm mr-2"></span>
                                        Deleting...
                                    </>
                                ) : (
                                    <>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                        </svg>
                                        Delete Permanently
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}