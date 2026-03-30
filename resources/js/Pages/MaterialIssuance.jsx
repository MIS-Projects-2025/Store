import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head, usePage, router } from "@inertiajs/react";
import { useState, useMemo, useEffect, useRef } from "react";
import { Eye, RotateCcw, X, Search, CalendarDays, XCircle } from "lucide-react";

/* -------------------- TABS -------------------- */
const MAIN_TABS = [
    { key: "consumable", label: "Consumable & Spare Parts" },
    { key: "supplies",   label: "Supplies" },
    { key: "consigned",  label: "Consigned" },
];

const SUB_TABS = ["Pending", "Preparing", "For Pick Up", "Delivered", "Return"];

const showsIssuedBy = (subTab) =>
    ["Preparing", "For Pick Up", "Delivered", "Return"].includes(subTab);

/* -------------------- REUSABLE BORDER BADGE -------------------- */
const BorderBadge = ({ children, className = "" }) => (
    <span
        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border border-base-content/40 text-base-content bg-transparent ${className}`}
    >
        {children}
    </span>
);

export default function MaterialIssuance() {
    const {
        consumables = [],
        supplies    = [],
        consigned   = [],
        pendingConsumables = 0,
        pendingSupplies    = 0,
        pendingConsigned   = 0,
    } = usePage().props;

    const [activeMainTab, setActiveMainTab] = useState("consumable");
    const [activeSubTab,  setActiveSubTab]  = useState("Pending");
    const [selectedMRS,   setSelectedMRS]   = useState(null);
    const [showModal,     setShowModal]     = useState(false);
    const [issuedQuantities, setIssuedQuantities] = useState({});
    const [itemRemarks, setItemRemarks] = useState({});
    const [isProcessing,  setIsProcessing]  = useState(false);

    const [showReplaceModal,        setShowReplaceModal]        = useState(false);
    const [selectedItemForReplace,  setSelectedItemForReplace]  = useState(null);
    const [availableReplacements,   setAvailableReplacements]   = useState([]);
    const [replacementQuantity,     setReplacementQuantity]     = useState("");
    const [showReturnModal,         setShowReturnModal]         = useState(false);
    const [selectedItemForReturn,   setSelectedItemForReturn]   = useState(null);
    const [returnRemarks,           setReturnRemarks]           = useState("");
    const [replaceRemarks,          setReplaceRemarks]          = useState("");
    const [searchQuery,             setSearchQuery]             = useState("");
    const [searchTimeout,           setSearchTimeout]           = useState(null);

    const [showCancelModal,  setShowCancelModal]  = useState(false);
    const [cancelRemarks,    setCancelRemarks]    = useState("");
    const [cancelTargetItem, setCancelTargetItem] = useState(null);

    const today = new Date().toLocaleDateString("en-CA");
    const [dateFilters, setDateFilters] = useState({
        consumable: today,
        supplies:   today,
        consigned:  today,
    });

    const activeDateFilter = dateFilters[activeMainTab];

    const handleDateFilterChange = (value) =>
        setDateFilters((prev) => ({ ...prev, [activeMainTab]: value }));

    const clearDateFilter = () =>
        setDateFilters((prev) => ({ ...prev, [activeMainTab]: "" }));

    const pendingCounts = {
        consumable: pendingConsumables,
        supplies:   pendingSupplies,
        consigned:  pendingConsigned,
    };

    // ==================== REAL-TIME BROADCASTING ====================
    const isMounted = useRef(true);

    useEffect(() => {
        isMounted.current = true;
        return () => { isMounted.current = false; };
    }, []);

    useEffect(() => {
        if (typeof window.Echo === "undefined") {
            console.warn("Laravel Echo is not initialized");
            return;
        }

        let reloadTimer = null;
        const channel = window.Echo.channel("material-issuance");

        channel.listen(".material.updated", () => {
            if (!isMounted.current) return;
            if (document.visibilityState === "hidden") return;
            if (isProcessing) return;

            if (reloadTimer) clearTimeout(reloadTimer);
            reloadTimer = setTimeout(() => {
                if (!isMounted.current) return;
                if (!window.location.pathname.includes("material-issuance")) return;

                router.reload({
                    only: [
                        "consumables", "supplies", "consigned",
                        "pendingConsumables", "pendingSupplies", "pendingConsigned",
                    ],
                    preserveState:  true,
                    preserveScroll: true,
                    onError: (errors) => {
                        console.warn("Real-time reload error:", errors);
                    },
                    onFinish: (visit) => {
                        const status = visit?.response?.status;
                        if (status === 404) {
                            console.warn("Reload returned 404 — user may have navigated away");
                            return;
                        }
                        if (status === 401 || status === 419) {
                            const appPrefix = window.location.pathname.split("/")[1];
                            window.location.href = `/${appPrefix}/login`;
                        }
                    },
                });
            }, 800);
        });

        if (window.Echo.connector?.pusher?.connection) {
            window.Echo.connector.pusher.connection.bind("error", (err) => {
                console.warn("Pusher connection error:", err);
            });
        }

        return () => {
            if (reloadTimer) clearTimeout(reloadTimer);
            window.Echo.leave("material-issuance");
        };
    }, [isProcessing]);

    /* -------------------- DATA SELECTOR -------------------- */
    const baseData = useMemo(() => {
        if (activeMainTab === "consumable") return consumables;
        if (activeMainTab === "supplies")   return supplies;
        if (activeMainTab === "consigned")  return consigned;
        return [];
    }, [activeMainTab, consumables, supplies, consigned]);

    /* -------------------- SORT HELPER -------------------- */
    const sortByDateDesc = (rows) =>
        [...rows].sort((a, b) => {
            const dateA = a.order_date ?? "";
            const dateB = b.order_date ?? "";
            if (dateB !== dateA) return dateB.localeCompare(dateA);
            return (b.created_at ?? "").localeCompare(a.created_at ?? "");
        });

    /* -------------------- FILTER ROWS BASED ON SUB TAB -------------------- */
    const rowsForSubTab = useMemo(() => {
        let rows;
        if (activeSubTab === "Return") {
            rows = sortByDateDesc(
                baseData.filter((row) =>
                    row.items?.some(
                        (item) =>
                            item.mrs_status?.toLowerCase() === "return" ||
                            item.mrs_status?.toLowerCase() === "cancelled"
                    )
                )
            );
        } else if (activeSubTab === "Delivered") {
            rows = sortByDateDesc(
                baseData.filter((row) =>
                    row.items?.some(
                        (item) => item.mrs_status?.toLowerCase() === "delivered"
                    )
                )
            );
        } else {
            rows = sortByDateDesc(
                baseData.filter(
                    (row) => row.mrs_status?.toLowerCase() === activeSubTab.toLowerCase()
                )
            );
        }

        if (activeDateFilter) {
            rows = rows.filter((row) => row.order_date === activeDateFilter);
        }

        return rows;
    }, [baseData, activeSubTab, activeDateFilter]);

    /* -------------------- MODAL & UPDATE HANDLERS -------------------- */
    const handleEyeClick = (row) => {
        if (activeSubTab === "Pending") {
            const routeName =
                activeMainTab === "consumable" ? "material-issuance.update-consumable-status"
                : activeMainTab === "supplies"  ? "material-issuance.update-supplies-status"
                :                                 "material-issuance.update-consigned-status";

            setIsProcessing(true);
            router.post(
                route(routeName),
                { mrs_no: row.mrs_no, status: "Preparing" },
                {
                    preserveScroll: true,
                    onSuccess: () => {
                        setActiveSubTab("Preparing");
                        setSelectedMRS({ ...row, mrs_status: "Preparing" });
                        setShowModal(true);
                    },
                    onFinish: () => setIsProcessing(false),
                }
            );
        } else {
            openModal(row);
        }
    };

    const openModal = (row) => {
        setSelectedMRS(row);
        setShowModal(true);
        const quantities = {};
        const remarks = {};
        row.items?.forEach((item) => {
            const hasIssuedQty = item.issued_quantity != null || item.issued_qty != null;
            quantities[item.id] = hasIssuedQty ? (item.issued_quantity ?? item.issued_qty) : "";
            // Pre-populate existing remarks (strip "Cancelled:" / "Return:" prefixes for display)
            remarks[item.id] = item.remarks ?? "";
        });
        setIssuedQuantities(quantities);
        setItemRemarks(remarks);
    };

    const modalItems = useMemo(() => {
        if (!selectedMRS?.items) return [];
        if (activeSubTab === "Delivered") {
            return selectedMRS.items.filter(
                (item) =>
                    item.mrs_status?.toLowerCase() !== "return" &&
                    item.mrs_status?.toLowerCase() !== "cancelled"
            );
        }
        return selectedMRS.items;
    }, [selectedMRS, activeSubTab]);

    const closeModal = () => {
        setShowModal(false);
        setSelectedMRS(null);
        setIssuedQuantities({});
        setItemRemarks({});
    };

    const handleIssuedQtyChange = (itemId, value) =>
        setIssuedQuantities((prev) => ({ ...prev, [itemId]: value }));

    const handleItemRemarksChange = (itemId, value) =>
        setItemRemarks((prev) => ({ ...prev, [itemId]: value }));

    const isAllItemsHaveIssuedQty = useMemo(() => {
        if (!selectedMRS?.items) return false;
        const activeItems = selectedMRS.items.filter(
            (item) => item.mrs_status?.toLowerCase() !== "cancelled"
        );
        if (activeItems.length === 0) return false;
        return activeItems.every((item) => {
            const qty = issuedQuantities[item.id];
            return qty !== "" && qty !== undefined && qty !== null && Number(qty) >= 1;
        });
    }, [selectedMRS, issuedQuantities]);

    const handleProceed = () => {
        if (!selectedMRS || !isAllItemsHaveIssuedQty) return;
        const routeName =
            activeMainTab === "consumable" ? "material-issuance.update-issued-qty-consumable"
            : activeMainTab === "supplies"  ? "material-issuance.update-issued-qty-supplies"
            :                                 "material-issuance.update-issued-qty-consigned";

        setIsProcessing(true);
        router.post(
            route(routeName),
            {
                mrs_no: selectedMRS.mrs_no,
                items: selectedMRS.items
                    .filter((item) => item.mrs_status?.toLowerCase() !== "cancelled")
                    .map((item) => ({
                        id: item.id,
                        issued_qty: issuedQuantities[item.id],
                        remarks: itemRemarks[item.id] ?? "",
                    })),
            },
            {
                preserveScroll: true,
                onSuccess: () => { setActiveSubTab("For Pick Up"); closeModal(); },
                onFinish: () => setIsProcessing(false),
            }
        );
    };

    const handleMarkAsDelivered = () => {
        if (!selectedMRS) return;
        const hasDeliverableItems = selectedMRS.items?.some(
            (item) => item.mrs_status?.toLowerCase() === "for pick up"
        );
        if (!hasDeliverableItems) {
            alert("No items available to deliver. All items may have been cancelled.");
            return;
        }
        const routeName =
            activeMainTab === "consumable" ? "material-issuance.mark-delivered-consumable"
            : activeMainTab === "supplies"  ? "material-issuance.mark-delivered-supplies"
            :                                 "material-issuance.mark-delivered-consigned";

        setIsProcessing(true);
        router.post(
            route(routeName),
            { mrs_no: selectedMRS.mrs_no },
            {
                preserveScroll: true,
                onSuccess: () => { setActiveSubTab("Delivered"); closeModal(); },
                onFinish: () => setIsProcessing(false),
            }
        );
    };

    // ==================== CANCEL ITEM ====================
    const handleCancelItemClick = (item) => {
        setCancelTargetItem(item);
        setCancelRemarks("");
        setShowCancelModal(true);
    };

    const closeCancelModal = () => {
        setShowCancelModal(false);
        setCancelTargetItem(null);
        setCancelRemarks("");
    };

    const handleConfirmCancel = () => {
        if (!cancelTargetItem || !selectedMRS || !cancelRemarks.trim()) return;
        const isPreparing = activeSubTab === "Preparing";
        let routeName;
        if (activeMainTab === "consumable") {
            routeName = isPreparing
                ? "material-issuance.cancel-item-consumable-preparing"
                : "material-issuance.cancel-item-consumable-for-pick-up";
        } else if (activeMainTab === "supplies") {
            routeName = isPreparing
                ? "material-issuance.cancel-item-supplies-preparing"
                : "material-issuance.cancel-item-supplies-for-pick-up";
        } else {
            routeName = isPreparing
                ? "material-issuance.cancel-item-consigned-preparing"
                : "material-issuance.cancel-item-consigned-for-pick-up";
        }

        setIsProcessing(true);
        router.post(
            route(routeName),
            { item_id: cancelTargetItem.id, mrs_no: selectedMRS.mrs_no, remarks: cancelRemarks.trim() },
            {
                preserveScroll: true,
                onSuccess: (page) => {
                    const updatedData =
                        activeMainTab === "consumable" ? page.props.consumables
                        : activeMainTab === "supplies"  ? page.props.supplies
                        :                                 page.props.consigned;
                    const updatedMRS = updatedData?.find((mrs) => mrs.mrs_no === selectedMRS.mrs_no);
                    if (updatedMRS) setSelectedMRS(updatedMRS);
                    closeCancelModal();
                },
                onFinish: () => setIsProcessing(false),
            }
        );
    };

    // ==================== RETURN ITEM ====================
    const handleReturnItemClick = (item) => {
        setSelectedItemForReturn(item);
        setReturnRemarks("");
        setShowReturnModal(true);
    };

    const closeReturnModal = () => {
        setShowReturnModal(false);
        setSelectedItemForReturn(null);
        setReturnRemarks("");
    };

    const handleConfirmReturn = () => {
        if (!selectedItemForReturn || !selectedMRS) return;
        if (!returnRemarks.trim()) { alert("Please provide a reason for returning this item"); return; }
        const routeName =
            activeMainTab === "consumable" ? "material-issuance.return-consumable-item"
            : activeMainTab === "supplies"  ? "material-issuance.return-supplies-item"
            :                                 "material-issuance.return-consigned-item";

        setIsProcessing(true);
        router.post(
            route(routeName),
            { item_id: selectedItemForReturn.id, mrs_no: selectedMRS.mrs_no, remarks: `Return: ${returnRemarks.trim()}` },
            {
                preserveScroll: true,
                onSuccess: (page) => {
                    const updatedData =
                        activeMainTab === "consumable" ? page.props.consumables
                        : activeMainTab === "supplies"  ? page.props.supplies
                        :                                 page.props.consigned;
                    const updatedMRS = updatedData.find((mrs) => mrs.mrs_no === selectedMRS.mrs_no);
                    if (updatedMRS) setSelectedMRS(updatedMRS);
                    closeReturnModal();
                },
                onFinish: () => setIsProcessing(false),
            }
        );
    };

    // ==================== REPLACE ITEM ====================
    const handleReplaceItem = (item) => {
        setSelectedItemForReplace(item);
        setReplacementQuantity(1);
        setReplaceRemarks("");
        setSearchQuery("");
        setAvailableReplacements([]);
        setShowReplaceModal(true);
    };

    const handleSearchReplacements = (query) => {
        if (query.trim().length < 2) { setAvailableReplacements([]); return; }
        const routeName =
            activeMainTab === "consumable" ? "material-issuance.get-replacement-items-consumable"
            : activeMainTab === "supplies"  ? "material-issuance.get-replacement-items-supplies"
            :                                 "material-issuance.get-replacement-items-consigned";

        router.get(
            route(routeName),
            { search: query },
            {
                preserveScroll: true,
                preserveState:  true,
                only: ["replacementItems"],
                onSuccess: (page) => setAvailableReplacements(page.props.replacementItems || []),
            }
        );
    };

    const closeReplaceModal = () => {
        setShowReplaceModal(false);
        setSelectedItemForReplace(null);
        setAvailableReplacements([]);
        setReplacementQuantity(1);
        setReplaceRemarks("");
        setSearchQuery("");
        if (searchTimeout) { clearTimeout(searchTimeout); setSearchTimeout(null); }
    };

    const handleConfirmReplacement = (replacementItem) => {
        if (!selectedItemForReplace || !selectedMRS) return;
        const maxQty = selectedItemForReplace.issued_quantity ?? selectedItemForReplace.issued_qty ?? 0;
        if (replacementQuantity > maxQty) { alert(`Replacement quantity cannot exceed ${maxQty}`); return; }
        if (replacementQuantity < 1)      { alert("Replacement quantity must be at least 1"); return; }
        if (!replaceRemarks.trim())        { alert("Please provide a reason for replacing this item"); return; }
        if (!confirm(`Replace ${replacementQuantity} unit(s) of this item?`)) return;

        const routeName =
            activeMainTab === "consumable" ? "material-issuance.replace-item-consumable"
            : activeMainTab === "supplies"  ? "material-issuance.replace-item-supplies"
            :                                 "material-issuance.replace-item-consigned";

        const payload = {
            mrs_no: selectedMRS.mrs_no,
            old_item_id: selectedItemForReplace.id,
            new_item_code: replacementItem.item_code,
            replacement_qty: replacementQuantity,
            remarks: `Replaced: ${replaceRemarks.trim()}`,
        };
        if (activeMainTab === "consumable") payload.new_serial = replacementItem.serial;
        else if (activeMainTab === "consigned") payload.new_supplier = replacementItem.supplier;
        else if (activeMainTab === "supplies")  payload.new_detailed_description = replacementItem.detailed_description;

        setIsProcessing(true);
        router.post(route(routeName), payload, {
            preserveScroll: true,
            preserveState:  true,
            only: [activeMainTab === "consumable" ? "consumables" : activeMainTab === "supplies" ? "supplies" : "consigned"],
            onSuccess: (page) => {
                const updatedData =
                    activeMainTab === "consumable" ? page.props.consumables
                    : activeMainTab === "supplies"  ? page.props.supplies
                    :                                 page.props.consigned;
                const updatedMRS = updatedData.find((mrs) => mrs.mrs_no === selectedMRS.mrs_no);
                if (updatedMRS) {
                    setSelectedMRS(updatedMRS);
                    const newQuantities = {};
                    const newRemarks = {};
                    updatedMRS.items.forEach((item) => {
                        newQuantities[item.id] = item.issued_quantity ?? item.issued_qty ?? 1;
                        newRemarks[item.id] = item.remarks ?? "";
                    });
                    setIssuedQuantities(newQuantities);
                    setItemRemarks(newRemarks);
                }
                closeReplaceModal();
            },
            onFinish: () => setIsProcessing(false),
        });
    };

    const isConsigned  = activeMainTab === "consigned";
    const isConsumable = activeMainTab === "consumable";
    const isSupplies   = activeMainTab === "supplies";

    return (
        <AuthenticatedLayout>
            <Head title="Material Issuance" />

            <h1 className="text-2xl font-bold mb-6 text-base-content">Material Issuance</h1>

            {/* ── MAIN TABS ─────────────────────────────────────── */}
            <div className="flex gap-2 mb-6">
                {MAIN_TABS.map((tab) => {
                    const count    = pendingCounts[tab.key] || 0;
                    const isActive = activeMainTab === tab.key;
                    return (
                        <button
                            key={tab.key}
                            onClick={() => { setActiveMainTab(tab.key); setActiveSubTab("Pending"); }}
                            className={`
                                relative px-5 py-2 rounded-lg font-semibold transition-all duration-200
                                flex items-center gap-2 bg-transparent
                                ${isActive
                                    ? "border-2 border-base-content text-base-content"
                                    : "border border-base-content/30 text-base-content/50 hover:border-base-content/70 hover:text-base-content"
                                }
                            `}
                        >
                            {tab.label}
                            {count > 0 && (
                                <span className={`
                                    inline-flex items-center justify-center rounded-full text-xs font-bold px-1.5 py-0.5 min-w-[20px]
                                    border bg-transparent
                                    ${isActive
                                        ? "border-base-content text-base-content"
                                        : "border-base-content/30 text-base-content/50"
                                    }
                                `}>
                                    {count}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* ── SUB TABS ──────────────────────────────────────── */}
            <div className="flex gap-0 border-b border-base-content/20 mb-6">
                {SUB_TABS.map((sub) => (
                    <button
                        key={sub}
                        onClick={() => setActiveSubTab(sub)}
                        className={`
                            px-4 py-2 text-sm font-medium transition-all duration-150 bg-transparent border-b-2 -mb-px
                            ${activeSubTab === sub
                                ? "border-base-content text-base-content"
                                : "border-transparent text-base-content/40 hover:text-base-content"
                            }
                        `}
                    >
                        {sub}
                    </button>
                ))}
            </div>

            {/* ── DATE FILTER ───────────────────────────────────── */}
            <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-base-content/50" />
                    <span className="text-sm font-medium text-base-content/60">Filter by Order Date:</span>
                </div>
                <div className="flex items-center gap-2">
                    <input
                        type="date"
                        className="input input-sm input-bordered bg-transparent text-base-content border-base-content/30 focus:border-base-content"
                        value={activeDateFilter}
                        onChange={(e) => handleDateFilterChange(e.target.value)}
                    />
                    {activeDateFilter && (
                        <button
                            className="flex items-center gap-1 px-2 py-1 text-sm rounded border border-base-content/30 text-base-content/60 hover:border-base-content hover:text-base-content bg-transparent transition-all"
                            onClick={clearDateFilter}
                        >
                            <X className="w-3.5 h-3.5" /> Clear
                        </button>
                    )}
                </div>
                {activeDateFilter && (
                    <span className="text-xs text-base-content/40">
                        Showing records for{" "}
                        <strong className="text-base-content">
                            {new Date(activeDateFilter + "T00:00:00").toLocaleDateString(undefined, {
                                year: "numeric", month: "long", day: "numeric",
                            })}
                        </strong>
                    </span>
                )}
            </div>

            {/* ================= STATUS TABLE ================= */}
            {activeSubTab !== "Return" && (
                <div className="border border-base-content/20 rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="table table-zebra w-full [&_th]:border-y [&_th]:border-base-content/20 [&_td]:border-y [&_td]:border-base-content/20">
                            <thead>
                                <tr className="border-b border-base-content/20 text-base-content">
                                    <th>Date Order</th>
                                    <th>Time Created</th>
                                    <th>MRS No</th>
                                    {isConsigned ? (
                                        <><th>Employee No</th><th>Station</th></>
                                    ) : (
                                        <><th>Requestor</th><th>Machine No</th><th>Prodline</th></>
                                    )}
                                    {showsIssuedBy(activeSubTab) && <th>Issued By</th>}
                                    <th>Status</th>
                                    <th className="text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rowsForSubTab.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={isConsigned
                                                ? (showsIssuedBy(activeSubTab) ? 8 : 7)
                                                : (showsIssuedBy(activeSubTab) ? 9 : 8)}
                                            className="text-center text-base-content/40"
                                        >
                                            {activeDateFilter
                                                ? `No records found for ${new Date(activeDateFilter + "T00:00:00").toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}`
                                                : "No approved records for this status"}
                                        </td>
                                    </tr>
                                )}
                                {rowsForSubTab.map((row) => (
                                    <tr key={row.id} className="text-base-content">
                                        <td>{row.order_date}</td>
                                        <td>
                                            {row.created_at
                                                ? <span className="text-xs text-base-content/50">{row.created_at}</span>
                                                : <span className="text-xs text-base-content/30">—</span>}
                                        </td>
                                        <td>{row.mrs_no}</td>
                                        {isConsigned ? (
                                            <>
                                                <td><span className="text-sm font-medium">{row.employee_no ?? "—"}</span></td>
                                                <td>{row.emp_name}</td>
                                            </>
                                        ) : (
                                            <>
                                                <td>{row.emp_name}</td>
                                                <td>{row.machine_no ?? "—"}</td>
                                                <td>{row.prodline ?? "—"}</td>
                                            </>
                                        )}
                                        {showsIssuedBy(activeSubTab) && (
                                            <td>
                                                {row.issued_by
                                                    ? <BorderBadge>{row.issued_by}</BorderBadge>
                                                    : <span className="text-xs text-base-content/30">—</span>}
                                            </td>
                                        )}
                                        <td><BorderBadge>{row.mrs_status}</BorderBadge></td>
                                        <td className="text-center">
                                            <button
                                                className="p-1.5 rounded border border-base-content/30 text-base-content hover:border-base-content bg-transparent transition-all disabled:opacity-40"
                                                title={activeSubTab === "Pending" ? "Move to Preparing" : "View"}
                                                onClick={() => handleEyeClick(row)}
                                                disabled={isProcessing}
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
                <div className="border border-base-content/20 rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="table table-zebra w-full [&_th]:border-y [&_th]:border-base-content/20 [&_td]:border-y [&_td]:border-base-content/20">
                            <thead>
                                <tr className="border-b border-base-content/20 text-base-content">
                                    <th>MRS No</th>
                                    <th>Time Created</th>
                                    {isConsigned ? (
                                        <><th>Employee No</th><th>Station</th></>
                                    ) : (
                                        <><th>Requestor</th><th>Machine No</th><th>Prodline</th></>
                                    )}
                                    <th>Issued By</th>
                                    <th>Item Code</th>
                                    <th>Description</th>
                                    <th>Detailed Description</th>
                                    {isConsumable && <th>Serial</th>}
                                    {(isConsumable || isSupplies) && <th>Bin Location</th>}
                                    {isConsigned && <th>Supplier</th>}
                                    {isConsigned && <th>Bin Location</th>}
                                    <th>Quantity</th>
                                    <th>Requested Qty</th>
                                    <th>Issued Qty</th>
                                    <th>Remarks</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rowsForSubTab.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={isConsumable ? 16 : 15}
                                            className="text-center text-base-content/40"
                                        >
                                            {activeDateFilter
                                                ? `No returned or cancelled items found for ${new Date(activeDateFilter + "T00:00:00").toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}`
                                                : "No returned or cancelled items"}
                                        </td>
                                    </tr>
                                )}
                                {rowsForSubTab.map((row) =>
                                    row.items
                                        ?.filter(
                                            (item) =>
                                                item.mrs_status?.toLowerCase() === "return" ||
                                                item.mrs_status?.toLowerCase() === "cancelled"
                                        )
                                        .map((item) => (
                                            <tr key={item.id} className="text-base-content">
                                                <td>{row.mrs_no}</td>
                                                <td><span className="text-xs text-base-content/50">{row.created_at ?? "—"}</span></td>
                                                {isConsigned ? (
                                                    <>
                                                        <td><span className="text-sm font-medium">{row.employee_no ?? "—"}</span></td>
                                                        <td>{row.emp_name}</td>
                                                    </>
                                                ) : (
                                                    <>
                                                        <td>{row.emp_name}</td>
                                                        <td>{row.machine_no ?? "—"}</td>
                                                        <td>{row.prodline ?? "—"}</td>
                                                    </>
                                                )}
                                                <td>
                                                    {row.issued_by
                                                        ? <BorderBadge>{row.issued_by}</BorderBadge>
                                                        : <span className="text-xs text-base-content/30">—</span>}
                                                </td>
                                                <td>{item.itemCode}</td>
                                                <td>{item.material_description}</td>
                                                <td>{item.detailed_description || "—"}</td>
                                                {isConsumable && <td>{item.serial ?? "N/A"}</td>}
                                                {(isConsumable || isSupplies) && <td>{item.bin_location ?? "N/A"}</td>}
                                                {isConsigned && <td>{item.supplier ?? "N/A"}</td>}
                                                {isConsigned && (
                                                    <td>
                                                        <div className="tooltip tooltip-right" data-tip={item.bin_location ?? "N/A"}>
                                                            <span className="truncate block max-w-[150px]">{item.bin_location ?? "N/A"}</span>
                                                        </div>
                                                    </td>
                                                )}
                                                <td>{item.quantity}</td>
                                                <td>{item.request_quantity ?? item.request_qty}</td>
                                                <td>{item.issued_quantity ?? item.issued_qty}</td>
                                                <td>{item.remarks || "—"}</td>
                                                <td>
                                                    <BorderBadge>
                                                        {item.mrs_status?.toLowerCase() === "cancelled" ? "Cancelled" : "Returned"}
                                                    </BorderBadge>
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
                    <div className="modal-box max-w-7xl bg-base-100 border border-base-content/20">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-lg text-base-content">
                                MRS Details — {selectedMRS.mrs_no}
                            </h3>
                            <button
                                className="p-1 rounded border border-base-content/30 text-base-content hover:border-base-content bg-transparent"
                                onClick={closeModal}
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

<div className="mb-4 flex justify-between items-start border border-base-content/10 rounded-lg px-4 py-3">
    <div>
        <p className="text-xs text-base-content/50 whitespace-nowrap">Order Date</p>
        <p className="font-semibold text-base-content text-sm whitespace-nowrap">{selectedMRS.order_date}</p>
    </div>
    <div>
        <p className="text-xs text-base-content/50 whitespace-nowrap">Time Created</p>
        <p className="font-semibold text-sm text-base-content whitespace-nowrap">{selectedMRS.created_at ?? "—"}</p>
    </div>
    <div>
        <p className="text-xs text-base-content/50 whitespace-nowrap">MRS No</p>
        <p className="font-semibold text-base-content text-sm whitespace-nowrap">{selectedMRS.mrs_no}</p>
    </div>
    {isConsigned ? (
        <>
            <div>
                <p className="text-xs text-base-content/50 whitespace-nowrap">Employee No</p>
                <p className="font-semibold text-base-content text-sm whitespace-nowrap">{selectedMRS.employee_no ?? "—"}</p>
            </div>
            <div>
                <p className="text-xs text-base-content/50 whitespace-nowrap">Station</p>
                <p className="font-semibold text-base-content text-sm whitespace-nowrap">{selectedMRS.emp_name}</p>
            </div>
        </>
    ) : (
        <>
            <div>
                <p className="text-xs text-base-content/50 whitespace-nowrap">Requestor</p>
                <p className="font-semibold text-base-content text-sm whitespace-nowrap">{selectedMRS.emp_name}</p>
            </div>
            <div>
                <p className="text-xs text-base-content/50 whitespace-nowrap">Machine No</p>
                <p className="font-semibold text-base-content text-sm whitespace-nowrap">{selectedMRS.machine_no ?? "—"}</p>
            </div>
            <div>
                <p className="text-xs text-base-content/50 whitespace-nowrap">Prodline</p>
                <p className="font-semibold text-base-content text-sm whitespace-nowrap">{selectedMRS.prodline ?? "—"}</p>
            </div>
        </>
    )}
    <div>
        <p className="text-xs text-base-content/50 whitespace-nowrap">Status</p>
        <BorderBadge>{selectedMRS.mrs_status}</BorderBadge>
    </div>
    {showsIssuedBy(activeSubTab) && (
        <div>
            <p className="text-xs text-base-content/50 whitespace-nowrap">Issued By</p>
            <p className="font-semibold text-base-content text-sm whitespace-nowrap">{selectedMRS.issued_by ?? "—"}</p>
        </div>
    )}
</div>

                        <div className="border-t border-base-content/10 my-4" />

                        <h4 className="font-semibold mb-3 text-base-content">Items</h4>
                        <div className="overflow-auto max-h-96 border border-base-content/15 rounded-lg">
                            <table className="table table-zebra table-pin-rows w-full [&_th]:border-y [&_th]:border-base-content/20 [&_td]:border-y [&_td]:border-base-content/20">
                                <thead>
                                    <tr className="text-base-content border-b border-base-content/15">
                                        <th>Item Code</th>
                                        <th>Description</th>
                                        <th>Detailed Description</th>
                                        {isConsumable && <th>Serial</th>}
                                        {(isConsumable || isSupplies) && <th>Bin Location</th>}
                                        {isConsigned && <th>Supplier</th>}
                                        {isConsigned && <th>Bin Location</th>}
                                        <th>Quantity</th>
                                        <th>Requested Qty</th>
                                        <th>Issued Qty</th>
                                        {/* Remarks column — editable in Preparing/For Pick Up, read-only in Delivered */}
                                        <th>Remarks</th>
                                        {(activeSubTab === "Preparing" || activeSubTab === "For Pick Up" || activeSubTab === "Delivered") && (
                                            <th className="text-center">Action</th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody>
                                    {modalItems.map((item, idx) => (
                                        <tr
                                            key={idx}
                                            className={`text-base-content ${item.mrs_status?.toLowerCase() === "cancelled" ? "opacity-40" : ""}`}
                                        >
                                            <td>{item.itemCode}</td>
                                            <td>{item.material_description}</td>
                                            <td>{item.detailed_description || "—"}</td>
                                            {isConsumable && <td>{item.serial ?? "N/A"}</td>}
                                            {(isConsumable || isSupplies) && <td>{item.bin_location ?? "N/A"}</td>}
                                            {isConsigned && <td>{item.supplier ?? "N/A"}</td>}
                                            {isConsigned && (
                                                <td>
                                                    <div className="tooltip tooltip-right" data-tip={item.bin_location ?? "N/A"}>
                                                        <span className="truncate block max-w-[150px]">{item.bin_location ?? "N/A"}</span>
                                                    </div>
                                                </td>
                                            )}
                                            <td>{item.quantity}</td>
                                            <td>{item.request_quantity ?? item.request_qty}</td>

                                            {/* ── Issued Qty cell ── */}
                                            <td>
                                                {activeSubTab === "For Pick Up" || activeSubTab === "Delivered" ? (
                                                    <span className="font-semibold">{item.issued_quantity ?? item.issued_qty ?? 0}</span>
                                                ) : (
                                                    <input
                                                        type="number"
                                                        className="w-20 px-2 py-1 text-sm rounded border border-base-content/30 text-base-content bg-transparent focus:border-base-content focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                        min="1"
                                                        value={issuedQuantities[item.id] ?? ""}
                                                        placeholder="Qty"
                                                        disabled={item.mrs_status?.toLowerCase() === "cancelled"}
                                                        ref={(el) => {
                                                            if (!el) return;
                                                            el.addEventListener("wheel", (e) => e.preventDefault(), { passive: false });
                                                        }}
                                                        onChange={(e) => {
                                                            const raw = e.target.value;
                                                            // Allow free typing — only store the raw string
                                                            handleIssuedQtyChange(item.id, raw);
                                                        }}
                                                        onBlur={(e) => {
                                                            const val = parseInt(e.target.value, 10);
                                                            if (!val || val < 1) handleIssuedQtyChange(item.id, "");
                                                        }}
                                                    />
                                                )}
                                            </td>

                                            {/* ── Remarks cell ── */}
                                            <td>
                                                {activeSubTab === "Preparing" || activeSubTab === "For Pick Up" ? (
                                                    <input
                                                        type="text"
                                                        className="w-36 px-2 py-1 text-sm rounded border border-base-content/30 text-base-content bg-transparent focus:border-base-content focus:outline-none placeholder:text-base-content/30"
                                                        placeholder="Optional remark…"
                                                        maxLength={500}
                                                        value={itemRemarks[item.id] ?? ""}
                                                        disabled={item.mrs_status?.toLowerCase() === "cancelled" || isProcessing}
                                                        onChange={(e) => handleItemRemarksChange(item.id, e.target.value)}
                                                    />
                                                ) : (
                                                    <span className="text-sm text-base-content">
                                                        {item.remarks || "—"}
                                                    </span>
                                                )}
                                            </td>

                                            {/* ── Action cell ── */}
                                            {activeSubTab === "Preparing" && (
                                                <td className="text-center">
                                                    <button
                                                        className="flex items-center gap-1 px-2 py-1 text-xs rounded border border-base-content/40 text-base-content hover:border-base-content bg-transparent transition-all disabled:opacity-40"
                                                        onClick={() => handleCancelItemClick(item)}
                                                        disabled={isProcessing || item.mrs_status?.toLowerCase() === "cancelled"}
                                                    >
                                                        <XCircle className="w-3 h-3" /> Cancel
                                                    </button>
                                                </td>
                                            )}
                                            {activeSubTab === "For Pick Up" && (
                                                <td className="text-center">
                                                    <div className="flex items-center justify-center gap-1">
                                                        <button
                                                            className="px-2 py-1 text-xs rounded border border-base-content/40 text-base-content hover:border-base-content bg-transparent transition-all disabled:opacity-40"
                                                            onClick={() => handleReplaceItem(item)}
                                                            disabled={isProcessing}
                                                        >
                                                            Replace
                                                        </button>
                                                        <button
                                                            className="flex items-center gap-1 px-2 py-1 text-xs rounded border border-base-content/40 text-base-content hover:border-base-content bg-transparent transition-all disabled:opacity-40"
                                                            onClick={() => handleCancelItemClick(item)}
                                                            disabled={isProcessing || item.mrs_status?.toLowerCase() === "cancelled"}
                                                        >
                                                            <XCircle className="w-3 h-3" /> Cancel
                                                        </button>
                                                    </div>
                                                </td>
                                            )}
                                            {activeSubTab === "Delivered" && (
                                                <td className="text-center">
                                                    <button
                                                        className="flex items-center gap-1 px-2 py-1 text-xs rounded border border-base-content/40 text-base-content hover:border-base-content bg-transparent transition-all disabled:opacity-40"
                                                        onClick={() => handleReturnItemClick(item)}
                                                        disabled={isProcessing}
                                                    >
                                                        <RotateCcw className="w-3 h-3" /> Return
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-base-content/10">
                            {activeSubTab === "Preparing" && (
                                <button
                                    className="px-4 py-2 rounded font-medium border-2 border-base-content text-base-content bg-transparent hover:bg-base-content hover:text-base-100 transition-all disabled:opacity-40"
                                    onClick={handleProceed}
                                    disabled={!isAllItemsHaveIssuedQty || isProcessing}
                                >
                                    {isProcessing ? <span className="flex items-center gap-2"><span className="loading loading-spinner loading-xs"></span>Processing...</span> : "Proceed"}
                                </button>
                            )}
                            {activeSubTab === "For Pick Up" && (
                                <button
                                    className="px-4 py-2 rounded font-medium border-2 border-base-content text-base-content bg-transparent hover:bg-base-content hover:text-base-100 transition-all disabled:opacity-40"
                                    onClick={handleMarkAsDelivered}
                                    disabled={isProcessing || !selectedMRS?.items?.some((item) => item.mrs_status?.toLowerCase() === "for pick up")}
                                >
                                    {isProcessing ? <span className="flex items-center gap-2"><span className="loading loading-spinner loading-xs"></span>Processing...</span> : "Mark as Delivered"}
                                </button>
                            )}
                            <button
                                className="px-4 py-2 rounded font-medium border border-base-content/40 text-base-content bg-transparent hover:border-base-content transition-all disabled:opacity-40"
                                onClick={closeModal}
                                disabled={isProcessing}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                    <div className="modal-backdrop" onClick={!isProcessing ? closeModal : undefined} />
                </div>
            )}

            {/* ================= CANCEL ITEM MODAL ================= */}
            {showCancelModal && cancelTargetItem && (
                <div className="modal modal-open" style={{ zIndex: 9999 }}>
                    <div className="modal-box max-w-lg bg-base-100 border border-base-content/20">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-lg flex items-center gap-2 text-base-content">
                                <XCircle className="w-5 h-5" /> Cancel Item
                            </h3>
                            <button
                                className="p-1 rounded border border-base-content/30 text-base-content bg-transparent"
                                onClick={closeCancelModal}
                                disabled={isProcessing}
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="border-l-4 border-base-content pl-3 mb-4 py-2">
                            <div className="text-sm text-base-content">
                                {activeSubTab === "For Pick Up" ? (
                                    <><strong>For Pick Up cancellation:</strong> The issued quantity will be <strong>restored back to inventory</strong> automatically.</>
                                ) : (
                                    <><strong>Preparing cancellation:</strong> No inventory adjustment will be made (item not yet deducted).</>
                                )}
                            </div>
                        </div>

                        <div className="border border-base-content/15 rounded-lg mb-4 p-4">
                            <div className="grid grid-cols-2 gap-2 text-sm">
                                <div>
                                    <span className="text-base-content/50">Item Code:</span>{" "}
                                    <span className="font-semibold text-base-content">{cancelTargetItem.itemCode}</span>
                                </div>
                                <div>
                                    <span className="text-base-content/50">Description:</span>{" "}
                                    <span className="font-semibold text-base-content">{cancelTargetItem.material_description}</span>
                                </div>
                                {cancelTargetItem.detailed_description && (
                                    <div className="col-span-2">
                                        <span className="text-base-content/50">Detailed Desc:</span>{" "}
                                        <span className="font-semibold text-base-content">{cancelTargetItem.detailed_description}</span>
                                    </div>
                                )}
                                <div>
                                    <span className="text-base-content/50">Requested Qty:</span>{" "}
                                    <span className="font-semibold text-base-content">
                                        {cancelTargetItem.request_quantity ?? cancelTargetItem.request_qty ?? "—"}
                                    </span>
                                </div>
                                {activeSubTab === "For Pick Up" && (
                                    <div>
                                        <span className="text-base-content/50">Issued Qty:</span>{" "}
                                        <span className="font-semibold text-base-content">
                                            {cancelTargetItem.issued_quantity ?? cancelTargetItem.issued_qty ?? "—"}
                                        </span>
                                    </div>
                                )}
                                <div>
                                    <span className="text-base-content/50">Current Status:</span>{" "}
                                    <BorderBadge>{activeSubTab}</BorderBadge>
                                </div>
                            </div>
                        </div>

                        <div className="mb-4">
                            <label className="block mb-1 text-sm font-semibold text-base-content">
                                Reason for Cancellation <span className="text-base-content/40">*</span>
                            </label>
                            <textarea
                                className="w-full h-24 px-3 py-2 rounded text-sm border border-base-content/30 text-base-content bg-transparent focus:border-base-content focus:outline-none resize-none placeholder:text-base-content/30"
                                placeholder="Enter the reason for cancelling this item..."
                                value={cancelRemarks}
                                onChange={(e) => setCancelRemarks(e.target.value)}
                                maxLength={500}
                                disabled={isProcessing}
                                autoFocus
                            />
                            <p className="text-xs text-base-content/40 mt-1">{cancelRemarks.length}/500 characters</p>
                        </div>

                        <div className="flex justify-end gap-2 pt-4 border-t border-base-content/10">
                            <button
                                className="flex items-center gap-1 px-4 py-2 rounded font-medium border-2 border-base-content text-base-content bg-transparent hover:bg-base-content hover:text-base-100 transition-all disabled:opacity-40"
                                onClick={handleConfirmCancel}
                                disabled={isProcessing || !cancelRemarks.trim()}
                            >
                                {isProcessing
                                    ? <span className="flex items-center gap-2"><span className="loading loading-spinner loading-xs"></span>Processing...</span>
                                    : <><XCircle className="w-4 h-4" />Confirm Cancellation</>}
                            </button>
                            <button
                                className="px-4 py-2 rounded font-medium border border-base-content/40 text-base-content bg-transparent hover:border-base-content transition-all disabled:opacity-40"
                                onClick={closeCancelModal}
                                disabled={isProcessing}
                            >
                                Back
                            </button>
                        </div>
                    </div>
                    <div className="modal-backdrop" onClick={!isProcessing ? closeCancelModal : undefined} />
                </div>
            )}

            {/* ================= RETURN ITEM MODAL ================= */}
            {showReturnModal && selectedItemForReturn && (
                <div className="modal modal-open">
                    <div className="modal-box max-w-2xl bg-base-100 border border-base-content/20">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-lg text-base-content">Return Item</h3>
                            <button
                                className="p-1 rounded border border-base-content/30 text-base-content bg-transparent"
                                onClick={closeReturnModal}
                                disabled={isProcessing}
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="border border-base-content/15 rounded-lg mb-6 p-4">
                            <h4 className="font-semibold text-base mb-3 text-base-content">Item Details</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-base-content/50">Item Code</p>
                                    <p className="font-semibold text-base-content">{selectedItemForReturn.itemCode}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-base-content/50">Description</p>
                                    <p className="font-semibold text-base-content">{selectedItemForReturn.material_description}</p>
                                </div>
                                {isConsumable && (
                                    <div>
                                        <p className="text-sm text-base-content/50">Serial</p>
                                        <p className="font-semibold text-base-content">{selectedItemForReturn.serial ?? "N/A"}</p>
                                    </div>
                                )}
                                {(isConsumable || isSupplies) && (
                                    <div>
                                        <p className="text-sm text-base-content/50">Bin Location</p>
                                        <p className="font-semibold text-base-content">{selectedItemForReturn.bin_location ?? "N/A"}</p>
                                    </div>
                                )}
                                {isConsigned && (
                                    <div>
                                        <p className="text-sm text-base-content/50">Supplier</p>
                                        <p className="font-semibold text-base-content">{selectedItemForReturn.supplier ?? "N/A"}</p>
                                    </div>
                                )}
                                <div>
                                    <p className="text-sm text-base-content/50">Issued Quantity</p>
                                    <p className="font-semibold text-base-content">
                                        {selectedItemForReturn.issued_quantity ?? selectedItemForReturn.issued_qty}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="mb-4">
                            <label className="block mb-1 text-sm font-semibold text-base-content">
                                Reason for Return <span className="text-base-content/40">*</span>
                            </label>
                            <textarea
                                className="w-full h-24 px-3 py-2 rounded text-sm border border-base-content/30 text-base-content bg-transparent focus:border-base-content focus:outline-none resize-none placeholder:text-base-content/30"
                                placeholder="Enter the reason for returning this item..."
                                value={returnRemarks}
                                onChange={(e) => setReturnRemarks(e.target.value)}
                                maxLength={500}
                                disabled={isProcessing}
                            />
                            <p className="text-xs text-base-content/40 mt-1">{returnRemarks.length}/500 characters</p>
                        </div>

                        <div className="flex justify-end gap-2 pt-4 border-t border-base-content/10">
                            <button
                                className="px-4 py-2 rounded font-medium border-2 border-base-content text-base-content bg-transparent hover:bg-base-content hover:text-base-100 transition-all disabled:opacity-40"
                                onClick={handleConfirmReturn}
                                disabled={isProcessing || !returnRemarks.trim()}
                            >
                                {isProcessing ? <span className="flex items-center gap-2"><span className="loading loading-spinner loading-xs"></span>Processing...</span> : "Confirm Return"}
                            </button>
                            <button
                                className="px-4 py-2 rounded font-medium border border-base-content/40 text-base-content bg-transparent hover:border-base-content transition-all disabled:opacity-40"
                                onClick={closeReturnModal}
                                disabled={isProcessing}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                    <div className="modal-backdrop" onClick={!isProcessing ? closeReturnModal : undefined} />
                </div>
            )}

            {/* ================= REPLACE ITEM MODAL ================= */}
            {showReplaceModal && selectedItemForReplace && (
                <div className="modal modal-open">
                    <div className="modal-box max-w-6xl bg-base-100 border border-base-content/20">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-lg text-base-content">Replace Item</h3>
                            <button
                                className="p-1 rounded border border-base-content/30 text-base-content bg-transparent"
                                onClick={closeReplaceModal}
                                disabled={isProcessing}
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="border border-base-content/15 rounded-lg mb-6 p-4">
                            <h4 className="font-semibold text-base mb-3 text-base-content">Current Item</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-base-content/50">Item Code</p>
                                    <p className="font-semibold text-base-content">{selectedItemForReplace.itemCode}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-base-content/50">Description</p>
                                    <p className="font-semibold text-base-content">{selectedItemForReplace.material_description}</p>
                                </div>
                                {isConsumable && (
                                    <div>
                                        <p className="text-sm text-base-content/50">Serial</p>
                                        <p className="font-semibold text-base-content">{selectedItemForReplace.serial ?? "N/A"}</p>
                                    </div>
                                )}
                                {(isConsumable || isSupplies) && (
                                    <div>
                                        <p className="text-sm text-base-content/50">Bin Location</p>
                                        <p className="font-semibold text-base-content">{selectedItemForReplace.bin_location ?? "N/A"}</p>
                                    </div>
                                )}
                                {isConsigned && (
                                    <div>
                                        <p className="text-sm text-base-content/50">Supplier</p>
                                        <p className="font-semibold text-base-content">{selectedItemForReplace.supplier ?? "N/A"}</p>
                                    </div>
                                )}
                                <div>
                                    <p className="text-sm text-base-content/50">Issued Quantity</p>
                                    <p className="font-semibold text-base-content">
                                        {selectedItemForReplace.issued_quantity ?? selectedItemForReplace.issued_qty}
                                    </p>
                                </div>
                            </div>

                            <div className="border-t border-base-content/10 my-4" />

                            <div className="grid grid-cols-3 gap-4 items-start">
                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <label className="text-sm font-semibold text-base-content">
                                            Replacement Qty <span className="text-base-content/40">*</span>
                                        </label>
                                        <span className="text-xs text-base-content/40">
                                            Max: {selectedItemForReplace?.issued_quantity ?? selectedItemForReplace?.issued_qty ?? 0}
                                        </span>
                                    </div>
                                    <input
                                        type="number"
                                        className="w-full px-3 py-2 rounded border border-base-content/30 text-base-content bg-transparent focus:border-base-content focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        min={1}
                                        max={selectedItemForReplace?.issued_quantity ?? selectedItemForReplace?.issued_qty ?? 1}
                                        value={replacementQuantity === "" ? "" : replacementQuantity}
                                        placeholder="Enter qty..."
                                        disabled={isProcessing}
                                        ref={(el) => {
                                            if (!el) return;
                                            el.addEventListener("wheel", (e) => e.preventDefault(), { passive: false });
                                        }}
                                        onChange={(e) => {
                                            const raw = e.target.value;
                                            if (raw === "") { setReplacementQuantity(""); return; }
                                            const val = parseInt(raw, 10);
                                            const max = selectedItemForReplace?.issued_quantity ?? selectedItemForReplace?.issued_qty ?? 1;
                                            if (!isNaN(val)) setReplacementQuantity(Math.min(Math.max(1, val), max));
                                        }}
                                    />
                                </div>
                                <div className="col-span-2">
                                    <div className="flex justify-between items-center mb-1">
                                        <label className="text-sm font-semibold text-base-content">
                                            Reason for Replacement <span className="text-base-content/40">*</span>
                                        </label>
                                        <span className="text-xs text-base-content/40">{replaceRemarks.length}/500</span>
                                    </div>
                                    <textarea
                                        className="w-full px-3 py-2 rounded text-sm border border-base-content/30 text-base-content bg-transparent focus:border-base-content focus:outline-none resize-none placeholder:text-base-content/30"
                                        placeholder="Enter reason for replacement..."
                                        value={replaceRemarks}
                                        onChange={(e) => setReplaceRemarks(e.target.value)}
                                        maxLength={500}
                                        rows={2}
                                        disabled={isProcessing}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 mb-4">
                            <div className="flex-1 border-t border-base-content/20" />
                            <span className="text-xs font-semibold text-base-content/50 uppercase tracking-wide">
                                Search for Replacement Items
                            </span>
                            <div className="flex-1 border-t border-base-content/20" />
                        </div>

                        <div className="mb-4">
                            <div className="flex items-center border border-base-content/30 rounded overflow-hidden">
                                <span className="px-3 py-2 border-r border-base-content/20">
                                    <Search className="w-5 h-5 text-base-content/50" />
                                </span>
                                <input
                                    type="text"
                                    placeholder="Search by item code, description, serial, or supplier (min 2 characters)..."
                                    className="flex-1 px-3 py-2 text-sm text-base-content bg-transparent focus:outline-none placeholder:text-base-content/30"
                                    value={searchQuery}
                                    disabled={isProcessing}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        setSearchQuery(value);
                                        if (searchTimeout) clearTimeout(searchTimeout);
                                        const timeout = setTimeout(() => handleSearchReplacements(value), 500);
                                        setSearchTimeout(timeout);
                                    }}
                                />
                                {searchQuery && (
                                    <button
                                        className="px-3 py-2 border-l border-base-content/20 text-base-content/50 hover:text-base-content bg-transparent"
                                        disabled={isProcessing}
                                        onClick={() => {
                                            setSearchQuery("");
                                            setAvailableReplacements([]);
                                            if (searchTimeout) { clearTimeout(searchTimeout); setSearchTimeout(null); }
                                        }}
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                            <p className="text-xs text-base-content/40 mt-1">Type at least 2 characters to search</p>
                        </div>

                        <div className="overflow-x-auto max-h-96 border border-base-content/15 rounded-lg">
                            <table className="table table-zebra table-pin-rows w-full [&_th]:border-y [&_th]:border-base-content/20 [&_td]:border-y [&_td]:border-base-content/20">
                                <thead>
                                    <tr className="text-base-content border-b border-base-content/15">
                                        <th>Item Code</th>
                                        <th>Material Description</th>
                                        <th>Detailed Description</th>
                                        {isConsumable && <th>Serial</th>}
                                        {(isConsumable || isSupplies) && <th>Bin Location</th>}
                                        {isConsigned && <><th>Supplier</th><th>Expiration</th><th>Bin Location</th></>}
                                        <th>Available Qty</th>
                                        <th className="text-center">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {availableReplacements.length === 0 && (
                                        <tr>
                                            <td
                                                colSpan={isConsumable ? 6 : isConsigned ? 7 : 5}
                                                className="text-center text-base-content/40"
                                            >
                                                {searchQuery.length === 0
                                                    ? "Type in the search bar to find replacement items"
                                                    : searchQuery.length < 2
                                                    ? "Please enter at least 2 characters to search"
                                                    : "No items match your search"}
                                            </td>
                                        </tr>
                                    )}
                                    {availableReplacements.map((replacement, idx) => (
                                        <tr key={idx} className="text-base-content">
                                            <td>{replacement.item_code}</td>
                                            <td>{replacement.material_description}</td>
                                            <td>{replacement.detailed_description || "—"}</td>
                                            {isConsumable && <td>{replacement.serial ?? "N/A"}</td>}
                                            {(isConsumable || isSupplies) && <td>{replacement.bin_location ?? "N/A"}</td>}
                                            {isConsigned && (
                                                <>
                                                    <td>{replacement.supplier ?? "N/A"}</td>
                                                    <td>{replacement.expiration ?? "N/A"}</td>
                                                    <td>{replacement.bin_location ?? "N/A"}</td>
                                                </>
                                            )}
                                            <td>{replacement.quantity ?? replacement.qty}</td>
                                            <td className="text-center">
                                                <button
                                                    className="px-2 py-1 text-xs rounded border border-base-content/40 text-base-content bg-transparent hover:bg-base-content hover:text-base-100 transition-all disabled:opacity-40"
                                                    onClick={() => handleConfirmReplacement(replacement)}
                                                    disabled={
                                                        isProcessing ||
                                                        (replacement.quantity ?? replacement.qty) < replacementQuantity ||
                                                        !replaceRemarks.trim()
                                                    }
                                                >
                                                    {isProcessing ? <span className="loading loading-spinner loading-xs"></span> : "Select"}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex justify-end pt-4 border-t border-base-content/10 mt-4">
                            <button
                                className="px-4 py-2 rounded font-medium border border-base-content/40 text-base-content bg-transparent hover:border-base-content transition-all disabled:opacity-40"
                                onClick={closeReplaceModal}
                                disabled={isProcessing}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                    <div className="modal-backdrop" onClick={!isProcessing ? closeReplaceModal : undefined} />
                </div>
            )}
        </AuthenticatedLayout>
    );
}