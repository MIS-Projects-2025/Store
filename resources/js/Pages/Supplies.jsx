import { Head, usePage, router } from "@inertiajs/react";
import { useState, useMemo } from "react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";

export default function Supplies({ Supplies }) {
    const props = usePage().props;
    const [searchQuery, setSearchQuery] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isAddQuantityModalOpen, setIsAddQuantityModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [itemSearchQuery, setItemSearchQuery] = useState("");
    const [showDropdown, setShowDropdown] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [deletingItem, setDeletingItem] = useState(null);
    const [deleteConfirmation, setDeleteConfirmation] = useState("");
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [selectedItemHistory, setSelectedItemHistory] = useState(null);
    const [historyData, setHistoryData] = useState([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);

    // Add this function
    const handleViewHistory = async (id) => {
        setIsLoadingHistory(true);
        setIsHistoryModalOpen(true);
        
        try {
            const response = await axios.get(`/supplies/${id}/history`);
            setHistoryData(response.data);
            const item = data.find(item => item.id === id);
            setSelectedItemHistory(item);
        } catch (error) {
            console.error('Error fetching history:', error);
        } finally {
            setIsLoadingHistory(false);
        }
    };

    
    // Updated to match model fields
    const [formData, setFormData] = useState({
        itemcode: "",
        material_description: "",
        bin_location: "",
        qty: "",
        uom: "",
        maximum: "",
        minimum: "",
        price: ""
    });
    
    const [editFormData, setEditFormData] = useState({
        itemcode: "",
        material_description: "",
        bin_location: "",
        qty: "",
        uom: "",
        maximum: "",
        minimum: "",
        price: ""
    });
    
    const [addQuantityData, setAddQuantityData] = useState({
        itemId: "",
        itemcode: "",
        currentQuantity: 0,
        addAmount: ""
    });

    const data = Supplies || [];

    // Filter data based on search query
    const filteredData = data.filter(item =>
        Object.values(item).some(value =>
            value != null && value.toString().toLowerCase().includes(searchQuery.toLowerCase())
        )
    );

    // Filter items for the searchable dropdown
    const filteredItems = useMemo(() => {
        return data.filter(item =>
            item.itemcode.toLowerCase().includes(itemSearchQuery.toLowerCase()) ||
            item.material_description.toLowerCase().includes(itemSearchQuery.toLowerCase())
        );
    }, [data, itemSearchQuery]);

    const handleAddItem = () => {
        setIsModalOpen(true);
    };

    const handleAddQuantity = () => {
        setIsAddQuantityModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setFormData({
            itemcode: "",
            material_description: "",
            bin_location: "",
            qty: "",
            uom: "",
            maximum: "",
            minimum: "",
            price: ""
        });
    };

    const handleCloseEditModal = () => {
        setIsEditModalOpen(false);
        setEditingItem(null);
        setEditFormData({
            itemcode: "",
            material_description: "",
            bin_location: "",
            qty: "",
            uom: "",
            maximum: "",
            minimum: "",
            price: ""
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
            itemId: "",
            itemcode: "",
            currentQuantity: 0,
            addAmount: ""
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
            itemcode: item.itemcode,
            currentQuantity: parseInt(item.qty), // Changed to parseInt
            addAmount: ""
        });
        setItemSearchQuery(`${item.itemcode} - ${item.material_description}`);
        setShowDropdown(false);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        router.post(route('supplies.store'), formData, {
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
        router.put(route('supplies.update', editingItem.id), editFormData, {
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
        const addAmount = parseInt(addQuantityData.addAmount); // Changed to parseInt
        
        router.post(route('supplies.addQuantity'), {
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
        const itemToEdit = data.find(item => item.id === id);
        if (itemToEdit) {
            setEditingItem(itemToEdit);
            setEditFormData({
                itemcode: itemToEdit.itemcode,
                material_description: itemToEdit.material_description,
                bin_location: itemToEdit.bin_location,
                qty: itemToEdit.qty,
                uom: itemToEdit.uom,
                maximum: itemToEdit.maximum,
                minimum: itemToEdit.minimum,
                price: itemToEdit.price || ""
            });
            setIsEditModalOpen(true);
        }
    };

    const handleDelete = (id) => {
        const itemToDelete = data.find(item => item.id === id);
        if (itemToDelete) {
            setDeletingItem(itemToDelete);
            setIsDeleteModalOpen(true);
        }
    };

    const handleConfirmDelete = (e) => {
        e.preventDefault();
        
        if (deleteConfirmation === "CONFIRM") {
            router.delete(route('supplies.destroy', deletingItem.id), {
                onSuccess: () => {
                    handleCloseDeleteModal();
                },
                onError: (errors) => {
                    console.error('Error deleting item:', errors);
                }
            });
        }
    };

    // Get selected item for validation
    const selectedItem = data.find(item => item.id === addQuantityData.itemId);
    const newQuantity = addQuantityData.addAmount ? 
        addQuantityData.currentQuantity + parseInt(addQuantityData.addAmount) : 
        addQuantityData.currentQuantity;
    const exceedsMaximum = selectedItem && newQuantity > parseInt(selectedItem.maximum);

    return (
        <AuthenticatedLayout>
            <Head title="Supplies" />

            <div className="space-y-6">
                {/* Header with Title and Add Buttons */}
                <div className="flex justify-between items-center">
                    <h1 className="text-2xl font-bold">Supplies</h1>
                    <div className="flex gap-2">
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

                {/* Search Bar */}
                <div className="form-control w-full max-w-md">
                    <input
                        type="text"
                        placeholder="Search Supplies..."
                        className="input input-bordered w-full"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                {/* Data Table - Updated column headers */}
                <div className="overflow-x-auto bg-base-100 rounded-lg shadow">
                    <table className="table table-zebra w-full">
                        <thead>
                            <tr>
                                <th>Item Code</th>
                                <th>Description</th>
                                <th>Bin Location</th>
                                <th>Quantity</th>
                                <th>UOM</th>
                                <th>Maximum</th>
                                <th>Minimum</th>
                                <th>Price</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredData.length > 0 ? (
                                filteredData.map((item) => (
                                    <tr key={item.id}>
                                        <td className="font-semibold">{item.itemcode}</td>
                                        <td>{item.material_description}</td>
                                        <td>
                                            <span className="badge badge-outline">{item.bin_location}</span>
                                        </td>
                                        <td>
                                            <span className={`font-semibold ${parseInt(item.qty) < parseInt(item.minimum) ? 'text-error' : 'text-success'}`}>
                                                {parseInt(item.qty)}
                                            </span>
                                        </td>
                                        <td>{item.uom}</td>
                                        <td>{parseInt(item.maximum)}</td>
                                        <td>{parseInt(item.minimum)}</td>
                                        <td>
                                            {item.price ? `$${parseFloat(item.price).toFixed(2)}` : '-'}
                                        </td>
                                        <td>
                                            <div className="flex gap-2">
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
                                        No Supplies found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Results Counter */}
                <div className="text-sm text-base-content/60">
                    Showing {filteredData.length} of {data.length} items
                </div>
            </div>

            {/* Add Material Modal - Updated fields */}
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
                                        name="itemcode"
                                        value={formData.itemcode}
                                        onChange={handleInputChange}
                                        className="input input-bordered w-full"
                                        required
                                    />
                                </div>

                                {/* Material Description */}
                                <div className="form-control">
                                    <label className="label pb-1">
                                        <span className="label-text font-semibold">Description</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="material_description"
                                        value={formData.material_description}
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
                                        name="bin_location"
                                        value={formData.bin_location}
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
                                        name="qty"
                                        value={formData.qty}
                                        onChange={handleInputChange}
                                        className="input input-bordered w-full"
                                        min="0"
                                        step="1"
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
                                        name="maximum"
                                        value={formData.maximum}
                                        onChange={handleInputChange}
                                        className="input input-bordered w-full"
                                        min="0"
                                        step="1"
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
                                        name="minimum"
                                        value={formData.minimum}
                                        onChange={handleInputChange}
                                        className="input input-bordered w-full"
                                        min="0"
                                        step="1"
                                        required
                                    />
                                </div>

                                {/* Price */}
                                <div className="form-control">
                                    <label className="label pb-1">
                                        <span className="label-text font-semibold">Price</span>
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        name="price"
                                        value={formData.price}
                                        onChange={handleInputChange}
                                        className="input input-bordered w-full"
                                        min="0"
                                        placeholder="Optional"
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

            {/* Edit Material Modal - Updated fields */}
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
                                        name="itemcode"
                                        value={editFormData.itemcode}
                                        className="input input-bordered w-full bg-base-200"
                                        disabled
                                    />
                                </div>

                                {/* Material Description */}
                                <div className="form-control">
                                    <label className="label pb-1">
                                        <span className="label-text font-semibold">Description</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="material_description"
                                        value={editFormData.material_description}
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
                                        name="bin_location"
                                        value={editFormData.bin_location}
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
                                        name="qty"
                                        value={parseInt(editFormData.qty)}
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
                                        name="maximum"
                                        value={editFormData.maximum}
                                        onChange={handleEditInputChange}
                                        className="input input-bordered w-full"
                                        min="0"
                                        step="1"
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
                                        name="minimum"
                                        value={editFormData.minimum}
                                        onChange={handleEditInputChange}
                                        className="input input-bordered w-full"
                                        min="0"
                                        step="1"
                                        required
                                    />
                                </div>

                                {/* Price */}
                                <div className="form-control">
                                    <label className="label pb-1">
                                        <span className="label-text font-semibold">Price</span>
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        name="price"
                                        value={editFormData.price}
                                        onChange={handleEditInputChange}
                                        className="input input-bordered w-full"
                                        min="0"
                                        placeholder="Optional"
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

            {/* Add Quantity Modal - Updated field references */}
            {isAddQuantityModalOpen && (
                <div className="modal modal-open">
                    <div className="modal-box">
                        <h3 className="font-bold text-lg mb-4">Add Quantity</h3>
                        <form onSubmit={handleAddQuantitySubmit}>
                            {/* Searchable Item Selection */}
                            <div className="form-control mb-4">
                                <label className="label">
                                    <span className="label-text font-semibold">Select Item</span>
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
                                    <div className="absolute right-3 top-3 pointer-events-none">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-base-content/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                        </svg>
                                    </div>
                                    
                                    {showDropdown && filteredItems.length > 0 && (
                                        <div className="absolute z-10 w-full mt-1 bg-base-100 border border-base-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                            {filteredItems.map((item) => (
                                                <div
                                                    key={item.id}
                                                    onClick={() => handleItemSelect(item)}
                                                    className={`px-4 py-3 cursor-pointer hover:bg-base-200 border-b border-base-300 last:border-b-0 ${
                                                        addQuantityData.itemId === item.id ? 'bg-primary/10' : ''
                                                    }`}
                                                >
                                                    <div className="font-semibold text-sm">{item.itemcode}</div>
                                                    <div className="text-xs text-base-content/60">{item.material_description}</div>
                                                    <div className="flex gap-2 mt-1">
                                                        <span className="badge badge-sm badge-outline">{item.bin_location}</span>
                                                        <span className="text-xs text-base-content/60">Qty: {parseInt(item.qty)} {item.uom}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    
                                    {showDropdown && itemSearchQuery && filteredItems.length === 0 && (
                                        <div className="absolute z-10 w-full mt-1 bg-base-100 border border-base-300 rounded-lg shadow-lg p-4 text-center text-base-content/60">
                                            No items found
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Current Quantity Display */}
                            {addQuantityData.itemId && (
                                <div className="alert alert-info mb-4">
                                    <div>
                                        <div className="font-semibold">Current Information:</div>
                                        <div className="text-sm mt-1">
                                            <div>Current Quantity: {addQuantityData.currentQuantity} {selectedItem?.uom}</div>
                                            <div>Maximum: {parseInt(selectedItem?.maximum)}</div>
                                            <div>Minimum: {parseInt(selectedItem?.minimum)}</div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Quantity to Add */}
                            <div className="form-control mb-4">
                                <label className="label">
                                    <span className="label-text font-semibold">Quantity to Add</span>
                                </label>
                                <input
                                    type="number"
                                    value={addQuantityData.addAmount}
                                    onChange={(e) => setAddQuantityData(prev => ({
                                        ...prev,
                                        addAmount: e.target.value
                                    }))}
                                    className="input input-bordered w-full"
                                    min="1"
                                    step="1"
                                    placeholder="Enter quantity to add"
                                    required
                                    disabled={!addQuantityData.itemId}
                                />
                            </div>

                            {/* New Quantity Preview */}
                            {addQuantityData.addAmount && addQuantityData.itemId && (
                                <div className={`alert ${exceedsMaximum ? 'alert-warning' : 'alert-success'} mb-4`}>
                                    <div>
                                        <div className="font-semibold">New Quantity: {newQuantity} {selectedItem?.uom}</div>
                                        {exceedsMaximum && (
                                            <div className="text-sm mt-1">
                                                ⚠️ Warning: New quantity exceeds maximum limit of {parseInt(selectedItem?.maximum)}
                                            </div>
                                        )}
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
                                    type="submit" 
                                    className="btn btn-primary"
                                    disabled={!addQuantityData.itemId}
                                >
                                    Add Quantity
                                </button>
                            </div>
                        </form>
                    </div>
                    <div className="modal-backdrop" onClick={handleCloseAddQuantityModal}></div>
                </div>
            )}

            {/* Delete Confirmation Modal - Updated field references */}
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
                                <div><span className="font-semibold">Item Code:</span> {deletingItem.itemcode}</div>
                                <div><span className="font-semibold">Description:</span> {deletingItem.material_description}</div>
                                <div><span className="font-semibold">Bin Location:</span> {deletingItem.bin_location}</div>
                                <div><span className="font-semibold">Current Quantity:</span> {parseInt(deletingItem.qty)} {deletingItem.uom}</div>
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
            {isHistoryModalOpen && (
    <div className="modal modal-open">
        <div className="modal-box max-w-4xl max-h-[80vh]">
            <h3 className="font-bold text-lg mb-4">
                History for {selectedItemHistory?.itemcode} - {selectedItemHistory?.material_description}
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
                    onClick={() => {
                        setIsHistoryModalOpen(false);
                        setHistoryData([]);
                        setSelectedItemHistory(null);
                    }}
                    className="btn btn-ghost"
                >
                    Close
                </button>
            </div>
        </div>
        <div className="modal-backdrop" onClick={() => setIsHistoryModalOpen(false)}></div>
    </div>
)}
        </AuthenticatedLayout>
    );
}