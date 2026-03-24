import { useState, useRef, useEffect } from 'react';
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head, router, usePage } from "@inertiajs/react";

// ---------------- SEARCHABLE SELECT COMPONENT ----------------
const SearchableSelect = ({ options, value, onChange, placeholder = "Search..." }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const dropdownRef = useRef(null);

    const filteredOptions = options.filter(option =>
        option.description.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const selectedOption = options.find(opt => opt.description === value);

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
                <div className="absolute z-[9999] w-full mt-1 bg-base-100 border border-base-content/20 rounded-lg shadow-lg max-h-60 overflow-hidden">
                    <div className="p-2 border-b border-base-content/20">
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
                                    className={`px-3 py-2 cursor-pointer hover:bg-base-content/10 ${
                                        option.description === value ? 'bg-base-content/10 font-semibold' : ''
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
                            <div className="px-3 py-2 text-base-content/50">No results found</div>
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
export default function Supplies({ supplies, suppliesDetails, suppliesHistory, suppliesDetailsHistory, empStation = 1 }) {
    const groupedSupplies = groupSupplies(supplies);
    const station = parseInt(empStation, 10);

    const [searchTerm, setSearchTerm] = useState('');
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
    const [isImporting, setIsImporting] = useState(false);

    const handleImport = () => {
        document.getElementById('supplies-file-input').click();
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setIsImporting(true);
            
            const formData = new FormData();
            formData.append('file', file);
            
            router.post(route('supplies.import'), formData, {
                onSuccess: () => {
                    setIsImporting(false);
                    alert('File imported successfully!');
                    e.target.value = '';
                },
                onError: (errors) => {
                    setIsImporting(false);
                    alert('Import failed: ' + (errors.file || errors.error || 'Unknown error'));
                    e.target.value = '';
                },
                onFinish: () => {
                    setIsImporting(false);
                }
            });
        }
    };

// Filter supplies based on search term (includes item codes from details)
const filteredSupplies = groupedSupplies.filter(row => {
    const term = searchTerm.toLowerCase();
    if (
        row.material_description.toLowerCase().includes(term) ||
        row.uom.toLowerCase().includes(term)
    ) return true;

    // Also match against item codes / long descriptions in related details
    return suppliesDetails.some(d =>
        row.suppliesNos.includes(d.supplies_no) && (
            (d.item_code ?? '').toLowerCase().includes(term) ||
            (d.detailed_description ?? '').toLowerCase().includes(term)
        )
    );
});

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
        if (station === 2) return;
        setEditingRowId(row.material_description + '-' + row.uom);
        setEditingRowData({
            material_description: row.material_description,
            uom: row.uom,
            supplies_no: row.suppliesNos[0]
        });
    };

    const handleSaveRow = () => {
        router.put(route('supplies.update', editingRowData.supplies_no), {
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
        const suppliesNos = historyMaterial.suppliesNos || [];
        return suppliesHistory.filter(item => 
            suppliesNos.includes(item.supplies_no)
        ).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    };

    const groupDetailsByItemCode = (details) => {
        return details.map(d => ({
            rowKey:       `${d.item_code}-${d.id}`,
            itemCode:     d.item_code,
            id:           d.id,
            supplies_no:  d.supplies_no,
            description:  d.detailed_description,
            binLocation:  d.bin_location ?? '',
            qty:          Number(d.qty),
            min:          d.min,
            max:          d.max,
            price:        d.price
        }));
    };

    const handleEditToggle = () => {
        setIsEditMode(!isEditMode);
        if (!isEditMode) {
            const initialData = {};
            groupDetailsByItemCode(getDetailsForModal()).forEach(row => {
                initialData[row.rowKey] = {
                    id:           row.id,
                    supplies_no:  row.supplies_no,
                    item_code:    row.itemCode,
                    description:  row.description,
                    binLocation:  row.binLocation,
                    qty:          row.qty ?? 0,
                    min:          row.min ?? 0,
                    max:          row.max ?? 0,
                    price:        row.price ?? 0,
                };
            });
            setEditedData(initialData);
        }
    };

    const handleFieldChange = (rowKey, field, value) => {
        setEditedData(prev => ({
            ...prev,
            [rowKey]: { ...prev[rowKey], [field]: value }
        }));
    };

    const handleSaveChanges = () => {
        const detailsToUpdate = Object.values(editedData).map(data => {
            if (station === 2) {
                return {
                    id:           data.id,
                    item_code:    data.item_code,
                    min:          parseInt(data.min) || 0,
                    max:          parseInt(data.max) || 0,
                };
            }
            return {
                id:           data.id,
                item_code:    data.item_code,
                description:  data.description,
                bin_location: data.binLocation,
                qty:          data.qty === '' || data.qty === null ? 0 : parseInt(data.qty),
                min:          parseInt(data.min) || 0,
                max:          parseInt(data.max) || 0,
                price:        parseFloat(data.price) || 0,
            };
        });

        router.post(route('supplies.details.bulk-update'), {
            details: detailsToUpdate
        }, {
            onSuccess: () => {
                setIsEditMode(false);
                alert('Changes saved successfully!');
            },
            onError: (errors) => {
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
            [`${detail.supplies_no}-${detail.item_code}-${detail.id}`]: {
                supplies_no: detail.supplies_no,
                item_code:   detail.item_code,
                add_qty:     parseInt(value) || 0,
                id:          detail.id,
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

        router.post(route('supplies.add-quantity'), {
            quantities: quantities.map(({ supplies_no, item_code, add_qty, id }) => ({
                supplies_no,
                item_code,
                add_qty,
                id,
            }))
        }, {
            onSuccess: () => {
                alert('Quantities added successfully!');
                closeAddQuantityModal();
            },
            onError: (errors) => {
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
    };

    const handleSaveMaterial = (detailData) => {
        if (selectedItem) {
            const existingSupply = supplies.find(s => 
                s.material_description === selectedItem.material_description && 
                s.uom === selectedItem.uom
            );
            
            if (existingSupply) {
                router.post(route('supplies.details.store'), {
                    supplies_no:           existingSupply.supplies_no,
                    item_code:             detailData.itemCode,
                    detailed_description:  detailData.detailedDescription,
                    bin_location:          detailData.binLocation,
                    qty:                   detailData.qty,
                    min:                   detailData.min,
                    max:                   detailData.max,
                    price:                 detailData.price,
                }, {
                    onSuccess: () => {
                        alert('Detail added successfully!');
                        closeAddMaterialDetailsModal();
                        setIsViewDetailsModalOpen(true);
                    },
                    onError: (errors) => {
                        alert('Failed to save detail: ' + Object.values(errors).join(', '));
                    }
                });
            }
} else {
    router.post(route('supplies.store-with-detail'), {
        material_description:  newMaterial.materialDescription,
        uom:                   newMaterial.uom,
        item_code:             detailData.itemCode,
        detailed_description:  detailData.detailedDescription,
        bin_location:          detailData.binLocation,
        qty:                   detailData.qty,
        min:                   detailData.min,
        max:                   detailData.max,
        price:                 detailData.price,
    }, {
        onSuccess: () => {
            alert('Material and details saved successfully!');
            closeAddMaterialDetailsModal();
        },
        onError: (errors) => {
            alert('Failed to save material: ' + Object.values(errors).join(', '));
        }
    });
}
    };

    const handleDeleteRow = (row) => {
        const suppliesNo = row.suppliesNos ? row.suppliesNos[0] : null;
        if (!suppliesNo) return;

        if (confirm(`Are you sure you want to delete ${row.material_description}?`)) {
            router.delete(route('supplies.destroy', suppliesNo), {
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
                        {station === 1 && (
                            <>
                                <button 
                                    className="btn btn-outline"
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
                                    id="supplies-file-input"
                                    type="file"
                                    accept=".xlsx,.xls,.csv"
                                    className="hidden"
                                    onChange={handleFileChange}
                                />
                            </>
                        )}
                        <button className="btn btn-outline" onClick={openAddQuantityModal}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                            </svg>
                            Add Quantity
                        </button>
                        <button className="btn btn-outline" onClick={openAddMaterialModal}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                            </svg>
                            Add Item
                        </button>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex gap-2 w-full md:w-auto">
                        <input 
                            type="text" 
                            placeholder="Search supplies..." 
                            className="input input-bordered w-full md:w-64"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <button 
                            className="btn btn-ghost btn-circle" 
                            title="Clear search"
                            onClick={() => setSearchTerm('')}
                        >
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
                        <div className="text-sm opacity-70">Showing {filteredSupplies.length} of {groupedSupplies.length} entries</div>
                    </div>
                </div>

                {/* ==================== MAIN TABLE ==================== */}
                <div className="overflow-x-auto border border-base-content/20 rounded-box">
                    <table className="table w-full [&_th]:border-b [&_th]:border-base-content/20 [&_td]:border-b [&_td]:border-base-content/20">
                        <thead>
                            <tr>
                                <th>Material Description</th>
                                <th>UOM</th>
                                <th className="text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredSupplies.map((row, idx) => {
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
                                                        <button className="btn btn-sm btn-outline" onClick={handleSaveRow}>
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
                                                        {station === 1 && (
                                                            <button className="btn btn-sm btn-ghost" title="Edit" onClick={() => handleEditRow(row)}>
                                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                                                </svg>
                                                            </button>
                                                        )}
                                                        {station === 1 && (
                                                            <button className="btn btn-sm btn-ghost opacity-60 hover:opacity-100 hover:text-error" title="Delete" onClick={() => handleDeleteRow(row)}>
                                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                                                </svg>
                                                            </button>
                                                        )}
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

                {/* ==================== VIEW DETAILS MODAL ==================== */}
                {isViewDetailsModalOpen && (
                    <div className="modal modal-open">
                        <div className="modal-box max-w-7xl">
                            <h3 className="font-bold text-lg mb-4">View Item Details</h3>

                            {/* Info card — border only, no fill */}
                            <div className="border border-base-content/20 rounded-lg mb-6">
                                <div className="p-4 grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-sm opacity-50">Material</p>
                                        <p className="font-semibold">{selectedItem.material_description}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm opacity-50">UOM</p>
                                        <p className="font-semibold">{selectedItem.uom}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-between items-center mb-2">
                                <h4 className="font-semibold">Supply Details</h4>
                                <div className="flex gap-2">
                                    {station === 1 && (
                                        <button className="btn btn-sm btn-outline" 
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
                                    )}
                                    {!isEditMode ? (
                                        <button className="btn btn-sm btn-outline" onClick={handleEditToggle}>
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                            </svg>
                                            Edit Details
                                        </button>
                                    ) : (
                                        <>
                                            <button className="btn btn-sm btn-outline" onClick={handleSaveChanges}>
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

                            <div className="overflow-x-auto overflow-y-auto max-h-96 border border-base-content/20 rounded-lg">
                                <table className="table w-full [&_th]:border-b [&_th]:border-base-content/20 [&_td]:border-b [&_td]:border-base-content/20">
                                    <thead className="sticky top-0 bg-base-100 z-10">
                                        <tr>
                                            <th>Item Code</th>
                                            <th>Long Description</th>
                                            <th>Bin Location</th>
                                            <th>Qty</th>
                                            <th>Min</th>
                                            <th>Max</th>
                                            <th>Price</th>
                                            <th>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {groupDetailsByItemCode(getDetailsForModal()).map(row => {
                                            const edited = editedData[row.rowKey] || {
                                                item_code:   row.itemCode,
                                                description: row.description,
                                                binLocation: row.binLocation,
                                                qty:         row.qty,
                                                min:         row.min,
                                                max:         row.max,
                                                price:       row.price,
                                            };
                                            return (
                                                <tr key={row.rowKey}>
                                                    {/* Item Code */}
                                                    <td>
                                                        {isEditMode ? (
                                                            station === 1 ? (
                                                                <input
                                                                    type="text"
                                                                    className="input input-bordered input-sm w-full min-w-[140px]"
                                                                    value={edited.item_code ?? row.itemCode}
                                                                    onChange={(e) => handleFieldChange(row.rowKey, 'item_code', e.target.value)}
                                                                />
                                                            ) : (
                                                                <span className="opacity-50">{row.itemCode}</span>
                                                            )
                                                        ) : (
                                                            row.itemCode
                                                        )}
                                                    </td>
                                                    {/* Long Description */}
                                                    <td>
                                                        {isEditMode ? (
                                                            station === 1 ? (
                                                                <input
                                                                    type="text"
                                                                    className="input input-bordered input-sm w-full min-w-[220px]"
                                                                    value={edited.description ?? row.description}
                                                                    onChange={(e) => handleFieldChange(row.rowKey, 'description', e.target.value)}
                                                                />
                                                            ) : (
                                                                <span className="opacity-50">{row.description}</span>
                                                            )
                                                        ) : (
                                                            row.description
                                                        )}
                                                    </td>
                                                    {/* Bin Location */}
                                                    <td>
                                                        {isEditMode ? (
                                                            station === 1 ? (
                                                                <input
                                                                    type="text"
                                                                    className="input input-bordered input-sm w-72"
                                                                    value={edited.binLocation ?? row.binLocation}
                                                                    onChange={(e) => handleFieldChange(row.rowKey, 'binLocation', e.target.value)}
                                                                />
                                                            ) : (
                                                                <span className="opacity-50">{row.binLocation || '—'}</span>
                                                            )
                                                        ) : (
                                                            <span className="badge badge-outline badge-sm">
                                                                {row.binLocation || '—'}
                                                            </span>
                                                        )}
                                                    </td>
                                                    {/* Qty */}
                                                    <td>
                                                        {isEditMode && station === 1 ? (
                                                            <input
                                                                type="number"
                                                                className="input input-bordered input-sm w-20"
                                                                value={edited.qty ?? ''}
                                                                min="0"
                                                                onChange={(e) => {
                                                                    const val = e.target.value;
                                                                    if (val === '') {
                                                                        handleFieldChange(row.rowKey, 'qty', '');
                                                                    } else {
                                                                        const num = parseInt(val);
                                                                        if (!isNaN(num) && num >= 0) {
                                                                            handleFieldChange(row.rowKey, 'qty', num);
                                                                        }
                                                                    }
                                                                }}
                                                                onBlur={(e) => {
                                                                    if (e.target.value === '' || parseInt(e.target.value) < 0) {
                                                                        handleFieldChange(row.rowKey, 'qty', 0);
                                                                    }
                                                                }}
                                                            />
                                                        ) : (
                                                            <span className="badge badge-outline badge-sm">{row.qty}</span>
                                                        )}
                                                    </td>
                                                    {/* Min */}
                                                    <td>
                                                        {isEditMode ? (
                                                            <input
                                                                type="number"
                                                                className="input input-bordered input-sm w-20"
                                                                value={edited.min}
                                                                onChange={(e) => handleFieldChange(row.rowKey, 'min', e.target.value)}
                                                            />
                                                        ) : (
                                                            row.min
                                                        )}
                                                    </td>
                                                    {/* Max */}
                                                    <td>
                                                        {isEditMode ? (
                                                            <input
                                                                type="number"
                                                                className="input input-bordered input-sm w-20"
                                                                value={edited.max}
                                                                onChange={(e) => handleFieldChange(row.rowKey, 'max', e.target.value)}
                                                            />
                                                        ) : (
                                                            row.max
                                                        )}
                                                    </td>
                                                    {/* Price */}
                                                    <td>
                                                        {isEditMode ? (
                                                            station === 1 ? (
                                                                <input
                                                                    type="number"
                                                                    className="input input-bordered input-sm w-24"
                                                                    value={edited.price}
                                                                    onChange={(e) => handleFieldChange(row.rowKey, 'price', e.target.value)}
                                                                />
                                                            ) : (
                                                                <span className="opacity-50">{row.price}</span>
                                                            )
                                                        ) : (
                                                            row.price
                                                        )}
                                                    </td>
                                                    {/* Action */}
                                                    <td>
                                                        <div className="flex gap-1">
                                                            <button
                                                                className="btn btn-xs btn-ghost"
                                                                title="History"
                                                                onClick={() => {
                                                                    setSelectedDetailForHistory({
                                                                        itemCode:            row.itemCode,
                                                                        detailedDescription: row.description,
                                                                        supplies_no:         row.supplies_no
                                                                    });
                                                                    setIsHistoryModalOpen(true);
                                                                }}
                                                            >
                                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                                                </svg>
                                                            </button>
                                                            {station === 1 && (
                                                                <button
                                                                    className="btn btn-xs btn-ghost opacity-60 hover:opacity-100 hover:text-error"
                                                                    title="Delete"
                                                                    onClick={() => handleDeleteDetail(row.itemCode, row.supplies_no)}
                                                                >
                                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                                                    </svg>
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            <div className="modal-action">
                                <button className="btn btn-outline" onClick={closeViewModal}>Close</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ==================== ADD QUANTITY MODAL ==================== */}
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
                                <div>
                                    <h4 className="font-semibold mb-2">Supply Details</h4>
                                    <div className="overflow-x-auto overflow-y-auto max-h-96 border border-base-content/20 rounded-lg">
                                        <table className="table w-full [&_th]:border-b [&_th]:border-base-content/20 [&_td]:border-b [&_td]:border-base-content/20">
                                            <thead className="sticky top-0 bg-base-100 z-10">
                                                <tr>
                                                    <th>Supply No</th>
                                                    <th>Item Code</th>
                                                    <th>Description</th>
                                                    <th>Bin Location</th>
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
                                                            <span className="badge badge-outline badge-sm">
                                                                {detail.bin_location || '—'}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            <span className="badge badge-outline badge-sm">{detail.qty}</span>
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
                                                                value={quantitiesToAdd[`${detail.supplies_no}-${detail.item_code}-${detail.id}`]?.add_qty || ''}
                                                                onChange={(e) => handleQuantityChange(detail, e.target.value)}
                                                            />
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* Border-based info notice instead of alert-info */}
                            {!selectedSupplyForQuantity && (
                                <div className="flex items-center gap-3 border border-base-content/20 rounded-lg p-4">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="shrink-0 w-5 h-5 opacity-60" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span className="text-sm opacity-70">Please select a supply to view and add quantity.</span>
                                </div>
                            )}

                            <div className="modal-action">
                                <button className="btn btn-ghost" onClick={closeAddQuantityModal}>Cancel</button>
                                <button 
                                    className="btn btn-outline" 
                                    disabled={!selectedSupplyForQuantity}
                                    onClick={handleSaveQuantities}
                                >
                                    Save Changes
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ==================== ADD MATERIAL MODAL ==================== */}
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
                                <button className="btn btn-ghost" onClick={closeAddMaterialModal}>Cancel</button>
                                <button className="btn btn-outline" onClick={handleNextToMaterialDetails}>
                                    Next
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ==================== ADD MATERIAL DETAILS MODAL ==================== */}
                {isAddMaterialDetailsModalOpen && (
                    <div className="modal modal-open">
                        <div className="modal-box max-w-4xl">
                            <h3 className="font-bold text-lg mb-4">Add Material Details</h3>
                            
                            {/* Border-only info card */}
                            <div className="border border-base-content/20 rounded-lg mb-4">
                                <div className="p-4 grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-sm opacity-50">Material Description</p>
                                        <p className="font-semibold">
                                            {selectedItem ? selectedItem.material_description : newMaterial.materialDescription}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm opacity-50">UOM</p>
                                        <p className="font-semibold">
                                            {selectedItem ? selectedItem.uom : newMaterial.uom}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="label">
                                            <span className="label-text font-semibold">Item Code</span>
                                        </label>
                                        <input type="text" className="input input-bordered w-full" placeholder="Enter item code" id="itemCodeInput" />
                                    </div>
                                    <div>
                                        <label className="label">
                                            <span className="label-text font-semibold">Bin Location</span>
                                        </label>
                                        <input type="text" className="input input-bordered w-full" placeholder="e.g. A-01-02" id="binLocationInput" />
                                    </div>
                                </div>
                                <div>
                                    <label className="label">
                                        <span className="label-text font-semibold">Detail Description</span>
                                    </label>
                                    <input type="text" className="input input-bordered w-full" placeholder="Enter Long Description" id="detailDescriptionInput" />
                                </div>
                                <div className="grid grid-cols-4 gap-4">
                                    <div>
                                        <label className="label"><span className="label-text font-semibold">Quantity</span></label>
                                        <input type="number" className="input input-bordered w-full" placeholder="Enter quantity" min="0" id="qtyInput" />
                                    </div>
                                    <div>
                                        <label className="label"><span className="label-text font-semibold">Maximum</span></label>
                                        <input type="number" className="input input-bordered w-full" placeholder="Enter maximum" min="0" id="maxInput" />
                                    </div>
                                    <div>
                                        <label className="label"><span className="label-text font-semibold">Minimum</span></label>
                                        <input type="number" className="input input-bordered w-full" placeholder="Enter minimum" min="0" id="minInput" />
                                    </div>
                                    <div>
                                        <label className="label"><span className="label-text font-semibold">Price</span></label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <span className="opacity-50">₱</span>
                                            </div>
                                            <input type="number" className="input input-bordered w-full pl-10" placeholder="Enter price" min="0" step="0.01" id="priceInput" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="modal-action">
                                <button className="btn btn-ghost" onClick={() => {
                                    closeAddMaterialDetailsModal();
                                    if (selectedItem) {
                                        setIsViewDetailsModalOpen(true);
                                    } else {
                                        setNewMaterial({ materialDescription: '', uom: '' });
                                    }
                                }}>Cancel</button>
                                <button 
                                    className="btn btn-outline"
                                    onClick={() => {
                                        const itemCode            = document.getElementById('itemCodeInput').value;
                                        const detailedDescription = document.getElementById('detailDescriptionInput').value;
                                        const binLocation         = document.getElementById('binLocationInput').value;
                                        const qty                 = document.getElementById('qtyInput').value;
                                        const min                 = document.getElementById('minInput').value;
                                        const max                 = document.getElementById('maxInput').value;
                                        const price               = document.getElementById('priceInput').value;
                                        
                                        if (!itemCode || !detailedDescription || !qty || !min || !max || !price) {
                                            alert('Please fill in all required fields');
                                            return;
                                        }
                                        
                                        handleSaveMaterial({
                                            itemCode,
                                            detailedDescription,
                                            binLocation,
                                            qty:   parseInt(qty),
                                            min:   parseInt(min),
                                            max:   parseInt(max),
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

                {/* ==================== HISTORY MODAL ==================== */}
                {isHistoryModalOpen && (
                    <div className="modal modal-open">
                        <div className="modal-box max-w-5xl">
                            {selectedDetailForHistory ? (
                                <>
                                    <h3 className="font-bold text-lg mb-4">
                                        Detail History: {selectedDetailForHistory.itemCode}
                                    </h3>
                                    
                                    <div className="mb-4 border border-base-content/20 rounded-lg p-3">
                                        <div className="grid grid-cols-2 gap-2 text-sm">
                                            <p><strong>Item Code:</strong> {selectedDetailForHistory.itemCode}</p>
                                            <p><strong>Description:</strong> {selectedDetailForHistory.detailedDescription}</p>
                                            <p><strong>Supply No:</strong> {selectedDetailForHistory.supplies_no}</p>
                                            {selectedItem && (
                                                <p><strong>Material:</strong> {selectedItem.material_description} ({selectedItem.uom})</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="overflow-x-auto max-h-96 border border-base-content/20 rounded-lg">
                                        <table className="table w-full [&_th]:border-b [&_th]:border-base-content/20 [&_td]:border-b [&_td]:border-base-content/20">
                                            <thead className="sticky top-0 bg-base-100">
                                                <tr>
                                                    <th>Date/Time</th>
                                                    <th>Action</th>
                                                    <th>User</th>
                                                    <th>Changes</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {getHistoryForDetail().map((record, index) => {
                                                    const changes   = Array.isArray(record.changes) ? record.changes : (record.changes ? [record.changes] : []);
                                                    const oldValues = record.old_values || {};
                                                    const newValues = record.new_values || {};
                                                    
                                                    return (
                                                        <tr key={record.id || index}>
                                                            <td className="text-xs">{new Date(record.created_at).toLocaleString()}</td>
                                                            <td>
                                                                <span className="badge badge-outline badge-sm">
                                                                    {record.action}
                                                                </span>
                                                            </td>
                                                            <td className="text-xs">{record.user_name}</td>
                                                            <td className="text-xs">
                                                                {record.action === 'created' && <span className="opacity-70">Detail created</span>}
                                                                {record.action === 'updated' && changes.length > 0 && (
                                                                    <div className="space-y-1">
                                                                        {changes.map((field, i) => (
                                                                            <div key={i} className="flex items-center gap-1">
                                                                                <strong className="capitalize">{field.replace(/_/g, ' ')}:</strong>
                                                                                <span className="opacity-50 line-through">{String(oldValues[field] || 'N/A')}</span>
                                                                                <span>→</span>
                                                                                <span>{String(newValues[field] || 'N/A')}</span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                                {record.action === 'updated' && changes.length === 0 && (
                                                                    <span className="opacity-40">No changes recorded</span>
                                                                )}
                                                                {record.action === 'deleted' && <span className="opacity-70">Detail deleted</span>}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                    
                                    {getHistoryForDetail().length === 0 && (
                                        <div className="text-center py-8 opacity-40">No history records found</div>
                                    )}
                                </>
                            ) : historyMaterial ? (
                                <>
                                    <h3 className="font-bold text-lg mb-4">
                                        Material History: {historyMaterial.material_description}
                                    </h3>
                                    
                                    <div className="mb-4 border border-base-content/20 rounded-lg p-3">
                                        <div className="grid grid-cols-2 gap-2 text-sm">
                                            <p><strong>Material:</strong> {historyMaterial.material_description}</p>
                                            <p><strong>UOM:</strong> {historyMaterial.uom}</p>
                                            <p><strong>Supplies Count:</strong> {historyMaterial.suppliesNos?.length || 0} items</p>
                                        </div>
                                    </div>

                                    <div className="overflow-x-auto max-h-96 border border-base-content/20 rounded-lg">
                                        <table className="table w-full [&_th]:border-b [&_th]:border-base-content/20 [&_td]:border-b [&_td]:border-base-content/20">
                                            <thead className="sticky top-0 bg-base-100">
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
                                                    const changes   = Array.isArray(record.changes) ? record.changes : (record.changes ? [record.changes] : []);
                                                    const oldValues = record.old_values || {};
                                                    const newValues = record.new_values || {};
                                                    
                                                    return (
                                                        <tr key={record.id || index}>
                                                            <td className="text-xs">{new Date(record.created_at).toLocaleString()}</td>
                                                            <td>
                                                                <span className="badge badge-outline badge-sm">
                                                                    {record.action}
                                                                </span>
                                                            </td>
                                                            <td className="text-xs">{record.user_name}</td>
                                                            <td className="text-xs">
                                                                {record.action === 'created' && <span className="opacity-70">Material created</span>}
                                                                {record.action === 'updated' && changes.length > 0 && (
                                                                    <div className="space-y-1">
                                                                        {changes.map((field, i) => (
                                                                            <div key={i} className="flex items-center gap-1">
                                                                                <strong className="capitalize">{field.replace(/_/g, ' ')}:</strong>
                                                                                <span className="opacity-50 line-through">{String(oldValues[field] || 'N/A')}</span>
                                                                                <span>→</span>
                                                                                <span>{String(newValues[field] || 'N/A')}</span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                                {record.action === 'updated' && changes.length === 0 && (
                                                                    <span className="opacity-40">No changes recorded</span>
                                                                )}
                                                                {record.action === 'deleted' && <span className="opacity-70">Material deleted</span>}
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
                                        <div className="text-center py-8 opacity-40">No history records found</div>
                                    )}
                                </>
                            ) : (
                                <div className="text-center py-8 opacity-40">No history data available</div>
                            )}

                            <div className="modal-action">
                                <button className="btn btn-ghost" onClick={closeHistoryModal}>Close</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AuthenticatedLayout>
    );
}