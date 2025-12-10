import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head, usePage, router } from "@inertiajs/react";
import { useState, useMemo, useEffect } from "react";

export default function MaterialIssuance({ consumableData, suppliesData, availableConsumables, availableSupplies }) {
    const props = usePage().props;
    
    // Get employee data from session (same structure as OrderMaterial)
    const empData = props.emp_data || {};
    const empName = empData.emp_name || "Unknown User";
    const [activeMainTab, setActiveMainTab] = useState("consumable");
    const [activeSubTab, setActiveSubTab] = useState(0);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [issuedQuantities, setIssuedQuantities] = useState({});
    const [isReplacementModalOpen, setIsReplacementModalOpen] = useState(false);
    const [itemToReplace, setItemToReplace] = useState(null);
    const [replacementSearch, setReplacementSearch] = useState('');
    const [pendingModalOpen, setPendingModalOpen] = useState(null);
    const [selectedRadioItems, setSelectedRadioItems] = useState([]); // Track selected checkbox items

    const mainTabs = [
        { id: "consumable", label: "Consumable" },
        { id: "supplies", label: "Supplies" }
    ];

    const subTabs = [
        { id: 0, label: "Pending" },
        { id: 1, label: "Preparing" },
        { id: 2, label: "For Pick Up" },
        { id: 3, label: "Served" },
        { id: 4, label: "Return Item" }
    ];

    // Effect to handle opening modal after status update
    useEffect(() => {
        if (pendingModalOpen) {
            const sourceData = activeMainTab === "consumable" ? consumableData : suppliesData;
            const item = sourceData.find(i => i.mrs_no === pendingModalOpen && i.mrs_status === 1);
            
            if (item) {
                setSelectedItem(item);
                setIsModalOpen(true);
                
                const items = getItemsByMrsNo(item.mrs_no);
                const initialQuantities = {};
                items.forEach(i => {
                    initialQuantities[i.ID] = i.Issued_qty || '';
                });
                setIssuedQuantities(initialQuantities);
                
                setPendingModalOpen(null);
            }
        }
    }, [consumableData, suppliesData, pendingModalOpen, activeMainTab]);

const getFilteredData = () => {
        const sourceData = activeMainTab === "consumable" ? consumableData : suppliesData;
        
        if (!sourceData || !Array.isArray(sourceData)) {
            return [];
        }

        // Filter by status
        let filtered = sourceData.filter(item => item.mrs_status === activeSubTab);
        
        // For tabs 1-3 (Preparing, For Pick Up, Served), filter by Issued_by matching current user
        if (activeSubTab >= 1 && activeSubTab <= 3) {
            filtered = filtered.filter(item => item.Issued_by === empName);
        }
        
        return filtered;
    };

    const getDeduplicatedData = () => {
        const filteredData = getFilteredData();
        const mrsMap = new Map();

        filteredData.forEach(item => {
            if (!mrsMap.has(item.mrs_no)) {
                mrsMap.set(item.mrs_no, item);
            }
        });

        return Array.from(mrsMap.values());
    };

    const getItemsByMrsNo = (mrsNo) => {
        const sourceData = activeMainTab === "consumable" ? consumableData : suppliesData;
        
        if (!sourceData || !Array.isArray(sourceData)) {
            return [];
        }

        return sourceData.filter(item => item.mrs_no === mrsNo);
    };

    const getBadgeClass = (status) => {
        const statusMap = {
            0: "badge-warning",
            1: "badge-info",
            2: "badge-primary",
            3: "badge-success",
            4: "badge-error"
        };
        return statusMap[status] || "badge-ghost";
    };

    const getStatusLabel = (status) => {
        const labelMap = {
            0: "Pending",
            1: "Preparing",
            2: "For Pick Up",
            3: "Served",
            4: "Return Item"
        };
        return labelMap[status] || "Unknown";
    };

    const deduplicatedData = getDeduplicatedData();
    const modalItems = useMemo(() => {
        if (selectedItem) {
            return getItemsByMrsNo(selectedItem.mrs_no);
        }
        return [];
    }, [selectedItem, activeMainTab, consumableData, suppliesData]);

    const handleViewClick = (item) => {
        if (item.mrs_status === 0) {
            setPendingModalOpen(item.mrs_no);
            setActiveSubTab(1);
            
            const issuedBy = empName;
            
            router.post(route('material-issuance.update-status'), {
                mrs_no: item.mrs_no,
                type: activeMainTab,
                issued_by: issuedBy
            }, {
                preserveState: true,
                preserveScroll: true,
                onSuccess: () => {
                    console.log('Status updated successfully');
                },
                onError: (errors) => {
                    console.error('Error updating status:', errors);
                    setPendingModalOpen(null);
                    setActiveSubTab(0);
                }
            });
        } else {
            setSelectedItem(item);
            setIsModalOpen(true);
            setSelectedRadioItems([]); // Reset checkbox selection
            
            const items = getItemsByMrsNo(item.mrs_no);
            const initialQuantities = {};
            items.forEach(i => {
                initialQuantities[i.ID] = i.Issued_qty || '';
            });
            setIssuedQuantities(initialQuantities);
        }
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setSelectedItem(null);
        setIssuedQuantities({});
        setSelectedRadioItems([]); // Reset checkbox selection
    };

    const handleIssuedQtyChange = (itemId, value, maxQty) => {
        const numValue = parseFloat(value);
        if (value === '' || (numValue >= 0 && numValue <= maxQty)) {
            setIssuedQuantities(prev => ({
                ...prev,
                [itemId]: value
            }));
        }
    };

    const allItemsHaveIssuedQty = useMemo(() => {
        if (modalItems.length === 0) return false;
        
        return modalItems.every(item => {
            const issuedQty = issuedQuantities[item.ID];
            return issuedQty !== '' && issuedQty !== null && issuedQty !== undefined && parseFloat(issuedQty) > 0;
        });
    }, [modalItems, issuedQuantities]);

    const handleIssueRequest = () => {
        if (!allItemsHaveIssuedQty) {
            alert('Please enter issued quantities for all items.');
            return;
        }

        const confirmIssue = window.confirm(
            `Are you sure you want to issue ${modalItems.length} item(s) for MRS No: ${selectedItem.mrs_no}?`
        );

        if (!confirmIssue) {
            return;
        }

        const issueData = modalItems.map(item => ({
            id: item.ID,
            issued_qty: parseFloat(issuedQuantities[item.ID])
        }));

        router.post(route('material-issuance.issue-request'), {
            mrs_no: selectedItem.mrs_no,
            type: activeMainTab,
            items: issueData
        }, {
            preserveState: true,
            preserveScroll: true,
            onSuccess: () => {
                alert('Items issued successfully!');
                closeModal();
            },
            onError: (errors) => {
                console.error('Error issuing items:', errors);
                alert('Failed to issue items. Please try again.');
            }
        });
    };

    const handlePickedUp = (item) => {
        const confirmPickup = window.confirm(
            `Mark MRS No: ${item.mrs_no} as Picked Up?`
        );

        if (!confirmPickup) {
            return;
        }

        router.post(route('material-issuance.picked-up'), {
            mrs_no: item.mrs_no,
            type: activeMainTab
        }, {
            preserveState: true,
            preserveScroll: true,
            onSuccess: () => {
                alert('Items marked as Picked Up successfully!');
            },
            onError: (errors) => {
                console.error('Error updating status:', errors);
                alert('Failed to update status. Please try again.');
            }
        });
    };

    const handleReturnItem = (item) => {
        const confirmReturn = window.confirm(
            `Mark item "${item.mat_description}" as Return Item?`
        );

        if (!confirmReturn) {
            return;
        }

        router.post(route('material-issuance.return-item'), {
            cart_item_id: item.ID,
            type: activeMainTab,
            mrs_no: selectedItem.mrs_no
        }, {
            preserveState: true,
            preserveScroll: true,
            onSuccess: () => {
                alert('Item marked for return successfully!');
                const items = getItemsByMrsNo(selectedItem.mrs_no);
                if (items.every(i => i.mrs_status === 4)) {
                    closeModal();
                }
            },
            onError: (errors) => {
                console.error('Error marking item for return:', errors);
                alert('Failed to mark item for return. Please try again.');
            }
        });
    };

    const handleBulkReturn = () => {
    const selectedItems = modalItems.filter(item => selectedRadioItems.includes(item.ID));
    const itemDescriptions = selectedItems.map(item => item.mat_description).join(', ');
    
    const confirmReturn = window.confirm(
        `Mark ${selectedRadioItems.length} item(s) as Return Item?\n\nItems: ${itemDescriptions}`
    );

    if (!confirmReturn) {
        return;
    }

    router.post(route('material-issuance.bulk-return-items'), {
        cart_item_ids: selectedRadioItems,
        type: activeMainTab,
        mrs_no: selectedItem.mrs_no
    }, {
        preserveState: true,
        preserveScroll: true,
        onSuccess: () => {
            alert(`${selectedRadioItems.length} item(s) marked for return successfully!`);
            setSelectedRadioItems([]);
            const items = getItemsByMrsNo(selectedItem.mrs_no);
            if (items.every(i => i.mrs_status === 4)) {
                closeModal();
            }
        },
        onError: (errors) => {
            console.error('Error marking items for return:', errors);
            alert('Failed to mark items for return. Please try again.');
        }
    });
};

    const handleReplaceClick = (item) => {
        setItemToReplace(item);
        setIsReplacementModalOpen(true);
        setReplacementSearch('');
    };

    const closeReplacementModal = () => {
        setIsReplacementModalOpen(false);
        setItemToReplace(null);
        setReplacementSearch('');
    };

    const replacementItems = useMemo(() => {
        return activeMainTab === "consumable" ? (availableConsumables || []) : (availableSupplies || []);
    }, [activeMainTab, availableConsumables, availableSupplies]);

    const filteredReplacementItems = useMemo(() => {
        if (!replacementSearch) return replacementItems;
        
        return replacementItems.filter(item => 
            Object.values(item).some(value => 
                value && value.toString().toLowerCase().includes(replacementSearch.toLowerCase())
            )
        );
    }, [replacementItems, replacementSearch]);

const handleSelectReplacement = (replacementItem) => {
    const confirmReplace = window.confirm(
        `Replace "${itemToReplace.mat_description}" with "${replacementItem.mat_description || replacementItem.material_description}"?`
    );

    if (!confirmReplace) {
        return;
    }

    // For consumables, send consumable.id, for supplies send detail_id
    const replacementItemId = activeMainTab === "consumable" 
        ? replacementItem.id 
        : replacementItem.detail_id || replacementItem.id;

    router.post(route('material-issuance.replace-item'), {
        cart_item_id: itemToReplace.ID,
        replacement_item_id: replacementItemId,
        type: activeMainTab,
        mrs_no: selectedItem.mrs_no,
        is_supply_detail: activeMainTab === "supplies" // Add flag to identify supply detail
    }, {
        preserveState: true,
        preserveScroll: true,
        onSuccess: () => {
            alert('Item replaced successfully!');
            closeReplacementModal();
            const items = getItemsByMrsNo(selectedItem.mrs_no);
            const initialQuantities = {};
            items.forEach(i => {
                initialQuantities[i.ID] = i.Issued_qty || '';
            });
            setIssuedQuantities(initialQuantities);
        },
        onError: (errors) => {
            console.error('Error replacing item:', errors);
            alert('Failed to replace item. Please try again.');
        }
    });
};

    // Handle checkbox selection
    const handleCheckboxSelect = (itemId) => {
        setSelectedRadioItems(prev => {
            if (prev.includes(itemId)) {
                return prev.filter(id => id !== itemId);
            } else {
                return [...prev, itemId];
            }
        });
    };

    // Handle select all checkbox
    const handleSelectAll = () => {
        if (selectedRadioItems.length === modalItems.length) {
            setSelectedRadioItems([]);
        } else {
            setSelectedRadioItems(modalItems.map(item => item.ID));
        }
    };

    return (
        <AuthenticatedLayout>
            <Head title="Material Issuance" />
            
            <div className="p-4">
                <h1 className="text-xl font-semibold mb-2">Material Issuance</h1>

                <div className="card bg-base-100 shadow-xl">
                    <div className="card-body">
                        {/* Main Tabs */}
                        <div className="tabs tabs-boxed mb-4 bg-primary/10">
                            {mainTabs.map((tab) => (
                                <a
                                    key={tab.id}
                                    className={`tab tab-lg font-semibold ${
                                        activeMainTab === tab.id ? "tab-active" : ""
                                    }`}
                                    onClick={() => setActiveMainTab(tab.id)}
                                >
                                    {tab.label}
                                </a>
                            ))}
                        </div>

                        {/* Sub Tabs */}
                        <div className="tabs tabs-boxed mb-4">
                            {subTabs.map((tab) => (
                                <a
                                    key={tab.id}
                                    className={`tab ${
                                        activeSubTab === tab.id ? "tab-active" : ""
                                    }`}
                                    onClick={() => setActiveSubTab(tab.id)}
                                >
                                    {tab.label}
                                </a>
                            ))}
                        </div>

                        {/* Table Content */}
                        <div className="mt-4">
                            <div className="overflow-x-auto">
                                <table className="table table-zebra w-full">
                                    <thead>
                                        <tr>
                                            {activeSubTab === 4 ? (
                                                <>
                                                    <th>MRS No</th>
                                                    <th>Item Code</th>
                                                    <th>Material Description</th>
                                                    {activeMainTab === "supplies" && <th>Detailed Description</th>}
                                                    {activeMainTab === "consumable" && <th>Detailed Description</th>}
                                                    <th>Quantity</th>
                                                    <th>Request Quantity</th>
                                                    <th>UOM</th>
                                                    <th>Remarks</th>
                                                    <th>Issued Quantity</th>
                                                </>
                                            ) : (
                                                <>
                                                    <th>Date Order</th>
                                                    <th>MRS No</th>
                                                    <th>Requestor Name</th>
                                                    <th>Status</th>
                                                    <th>Action</th>
                                                </>
                                            )}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {activeSubTab === 4 ? (
                                            // Display all returned items directly
                                            getFilteredData().length > 0 ? (
                                                getFilteredData().map((item) => (
                                                    <tr key={item.ID}>
                                                        <td>{item.mrs_no}</td>
                                                        <td>{item.Itemcode}</td>
                                                        <td>{item.mat_description}</td>
                                                        {activeMainTab === "consumable" && (
                                                            <td>{item.Long_description || 'N/A'}</td>
                                                        )}
                                                        {activeMainTab === "supplies" && (
                                                            <td>{item.detailed_description || 'N/A'}</td>
                                                        )}
                                                        <td>{item.qty || 0}</td>
                                                        <td>{item.request_qty}</td>
                                                        <td>{item.uom}</td>
                                                        <td className="text-sm">{item.remarks || 'N/A'}</td>
                                                        <td className="font-medium">{item.Issued_qty || '0'}</td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan={activeMainTab === "consumable" ? "9" : "8"} className="text-center text-gray-500 py-4">
                                                        No data available
                                                    </td>
                                                </tr>
                                            )
                                        ) : (
                                            // Display deduplicated MRS for other tabs
                                            deduplicatedData.length > 0 ? (
                                                deduplicatedData.map((item) => (
                                                    <tr key={item.ID}>
                                                        <td>{new Date(item.order_date).toLocaleDateString()}</td>
                                                        <td>{item.mrs_no}</td>
                                                        <td>{item.requestor_name || 'N/A'}</td>
                                                        <td>
                                                            <span className={`badge ${getBadgeClass(item.mrs_status)}`}>
                                                                {getStatusLabel(item.mrs_status)}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            {activeSubTab === 2 ? (
                                                                <button 
                                                                    className="btn btn-sm btn-success"
                                                                    onClick={() => handlePickedUp(item)}
                                                                >
                                                                    Picked Up
                                                                </button>
                                                            ) : (
                                                                <button 
                                                                    className="btn btn-sm btn-primary"
                                                                    onClick={() => handleViewClick(item)}
                                                                >
                                                                    View
                                                                </button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan="5" className="text-center text-gray-500 py-4">
                                                        No data available
                                                    </td>
                                                </tr>
                                            )
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Info Badge */}
                        <div className="mt-4 text-sm text-gray-600">
                            Showing: <span className="font-semibold capitalize">{activeMainTab}</span> → 
                            <span className="font-semibold ml-1">{getStatusLabel(activeSubTab)}</span>
                            <span className="ml-2">
                                ({activeSubTab === 4 ? `${getFilteredData().length} items` : `${deduplicatedData.length} unique MRS`})
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal with all items for selected MRS No */}
            {isModalOpen && (
                <dialog className="modal modal-open">
                    <div className="modal-box max-w-7xl">
                        <h3 className="font-bold text-lg mb-4">MRS Details</h3>
                        
                        {selectedItem && (
                            <div>
                                {/* Header Card */}
                                <div className="card bg-base-200 shadow-md mb-4">
                                    <div className="card-body p-4">
                                        <div className="grid grid-cols-4 gap-4">
                                            <div>
                                                <label className="font-semibold text-sm text-gray-600">MRS No:</label>
                                                <p className="text-base mt-1">{selectedItem.mrs_no}</p>
                                            </div>
                                            
                                            <div>
                                                <label className="font-semibold text-sm text-gray-600">Requestor Name:</label>
                                                <p className="text-base mt-1">{selectedItem.requestor_name}</p>
                                            </div>
                                            
                                            <div>
                                                <label className="font-semibold text-sm text-gray-600">Department:</label>
                                                <p className="text-base mt-1">{selectedItem.department || 'N/A'}</p>
                                            </div>
                                            
                                            <div>
                                                <label className="font-semibold text-sm text-gray-600">Date Order:</label>
                                                <p className="text-base mt-1">
                                                    {new Date(selectedItem.order_date).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Data Table */}
                                <div className="overflow-x-auto">
                                    <table className="table table-zebra w-full">
                                        <thead>
                                            <tr>
                                                {activeSubTab === 3 && (
                                                    <th>
                                                        <input 
                                                            type="checkbox" 
                                                            className="checkbox checkbox-primary"
                                                            checked={selectedRadioItems.length === modalItems.length && modalItems.length > 0}
                                                            onChange={handleSelectAll}
                                                        />
                                                    </th>
                                                )}
                                                <th>Item Code</th>
                                                <th>Material Description</th>
                                                {activeMainTab === "supplies" && <th>Detailed Description</th>}
                                                {activeMainTab === "consumable" && <th>Detailed Description</th>}
                                                <th>Quantity</th>
                                                <th>Request Quantity</th>
                                                <th>UOM</th>
                                                {activeSubTab !== 0 && <th>Remarks</th>}
                                                <th>Issued Quantity</th>
                                                <th>{activeSubTab === 0 ? "Remarks" : "Action"}</th>
                                            </tr>
                                        </thead>
                                            <tbody>
                                                {modalItems.length > 0 ? (
                                                    modalItems.map((item, index) => (
                                                        <tr key={`${item.ID}-${index}`}>
                                                            {activeSubTab === 3 && (
                                                                <td>
                                                                    <input 
                                                                        type="checkbox" 
                                                                        className="checkbox checkbox-primary"
                                                                        checked={selectedRadioItems.includes(item.ID)}
                                                                        onChange={() => handleCheckboxSelect(item.ID)}
                                                                        disabled={item.mrs_status === 4}
                                                                    />
                                                                </td>
                                                            )}
                                                            <td>{item.Itemcode}</td>
                                                            <td>{item.mat_description}</td>
                                                            {activeMainTab === "consumable" && (
                                                                <td>{item.Long_description || 'N/A'}</td>
                                                            )}
                                                            {activeMainTab === "supplies" && (
                                                                <td>{item.detailed_description || 'N/A'}</td>
                                                            )}
                                                            <td>{item.qty || 0}</td>
                                                            <td>{item.request_qty}</td>
                                                            <td>{item.uom}</td>
                                                            {activeSubTab !== 0 && (
                                                                <td className="text-sm">{item.remarks || 'N/A'}</td>
                                                            )}
                                                            <td>
                                                                {activeSubTab === 3 || activeSubTab === 4 ? (
                                                                    <span className="font-medium">{item.Issued_qty || '0'}</span>
                                                                ) : (
                                                                    <input
                                                                        type="number"
                                                                        className="input input-bordered input-sm w-24"
                                                                        value={issuedQuantities[item.ID] || ''}
                                                                        onChange={(e) => handleIssuedQtyChange(item.ID, e.target.value, item.request_qty)}
                                                                        placeholder="0"
                                                                        min="0"
                                                                        max={item.request_qty}
                                                                    />
                                                                )}
                                                            </td>
                                                            <td>
                                                                {activeSubTab === 0 ? (
                                                                    <span className="text-sm">{item.remarks || 'N/A'}</span>
                                                                ) : activeSubTab === 3 ? (
                                                                    <button 
                                                                        className="btn btn-xs btn-error"
                                                                        onClick={() => handleReturnItem(item)}
                                                                        disabled={item.mrs_status === 4}
                                                                    >
                                                                        {item.mrs_status === 4 ? 'Returned' : 'Return'}
                                                                    </button>
                                                                ) : activeSubTab === 4 ? (
                                                                    <span className="badge badge-error">Returned</span>
                                                                ) : (
                                                                    <button 
                                                                        className="btn btn-xs btn-accent"
                                                                        onClick={() => handleReplaceClick(item)}
                                                                    >
                                                                        Replace
                                                                    </button>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))
                                                ) : (
                                                    <tr>
                                                        <td colSpan={activeMainTab === "consumable" ? (activeSubTab === 3 ? "10" : activeSubTab === 0 ? "8" : "9") : (activeSubTab === 3 ? "9" : activeSubTab === 0 ? "7" : "8")} className="text-center text-gray-500 py-4">
                                                            No items found
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                    </table>
                                </div>

                                <div className="mt-4 text-sm text-gray-600">
                                    Total Items: <span className="font-semibold">{modalItems.length}</span>
                                    {activeSubTab === 3 && selectedRadioItems.length > 0 && (
                                        <span className="ml-4 text-primary font-semibold">
                                            • {selectedRadioItems.length} item(s) selected for action
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="modal-action">
                            <button className="btn" onClick={closeModal}>Close</button>
                            {activeSubTab === 1 && allItemsHaveIssuedQty && (
                                <button 
                                    className="btn btn-success gap-2"
                                    onClick={handleIssueRequest}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Issue Request
                                </button>
                            )}
                            {activeSubTab === 3 && selectedRadioItems.length > 0 && (
                                <button 
                                    className="btn btn-error gap-2"
                                    onClick={handleBulkReturn}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 15v-1a4 4 0 00-4-4H8m0 0l3 3m-3-3l3-3m9 14V5a2 2 0 00-2-2H6a2 2 0 00-2 2v16l4-2 4 2 4-2 4 2z" />
                                    </svg>
                                    Return Selected Items ({selectedRadioItems.length})
                                </button>
                            )}
                        </div>
                    </div>
                    <form method="dialog" className="modal-backdrop" onClick={closeModal}>
                        <button>close</button>
                    </form>
                </dialog>
            )}

            {/* Replacement Modal */}
            {isReplacementModalOpen && (
                <dialog className="modal modal-open">
                    <div className="modal-box max-w-6xl">
                        <h3 className="font-bold text-lg mb-4">Select Item for Replacement</h3>
                        
                        {itemToReplace && (
                            <div className="alert alert-info mb-4">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                </svg>
                                <div>
                                    <div className="font-bold">Replacing:</div>
                                    <div className="text-sm">
                                        {itemToReplace.Itemcode} - {itemToReplace.mat_description}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Search Bar */}
                        <div className="form-control mb-4">
                            <input 
                                type="text" 
                                placeholder="Search replacement items..." 
                                className="input input-bordered w-full" 
                                value={replacementSearch}
                                onChange={(e) => setReplacementSearch(e.target.value)}
                            />
                        </div>

                        {/* Replacement Items Table */}
                        <div className="overflow-x-auto max-h-96">
                            <table className="table table-zebra w-full">
<thead className="sticky top-0 bg-base-200">
    <tr>
        <th>Item Code</th>
        <th>Material Description</th>
        {activeMainTab === "consumable" && <th>Detailed Description</th>}
        {activeMainTab === "supplies" && <th>Detailed Description</th>}
        <th>Supplier</th>
        <th className="text-center">Available Qty</th>
        <th className="text-center">UOM</th>
        <th className="text-center">Action</th>
    </tr>
</thead>
<tbody>
    {filteredReplacementItems.length > 0 ? (
        filteredReplacementItems.map((item) => (
            <tr key={activeMainTab === "consumable" ? item.id : `${item.id}-${item.detail_id}`}>
                <td className="font-medium">
                    {activeMainTab === "consumable" ? item.itemcode : item.itemcode}
                </td>
                <td>{activeMainTab === "consumable" ? item.mat_description : item.material_description}</td>
                {activeMainTab === "consumable" ? (
                    <td>{item.Long_description || 'N/A'}</td>
                ) : (
                    <td>{item.detailed_description || 'N/A'}</td>
                )}
                {activeMainTab === "supplies" && (
                    <td>{item.detailed_description || 'N/A'}</td>
                 )}
                <td>{item.supplier || 'N/A'}</td>
                <td className="text-center">
                    {item.qty <= 0 ? (
                        <span className="badge badge-error">Out of Stock</span>
                    ) : (
                        <span className={item.qty <= 10 ? 'text-warning font-semibold' : ''}>
                            {item.qty}
                        </span>
                    )}
                </td>
                <td className="text-center">{item.uom}</td>
                <td className="text-center">
                    <button 
                        className="btn btn-sm btn-primary"
                        onClick={() => handleSelectReplacement(item)}
                        disabled={item.qty <= 0}
                    >
                        Select
                    </button>
                </td>
            </tr>
        ))
    ) : (
        <tr>
            <td colSpan={activeMainTab === "consumable" ? "7" : "7"} className="text-center text-gray-500 py-4">
                {replacementSearch ? 'No items found matching your search' : 'No replacement items available'}
            </td>
        </tr>
    )}
</tbody>
                            </table>
                        </div>

                        <div className="modal-action">
                            <button className="btn" onClick={closeReplacementModal}>Cancel</button>
                        </div>
                    </div>
                    <form method="dialog" className="modal-backdrop" onClick={closeReplacementModal}>
                        <button>close</button>
                    </form>
                </dialog>
            )}
        </AuthenticatedLayout>
    );
}