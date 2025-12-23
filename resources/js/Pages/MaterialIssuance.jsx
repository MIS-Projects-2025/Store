import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head, usePage, router } from "@inertiajs/react";
import { useState, useMemo } from "react";
import { Eye, RotateCcw, X } from "lucide-react";

/* -------------------- TABS -------------------- */
const MAIN_TABS = [
    { key: "consumable", label: "Consumable & Spare Parts" },
    { key: "supplies", label: "Supplies" },
    { key: "consigned", label: "Consigned" },
];

const SUB_TABS = [
    "Pending",
    "Preparing",
    "For Pick Up",
    "Delivered",
    "Return",
];

export default function MaterialIssuance() {
    const { consumables = [], supplies = [], consigned = [] } = usePage().props;

    const [activeMainTab, setActiveMainTab] = useState("consumable");
    const [activeSubTab, setActiveSubTab] = useState("Pending");
    const [selectedMRS, setSelectedMRS] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [issuedQuantities, setIssuedQuantities] = useState({});
    const [isProcessing, setIsProcessing] = useState(false);
    const [showReplaceModal, setShowReplaceModal] = useState(false);
    const [selectedItemForReplace, setSelectedItemForReplace] = useState(null);
    const [availableReplacements, setAvailableReplacements] = useState([]);
    const [replacementQuantity, setReplacementQuantity] = useState(1);

    /* -------------------- DATA SELECTOR -------------------- */
    const baseData = useMemo(() => {
        if (activeMainTab === "consumable") return consumables;
        if (activeMainTab === "supplies") return supplies;
        if (activeMainTab === "consigned") return consigned;
        return [];
    }, [activeMainTab, consumables, supplies, consigned]);

    /* -------------------- FILTER ROWS BASED ON SUB TAB -------------------- */
    const rowsForSubTab = useMemo(() => {
        if (activeSubTab === "Return") {
            return baseData.filter(row => {
                return row.items?.some(item => item.mrs_status?.toLowerCase() === "return");
            });
        }
        
        if (activeSubTab === "Delivered") {
            return baseData.filter(row => {
                return row.items?.some(item => item.mrs_status?.toLowerCase() === "delivered");
            });
        }
        
        return baseData.filter(row => {
            return row.mrs_status?.toLowerCase() === activeSubTab.toLowerCase();
        });
    }, [baseData, activeSubTab]);

    /* -------------------- MODAL & UPDATE HANDLERS -------------------- */
    const handleEyeClick = (row) => {
        if (activeSubTab === "Pending") {
            const routeName = activeMainTab === "consumable" 
                ? 'material-issuance.update-consumable-status'
                : activeMainTab === "supplies"
                ? 'material-issuance.update-supplies-status'
                : 'material-issuance.update-consigned-status';

            router.post(route(routeName), {
                mrs_no: row.mrs_no,
                status: 'Preparing'
            }, {
                preserveScroll: true,
                onSuccess: () => {
                    setActiveSubTab("Preparing");
                    setSelectedMRS({ ...row, mrs_status: 'Preparing' });
                    setShowModal(true);
                }
            });
        } else {
            openModal(row);
        }
    };

    const openModal = (row) => {
        setSelectedMRS(row);
        setShowModal(true);
        const quantities = {};
        row.items?.forEach(item => {
            quantities[item.id] = item.issued_quantity ?? item.issued_qty ?? 1;
        });
        setIssuedQuantities(quantities);
    };

    const modalItems = useMemo(() => {
        if (!selectedMRS?.items) return [];
        
        if (activeSubTab === "Delivered") {
            return selectedMRS.items.filter(item => 
                item.mrs_status?.toLowerCase() !== "return"
            );
        }
        
        return selectedMRS.items;
    }, [selectedMRS, activeSubTab]);

    const closeModal = () => {
        setShowModal(false);
        setSelectedMRS(null);
        setIssuedQuantities({});
    };

    const handleIssuedQtyChange = (itemId, value) => {
        setIssuedQuantities(prev => ({
            ...prev,
            [itemId]: value
        }));
    };

    const isAllItemsHaveIssuedQty = useMemo(() => {
        if (!selectedMRS?.items) return false;
        return selectedMRS.items.every(item => {
            const qty = issuedQuantities[item.id];
            return qty && qty >= 1;
        });
    }, [selectedMRS, issuedQuantities]);

    const handleProceed = () => {
        if (!selectedMRS || !isAllItemsHaveIssuedQty) return;

        setIsProcessing(true);

        const routeName = activeMainTab === "consumable" 
            ? 'material-issuance.update-issued-qty-consumable'
            : activeMainTab === "supplies"
            ? 'material-issuance.update-issued-qty-supplies'
            : 'material-issuance.update-issued-qty-consigned';

        router.post(route(routeName), {
            mrs_no: selectedMRS.mrs_no,
            items: selectedMRS.items.map(item => ({
                id: item.id,
                issued_qty: issuedQuantities[item.id]
            }))
        }, {
            preserveScroll: true,
            onSuccess: () => {
                setActiveSubTab("For Pick Up");
                closeModal();
            },
            onFinish: () => {
                setIsProcessing(false);
            }
        });
    };

    const handleMarkAsDelivered = () => {
        if (!selectedMRS) return;

        setIsProcessing(true);

        const routeName = activeMainTab === "consumable" 
            ? 'material-issuance.mark-delivered-consumable'
            : activeMainTab === "supplies"
            ? 'material-issuance.mark-delivered-supplies'
            : 'material-issuance.mark-delivered-consigned';

        router.post(route(routeName), {
            mrs_no: selectedMRS.mrs_no
        }, {
            preserveScroll: true,
            onSuccess: () => {
                setActiveSubTab("Delivered");
                closeModal();
            },
            onFinish: () => {
                setIsProcessing(false);
            }
        });
    };

    const handleReturnItem = (item) => {
        if (!selectedMRS) return;

        if (!confirm('Are you sure you want to return this item? The inventory will be updated.')) {
            return;
        }

        setIsProcessing(true);

        const routeName = activeMainTab === "consumable" 
            ? 'material-issuance.return-consumable-item'
            : activeMainTab === "supplies"
            ? 'material-issuance.return-supplies-item'
            : 'material-issuance.return-consigned-item';

        router.post(route(routeName), {
            item_id: item.id,
            mrs_no: selectedMRS.mrs_no
        }, {
            preserveScroll: true,
            onSuccess: (page) => {
                const updatedData = activeMainTab === "consumable" 
                    ? page.props.consumables 
                    : activeMainTab === "supplies"
                    ? page.props.supplies
                    : page.props.consigned;
                
                const updatedMRS = updatedData.find(mrs => mrs.mrs_no === selectedMRS.mrs_no);
                
                if (updatedMRS) {
                    setSelectedMRS(updatedMRS);
                }
            },
            onFinish: () => {
                setIsProcessing(false);
            }
        });
    };

const handleReplaceItem = (item) => {
    setSelectedItemForReplace(item);
    setReplacementQuantity(1); // Initialize with 1
    
    const routeName = activeMainTab === "consumable" 
        ? 'material-issuance.get-replacement-items-consumable'
        : activeMainTab === "supplies"
        ? 'material-issuance.get-replacement-items-supplies'
        : 'material-issuance.get-replacement-items-consigned';

    // Pass material_description to filter replacement items
    const params = activeMainTab === "consigned" 
        ? { material_description: item.material_description }
        : {};

    router.get(route(routeName), params, {
        preserveScroll: true,
        preserveState: true,
        onSuccess: (page) => {
            setAvailableReplacements(page.props.replacementItems || []);
            setShowReplaceModal(true);
        }
    });
};

    const closeReplaceModal = () => {
        setShowReplaceModal(false);
        setSelectedItemForReplace(null);
        setAvailableReplacements([]);
        setReplacementQuantity(1); // Reset quantity
    };

const handleConfirmReplacement = (replacementItem) => {
    if (!selectedItemForReplace || !selectedMRS) return;

    // Validate quantity
    const maxQty = selectedItemForReplace.issued_quantity ?? selectedItemForReplace.issued_qty ?? 0;
    if (replacementQuantity > maxQty) {
        alert(`Replacement quantity cannot exceed ${maxQty}`);
        return;
    }

    if (replacementQuantity < 1) {
        alert('Replacement quantity must be at least 1');
        return;
    }

    if (!confirm(`Replace ${replacementQuantity} unit(s) of this item?`)) {
        return;
    }

    setIsProcessing(true);

    const routeName = activeMainTab === "consumable" 
        ? 'material-issuance.replace-item-consumable'
        : activeMainTab === "supplies"
        ? 'material-issuance.replace-item-supplies'
        : 'material-issuance.replace-item-consigned';

    const payload = {
        mrs_no: selectedMRS.mrs_no,
        old_item_id: selectedItemForReplace.id,
        new_item_code: replacementItem.item_code,
        replacement_qty: replacementQuantity,
    };

    // Add type-specific fields
    if (activeMainTab === "consumable") {
        payload.new_serial = replacementItem.serial;
    } else if (activeMainTab === "consigned") {
        payload.new_supplier = replacementItem.supplier;
    }

    router.post(route(routeName), payload, {
        preserveScroll: true,
        preserveState: true, // ✅ CHANGED: Keep the page state
        only: [activeMainTab === "consumable" ? 'consumables' : activeMainTab === "supplies" ? 'supplies' : 'consigned'], // ✅ ADDED: Only reload specific data
        onSuccess: (page) => {
            // Get updated data from the response
            const updatedData = activeMainTab === "consumable" 
                ? page.props.consumables 
                : activeMainTab === "supplies"
                ? page.props.supplies
                : page.props.consigned;
            
            // Find the updated MRS
            const updatedMRS = updatedData.find(mrs => mrs.mrs_no === selectedMRS.mrs_no);
            
            if (updatedMRS) {
                // ✅ Update the modal with fresh data
                setSelectedMRS(updatedMRS);
                
                // Update issued quantities state
                const newQuantities = {};
                updatedMRS.items.forEach(item => {
                    newQuantities[item.id] = item.issued_quantity ?? item.issued_qty ?? 1;
                });
                setIssuedQuantities(newQuantities);
            }
            
            closeReplaceModal();
        },
        onFinish: () => {
            setIsProcessing(false);
        }
    });
};

    return (
        <AuthenticatedLayout>
            <Head title="Material Issuance" />
            <h1 className="text-2xl font-bold mb-6">Material Issuance</h1>

            {/* MAIN TABS */}
            <div className="tabs tabs-boxed mb-6">
                {MAIN_TABS.map(tab => (
                    <a
                        key={tab.key}
                        className={`tab ${activeMainTab === tab.key ? "tab-active" : ""}`}
                        onClick={() => {
                            setActiveMainTab(tab.key);
                            setActiveSubTab("Pending");
                        }}
                    >
                        {tab.label}
                    </a>
                ))}
            </div>

            {/* SUB TABS */}
            <div className="tabs tabs-bordered mb-6">
                {SUB_TABS.map(sub => (
                    <a
                        key={sub}
                        className={`tab ${activeSubTab === sub ? "tab-active" : ""}`}
                        onClick={() => setActiveSubTab(sub)}
                    >
                        {sub}
                    </a>
                ))}
            </div>

            {/* ================= STATUS TABLES ================= */}
            {activeSubTab !== "Return" && (
                <div className="card bg-base-100 shadow">
                    <div className="overflow-x-auto">
                        <table className="table table-zebra">
                            <thead>
                                <tr>
                                    <th>Date Order</th>
                                    <th>MRS No</th>
                                    <th>{activeMainTab === "consigned" ? "Station" : "Requestor"}</th>
                                    <th>Status</th>
                                    <th className="text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rowsForSubTab.length === 0 && (
                                    <tr>
                                        <td colSpan="5" className="text-center text-gray-400">
                                            No approved records for this status
                                        </td>
                                    </tr>
                                )}

                                {rowsForSubTab.map(row => (
                                    <tr key={row.id}>
                                        <td>{row.order_date}</td>
                                        <td>{row.mrs_no}</td>
                                        <td>{row.emp_name}</td>
                                        <td>
                                            <span className="badge badge-info">
                                                {row.mrs_status}
                                            </span>
                                        </td>
                                        <td className="text-center">
                                            <button 
                                                className="btn btn-sm btn-ghost" 
                                                title={activeSubTab === "Pending" ? "Move to Preparing" : "View"}
                                                onClick={() => handleEyeClick(row)}
                                            >
                                                <Eye className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ================= RETURN TABLE ================= */}
            {activeSubTab === "Return" && (
                <div className="card bg-base-100 shadow">
                    <div className="overflow-x-auto">
                        <table className="table table-zebra">
                            <thead>
                                <tr>
                                    <th>MRS No</th>
                                    <th>Item Code</th>
                                    <th>Description</th>
                                    <th>Detailed Description</th>
                                    {activeMainTab === "consumable" && <th>Serial</th>}
                                    {activeMainTab === "consigned" && <th>Supplier</th>}
                                    <th>Quantity</th>
                                    <th>Requested Qty</th>
                                    <th>Issued Qty</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rowsForSubTab.length === 0 && (
                                    <tr>
                                        <td colSpan={activeMainTab === "supplies" ? "8" : "9"} className="text-center text-gray-400">
                                            No returned items
                                        </td>
                                    </tr>
                                )}

                                {rowsForSubTab.map(row => 
                                    row.items?.filter(item => item.mrs_status?.toLowerCase() === "return").map(item => (
                                        <tr key={item.id}>
                                            <td>{row.mrs_no}</td>
                                            <td>{item.itemCode}</td>
                                            <td>{item.material_description}</td>
                                            <td>{item.detailed_description}</td>
                                            {activeMainTab === "consumable" && (
                                                <td>{item.serial ?? "N/A"}</td>
                                            )}
                                            {activeMainTab === "consigned" && (
                                                <td>{item.supplier ?? "N/A"}</td>
                                            )}
                                            <td>{item.quantity}</td>
                                            <td>{item.request_quantity ?? item.request_qty}</td>
                                            <td>{item.issued_quantity ?? item.issued_qty}</td>
                                            <td>
                                                <span className="badge badge-warning">
                                                    Returned
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ================= MODAL FOR VIEWING ITEMS ================= */}
            {showModal && selectedMRS && (
                <div className="modal modal-open">
                    <div className="modal-box max-w-5xl">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-lg">
                                MRS Details - {selectedMRS.mrs_no}
                            </h3>
                            <button 
                                className="btn btn-sm btn-circle btn-ghost"
                                onClick={closeModal}
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="mb-4 grid grid-cols-4 gap-4">
                            <div>
                                <p className="text-sm text-gray-500">Order Date</p>
                                <p className="font-semibold">{selectedMRS.order_date}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">MRS No</p>
                                <p className="font-semibold">{selectedMRS.mrs_no}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">{activeMainTab === "consigned" ? "Station" : "Requestor"}</p>
                                <p className="font-semibold">{selectedMRS.emp_name}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Status</p>
                                <span className="badge badge-info">{selectedMRS.mrs_status}</span>
                            </div>
                        </div>

                        <div className="divider"></div>

                        <h4 className="font-semibold mb-3">Items</h4>
                        <div className="overflow-x-auto">
                            <table className="table table-sm table-zebra">
                                <thead>
                                    <tr>
                                        <th>Item Code</th>
                                        <th>Description</th>
                                        <th>Detailed Description</th>
                                        {activeMainTab === "consumable" && <th>Serial</th>}
                                        {activeMainTab === "consigned" && <th>Supplier</th>}
                                        <th>Quantity</th>
                                        <th>Requested Qty</th>
                                        <th>Issued Qty</th>
                                        {/* SHOW REMARKS COLUMN ONLY IN PREPARING AND FOR PICK UP */}
                                        {(activeSubTab === "Preparing" || activeSubTab === "For Pick Up") && (
                                            <th>Remarks</th>
                                        )}
                                        {(activeSubTab === "For Pick Up" || activeSubTab === "Delivered") && (
                                            <th className="text-center">Action</th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody>
                                    {modalItems.map((item, idx) => (
                                        <tr key={idx}>
                                            <td>{item.itemCode}</td>
                                            <td>{item.material_description}</td>
                                            <td>{item.detailed_description}</td>
                                            {activeMainTab === "consumable" && (
                                                <td>{item.serial ?? "N/A"}</td>
                                            )}
                                            {activeMainTab === "consigned" && (
                                                <td>{item.supplier ?? "N/A"}</td>
                                            )}
                                            <td>{item.quantity}</td>
                                            <td>
                                                {item.request_quantity ?? item.request_qty}
                                            </td>
                                            <td>
                                                {activeSubTab === "For Pick Up" || activeSubTab === "Delivered" ? (
                                                    <span className="font-semibold">
                                                        {item.issued_quantity ?? item.issued_qty ?? 0}
                                                    </span>
                                                ) : (
                                                    <input 
                                                        type="number" 
                                                        className="input input-sm input-bordered w-20"
                                                        min="1"
                                                        max={item.request_quantity ?? item.request_qty}
                                                        value={issuedQuantities[item.id] || ''}
                                                        placeholder="1"
                                                        onChange={(e) => {
                                                            const max = item.request_quantity ?? item.request_qty;
                                                            let value = parseInt(e.target.value) || 0;
                                                            if (value > max) value = max;
                                                            if (value < 1) value = 1;
                                                            handleIssuedQtyChange(item.id, value);
                                                        }}
                                                    />
                                                )}
                                            </td>
                                            {/* DISPLAY REMARKS (READ-ONLY) */}
                                            {(activeSubTab === "Preparing" || activeSubTab === "For Pick Up") && (
                                                <td>
                                                    <span className="text-sm">
                                                        {item.remarks || '-'}
                                                    </span>
                                                </td>
                                            )}
                                            {activeSubTab === "For Pick Up" && (
                                                <td className="text-center">
                                                    <button 
                                                        className="btn btn-xs btn-warning"
                                                        onClick={() => handleReplaceItem(item)}
                                                    >
                                                        Replace Item
                                                    </button>
                                                </td>
                                            )}
                                            {activeSubTab === "Delivered" && (
                                                <td className="text-center">
                                                    <button 
                                                        className="btn btn-xs btn-error gap-1"
                                                        onClick={() => handleReturnItem(item)}
                                                        disabled={isProcessing}
                                                        title="Return this item"
                                                    >
                                                        <RotateCcw className="w-3 h-3" />
                                                        Return
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="modal-action">
                            {activeSubTab === "Preparing" && (
                                <button 
                                    className="btn btn-primary"
                                    onClick={handleProceed}
                                    disabled={!isAllItemsHaveIssuedQty || isProcessing}
                                >
                                    {isProcessing ? 'Processing...' : 'Proceed'}
                                </button>
                            )}
                            {activeSubTab === "For Pick Up" && (
                                <button 
                                    className="btn btn-success"
                                    onClick={handleMarkAsDelivered}
                                    disabled={isProcessing}
                                >
                                    {isProcessing ? 'Processing...' : 'Mark as Delivered'}
                                </button>
                            )}
                            <button className="btn" onClick={closeModal}>
                                Close
                            </button>
                        </div>
                    </div>
                    <div className="modal-backdrop" onClick={closeModal}></div>
                </div>
            )}

{/* ================= REPLACE ITEM MODAL ================= */}
{showReplaceModal && selectedItemForReplace && (
    <div className="modal modal-open">
        <div className="modal-box max-w-5xl">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg">Replace Item</h3>
                <button 
                    className="btn btn-sm btn-circle btn-ghost"
                    onClick={closeReplaceModal}
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Current Item Card */}
            <div className="card bg-base-200 mb-6">
                <div className="card-body">
                    <h4 className="card-title text-base">Current Item</h4>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-sm text-gray-500">Item Code</p>
                            <p className="font-semibold">{selectedItemForReplace.itemCode}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Description</p>
                            <p className="font-semibold">{selectedItemForReplace.material_description}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Detailed Description</p>
                            <p className="font-semibold">{selectedItemForReplace.detailed_description}</p>
                        </div>
                        {activeMainTab === "consumable" && (
                            <div>
                                <p className="text-sm text-gray-500">Serial</p>
                                <p className="font-semibold">{selectedItemForReplace.serial ?? "N/A"}</p>
                            </div>
                        )}
                        {activeMainTab === "consigned" && (
                            <div>
                                <p className="text-sm text-gray-500">Supplier</p>
                                <p className="font-semibold">{selectedItemForReplace.supplier ?? "N/A"}</p>
                            </div>
                        )}
                        <div>
                            <p className="text-sm text-gray-500">Issued Quantity</p>
                            <p className="font-semibold">
                                {selectedItemForReplace.issued_quantity ?? selectedItemForReplace.issued_qty}
                            </p>
                        </div>
                    </div>
                    
                    {/* ADD QUANTITY INPUT HERE */}
                    <div className="divider"></div>
                    <div className="form-control w-full max-w-xs">
                        <label className="label">
                            <span className="label-text font-semibold">Quantity to Replace</span>
                        </label>
                        <input 
                            type="number" 
                            className="input input-bordered w-full"
                            min="1"
                            max={selectedItemForReplace.issued_quantity ?? selectedItemForReplace.issued_qty}
                            value={replacementQuantity}
                            onChange={(e) => {
                                const max = selectedItemForReplace.issued_quantity ?? selectedItemForReplace.issued_qty;
                                let value = parseInt(e.target.value) || 1;
                                if (value > max) value = max;
                                if (value < 1) value = 1;
                                setReplacementQuantity(value);
                            }}
                        />
                        <label className="label">
                            <span className="label-text-alt">
                                Max: {selectedItemForReplace.issued_quantity ?? selectedItemForReplace.issued_qty}
                            </span>
                        </label>
                    </div>
                </div>
            </div>

            <div className="divider">Available Replacements</div>

            {/* Replacement Items Table */}
            <div className="overflow-x-auto">
                <table className="table table-sm table-zebra">
                    <thead>
                        <tr>
                            <th>Item Code</th>
                            <th>Material Description</th>
                            <th>Detailed Description</th>
                            {activeMainTab === "consumable" && (
                                <>
                                    <th>Serial</th>
                                    <th>Bin Location</th>
                                </>
                            )}
                            {activeMainTab === "consigned" && (
                                <>
                                    <th>Supplier</th>
                                    <th>Expiration</th>
                                    <th>Bin Location</th>
                                </>
                            )}
                            <th>Available Qty</th>
                            <th className="text-center">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {availableReplacements.length === 0 && (
                            <tr>
                                <td colSpan={
                                    activeMainTab === "consumable" ? "7" : 
                                    activeMainTab === "consigned" ? "8" : "5"
                                } className="text-center text-gray-400">
                                    No replacement items available
                                </td>
                            </tr>
                        )}

                        {availableReplacements.map((replacement, idx) => (
                            <tr key={idx}>
                                <td>{replacement.item_code}</td>
                                <td>{replacement.material_description}</td>
                                <td>{replacement.detailed_description}</td>
                                {activeMainTab === "consumable" && (
                                    <>
                                        <td>{replacement.serial ?? "N/A"}</td>
                                        <td>{replacement.bin_location ?? "N/A"}</td>
                                    </>
                                )}
                                {activeMainTab === "consigned" && (
                                    <>
                                        <td>{replacement.supplier ?? "N/A"}</td>
                                        <td>{replacement.expiration ?? "N/A"}</td>
                                        <td>{replacement.bin_location ?? "N/A"}</td>
                                    </>
                                )}
                                <td>{replacement.quantity ?? replacement.qty}</td>
                                <td className="text-center">
                                    <button 
                                        className="btn btn-xs btn-primary"
                                        onClick={() => handleConfirmReplacement(replacement)}
                                        disabled={isProcessing || (replacement.quantity ?? replacement.qty) < replacementQuantity}
                                        title={
                                            (replacement.quantity ?? replacement.qty) < replacementQuantity 
                                            ? `Insufficient stock. Available: ${replacement.quantity ?? replacement.qty}` 
                                            : 'Select this item'
                                        }
                                    >
                                        Select
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="modal-action">
                <button className="btn" onClick={closeReplaceModal}>
                    Cancel
                </button>
            </div>
        </div>
        <div className="modal-backdrop" onClick={closeReplaceModal}></div>
    </div>
)}
        </AuthenticatedLayout>
    );
}