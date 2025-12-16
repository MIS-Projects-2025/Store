import { useState, useRef, useEffect } from 'react';
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head, router } from "@inertiajs/react";

// ---------------- SEARCHABLE SELECT COMPONENT ----------------
const SearchableSelect = ({ options, value, onChange, placeholder = "Search..." }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const dropdownRef = useRef(null);

    const filteredOptions = options.filter(option =>
        option.description.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const selectedOption = options.find(opt => opt.supplies_no === value);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
                setSearchTerm('');
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative w-full" ref={dropdownRef}>
            <div
                className="input input-bordered input-sm w-full cursor-pointer flex items-center justify-between"
                onClick={() => setIsOpen(!isOpen)}
            >
                <span className="truncate flex-1">
                    {selectedOption ? selectedOption.description : placeholder}
                </span>
                <svg
                    className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </div>

            {isOpen && (
                <div className="absolute z-[9999] w-full mt-1 bg-base-100 border border-base-300 rounded-lg shadow-lg max-h-60 overflow-hidden">
                    <div className="p-2 border-b border-base-300">
                        <input
                            type="text"
                            className="input input-bordered input-sm w-full"
                            placeholder="Search..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            autoFocus
                        />
                    </div>
                    <div className="overflow-y-auto max-h-48">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((option, i) => (
                                <div
                                    key={i}
                                    className={`px-3 py-2 cursor-pointer hover:bg-base-200 ${
                                        option.supplies_no === value ? 'bg-base-200 font-semibold' : ''
                                    }`}
                                    onClick={() => {
                                        onChange(option);
                                        setIsOpen(false);
                                        setSearchTerm('');
                                    }}
                                >
                                    {option.description}
                                </div>
                            ))
                        ) : (
                            <div className="px-3 py-2 text-gray-500">No results found</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

// ---------------- HELPERS ----------------
const groupSupplies = (supplies) => {
    const map = {};
    supplies.forEach(item => {
        const key = `${item.material_description}-${item.uom}`;
        if (!map[key]) {
            map[key] = {
                material_description: item.material_description,
                uom: item.uom,
                suppliesNos: []
            };
        }
        map[key].suppliesNos.push(item.supplies_no);
    });
    return Object.values(map);
};

// ---------------- MAIN COMPONENT ----------------
export default function Supplies({ supplies, suppliesDetails, suppliesHistory, suppliesDetailsHistory }) {
    const groupedSupplies = groupSupplies(supplies);
    const [isViewDetailsModalOpen, setIsViewDetailsModalOpen] = useState(false);
    const [isAddQuantityModalOpen, setIsAddQuantityModalOpen] = useState(false);
    const [isAddMaterialModalOpen, setIsAddMaterialModalOpen] = useState(false);
    const [isAddMaterialDetailsModalOpen, setIsAddMaterialDetailsModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [selectedVariants, setSelectedVariants] = useState({});
    const [isEditMode, setIsEditMode] = useState(false);
    const [editedData, setEditedData] = useState({});
    const [selectedSupplyForQuantity, setSelectedSupplyForQuantity] = useState(null);
    const [newMaterial, setNewMaterial] = useState({ materialDescription: '', uom: '' });
    const [editingRowId, setEditingRowId] = useState(null);
    const [editingRowData, setEditingRowData] = useState({});
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [historyMaterial, setHistoryMaterial] = useState(null);
    const [selectedDetailForHistory, setSelectedDetailForHistory] = useState(null);
    const [quantitiesToAdd, setQuantitiesToAdd] = useState({});

    const getHistoryForDetail = () => {
        if (!selectedDetailForHistory) return [];
        return suppliesDetailsHistory.filter(item => 
            item.item_code === selectedDetailForHistory.itemCode &&
            item.supplies_no === selectedDetailForHistory.supplies_no
        ).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    };

const handleDeleteDetail = (itemCode, supplies_no) => {
    if (confirm(`Are you sure you want to delete this detail? Item Code: ${itemCode}, Supply No: ${supplies_no}`)) {
        router.delete(route('supplies.details.destroy', [supplies_no, itemCode]), {
            onSuccess: () => {
                alert('Detail deleted successfully!');
            },
            onError: (errors) => {
                alert('Failed to delete detail: ' + Object.values(errors).join(', '));
            }
        });
    }
};

    const openHistoryModal = (row) => {
        console.log('Opening history for material:', row); // Debug log
        setHistoryMaterial(row);
        setSelectedDetailForHistory(null);
        setIsHistoryModalOpen(true);
    };   

    const openDetailHistoryModal = (detail) => {
        setSelectedDetailForHistory(detail);
        setIsHistoryModalOpen(true);
    };

    const closeHistoryModal = () => {
        setSelectedDetailForHistory(null);
        setHistoryMaterial(null);
        setIsHistoryModalOpen(false);
    };   

    const handleEditRow = (row) => {
        setEditingRowId(row.material_description + '-' + row.uom);
        setEditingRowData({
            material_description: row.material_description,
            uom: row.uom,
            supplies_no: row.suppliesNos[0] // Use first supplies_no
        });
    };

    const handleSaveRow = () => {
        router.put(route('supplies.update', editingRowData.supplies_no), { // Use supplies_no
            material_description: editingRowData.material_description,
            uom: editingRowData.uom,
        }, {
            onSuccess: () => {
                setEditingRowId(null);
                setEditingRowData({});
                alert('Row updated successfully!');
            },
            onError: (errors) => {
                alert('Failed to update: ' + Object.values(errors).join(', '));
            }
        });
    };

    const handleCancelRowEdit = () => {
        setEditingRowId(null);
        setEditingRowData({});
    };

    const openViewModal = (row) => {
        setSelectedItem(row);
        setSelectedVariants({});
        setIsEditMode(false);
        setEditedData({});
        setIsViewDetailsModalOpen(true);
    };

    const closeViewModal = () => {
        setSelectedItem(null);
        setSelectedVariants({});
        setIsEditMode(false);
        setEditedData({});
        setIsViewDetailsModalOpen(false);
    };

    const getDetailsForModal = () => {
        if (!selectedItem) return [];
        return suppliesDetails.filter(d =>
            selectedItem.suppliesNos.includes(d.supplies_no)
        );
    };

    const getHistoryForMaterial = () => {
        if (!historyMaterial) return [];
        
        // Get all supplies_no for this material
        const suppliesNos = historyMaterial.suppliesNos || [];
        
        // Filter history for all supplies_no that belong to this material
        return suppliesHistory.filter(item => 
            suppliesNos.includes(item.supplies_no)
        ).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    };

    const groupDetailsByItemCode = (details) => {
        const map = {};
        details.forEach(d => {
            if (!map[d.item_code]) {
                map[d.item_code] = { itemCode: d.item_code, variants: [] };
            }
            map[d.item_code].variants.push({
                id: d.id,
                supplies_no: d.supplies_no,
                description: d.detailed_description,
                qty: Number(d.qty),
                min: d.min,
                max: d.max,
                price: d.price
            });
        });
        return Object.values(map);
    };

const handleEditToggle = () => {
    setIsEditMode(!isEditMode);
    if (!isEditMode) {
        const initialData = {};
        groupDetailsByItemCode(getDetailsForModal()).forEach(item => {
            const selected = selectedVariants[item.itemCode] || item.variants[0];
            initialData[item.itemCode] = {
                id: selected.id,
                supplies_no: selected.supplies_no, // Add this
                item_code: item.itemCode, // Add this
                qty: selected.qty,
                min: selected.min,
                max: selected.max,
                price: selected.price
            };
        });
        setEditedData(initialData);
    }
};

    const handleFieldChange = (itemCode, field, value) => {
        setEditedData(prev => ({
            ...prev,
            [itemCode]: { ...prev[itemCode], [field]: value }
        }));
    };

const handleSaveChanges = () => {
    const detailsToUpdate = Object.values(editedData).map(data => ({
        supplies_no: data.supplies_no,
        item_code: data.item_code,
        min: data.min,
        max: data.max,
        price: data.price
    }));

    console.log('Sending details to update:', detailsToUpdate); // Debug log

    router.post(route('supplies.details.bulk-update'), {
        details: detailsToUpdate
    }, {
        onSuccess: () => {
            setIsEditMode(false);
            alert('Changes saved successfully!');
        },
        onError: (errors) => {
            console.error('Update errors:', errors); // Debug log
            alert('Failed to save changes: ' + Object.values(errors).join(', '));
        }
    });
};

    const handleCancelEdit = () => {
        setIsEditMode(false);
        setEditedData({});
    };

    const openAddQuantityModal = () => {
        setSelectedSupplyForQuantity(null);
        setQuantitiesToAdd({});
        setIsAddQuantityModalOpen(true);
    };

    const closeAddQuantityModal = () => {
        setSelectedSupplyForQuantity(null);
        setQuantitiesToAdd({});
        setIsAddQuantityModalOpen(false);
    };

    const getDetailsForSelectedSupply = () => {
        if (!selectedSupplyForQuantity) return [];
        return suppliesDetails.filter(d => d.supplies_no === selectedSupplyForQuantity);
    };

const handleQuantityChange = (detail, value) => {
    setQuantitiesToAdd(prev => ({
        ...prev,
        [`${detail.supplies_no}-${detail.item_code}`]: {
            supplies_no: detail.supplies_no,
            item_code: detail.item_code,
            add_qty: parseInt(value) || 0
        }
    }));
};

const handleSaveQuantities = () => {
    const quantities = Object.values(quantitiesToAdd)
        .filter(item => item.add_qty > 0);

    if (quantities.length === 0) {
        alert('Please enter quantities to add');
        return;
    }

    console.log('Sending quantities:', quantities); // Debug log

    router.post(route('supplies.add-quantity'), {
        quantities: quantities
    }, {
        onSuccess: () => {
            alert('Quantities added successfully!');
            closeAddQuantityModal();
        },
        onError: (errors) => {
            console.error('Add quantity errors:', errors); // Debug log
            alert('Failed to add quantities: ' + Object.values(errors).join(', '));
        }
    });
};

    const searchableSuppliesOptions = supplies.map(supply => {
        const details = suppliesDetails.find(d => d.supplies_no === supply.supplies_no);
        const itemCode = details ? details.item_code : 'N/A';
        const detailedDesc = details ? details.detailed_description : '';
        return {
            supplies_no: supply.supplies_no,
            description: `${itemCode} - ${supply.material_description} - ${detailedDesc}`
        };
    });

    const openAddMaterialModal = () => {
        setNewMaterial({ materialDescription: '', uom: '' });
        setIsAddMaterialModalOpen(true);
    };

    const closeAddMaterialModal = () => {
        setNewMaterial({ materialDescription: '', uom: '' });
        setIsAddMaterialModalOpen(false);
    };

    const handleNextToMaterialDetails = () => {
        if (!newMaterial.materialDescription || !newMaterial.uom) {
            alert('Please fill in all fields');
            return;
        }
        setIsAddMaterialModalOpen(false);
        setIsAddMaterialDetailsModalOpen(true);
    };

    const closeAddMaterialDetailsModal = () => {
        setIsAddMaterialDetailsModalOpen(false);
        // Don't clear newMaterial or selectedItem here - let the parent handle it
    };

    const handleSaveMaterial = (detailData) => {
        // Check if we're adding to an existing material (opened from view modal)
        if (selectedItem) {
            // Just add the detail to existing material
            const existingSupply = supplies.find(s => 
                s.material_description === selectedItem.material_description && 
                s.uom === selectedItem.uom
            );
            
            if (existingSupply) {
                router.post(route('supplies.details.store'), {
                    supplies_no: existingSupply.supplies_no,
                    item_code: detailData.itemCode,
                    detailed_description: detailData.detailedDescription,
                    qty: detailData.qty,
                    min: detailData.min,
                    max: detailData.max,
                    price: detailData.price,
                }, {
                    onSuccess: () => {
                        alert('Detail added successfully!');
                        closeAddMaterialDetailsModal();
                        setIsViewDetailsModalOpen(true); // Reopen view modal
                    },
                    onError: (errors) => {
                        alert('Failed to save detail: ' + Object.values(errors).join(', '));
                    }
                });
            }
        } else {
            // Creating new material + detail
            router.post(route('supplies.store'), {
                material_description: newMaterial.materialDescription,
                uom: newMaterial.uom,
            }, {
                preserveState: true,
                preserveScroll: true,
                onSuccess: (page) => {
                    const newSupply = page.props.supplies[page.props.supplies.length - 1];
                    
                    router.post(route('supplies.details.store'), {
                        supplies_no: newSupply.supplies_no,
                        item_code: detailData.itemCode,
                        detailed_description: detailData.detailedDescription,
                        qty: detailData.qty,
                        min: detailData.min,
                        max: detailData.max,
                        price: detailData.price,
                    }, {
                        onSuccess: () => {
                            alert('Material and details saved successfully!');
                            closeAddMaterialDetailsModal();
                        },
                        onError: (errors) => {
                            alert('Failed to save details: ' + Object.values(errors).join(', '));
                        }
                    });
                },
                onError: (errors) => {
                    alert('Failed to save material: ' + Object.values(errors).join(', '));
                }
            });
        }
    };

    const handleDeleteRow = (row) => {
        const suppliesNo = row.suppliesNos ? row.suppliesNos[0] : null; // Get first supplies_no

        if (!suppliesNo) return;

        if (confirm(`Are you sure you want to delete ${row.material_description}?`)) {
            router.delete(route('supplies.destroy', suppliesNo), { // Use supplies_no
                onSuccess: () => {
                    alert('Material deleted successfully!');
                },
                onError: (errors) => {
                    alert('Failed to delete: ' + Object.values(errors).join(', '));
                }
            });
        }
    };

    return (
        <AuthenticatedLayout>
            <Head title="Supplies" />
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <h1 className="text-2xl font-bold">Supplies</h1>
                    <div className="flex gap-2">
                        <button className="btn btn-info">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                            </svg>
                            Import Excel
                        </button>
                        <button className="btn btn-secondary" onClick={openAddQuantityModal}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                            </svg>
                            Add Quantity
                        </button>
                        <button className="btn btn-primary" onClick={openAddMaterialModal}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                            </svg>
                            Add Item
                        </button>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex gap-2 w-full md:w-auto">
                        <input type="text" placeholder="Search consumables..." className="input input-bordered w-full md:w-64" />
                        <button className="btn btn-ghost btn-circle" title="Clear search">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        </button>
                    </div>
                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <div className="flex items-center gap-2">
                            <span className="text-sm">Show</span>
                            <select className="select select-bordered select-sm">
                                <option value="5">5</option>
                                <option value="10">10</option>
                                <option value="25">25</option>
                                <option value="50">50</option>
                                <option value="100">100</option>
                            </select>
                            <span className="text-sm">entries</span>
                        </div>
                        <div className="text-sm">Showing {supplies.length} entries</div>
                    </div>
                </div>

                <div className="overflow-x-auto bg-base-100 rounded-box shadow">
                    <table className="table table-zebra w-full">
                        <thead>
                            <tr>
                                <th>Material Description</th>
                                <th>UOM</th>
                                <th className="text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {groupedSupplies.map((row, idx) => {
                                const isEditing = editingRowId === (row.material_description + '-' + row.uom);
                                
                                return (
                                    <tr key={idx}>
                                        <td>
                                            {isEditing ? (
                                                <input
                                                    type="text"
                                                    className="input input-bordered input-sm w-full"
                                                    value={editingRowData.material_description || ''}
                                                    onChange={(e) => setEditingRowData(prev => ({ ...prev, material_description: e.target.value }))}
                                                />
                                            ) : (
                                                row.material_description
                                            )}
                                        </td>
                                        <td>
                                            {isEditing ? (
                                                <input
                                                    type="text"
                                                    className="input input-bordered input-sm w-full"
                                                    value={editingRowData.uom || ''}
                                                    onChange={(e) => setEditingRowData(prev => ({ ...prev, uom: e.target.value }))}
                                                />
                                            ) : (
                                                row.uom
                                            )}
                                        </td>
                                        <td className="text-center">
                                            <div className="flex gap-2 justify-center">
                                                {isEditing ? (
                                                    <>
                                                        <button className="btn btn-sm btn-success" onClick={handleSaveRow}>
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                            </svg>
                                                        </button>
                                                        <button className="btn btn-sm btn-ghost" onClick={handleCancelRowEdit}>
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                                            </svg>
                                                        </button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <button className="btn btn-sm btn-ghost" title="View Details" onClick={() => openViewModal(row)}>
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                                                <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                                                            </svg>
                                                        </button>
                                                        <button className="btn btn-sm btn-ghost" title="View History" onClick={() => openHistoryModal(row)}>
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                                            </svg>
                                                        </button>
                                                        <button className="btn btn-sm btn-ghost" title="Edit" onClick={() => handleEditRow(row)}>
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                                            </svg>
                                                        </button>
                                                        <button className="btn btn-sm btn-ghost text-error" title="Delete" onClick={() => handleDeleteRow(row)}>
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
                            })}
                        </tbody>
                    </table>
                </div>

                {isViewDetailsModalOpen && (
                    <div className="modal modal-open">
                        <div className="modal-box max-w-6xl">
                            <h3 className="font-bold text-lg mb-4">View Item Details</h3>
                            <div className="card bg-base-200 shadow-sm mb-6">
                                <div className="card-body grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-sm text-gray-500">Material</p>
                                        <p className="font-semibold">{selectedItem.material_description}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">UOM</p>
                                        <p className="font-semibold">{selectedItem.uom}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="flex justify-between items-center mb-2">
                                <h4 className="font-semibold">Consumable Details</h4>
                                <div className="flex gap-2">
                                    <button className="btn btn-sm btn-primary" 
                                            disabled={isEditMode}
                                            onClick={() => {
                                                setIsViewDetailsModalOpen(false);
                                                setNewMaterial({
                                                    materialDescription: selectedItem.material_description,
                                                    uom: selectedItem.uom
                                                });
                                                setIsAddMaterialDetailsModalOpen(true);
                                            }}>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                                        </svg>
                                        Add Detail
                                    </button>
                                    {!isEditMode ? (
                                        <button className="btn btn-sm btn-secondary" onClick={handleEditToggle}>
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                            </svg>
                                            Edit Details
                                        </button>
                                    ) : (
                                        <>
                                            <button className="btn btn-sm btn-success" onClick={handleSaveChanges}>
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                </svg>
                                                Save All Changes
                                            </button>
                                            <button className="btn btn-sm btn-ghost" onClick={handleCancelEdit}>
                                                Cancel
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                            <table className="table table-zebra table-sm w-full">
                                <thead>
                                    <tr>
                                        <th>Item Code</th>
                                        <th>Detailed Description</th>
                                        <th>Qty</th>
                                        <th>Min</th>
                                        <th>Max</th>
                                        <th>Price</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {groupDetailsByItemCode(getDetailsForModal()).map(item => {
                                        const selected = selectedVariants[item.itemCode] || item.variants[0];
                                        const edited = editedData[item.itemCode] || {
                                            qty: selected.qty,
                                            min: selected.min,
                                            max: selected.max,
                                            price: selected.price
                                        };
                                        return (
                                            <tr key={item.itemCode}>
                                                <td>{item.itemCode}</td>
                                                <td>
                                                    {isEditMode ? (
                                                        <input type="text" className="input input-bordered input-sm w-full" value={selected.description} disabled />
                                                    ) : (
                                                        <SearchableSelect
                                                            options={item.variants}
                                                            value={selected.supplies_no}
                                                            onChange={(chosen) => {
                                                                setSelectedVariants(prev => ({ ...prev, [item.itemCode]: chosen }));
                                                            }}
                                                            placeholder="Select variant..."
                                                        />
                                                    )}
                                                </td>
                                                <td>
                                                    {isEditMode ? (
                                                        <input type="number" className="input input-bordered input-sm w-full" value={edited.qty} disabled />
                                                    ) : (
                                                        <span className="font-semibold">{selected.qty}</span>
                                                    )}
                                                </td>
                                                <td>
                                                    {isEditMode ? (
                                                        <input type="number" className="input input-bordered input-sm w-full" value={edited.min} onChange={(e) => handleFieldChange(item.itemCode, 'min', e.target.value)} />
                                                    ) : (
                                                        selected.min
                                                    )}
                                                </td>
                                                <td>
                                                    {isEditMode ? (
                                                        <input type="number" className="input input-bordered input-sm w-full" value={edited.max} onChange={(e) => handleFieldChange(item.itemCode, 'max', e.target.value)} />
                                                    ) : (
                                                        selected.max
                                                    )}
                                                </td>
                                                <td>
                                                    {isEditMode ? (
                                                        <input type="number" className="input input-bordered input-sm w-full" value={edited.price} onChange={(e) => handleFieldChange(item.itemCode, 'price', e.target.value)} />
                                                    ) : (
                                                        selected.price
                                                    )}
                                                </td>
                                                <td>
                                                    <div className="flex gap-1">
                                                        <button 
                                                            className="btn btn-xs btn-ghost" 
                                                            title="History"
                                                            onClick={() => {
                                                                setSelectedDetailForHistory({
                                                                    itemCode: item.itemCode,
                                                                    detailedDescription: selected.description,
                                                                    supplies_no: selected.supplies_no
                                                                });
                                                                setIsHistoryModalOpen(true);
                                                            }}
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                                            </svg>
                                                        </button>
                                                        <button 
                                                            className="btn btn-xs btn-ghost text-error" 
                                                            title="Delete"
                                                               onClick={() => handleDeleteDetail(item.itemCode, selected.supplies_no)}
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            <div className="modal-action">
                                <button className="btn" onClick={closeViewModal}>Close</button>
                            </div>
                        </div>
                    </div>
                )}

                {isAddQuantityModalOpen && (
                    <div className="modal modal-open">
                        <div className="modal-box max-w-4xl">
                            <h3 className="font-bold text-lg mb-4">Add Quantity</h3>
                            
                            <div className="mb-4">
                                <label className="label">
                                    <span className="label-text font-semibold">Select Supply</span>
                                </label>
                                <SearchableSelect
                                    options={searchableSuppliesOptions}
                                    value={selectedSupplyForQuantity}
                                    onChange={(option) => setSelectedSupplyForQuantity(option.supplies_no)}
                                    placeholder="Search and select a supply..."
                                />
                            </div>

                            {selectedSupplyForQuantity && (
                                <div className="overflow-x-auto">
                                    <h4 className="font-semibold mb-2">Supply Details</h4>
                                    <table className="table table-zebra table-sm w-full">
                                        <thead>
                                            <tr>
                                                <th>Supply No</th>
                                                <th>Item Code</th>
                                                <th>Description</th>
                                                <th>Current Qty</th>
                                                <th>Min</th>
                                                <th>Max</th>
                                                <th>Price</th>
                                                <th>Add Qty</th>
                                            </tr>
                                        </thead>
                                        <tbody>
{getDetailsForSelectedSupply().map((detail, idx) => (
    <tr key={idx}>
        <td>{detail.supplies_no}</td>
        <td>{detail.item_code}</td>
        <td>{detail.detailed_description}</td>
        <td>
            <span className="badge badge-neutral">{detail.qty}</span>
        </td>
        <td>{detail.min}</td>
        <td>{detail.max}</td>
        <td>₱{detail.price}</td>
        <td>
            <input
                type="number"
                className="input input-bordered input-sm w-20"
                placeholder="0"
                min="0"
                value={quantitiesToAdd[`${detail.supplies_no}-${detail.item_code}`]?.add_qty || ''}
                onChange={(e) => handleQuantityChange(detail, e.target.value)}
            />
        </td>
    </tr>
))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {!selectedSupplyForQuantity && (
                                <div className="alert alert-info">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                    </svg>
                                    <span>Please select a supply to view and add quantity.</span>
                                </div>
                            )}

                            <div className="modal-action">
                                <button className="btn" onClick={closeAddQuantityModal}>Cancel</button>
                                <button 
                                    className="btn btn-primary" 
                                    disabled={!selectedSupplyForQuantity}
                                    onClick={handleSaveQuantities}
                                >
                                    Save Changes
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {isAddMaterialModalOpen && (
                    <div className="modal modal-open">
                        <div className="modal-box max-w-md">
                            <h3 className="font-bold text-lg mb-4">Add Material</h3>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="label">
                                        <span className="label-text font-semibold">Material Description</span>
                                    </label>
                                    <input
                                        type="text"
                                        className="input input-bordered w-full"
                                        placeholder="Enter material description"
                                        value={newMaterial.materialDescription}
                                        onChange={(e) => setNewMaterial(prev => ({ ...prev, materialDescription: e.target.value }))}
                                    />
                                </div>

                                <div>
                                    <label className="label">
                                        <span className="label-text font-semibold">UOM</span>
                                    </label>
                                    <input
                                        type="text"
                                        className="input input-bordered w-full"
                                        placeholder="Enter unit of measure"
                                        value={newMaterial.uom}
                                        onChange={(e) => setNewMaterial(prev => ({ ...prev, uom: e.target.value }))}
                                    />
                                </div>
                            </div>

                            <div className="modal-action">
                                <button className="btn" onClick={closeAddMaterialModal}>Cancel</button>
                                <button className="btn btn-primary" onClick={handleNextToMaterialDetails}>
                                    Next
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {isAddMaterialDetailsModalOpen && (
                    <div className="modal modal-open">
                        <div className="modal-box max-w-4xl">
                            <h3 className="font-bold text-lg mb-4">Add Material Details</h3>
                            
                            <div className="card bg-base-200 shadow-sm mb-4">
                                <div className="card-body grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-sm text-gray-500">Material Description</p>
                                        <p className="font-semibold">
                                            {selectedItem ? selectedItem.material_description : newMaterial.materialDescription}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">UOM</p>
                                        <p className="font-semibold">
                                            {selectedItem ? selectedItem.uom : newMaterial.uom}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="label">
                                        <span className="label-text font-semibold">Item Code</span>
                                    </label>
                                    <input
                                        type="text"
                                        className="input input-bordered w-full"
                                        placeholder="Enter item code"
                                        id="itemCodeInput"
                                    />
                                </div>

                                <div>
                                    <label className="label">
                                        <span className="label-text font-semibold">Detail Description</span>
                                    </label>
                                    <input
                                        type="text"
                                        className="input input-bordered w-full"
                                        placeholder="Enter detailed description"
                                        id="detailDescriptionInput"
                                    />
                                </div>

                                <div className="grid grid-cols-4 gap-4">
                                    <div>
                                        <label className="label">
                                            <span className="label-text font-semibold">Quantity</span>
                                        </label>
                                        <input
                                            type="number"
                                            className="input input-bordered w-full"
                                            placeholder="Enter quantity"
                                            min="0"
                                            id="qtyInput"
                                        />
                                    </div>
                                    <div>
                                        <label className="label">
                                            <span className="label-text font-semibold">Maximum</span>
                                        </label>
                                        <input
                                            type="number"
                                            className="input input-bordered w-full"
                                            placeholder="Enter maximum"
                                            min="0"
                                            id="maxInput"
                                        />
                                    </div>
                                    <div>
                                        <label className="label">
                                            <span className="label-text font-semibold">Minimum</span>
                                        </label>
                                        <input
                                            type="number"
                                            className="input input-bordered w-full"
                                            placeholder="Enter minimum"
                                            min="0"
                                            id="minInput"
                                        />
                                    </div>
                                    <div>
                                        <label className="label">
                                            <span className="label-text font-semibold">Price</span>
                                        </label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <span className="text-gray-500">₱</span>
                                            </div>
                                            <input
                                                type="number"
                                                className="input input-bordered w-full pl-10"
                                                placeholder="Enter price"
                                                min="0"
                                                step="0.01"
                                                id="priceInput"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="modal-action">
                                <button className="btn" onClick={() => {
                                    closeAddMaterialDetailsModal();
                                    if (selectedItem) {
                                        // If opened from view modal, go back to view modal
                                        setIsViewDetailsModalOpen(true);
                                    } else {
                                        // If creating new material, clear everything
                                        setNewMaterial({ materialDescription: '', uom: '' });
                                    }
                                }}>Cancel</button>
                                <button 
                                    className="btn btn-primary"
                                    onClick={() => {
                                        const itemCode = document.getElementById('itemCodeInput').value;
                                        const detailedDescription = document.getElementById('detailDescriptionInput').value;
                                        const qty = document.getElementById('qtyInput').value;
                                        const min = document.getElementById('minInput').value;
                                        const max = document.getElementById('maxInput').value;
                                        const price = document.getElementById('priceInput').value;
                                        
                                        if (!itemCode || !detailedDescription || !qty || !min || !max || !price) {
                                            alert('Please fill in all fields');
                                            return;
                                        }
                                        
                                        handleSaveMaterial({
                                            itemCode,
                                            detailedDescription,
                                            qty: parseInt(qty),
                                            min: parseInt(min),
                                            max: parseInt(max),
                                            price: parseFloat(price)
                                        });
                                    }}
                                >
                                    {selectedItem ? 'Add Detail' : 'Save Material'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {isHistoryModalOpen && (
                    <div className="modal modal-open">
                        <div className="modal-box max-w-5xl">
                            {selectedDetailForHistory ? (
                                <>
                                    <h3 className="font-bold text-lg mb-4">
                                        Detail History: {selectedDetailForHistory.itemCode}
                                    </h3>
                                    
                                    <div className="mb-4 p-3 bg-base-200 rounded">
                                        <div className="grid grid-cols-2 gap-2 text-sm">
                                            <p><strong>Item Code:</strong> {selectedDetailForHistory.itemCode}</p>
                                            <p><strong>Description:</strong> {selectedDetailForHistory.detailedDescription}</p>
                                            <p><strong>Supply No:</strong> {selectedDetailForHistory.supplies_no}</p>
                                            {selectedItem && (
                                                <p><strong>Material:</strong> {selectedItem.material_description} ({selectedItem.uom})</p>
                                            )}
                                        </div>
                                    </div>

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
    {getHistoryForDetail().map((record, index) => {
        // Ensure changes is always an array
        const changes = Array.isArray(record.changes) ? record.changes : 
                       (record.changes ? [record.changes] : []);
        const oldValues = record.old_values || {};
        const newValues = record.new_values || {};
        
        return (
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
                    {record.action === 'updated' && changes.length > 0 && (
                        <div className="space-y-1">
                            {changes.map((field, i) => (
                                <div key={i} className="flex items-center gap-1">
                                    <strong className="capitalize">{field.replace(/_/g, ' ')}:</strong>
                                    <span className="text-error">
                                        {String(oldValues[field] || 'N/A')}
                                    </span>
                                    <span>→</span>
                                    <span className="text-success">
                                        {String(newValues[field] || 'N/A')}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                    {record.action === 'updated' && changes.length === 0 && (
                        <span className="text-gray-500">No changes recorded</span>
                    )}
                    {record.action === 'deleted' && (
                        <span className="text-error">Detail deleted</span>
                    )}
                </td>
            </tr>
        );
    })}
</tbody>
                                        </table>
                                    </div>
                                    
                                    {getHistoryForDetail().length === 0 && (
                                        <div className="text-center py-8 text-gray-500">
                                            No history records found
                                        </div>
                                    )}
                                </>
                            ) : historyMaterial ? (
                                <>
                                    <h3 className="font-bold text-lg mb-4">
                                        Material History: {historyMaterial.material_description}
                                    </h3>
                                    
                                    <div className="mb-4 p-3 bg-base-200 rounded">
                                        <div className="grid grid-cols-2 gap-2 text-sm">
                                            <p><strong>Material:</strong> {historyMaterial.material_description}</p>
                                            <p><strong>UOM:</strong> {historyMaterial.uom}</p>
                                            <p><strong>Supplies Count:</strong> {historyMaterial.suppliesNos?.length || 0} items</p>
                                        </div>
                                    </div>

                                    <div className="overflow-x-auto max-h-96">
                                        <table className="table table-sm w-full">
                                            <thead className="sticky top-0 bg-base-200">
                                                <tr>
                                                    <th>Date/Time</th>
                                                    <th>Action</th>
                                                    <th>User</th>
                                                    <th>Changes</th>
                                                    <th>Supply No</th>
                                                </tr>
                                            </thead>

<tbody>
    {getHistoryForMaterial().map((record, index) => {
        // Ensure changes is always an array
        const changes = Array.isArray(record.changes) ? record.changes : 
                       (record.changes ? [record.changes] : []);
        const oldValues = record.old_values || {};
        const newValues = record.new_values || {};
        
        return (
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
                        <span className="text-success">Material created</span>
                    )}
                    {record.action === 'updated' && changes.length > 0 && (
                        <div className="space-y-1">
                            {changes.map((field, i) => (
                                <div key={i} className="flex items-center gap-1">
                                    <strong className="capitalize">{field.replace(/_/g, ' ')}:</strong>
                                    <span className="text-error">
                                        {String(oldValues[field] || 'N/A')}
                                    </span>
                                    <span>→</span>
                                    <span className="text-success">
                                        {String(newValues[field] || 'N/A')}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                    {record.action === 'updated' && changes.length === 0 && (
                        <span className="text-gray-500">No changes recorded</span>
                    )}
                    {record.action === 'deleted' && (
                        <span className="text-error">Material deleted</span>
                    )}
                </td>
                <td>
                    <span className="badge badge-outline badge-sm">{record.supplies_no}</span>
                </td>
            </tr>
        );
    })}
</tbody>
                                        </table>
                                    </div>
                                    
                                    {getHistoryForMaterial().length === 0 && (
                                        <div className="text-center py-8 text-gray-500">
                                            No history records found
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="text-center py-8 text-gray-500">
                                    No history data available
                                </div>
                            )}

                            <div className="modal-action">
                                <button className="btn" onClick={closeHistoryModal}>
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AuthenticatedLayout>
    );
}