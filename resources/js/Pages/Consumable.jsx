import { Head, usePage, router } from "@inertiajs/react";
import { useState, useMemo } from "react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import axios from "axios";

export default function Consumable({ consumables }) {
    const props = usePage().props;
    const [searchQuery, setSearchQuery] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isAddQuantityModalOpen, setIsAddQuantityModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false); // NEW
    const [itemSearchQuery, setItemSearchQuery] = useState("");
    const [showDropdown, setShowDropdown] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [deletingItem, setDeletingItem] = useState(null);
    const [deleteConfirmation, setDeleteConfirmation] = useState("");
    const [selectedItemHistory, setSelectedItemHistory] = useState(null); // NEW
    const [historyData, setHistoryData] = useState([]); // NEW
    const [isLoadingHistory, setIsLoadingHistory] = useState(false); // NEW

    const handleCloseHistoryModal = () => {
    setIsHistoryModalOpen(false);
    setSelectedItemHistory(null);
    setHistoryData([]);
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
        itemId: "",
        Itemcode: "",
        currentQuantity: 0,
        addAmount: ""
    });

    const data = consumables || [];

    // Filter data based on search query
    const filteredData = data.filter(item =>
        Object.values(item).some(value =>
            value != null && value.toString().toLowerCase().includes(searchQuery.toLowerCase())
        )
    );

    // Filter items for the searchable dropdown
    const filteredItems = useMemo(() => {
        return data.filter(item =>
            item.Itemcode.toLowerCase().includes(itemSearchQuery.toLowerCase()) ||
            item.mat_description.toLowerCase().includes(itemSearchQuery.toLowerCase())
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
            itemId: "",
            Itemcode: "",
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
        const itemToEdit = data.find(item => item.id === id);
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
        const itemToDelete = data.find(item => item.id === id);
        if (itemToDelete) {
            setDeletingItem(itemToDelete);
            setIsDeleteModalOpen(true);
        }
    };

    const handleViewHistory = async (id) => {
    setIsLoadingHistory(true);
    setIsHistoryModalOpen(true);
    
    try {
        // Get item details
        const item = data.find(item => item.id === id);
        setSelectedItemHistory(item);
        
        // Fetch history data
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

    // Get selected item for validation
    const selectedItem = data.find(item => item.id === addQuantityData.itemId);
    const newQuantity = addQuantityData.addAmount ? 
        addQuantityData.currentQuantity + parseFloat(addQuantityData.addAmount) : 
        addQuantityData.currentQuantity;
    const exceedsMaximum = selectedItem && newQuantity > parseFloat(selectedItem.maximum);

    return (
        <AuthenticatedLayout>
            <Head title="Consumable" />

            <div className="space-y-6">
                {/* Header with Title and Add Buttons */}
                <div className="flex justify-between items-center">
                    <h1 className="text-2xl font-bold">Consumable</h1>
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
                        placeholder="Search consumables..."
                        className="input input-bordered w-full"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                {/* Data Table */}
                <div className="overflow-x-auto bg-base-100 rounded-lg shadow">
                    <table className="table table-zebra w-full">
                        <thead>
                            <tr>
                                <th>Item Code</th>
                                <th>Description</th>
                                <th>Long Description</th>
                                <th>Bin Location</th>
                                <th>Supplier</th>
                                <th>Category</th>
                                <th>Quantity</th>
                                <th>UOM</th>
                                <th>Maximum</th>
                                <th>Minimum</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredData.length > 0 ? (
                                filteredData.map((item) => (
                                    <tr key={item.id}>
                                        <td className="font-semibold">{item.Itemcode}</td>
                                        <td>{item.mat_description}</td>
                                        <td>{item.Long_description}</td>
                                        <td>
                                            <span className="badge badge-outline">{item.Bin_location}</span>
                                        </td>
                                        <td>{item.supplier}</td>
                                        <td>
                                            <span className="badge badge-primary badge-sm">{item.category}</span>
                                        </td>
                                        <td>
                                            <span className={`font-semibold ${parseFloat(item.qty) < parseFloat(item.minimum) ? 'text-error' : 'text-success'}`}>
                                                {parseFloat(item.qty).toFixed(2)}
                                            </span>
                                        </td>
                                        <td>{item.uom}</td>
                                        <td>{parseFloat(item.maximum).toFixed(2)}</td>
                                        <td>{parseFloat(item.minimum).toFixed(2)}</td>
                                        <td>
                                            <div className="flex gap-2">
                                                {/* NEW: History Button */}
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
                                    <td colSpan="11" className="text-center py-8 text-base-content/60">
                                        No consumables found
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

            {/* Add Quantity Modal */}
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
                                                    <div className="font-semibold text-sm">{item.Itemcode}</div>
                                                    <div className="text-xs text-base-content/60">{item.mat_description}</div>
                                                    <div className="flex gap-2 mt-1">
                                                        <span className="badge badge-sm badge-outline">{item.category}</span>
                                                        <span className="text-xs text-base-content/60">Qty: {parseFloat(item.qty).toFixed(2)} {item.uom}</span>
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
                                            <div>Current Quantity: {addQuantityData.currentQuantity.toFixed(2)} {selectedItem?.uom}</div>
                                            <div>Maximum: {parseFloat(selectedItem?.maximum).toFixed(2)}</div>
                                            <div>Minimum: {parseFloat(selectedItem?.minimum).toFixed(2)}</div>
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
                                    step="0.01"
                                    value={addQuantityData.addAmount}
                                    onChange={(e) => setAddQuantityData(prev => ({
                                        ...prev,
                                        addAmount: e.target.value
                                    }))}
                                    className="input input-bordered w-full"
                                    min="0.01"
                                    placeholder="Enter quantity to add"
                                    required
                                    disabled={!addQuantityData.itemId}
                                />
                            </div>

                            {/* New Quantity Preview */}
                            {addQuantityData.addAmount && addQuantityData.itemId && (
                                <div className={`alert ${exceedsMaximum ? 'alert-warning' : 'alert-success'} mb-4`}>
                                    <div>
                                        <div className="font-semibold">New Quantity: {newQuantity.toFixed(2)} {selectedItem?.uom}</div>
                                        {exceedsMaximum && (
                                            <div className="text-sm mt-1">
                                                ⚠️ Warning: New quantity exceeds maximum limit of {parseFloat(selectedItem?.maximum).toFixed(2)}
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