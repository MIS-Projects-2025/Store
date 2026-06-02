import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head, usePage, router } from "@inertiajs/react";
import { useState, useEffect, useCallback, useMemo } from "react";
import {
    FileExcelOutlined,
    PlusCircleOutlined,
    AppstoreAddOutlined,
    SearchOutlined,
    EditOutlined,
    DeleteOutlined,
    EyeOutlined,
    HistoryOutlined,
    SyncOutlined,
} from "@ant-design/icons";

// Debounce hook
const useDebounce = (value, delay) => {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
};

// ── Shared class helpers ──────────────────────────────────────────────────────

const inputCls = (hasError = false) =>
    `w-full px-3 py-2 rounded text-sm border ${
        hasError ? "border-red-400" : "border-base-content/30"
    } text-base-content bg-transparent focus:border-base-content focus:outline-none placeholder:text-base-content/30`;

const inputSmCls = (hasError = false) =>
    `input input-sm w-full border ${
        hasError ? "border-red-400" : "border-base-content/30"
    } text-base-content bg-transparent focus:border-base-content focus:outline-none`;

// Table class — horizontal borders only (no vertical column separators)
const tableCls =
    "table w-full border-collapse [&_thead_th]:border-y [&_thead_th]:border-base-content/20 [&_tbody_td]:border-y [&_tbody_td]:border-base-content/20";

// ── Reusable components ───────────────────────────────────────────────────────

const BorderBadge = ({ children, className = "" }) => (
    <span
        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border border-base-content/40 text-base-content bg-transparent ${className}`}
    >
        {children}
    </span>
);

const PrimaryBtn = ({
    children,
    onClick,
    disabled,
    className = "",
    title,
    type = "button",
}) => (
    <button
        type={type}
        onClick={onClick}
        disabled={disabled}
        title={title}
        className={`flex items-center gap-1.5 px-4 py-2 rounded font-medium border-2 border-base-content text-base-content bg-transparent hover:bg-base-content hover:text-base-100 transition-all disabled:opacity-40 ${className}`}
    >
        {children}
    </button>
);

const SecondaryBtn = ({
    children,
    onClick,
    disabled,
    className = "",
    title,
    type = "button",
}) => (
    <button
        type={type}
        onClick={onClick}
        disabled={disabled}
        title={title}
        className={`flex items-center gap-1.5 px-4 py-2 rounded font-medium border border-base-content/40 text-base-content bg-transparent hover:border-base-content transition-all disabled:opacity-40 ${className}`}
    >
        {children}
    </button>
);

const IconBtn = ({ children, onClick, disabled, title, className = "" }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        title={title}
        className={`p-1 rounded border border-base-content/20 text-base-content bg-transparent hover:border-base-content transition-all disabled:opacity-40 ${className}`}
    >
        {children}
    </button>
);

// Shared cell/header classes
const th = "text-center px-3 py-2 text-xs font-semibold text-base-content";
const td = "text-center px-3 py-2 text-sm text-base-content";

export default function Consigned({ consignedItems = [], empStation = 1 }) {
    const props = usePage().props;
    const station = parseInt(empStation, 10);

    const [searchQuery, setSearchQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [showStep1Modal, setShowStep1Modal] = useState(false);
    const [showStep2Modal, setShowStep2Modal] = useState(false);
    const [step1Data, setStep1Data] = useState({
        commonality: "",
        category: "",
    });
    const [step2Data, setStep2Data] = useState({
        item_code: "",
        mat_description: "",
        supplier: "",
        expiration: "",
        uom: "",
        qty: "",
        qty_per_box: "",
        minimum: "",
        price: "",
        bin_location: "",
    });
    const [rowSelections, setRowSelections] = useState({});
    const [errors, setErrors] = useState({});
    const [processing, setProcessing] = useState(false);
    const [fetchingCategory, setFetchingCategory] = useState(false);
    const [modalSearchQuery, setModalSearchQuery] = useState("");
    const [editingMainRowId, setEditingMainRowId] = useState(null);
    const [showDeleteMainConfirmModal, setShowDeleteMainConfirmModal] =
        useState(false);
    const [deleteMainItemId, setDeleteMainItemId] = useState(null);
    const [deleteMainConfirmText, setDeleteMainConfirmText] = useState("");
    const [showAddQuantityModal, setShowAddQuantityModal] = useState(false);
    const [quantitySearchQuery, setQuantitySearchQuery] = useState("");
    const [selectedQuantityItems, setSelectedQuantityItems] = useState([]);
    const [quantityToAdd, setQuantityToAdd] = useState({});
    const [editMainFormData, setEditMainFormData] = useState({
        commonality: "",
        category: "",
    });
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [showImportModal, setShowImportModal] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [importProcessing, setImportProcessing] = useState(false);
    const [showConsignedHistoryModal, setShowConsignedHistoryModal] =
        useState(false);
    const [showDetailHistoryModal, setShowDetailHistoryModal] = useState(false);
    const [consignedHistoryData, setConsignedHistoryData] = useState([]);
    const [detailHistoryData, setDetailHistoryData] = useState([]);
    const [loadingConsignedHistory, setLoadingConsignedHistory] =
        useState(false);
    const [loadingDetailHistory, setLoadingDetailHistory] = useState(false);
    const [consignedHistoryItemInfo, setConsignedHistoryItemInfo] =
        useState(null);
    const [detailHistoryItemInfo, setDetailHistoryItemInfo] = useState(null);
    const [editingRowId, setEditingRowId] = useState(null);
    const [editFormData, setEditFormData] = useState({});
    const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
    const [deleteItemId, setDeleteItemId] = useState(null);
    const [deleteConfirmText, setDeleteConfirmText] = useState("");

    const [recalibrating, setRecalibrating] = useState(false);

    const handleRecalibrateMinimum = () => {
        if (
            !confirm(
                "Recalibrate minimum stock levels based on the last 2 weeks of issued history?",
            )
        )
            return;

        setRecalibrating(true);
        router.post(
            route("consigned.recalibrate-minimum"),
            {},
            {
                preserveScroll: true,
                onSuccess: () => {
                    setRecalibrating(false);
                },
                onError: (errors) => {
                    console.error("Recalibration failed:", errors);
                    setRecalibrating(false);
                    alert(
                        "Recalibration failed: " +
                            (errors.error || "Unknown error"),
                    );
                },
                onFinish: () => setRecalibrating(false),
            },
        );
    };

    const debouncedCommonality = useDebounce(step1Data.commonality, 500);

    const parseJsonField = (field) => {
        if (!field) return null;
        if (typeof field === "object") return field;
        try {
            return JSON.parse(field);
        } catch {
            return null;
        }
    };

    useEffect(() => {
        if (debouncedCommonality && showStep1Modal) {
            fetchCategoryForCommonality(debouncedCommonality);
        }
    }, [debouncedCommonality, showStep1Modal]);

    const fetchCategoryForCommonality = async (commonality) => {
        setFetchingCategory(true);
        try {
            const response = await fetch(
                route("consigned.category") +
                    `?commonality=${encodeURIComponent(commonality)}`,
            );
            const data = await response.json();
            if (data.category)
                setStep1Data((prev) => ({ ...prev, category: data.category }));
        } catch (error) {
            console.error("Error fetching category:", error);
        } finally {
            setFetchingCategory(false);
        }
    };

    useEffect(() => {
        const initialSelections = {};
        consignedItems.forEach((item) => {
            if (item.combinations && item.combinations.length > 0) {
                const matchedCombination =
                    item.combinations.find(
                        (combo) =>
                            combo.item_code === item.selected_itemcode &&
                            combo.supplier === item.selected_supplier,
                    ) || item.combinations[0];
                initialSelections[item.id] = {
                    itemCode: matchedCombination.item_code,
                    supplier: matchedCombination.supplier,
                    description: matchedCombination.mat_description,
                };
            }
        });
        setRowSelections(initialSelections);
    }, [consignedItems]);

    const getAvailableItemCodes = (item) => {
        if (!item.combinations) return [];
        return [...new Set(item.combinations.map((c) => c.item_code))];
    };

    const getAvailableSuppliersForItemCode = (item, itemCode) => {
        if (!item.combinations) return [];
        return [
            ...new Set(
                item.combinations
                    .filter((c) => c.item_code === itemCode)
                    .map((c) => c.supplier),
            ),
        ];
    };

    const updateSelectionInBackend = useCallback(
        (itemId, itemCode, supplier) => {
            router.post(
                route("consigned.update-selection", itemId),
                { selected_itemcode: itemCode, selected_supplier: supplier },
                {
                    preserveScroll: true,
                    onSuccess: () =>
                        console.log("Selection updated successfully"),
                    onError: (errors) =>
                        console.error("Failed to update selection:", errors),
                },
            );
        },
        [],
    );

    const handleItemCodeChange = useCallback(
        (itemId, newItemCode, item) => {
            const availableSuppliers = getAvailableSuppliersForItemCode(
                item,
                newItemCode,
            );
            const newSupplier = availableSuppliers[0] || "";
            const matchedCombination = item.combinations.find(
                (combo) =>
                    combo.item_code === newItemCode &&
                    combo.supplier === newSupplier,
            );
            setRowSelections((prev) => ({
                ...prev,
                [itemId]: {
                    itemCode: newItemCode,
                    supplier: newSupplier,
                    description: matchedCombination?.mat_description || "N/A",
                },
            }));
            updateSelectionInBackend(itemId, newItemCode, newSupplier);
        },
        [updateSelectionInBackend],
    );

    const handleImportExcel = () => {
        setShowImportModal(true);
        setSelectedFile(null);
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const validTypes = [
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "application/vnd.ms-excel",
            ];
            if (!validTypes.includes(file.type)) {
                alert("Please select a valid Excel file (.xlsx or .xls)");
                e.target.value = "";
                return;
            }
            setSelectedFile(file);
        }
    };

    const handleImportSubmit = () => {
        if (!selectedFile) {
            alert("Please select a file to import");
            return;
        }
        setImportProcessing(true);
        const formData = new FormData();
        formData.append("file", selectedFile);
        router.post(route("consigned.import-excel"), formData, {
            preserveScroll: true,
            onSuccess: () => {
                setShowImportModal(false);
                setSelectedFile(null);
                setImportProcessing(false);
            },
            onError: (errors) => {
                console.error("Import failed:", errors);
                setImportProcessing(false);
            },
            onFinish: () => setImportProcessing(false),
        });
    };

    const handleAddQuantity = () => {
        setShowAddQuantityModal(true);
        setQuantitySearchQuery("");
        setSelectedQuantityItems([]);
        setQuantityToAdd({});
    };

    const handleSelectQuantityItem = (combo) => {
        const isSelected = selectedQuantityItems.some(
            (item) => item.id === combo.id,
        );
        if (isSelected) {
            setSelectedQuantityItems(
                selectedQuantityItems.filter((item) => item.id !== combo.id),
            );
            const newQuantityToAdd = { ...quantityToAdd };
            delete newQuantityToAdd[combo.id];
            setQuantityToAdd(newQuantityToAdd);
        } else {
            setSelectedQuantityItems([...selectedQuantityItems, combo]);
            setQuantityToAdd({ ...quantityToAdd, [combo.id]: 0 });
        }
    };

    const handleQuantityChange = (id, value) => {
        setQuantityToAdd({ ...quantityToAdd, [id]: parseInt(value) || 0 });
    };

    const handleSaveQuantities = () => {
        const updates = selectedQuantityItems
            .filter(
                (item) => quantityToAdd[item.id] && quantityToAdd[item.id] > 0,
            )
            .map((item) => ({
                id: item.id,
                quantity_to_add: quantityToAdd[item.id],
            }));
        if (updates.length === 0) {
            alert("Please enter quantities to add for selected items");
            return;
        }
        router.post(
            route("consigned.update-quantities"),
            { updates },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setShowAddQuantityModal(false);
                    setQuantitySearchQuery("");
                    setSelectedQuantityItems([]);
                    setQuantityToAdd({});
                },
                onError: (errors) => {
                    console.error("Failed to update quantities:", errors);
                    alert(
                        "Failed to update quantities: " +
                            (errors.error || "Unknown error"),
                    );
                },
            },
        );
    };

    const allAvailableItems = useMemo(() => {
        const allItems = [];
        consignedItems.forEach((item) => {
            if (item.combinations && item.combinations.length > 0) {
                item.combinations.forEach((combo) => {
                    allItems.push({
                        ...combo,
                        commonality: item.commonality,
                        category: item.category,
                    });
                });
            }
        });
        return allItems;
    }, [consignedItems]);

    const filteredQuantityItems = useMemo(() => {
        const searchLower = quantitySearchQuery.toLowerCase();
        if (!searchLower) return allAvailableItems;
        return allAvailableItems.filter(
            (item) =>
                (item.item_code &&
                    item.item_code.toLowerCase().includes(searchLower)) ||
                (item.mat_description &&
                    item.mat_description.toLowerCase().includes(searchLower)) ||
                (item.supplier &&
                    item.supplier.toLowerCase().includes(searchLower)) ||
                (item.commonality &&
                    item.commonality.toLowerCase().includes(searchLower)),
        );
    }, [allAvailableItems, quantitySearchQuery]);

    const handleAddItem = () => {
        setShowStep1Modal(true);
        setStep1Data({ commonality: "", category: "" });
        setStep2Data({
            item_code: "",
            mat_description: "",
            supplier: "",
            expiration: "",
            uom: "",
            qty: "",
            qty_per_box: "",
            minimum: "",
            maximum: "",
            price: "",
            bin_location: "",
        });
        setErrors({});
    };

    const handleStep1Next = () => {
        const newErrors = {};
        if (!step1Data.category) newErrors.category = "Category is required";
        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }
        setShowStep1Modal(false);
        setShowStep2Modal(true);
    };

    const handleStep2Back = () => {
        setShowStep2Modal(false);
        setShowStep1Modal(true);
    };

    const handleStep2Save = (e) => {
        e.preventDefault();
        const newErrors = {};
        if (!step2Data.item_code) newErrors.item_code = "Item code is required";
        if (!step2Data.mat_description)
            newErrors.mat_description = "Description is required";
        if (!step2Data.supplier) newErrors.supplier = "Supplier is required";
        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }
        setProcessing(true);
        router.post(
            route("consigned.store"),
            { ...step1Data, ...step2Data },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setShowStep2Modal(false);
                    setStep1Data({ commonality: "", category: "" });
                    setStep2Data({
                        item_code: "",
                        mat_description: "",
                        supplier: "",
                        expiration: "",
                        uom: "",
                        qty: "",
                        qty_per_box: "",
                        minimum: "",
                        maximum: "",
                        price: "",
                        bin_location: "",
                    });
                    setErrors({});
                    setProcessing(false);
                },
                onError: (errors) => {
                    setErrors(errors);
                    setProcessing(false);
                },
                onFinish: () => setProcessing(false),
            },
        );
    };

    const handleView = (id) => {
        const item = consignedItems.find((i) => i.id === id);
        if (item) {
            const currentSelection = rowSelections[id] || {
                itemCode: item.selected_itemcode,
                supplier: item.selected_supplier,
                description: "N/A",
            };
            fetch(route("consigned.get-all-details", id))
                .then((r) => r.json())
                .then((data) => {
                    setSelectedItem({
                        ...item,
                        currentSelection,
                        allCombinations: data.allDetails || [],
                    });
                    setShowViewModal(true);
                })
                .catch(() => {
                    setSelectedItem({
                        ...item,
                        currentSelection,
                        allCombinations: item.combinations || [],
                    });
                    setShowViewModal(true);
                });
        }
    };

    const handleEditRow = (combo, idx) => {
        setEditingRowId(idx);
        setEditFormData({
            item_code: combo.item_code,
            mat_description: combo.mat_description,
            supplier: combo.supplier,
            expiration: combo.expiration,
            uom: combo.uom,
            qty: combo.qty,
            qty_per_box: combo.qty_per_box,
            minimum: combo.minimum,
            price: combo.price,
            bin_location: combo.bin_location,
        });
    };

    const handleCancelEdit = () => {
        setEditingRowId(null);
        setEditFormData({});
    };

    const handleSaveEdit = (combo, idx) => {
        const newErrors = {};
        if (station === 1) {
            if (!editFormData.item_code)
                newErrors.item_code = "Item code is required";
            if (!editFormData.mat_description)
                newErrors.mat_description = "Description is required";
            if (!editFormData.supplier)
                newErrors.supplier = "Supplier is required";
        }
        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        const payload =
            station === 2
                ? {
                      item_code: combo.item_code,
                      mat_description: combo.mat_description,
                      supplier: combo.supplier,
                      expiration: editFormData.expiration,
                      uom: combo.uom,
                      qty_per_box: editFormData.qty_per_box,
                      minimum: combo.minimum,
                      price: combo.price,
                      bin_location: editFormData.bin_location,
                  }
                : editFormData;

        router.put(route("consigned.update-detail", combo.id), payload, {
            preserveScroll: true,
            onSuccess: () => {
                if (selectedItem) {
                    const updatedCombinations =
                        selectedItem.allCombinations.map((c, index) =>
                            index === idx ? { ...c, ...payload } : c,
                        );
                    setSelectedItem({
                        ...selectedItem,
                        allCombinations: updatedCombinations,
                    });
                }
                setEditingRowId(null);
                setEditFormData({});
                setErrors({});
            },
            onError: (errors) => setErrors(errors),
        });
    };

    const handleDeleteRow = (combo, idx) => {
        setDeleteItemId({ combo, idx });
        setShowDeleteConfirmModal(true);
        setDeleteConfirmText("");
    };

    const handleConfirmDelete = () => {
        if (deleteConfirmText === "Confirm") {
            const { combo, idx } = deleteItemId;
            router.delete(route("consigned.delete-detail", combo.id), {
                preserveScroll: true,
                onSuccess: () => {
                    setShowDeleteConfirmModal(false);
                    setDeleteItemId(null);
                    setDeleteConfirmText("");
                    if (selectedItem) {
                        const updatedCombinations =
                            selectedItem.allCombinations.filter(
                                (c, index) => index !== idx,
                            );
                        if (updatedCombinations.length === 0) {
                            setShowViewModal(false);
                            setSelectedItem(null);
                            setEditingRowId(null);
                            setEditFormData({});
                        } else {
                            setSelectedItem({
                                ...selectedItem,
                                allCombinations: updatedCombinations,
                            });
                        }
                    }
                },
                onError: (errors) => {
                    setShowDeleteConfirmModal(false);
                    setDeleteItemId(null);
                    setDeleteConfirmText("");
                    alert(
                        "Failed to delete item: " +
                            (errors.error || "Unknown error"),
                    );
                },
            });
        }
    };

    const handleConsignedHistory = async (id) => {
        setLoadingConsignedHistory(true);
        setShowConsignedHistoryModal(true);
        const item = consignedItems.find((i) => i.id === id);
        setConsignedHistoryItemInfo(item);
        try {
            const response = await fetch(route("consigned.history.main", id));
            const data = await response.json();
            console.log("consigned history response:", data); // debug
            setConsignedHistoryData(data.history || []);
        } catch (e) {
            console.error("consigned history fetch error:", e); // debug
            setConsignedHistoryData([]);
        } finally {
            setLoadingConsignedHistory(false);
        }
    };

    const handleExportConsignedHistory = () => {
        if (!consignedHistoryData.length) return;

        const info = consignedHistoryItemInfo;
        const rows = [];

        rows.push(["Consigned Detailed History"]);
        rows.push([]);
        rows.push(["Commonality", info?.commonality || "N/A"]);
        rows.push(["Category", info?.category || "N/A"]);
        rows.push([]);
        rows.push([
            "Action",
            "Record Type",
            "User",
            "Date/Time",
            "Field",
            "Old Value",
            "New Value",
        ]);

        consignedHistoryData.forEach((history) => {
            const action = formatAction(history.action);
            const recordType =
                history.type === "main" ? "Main Record" : "Detail Record";
            const user = history.user_name || "N/A";
            const date = history.created_at || "N/A";

            const changes = parseJsonField(history.changes);
            const oldValues = parseJsonField(history.old_values);
            const newValues = parseJsonField(history.new_values);

            if (changes && Object.keys(changes).length > 0) {
                Object.entries(changes).forEach(([field, change], idx) => {
                    rows.push([
                        idx === 0 ? action : "",
                        idx === 0 ? recordType : "",
                        idx === 0 ? user : "",
                        idx === 0 ? date : "",
                        field.replace(/_/g, " "),
                        change?.old !== undefined
                            ? String(change.old ?? "N/A")
                            : "",
                        change?.new !== undefined
                            ? String(change.new ?? "N/A")
                            : "",
                    ]);
                });
            } else if (
                (history.action === "deleted" ||
                    history.action === "deleted_with_main") &&
                oldValues
            ) {
                Object.entries(oldValues).forEach(([key, value], idx) => {
                    if (value === null || value === undefined) return;
                    rows.push([
                        idx === 0 ? action : "",
                        idx === 0 ? recordType : "",
                        idx === 0 ? user : "",
                        idx === 0 ? date : "",
                        key.replace(/_/g, " "),
                        String(value),
                        "",
                    ]);
                });
            } else if (history.action === "created" && newValues) {
                Object.entries(newValues).forEach(([key, value], idx) => {
                    if (value === null || value === undefined) return;
                    rows.push([
                        idx === 0 ? action : "",
                        idx === 0 ? recordType : "",
                        idx === 0 ? user : "",
                        idx === 0 ? date : "",
                        key.replace(/_/g, " "),
                        "",
                        String(value),
                    ]);
                });
            } else {
                rows.push([action, recordType, user, date, "", "", ""]);
            }
        });

        const csvContent = rows
            .map((row) =>
                row
                    .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
                    .join(","),
            )
            .join("\n");

        const blob = new Blob([csvContent], {
            type: "text/csv;charset=utf-8;",
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        const filename = `consigned_history_${info?.commonality || "export"}_${new Date().toISOString().slice(0, 10)}.csv`;
        link.setAttribute("href", url);
        link.setAttribute("download", filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleDetailHistory = async (detailId, combo) => {
        setLoadingDetailHistory(true);
        setShowDetailHistoryModal(true);
        setDetailHistoryItemInfo({
            item_code: combo.item_code,
            mat_description: combo.mat_description,
            supplier: combo.supplier,
            commonality: selectedItem?.commonality || "N/A",
        });
        try {
            const response = await fetch(
                route("consigned.history.detail", detailId),
            );
            const data = await response.json();
            setDetailHistoryData(data.history || []);
        } catch {
            setDetailHistoryData([]);
        } finally {
            setLoadingDetailHistory(false);
        }
    };

    const handleExportDetailHistory = () => {
        if (!detailHistoryData.length) return;

        const info = detailHistoryItemInfo;
        const rows = [];

        rows.push(["Consigned Detailed History"]);
        rows.push([]);
        rows.push(["Commonality", info?.commonality || "N/A"]);
        rows.push(["Item Code", info?.item_code || "N/A"]);
        rows.push(["Supplier", info?.supplier || "N/A"]);
        rows.push(["Description", info?.mat_description || "N/A"]);
        rows.push([]);
        rows.push([
            "Action",
            "User",
            "Date/Time",
            "Field",
            "Old Value",
            "New Value",
        ]);

        detailHistoryData.forEach((history) => {
            const action = formatAction(history.action);
            const user = history.user_name || "N/A";
            const date = history.created_at || "N/A";

            const changes = parseJsonField(history.changes);
            const oldValues = parseJsonField(history.old_values);
            const newValues = parseJsonField(history.new_values);

            const isTransactionAction = [
                "issued",
                "returned",
                "replacement_return",
                "replacement_issue",
            ].includes(history.action);

            if (isTransactionAction && oldValues) {
                const details = [
                    oldValues.mrs_no ? `MRS No: ${oldValues.mrs_no}` : null,
                    oldValues.issued_qty !== undefined
                        ? `Issued Qty: ${oldValues.issued_qty}`
                        : null,
                    oldValues.returned_qty !== undefined
                        ? `Returned Qty: ${oldValues.returned_qty}`
                        : null,
                    oldValues.supplier
                        ? `Supplier: ${oldValues.supplier}`
                        : null,
                    oldValues.reason ? `Reason: ${oldValues.reason}` : null,
                ]
                    .filter(Boolean)
                    .join("; ");
                rows.push([
                    action,
                    user,
                    date,
                    "Transaction Details",
                    details,
                    "",
                ]);
            } else if (changes && Object.keys(changes).length > 0) {
                Object.entries(changes).forEach(([field, change], idx) => {
                    rows.push([
                        idx === 0 ? action : "",
                        idx === 0 ? user : "",
                        idx === 0 ? date : "",
                        field.replace(/_/g, " "),
                        change?.old !== undefined
                            ? String(change.old ?? "N/A")
                            : "",
                        change?.new !== undefined
                            ? String(change.new ?? "N/A")
                            : "",
                    ]);
                });
            } else if (
                (history.action === "deleted" ||
                    history.action === "deleted_with_main") &&
                oldValues
            ) {
                const relevant = Object.entries(oldValues).filter(
                    ([key]) =>
                        ![
                            "mrs_no",
                            "issued_qty",
                            "returned_qty",
                            "supplier",
                            "reason",
                        ].includes(key),
                );
                relevant.forEach(([key, value], idx) => {
                    if (value === null || value === undefined) return;
                    rows.push([
                        idx === 0 ? action : "",
                        idx === 0 ? user : "",
                        idx === 0 ? date : "",
                        key.replace(/_/g, " "),
                        String(value),
                        "",
                    ]);
                });
            } else if (history.action === "created" && newValues) {
                Object.entries(newValues).forEach(([key, value], idx) => {
                    if (value === null || value === undefined) return;
                    rows.push([
                        idx === 0 ? action : "",
                        idx === 0 ? user : "",
                        idx === 0 ? date : "",
                        key.replace(/_/g, " "),
                        "",
                        String(value),
                    ]);
                });
            } else {
                rows.push([action, user, date, "", "", ""]);
            }
        });

        const csvContent = rows
            .map((row) =>
                row
                    .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
                    .join(","),
            )
            .join("\n");

        const blob = new Blob([csvContent], {
            type: "text/csv;charset=utf-8;",
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        const filename = `detail_history_${info?.item_code || "export"}_${new Date().toISOString().slice(0, 10)}.csv`;
        link.setAttribute("href", url);
        link.setAttribute("download", filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const formatAction = (action) => {
        const actionMap = {
            created: "Created",
            updated: "Updated",
            deleted: "Deleted",
            deleted_with_main: "Deleted (with main record)",
            quantity_added: "Quantity Added",
            selection_updated: "Selection Updated",
            issued: "Material Issued",
            returned: "Material Returned",
            replacement_return: "Replacement Return",
            replacement_issue: "Replacement Issue",
        };
        return actionMap[action] || action;
    };

    const renderChangeDetails = (history) => {
        if (
            [
                "issued",
                "returned",
                "replacement_return",
                "replacement_issue",
            ].includes(history.action)
        )
            return null;
        if (!history.changes || Object.keys(history.changes).length === 0)
            return null;
        return (
            <div className="mt-2 space-y-1">
                {Object.entries(history.changes).map(([field, change]) => (
                    <div
                        key={field}
                        className="text-xs border border-base-content/15 p-2 rounded"
                    >
                        <span className="font-semibold capitalize text-base-content">
                            {field.replace(/_/g, " ")}:
                        </span>
                        <div className="ml-2">
                            {change.old !== undefined && (
                                <div className="text-base-content/60">
                                    <span className="font-mono">Old: </span>
                                    {change.old === null
                                        ? "N/A"
                                        : String(change.old)}
                                </div>
                            )}
                            {change.new !== undefined && (
                                <div className="text-base-content">
                                    <span className="font-mono">New: </span>
                                    {change.new === null
                                        ? "N/A"
                                        : String(change.new)}
                                </div>
                            )}
                            {change.added !== undefined && (
                                <div className="text-base-content font-semibold">
                                    <span className="font-mono">Added: </span>+
                                    {change.added}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    const handleEdit = (id) => {
        if (station === 2) return;
        const item = consignedItems.find((i) => i.id === id);
        if (item) {
            setEditingMainRowId(id);
            setEditMainFormData({
                commonality: item.commonality,
                category: item.category,
            });
        }
    };

    const handleCancelMainEdit = () => {
        setEditingMainRowId(null);
        setEditMainFormData({ commonality: "", category: "" });
        setErrors({});
    };

    const handleSaveMainEdit = (id) => {
        const newErrors = {};
        if (!editMainFormData.commonality)
            newErrors.commonality = "Commonality is required";
        if (!editMainFormData.category)
            newErrors.category = "Category is required";
        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }
        router.put(route("consigned.update-main", id), editMainFormData, {
            preserveScroll: true,
            onSuccess: () => {
                setEditingMainRowId(null);
                setEditMainFormData({ commonality: "", category: "" });
                setErrors({});
            },
            onError: (errors) => setErrors(errors),
        });
    };

    const handleDelete = (id) => {
        setDeleteMainItemId(id);
        setShowDeleteMainConfirmModal(true);
        setDeleteMainConfirmText("");
    };

    const handleConfirmMainDelete = () => {
        if (deleteMainConfirmText === "Confirm") {
            router.delete(route("consigned.delete-main", deleteMainItemId), {
                preserveScroll: true,
                onSuccess: () => {
                    setShowDeleteMainConfirmModal(false);
                    setDeleteMainItemId(null);
                    setDeleteMainConfirmText("");
                },
                onError: (errors) => {
                    setShowDeleteMainConfirmModal(false);
                    setDeleteMainItemId(null);
                    setDeleteMainConfirmText("");
                    alert(
                        "Failed to delete item: " +
                            (errors.error || "Unknown error"),
                    );
                },
            });
        }
    };

    const filteredData = useMemo(
        () =>
            consignedItems.filter((item) => {
                const searchLower = searchQuery.toLowerCase();
                const mainFieldsMatch = Object.values(item).some(
                    (value) =>
                        typeof value === "string" &&
                        value.toLowerCase().includes(searchLower),
                );
                const combinationsMatch =
                    item.combinations &&
                    item.combinations.some(
                        (combo) =>
                            (combo.item_code &&
                                combo.item_code
                                    .toLowerCase()
                                    .includes(searchLower)) ||
                            (combo.supplier &&
                                combo.supplier
                                    .toLowerCase()
                                    .includes(searchLower)) ||
                            (combo.mat_description &&
                                combo.mat_description
                                    .toLowerCase()
                                    .includes(searchLower)),
                    );
                return mainFieldsMatch || combinationsMatch;
            }),
        [consignedItems, searchQuery],
    );

    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentData = filteredData.slice(
        startIndex,
        startIndex + itemsPerPage,
    );

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery]);

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= totalPages) setCurrentPage(newPage);
    };
    const handleItemsPerPageChange = (e) => {
        setItemsPerPage(parseInt(e.target.value));
        setCurrentPage(1);
    };

    const stockStatusMap = useMemo(() => {
        const map = {};
        consignedItems.forEach((item) => {
            const currentSelection = rowSelections[item.id] || {
                itemCode: item.selected_itemcode,
                supplier: item.selected_supplier,
            };
            if (!item.combinations) {
                map[item.id] = null;
                return;
            }
            const selectedCombo = item.combinations.find(
                (c) =>
                    c.item_code === currentSelection.itemCode &&
                    c.supplier === currentSelection.supplier,
            );
            if (!selectedCombo || selectedCombo.qty == null) {
                map[item.id] = null;
                return;
            }
            if (
                (!selectedCombo.qty || selectedCombo.qty === 0) &&
                (!selectedCombo.minimum || selectedCombo.minimum === 0)
            ) {
                map[item.id] = "no_inventory";
                return;
            }
            if (!selectedCombo.minimum || selectedCombo.minimum === 0) {
                map[item.id] =
                    selectedCombo.qty > 0 ? "healthy" : "no_inventory";
                return;
            }
            if (selectedCombo.qty <= selectedCombo.minimum) {
                map[item.id] = "critical";
                return;
            }
            if (selectedCombo.qty <= selectedCombo.minimum * 1.5) {
                map[item.id] = "low";
                return;
            }
            map[item.id] = "healthy";
        });
        return map;
    }, [consignedItems, rowSelections]);

    const isSelectedItemLowStock = (item) => {
        return stockStatusMap[item.id] ?? null;
    };

    const getPageNumbers = () => {
        const pages = [];
        const maxPagesToShow = 5;
        if (totalPages <= maxPagesToShow) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            if (currentPage <= 3) {
                for (let i = 1; i <= 4; i++) pages.push(i);
                pages.push("...");
                pages.push(totalPages);
            } else if (currentPage >= totalPages - 2) {
                pages.push(1);
                pages.push("...");
                for (let i = totalPages - 3; i <= totalPages; i++)
                    pages.push(i);
            } else {
                pages.push(1);
                pages.push("...");
                for (let i = currentPage - 1; i <= currentPage + 1; i++)
                    pages.push(i);
                pages.push("...");
                pages.push(totalPages);
            }
        }
        return pages;
    };

    return (
        <AuthenticatedLayout>
            <Head title="Consigned" />

            <div className="p-6">
                <div className="border border-base-content/10 rounded-xl bg-base-100">
                    <div className="p-6">
                        {/* ── Header ── */}
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-3xl font-bold text-base-content">
                                Consigned
                            </h2>
                            <div className="flex gap-2">
                                {station === 1 && (
                                    <PrimaryBtn onClick={handleImportExcel}>
                                        <FileExcelOutlined className="text-lg" />
                                        Import Excel
                                    </PrimaryBtn>
                                )}
                                <PrimaryBtn onClick={handleAddItem}>
                                    <AppstoreAddOutlined className="text-lg" />
                                    Add Item
                                </PrimaryBtn>
                                <PrimaryBtn onClick={handleAddQuantity}>
                                    <PlusCircleOutlined className="text-lg" />
                                    Add Quantity
                                </PrimaryBtn>

                                {station === 1 && (
                                    <PrimaryBtn
                                        onClick={handleRecalibrateMinimum}
                                        disabled={recalibrating}
                                        title="Recalibrate minimum stock levels based on issued history"
                                    >
                                        {recalibrating ? (
                                            <span className="flex items-center gap-2">
                                                <span className="loading loading-spinner loading-xs"></span>
                                                Recalibrating...
                                            </span>
                                        ) : (
                                            <>
                                                <SyncOutlined className="text-lg" />
                                                Recalibrate Minimum
                                            </>
                                        )}
                                    </PrimaryBtn>
                                )}
                            </div>
                        </div>

                        {/* ── Search ── */}
                        <div className="mb-4">
                            <input
                                type="text"
                                placeholder="Search..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className={inputCls()}
                            />
                        </div>

                        {/* ── Controls bar ── */}
                        <div className="flex justify-between items-center mb-4">
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-base-content/60">
                                    Show
                                </span>
                                <select
                                    className="px-2 py-1 text-sm rounded border border-base-content/30 text-base-content bg-transparent focus:border-base-content focus:outline-none"
                                    value={itemsPerPage}
                                    onChange={handleItemsPerPageChange}
                                >
                                    {[5, 10, 25, 50, 100].map((n) => (
                                        <option key={n} value={n}>
                                            {n}
                                        </option>
                                    ))}
                                </select>
                                <span className="text-sm text-base-content/60">
                                    entries
                                </span>
                            </div>
                            {station === 2 && (
                                <BorderBadge>
                                    Station 2: Limited Edit Access
                                </BorderBadge>
                            )}
                        </div>

                        {/* ── Main table ── */}
                        <div className="border border-base-content/20 rounded-lg overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className={tableCls}>
                                    <thead className="bg-base-200">
                                        <tr>
                                            {[
                                                "Commonality",
                                                "Item Code",
                                                "Supplier",
                                                "Description",
                                                "Action",
                                            ].map((h) => (
                                                <th key={h} className={th}>
                                                    {h}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {currentData.length > 0 ? (
                                            currentData.map((item) => {
                                                const currentSelection =
                                                    rowSelections[item.id] || {
                                                        itemCode:
                                                            item.selected_itemcode,
                                                        supplier:
                                                            item.selected_supplier,
                                                        description: "N/A",
                                                    };
                                                const isEditingMain =
                                                    editingMainRowId ===
                                                    item.id;
                                                const stockStatus =
                                                    isSelectedItemLowStock(
                                                        item,
                                                    );
                                                return (
                                                    <tr
                                                        key={item.id}
                                                        className={`hover:bg-base-content/5 transition-colors ${
                                                            stockStatus ===
                                                            "critical"
                                                                ? "border-l-4 border-l-red-500"
                                                                : stockStatus ===
                                                                    "low"
                                                                  ? "border-l-4 border-l-yellow-500"
                                                                  : ""
                                                        }`}
                                                    >
                                                        <td className={td}>
                                                            {isEditingMain ? (
                                                                <input
                                                                    type="text"
                                                                    className={`px-2 py-1 text-xs rounded w-full border ${errors.commonality ? "border-red-400" : "border-base-content/30"} text-base-content bg-transparent focus:border-base-content focus:outline-none`}
                                                                    value={
                                                                        editMainFormData.commonality
                                                                    }
                                                                    onChange={(
                                                                        e,
                                                                    ) =>
                                                                        setEditMainFormData(
                                                                            {
                                                                                ...editMainFormData,
                                                                                commonality:
                                                                                    e
                                                                                        .target
                                                                                        .value,
                                                                            },
                                                                        )
                                                                    }
                                                                />
                                                            ) : (
                                                                <div
                                                                    className="truncate px-1"
                                                                    title={
                                                                        item.commonality ||
                                                                        "N/A"
                                                                    }
                                                                >
                                                                    {item.commonality ||
                                                                        "N/A"}
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className={td}>
                                                            {isEditingMain ? (
                                                                <span className="text-[10px] text-base-content/50">
                                                                    (Cannot
                                                                    edit)
                                                                </span>
                                                            ) : item.has_multiple ? (
                                                                <select
                                                                    className="w-full px-2 py-1 text-xs rounded border border-base-content/30 text-base-content bg-transparent focus:border-base-content focus:outline-none h-8"
                                                                    value={
                                                                        currentSelection.itemCode ||
                                                                        ""
                                                                    }
                                                                    onChange={(
                                                                        e,
                                                                    ) =>
                                                                        handleItemCodeChange(
                                                                            item.id,
                                                                            e
                                                                                .target
                                                                                .value,
                                                                            item,
                                                                        )
                                                                    }
                                                                >
                                                                    <option value="">
                                                                        Select
                                                                    </option>
                                                                    {getAvailableItemCodes(
                                                                        item,
                                                                    ).map(
                                                                        (
                                                                            code,
                                                                            idx,
                                                                        ) => (
                                                                            <option
                                                                                key={
                                                                                    idx
                                                                                }
                                                                                value={
                                                                                    code
                                                                                }
                                                                            >
                                                                                {
                                                                                    code
                                                                                }
                                                                            </option>
                                                                        ),
                                                                    )}
                                                                </select>
                                                            ) : (
                                                                <div
                                                                    className="truncate px-1"
                                                                    title={
                                                                        currentSelection.itemCode ||
                                                                        "N/A"
                                                                    }
                                                                >
                                                                    {currentSelection.itemCode ||
                                                                        "N/A"}
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className={td}>
                                                            <div
                                                                className="truncate px-1"
                                                                title={
                                                                    currentSelection.supplier ||
                                                                    "N/A"
                                                                }
                                                            >
                                                                {currentSelection.supplier ||
                                                                    "N/A"}
                                                            </div>
                                                        </td>
                                                        <td className={td}>
                                                            <div className="flex items-center gap-2 justify-center">
                                                                <div
                                                                    className="truncate px-1"
                                                                    title={
                                                                        currentSelection.description ||
                                                                        "N/A"
                                                                    }
                                                                >
                                                                    {currentSelection.description ||
                                                                        "N/A"}
                                                                </div>
                                                                {stockStatus ===
                                                                    "critical" && (
                                                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-700 border border-red-300 whitespace-nowrap">
                                                                        Critical
                                                                    </span>
                                                                )}
                                                                {stockStatus ===
                                                                    "low" && (
                                                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-yellow-100 text-yellow-700 border border-yellow-300 whitespace-nowrap">
                                                                        Low
                                                                        Stock
                                                                    </span>
                                                                )}
                                                                {stockStatus ===
                                                                    "healthy" && (
                                                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-green-100 text-green-700 border border-green-300 whitespace-nowrap">
                                                                        Healthy
                                                                    </span>
                                                                )}
                                                                {stockStatus ===
                                                                    "no_inventory" && (
                                                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-600 border border-gray-300 whitespace-nowrap">
                                                                        No
                                                                        Inventory
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className={td}>
                                                            {isEditingMain ? (
                                                                <div className="flex gap-1 justify-center">
                                                                    <button
                                                                        onClick={() =>
                                                                            handleSaveMainEdit(
                                                                                item.id,
                                                                            )
                                                                        }
                                                                        className="px-2 py-1 text-xs rounded border-2 border-base-content text-base-content bg-transparent hover:bg-base-content hover:text-base-100 transition-all"
                                                                    >
                                                                        Save
                                                                    </button>
                                                                    <button
                                                                        onClick={
                                                                            handleCancelMainEdit
                                                                        }
                                                                        className="px-2 py-1 text-xs rounded border border-base-content/40 text-base-content bg-transparent hover:border-base-content transition-all"
                                                                    >
                                                                        Cancel
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <div className="flex gap-0.5 justify-center items-center">
                                                                    <IconBtn
                                                                        onClick={() =>
                                                                            handleView(
                                                                                item.id,
                                                                            )
                                                                        }
                                                                        title="View"
                                                                    >
                                                                        <EyeOutlined className="text-sm" />
                                                                    </IconBtn>
                                                                    {station ===
                                                                        1 && (
                                                                        <IconBtn
                                                                            onClick={() =>
                                                                                handleEdit(
                                                                                    item.id,
                                                                                )
                                                                            }
                                                                            title="Edit"
                                                                        >
                                                                            <EditOutlined className="text-sm" />
                                                                        </IconBtn>
                                                                    )}
                                                                    <IconBtn
                                                                        onClick={() =>
                                                                            handleConsignedHistory(
                                                                                item.id,
                                                                            )
                                                                        }
                                                                        title="History"
                                                                    >
                                                                        <HistoryOutlined className="text-sm" />
                                                                    </IconBtn>
                                                                    {station ===
                                                                        1 && (
                                                                        <IconBtn
                                                                            onClick={() =>
                                                                                handleDelete(
                                                                                    item.id,
                                                                                )
                                                                            }
                                                                            title="Delete"
                                                                        >
                                                                            <DeleteOutlined className="text-sm" />
                                                                        </IconBtn>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        ) : (
                                            <tr>
                                                <td
                                                    colSpan="5"
                                                    className="text-center py-8 text-base-content/50"
                                                >
                                                    <div className="flex items-center justify-center gap-2">
                                                        <SearchOutlined className="text-lg" />
                                                        <span>
                                                            No data found
                                                        </span>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* ── Pagination ── */}
                        {totalPages > 1 && (
                            <div className="flex justify-center items-center gap-2 mt-4">
                                <button
                                    className="px-3 py-1 rounded border border-base-content/30 text-base-content bg-transparent hover:border-base-content transition-all disabled:opacity-40"
                                    onClick={() =>
                                        handlePageChange(currentPage - 1)
                                    }
                                    disabled={currentPage === 1}
                                >
                                    «
                                </button>
                                {getPageNumbers().map((page, idx) =>
                                    page === "..." ? (
                                        <span
                                            key={idx}
                                            className="px-2 text-base-content/50"
                                        >
                                            ...
                                        </span>
                                    ) : (
                                        <button
                                            key={idx}
                                            className={`px-3 py-1 rounded border transition-all ${
                                                currentPage === page
                                                    ? "border-base-content bg-base-content text-base-100"
                                                    : "border-base-content/30 text-base-content bg-transparent hover:border-base-content"
                                            }`}
                                            onClick={() =>
                                                handlePageChange(page)
                                            }
                                        >
                                            {page}
                                        </button>
                                    ),
                                )}
                                <button
                                    className="px-3 py-1 rounded border border-base-content/30 text-base-content bg-transparent hover:border-base-content transition-all disabled:opacity-40"
                                    onClick={() =>
                                        handlePageChange(currentPage + 1)
                                    }
                                    disabled={currentPage === totalPages}
                                >
                                    »
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ══════════════════════════════════════════
                STEP 1 MODAL
            ══════════════════════════════════════════ */}
            {showStep1Modal && (
                <div className="modal modal-open">
                    <div className="modal-box bg-base-100 border border-base-content/20">
                        <h3 className="font-bold text-lg mb-4 text-base-content">
                            Add Item — Step 1
                        </h3>
                        <div className="mb-4">
                            <label className="block mb-1 text-sm font-medium text-base-content">
                                Commonality (Optional)
                            </label>
                            <input
                                type="text"
                                placeholder="Enter commonality (optional)"
                                className={inputCls(errors.commonality)}
                                value={step1Data.commonality}
                                onChange={(e) =>
                                    setStep1Data({
                                        ...step1Data,
                                        commonality: e.target.value,
                                    })
                                }
                            />
                            {errors.commonality && (
                                <p className="text-xs text-red-400 mt-1">
                                    {errors.commonality}
                                </p>
                            )}
                            <p className="text-xs text-base-content/50 mt-1">
                                If left empty, the Material Description will be
                                used as the commonality
                            </p>
                        </div>
                        <div className="mb-4">
                            <label className="block mb-1 text-sm font-medium text-base-content">
                                Category *
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Enter category"
                                    className={inputCls(errors.category)}
                                    value={step1Data.category}
                                    onChange={(e) =>
                                        setStep1Data({
                                            ...step1Data,
                                            category: e.target.value,
                                        })
                                    }
                                />
                                {fetchingCategory && (
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                        <span className="loading loading-spinner loading-sm"></span>
                                    </div>
                                )}
                            </div>
                            {errors.category && (
                                <p className="text-xs text-red-400 mt-1">
                                    {errors.category}
                                </p>
                            )}
                        </div>
                        <div className="flex justify-end gap-2 pt-4 border-t border-base-content/10">
                            <SecondaryBtn
                                onClick={() => setShowStep1Modal(false)}
                            >
                                Cancel
                            </SecondaryBtn>
                            <PrimaryBtn onClick={handleStep1Next}>
                                Next
                            </PrimaryBtn>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════════
                STEP 2 MODAL
            ══════════════════════════════════════════ */}
            {showStep2Modal && (
                <div className="modal modal-open">
                    <div className="modal-box max-w-4xl bg-base-100 border border-base-content/20">
                        <h3 className="font-bold text-lg mb-4 text-base-content">
                            Add Item — Step 2
                        </h3>
                        <form onSubmit={handleStep2Save}>
                            <div className="grid grid-cols-2 gap-4">
                                {[
                                    {
                                        label: "Item Code *",
                                        key: "item_code",
                                        type: "text",
                                    },
                                    {
                                        label: "Material Description *",
                                        key: "mat_description",
                                        type: "text",
                                    },
                                    {
                                        label: "Supplier *",
                                        key: "supplier",
                                        type: "text",
                                    },
                                    {
                                        label: "Expiration",
                                        key: "expiration",
                                        type: "date",
                                    },
                                    { label: "UOM", key: "uom", type: "text" },
                                    {
                                        label: "Quantity",
                                        key: "qty",
                                        type: "number",
                                    },
                                    {
                                        label: "Qty Per Box",
                                        key: "qty_per_box",
                                        type: "number",
                                    },
                                    {
                                        label: "Minimum",
                                        key: "minimum",
                                        type: "number",
                                    },
                                    {
                                        label: "Price",
                                        key: "price",
                                        type: "number",
                                        step: "0.01",
                                    },
                                    {
                                        label: "Bin Location",
                                        key: "bin_location",
                                        type: "text",
                                    },
                                ].map(({ label, key, type, step }) => (
                                    <div key={key}>
                                        <label className="block mb-1 text-sm font-medium text-base-content">
                                            {label}
                                        </label>
                                        <input
                                            type={type}
                                            step={step}
                                            placeholder={`Enter ${label.replace(" *", "").toLowerCase()}`}
                                            className={inputCls(errors[key])}
                                            value={step2Data[key]}
                                            onChange={(e) =>
                                                setStep2Data({
                                                    ...step2Data,
                                                    [key]: e.target.value,
                                                })
                                            }
                                        />
                                        {errors[key] && (
                                            <p className="text-xs text-red-400 mt-1">
                                                {errors[key]}
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-end gap-2 pt-4 border-t border-base-content/10 mt-4">
                                <SecondaryBtn
                                    type="button"
                                    onClick={handleStep2Back}
                                >
                                    Back
                                </SecondaryBtn>
                                <PrimaryBtn type="submit" disabled={processing}>
                                    {processing ? (
                                        <span className="flex items-center gap-2">
                                            <span className="loading loading-spinner loading-xs"></span>
                                            Saving...
                                        </span>
                                    ) : (
                                        "Save"
                                    )}
                                </PrimaryBtn>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════════
                VIEW MODAL
            ══════════════════════════════════════════ */}
            {showViewModal && selectedItem && (
                <div className="modal modal-open">
                    <div className="modal-box max-w-[98vw] w-[98vw] max-h-[90vh] flex flex-col bg-base-100 border border-base-content/20">
                        <h3 className="font-bold text-2xl mb-6 text-base-content">
                            Item Details
                        </h3>
                        <div className="border border-base-content/15 rounded-lg mb-6 flex-shrink-0 p-4">
                            <div className="flex items-center gap-2 mb-3">
                                <h4 className="font-semibold text-lg text-base-content">
                                    Item Information:
                                </h4>
                                <BorderBadge>
                                    Commonality:{" "}
                                    {selectedItem.commonality || "N/A"}
                                </BorderBadge>
                            </div>
                            <div className="grid grid-cols-4 gap-6">
                                {[
                                    {
                                        label: "Category",
                                        value: selectedItem.category,
                                    },
                                    {
                                        label: "Item Code",
                                        value: selectedItem.currentSelection
                                            .itemCode,
                                    },
                                    {
                                        label: "Supplier",
                                        value: selectedItem.currentSelection
                                            .supplier,
                                    },
                                    {
                                        label: "Description",
                                        value: selectedItem.currentSelection
                                            .description,
                                    },
                                ].map(({ label, value }) => (
                                    <div key={label}>
                                        <label className="text-sm font-semibold text-base-content/60">
                                            {label}
                                        </label>
                                        <p className="text-base text-base-content">
                                            {value || "N/A"}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="border border-base-content/15 rounded-lg flex-1 flex flex-col overflow-hidden">
                            <div className="p-4 flex flex-col overflow-hidden h-full">
                                <div className="flex justify-between items-center mb-4 flex-shrink-0">
                                    <h4 className="font-semibold text-lg text-base-content">
                                        All Items in this Commonality
                                        <span className="text-sm text-base-content/50 ml-2">
                                            (Including all expiration dates)
                                        </span>
                                    </h4>
                                    <input
                                        type="text"
                                        placeholder="Search by Item Code, Description, or Supplier..."
                                        value={modalSearchQuery}
                                        onChange={(e) =>
                                            setModalSearchQuery(e.target.value)
                                        }
                                        className="w-1/3 px-3 py-1.5 text-sm rounded border border-base-content/30 text-base-content bg-transparent focus:border-base-content focus:outline-none placeholder:text-base-content/30"
                                    />
                                </div>
                                <div className="overflow-auto flex-1">
                                    <table className={tableCls}>
                                        <thead className="sticky top-0 bg-base-200 z-10">
                                            <tr>
                                                {[
                                                    "Item Code",
                                                    "Description",
                                                    "Supplier",
                                                    "Expiration",
                                                    "UOM",
                                                    "Qty",
                                                    "Qty/Box",
                                                    "Min",
                                                    "Price",
                                                    "Bin Location",
                                                    "Actions",
                                                ].map((h) => (
                                                    <th key={h} className={th}>
                                                        {h}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {selectedItem.allCombinations &&
                                            selectedItem.allCombinations
                                                .length > 0 ? (
                                                selectedItem.allCombinations
                                                    .filter((combo) => {
                                                        const s =
                                                            modalSearchQuery.toLowerCase();
                                                        return (
                                                            (combo.item_code &&
                                                                combo.item_code
                                                                    .toLowerCase()
                                                                    .includes(
                                                                        s,
                                                                    )) ||
                                                            (combo.mat_description &&
                                                                combo.mat_description
                                                                    .toLowerCase()
                                                                    .includes(
                                                                        s,
                                                                    )) ||
                                                            (combo.supplier &&
                                                                combo.supplier
                                                                    .toLowerCase()
                                                                    .includes(
                                                                        s,
                                                                    ))
                                                        );
                                                    })
                                                    .map((combo, idx) => {
                                                        const isEditing =
                                                            editingRowId ===
                                                            idx;
                                                        const isSelected =
                                                            combo.item_code ===
                                                                selectedItem
                                                                    .currentSelection
                                                                    .itemCode &&
                                                            combo.supplier ===
                                                                selectedItem
                                                                    .currentSelection
                                                                    .supplier;
                                                        const hasNearestExpiration =
                                                            isSelected &&
                                                            combo.expiration;
                                                        return (
                                                            <tr
                                                                key={idx}
                                                                className={`text-base-content ${isSelected ? "bg-base-content/10" : ""} ${hasNearestExpiration ? "border-l-4 border-l-base-content" : ""}`}
                                                            >
                                                                <td
                                                                    className={
                                                                        td
                                                                    }
                                                                >
                                                                    {isEditing &&
                                                                    station ===
                                                                        1 ? (
                                                                        <input
                                                                            type="text"
                                                                            className={inputSmCls()}
                                                                            value={
                                                                                editFormData.item_code
                                                                            }
                                                                            onChange={(
                                                                                e,
                                                                            ) =>
                                                                                setEditFormData(
                                                                                    {
                                                                                        ...editFormData,
                                                                                        item_code:
                                                                                            e
                                                                                                .target
                                                                                                .value,
                                                                                    },
                                                                                )
                                                                            }
                                                                        />
                                                                    ) : isEditing ? (
                                                                        <span className="text-base-content/60">
                                                                            {combo.item_code ||
                                                                                "N/A"}
                                                                        </span>
                                                                    ) : (
                                                                        combo.item_code ||
                                                                        "N/A"
                                                                    )}
                                                                </td>
                                                                <td
                                                                    className={
                                                                        td
                                                                    }
                                                                >
                                                                    {isEditing &&
                                                                    station ===
                                                                        1 ? (
                                                                        <input
                                                                            type="text"
                                                                            className={inputSmCls()}
                                                                            value={
                                                                                editFormData.mat_description
                                                                            }
                                                                            onChange={(
                                                                                e,
                                                                            ) =>
                                                                                setEditFormData(
                                                                                    {
                                                                                        ...editFormData,
                                                                                        mat_description:
                                                                                            e
                                                                                                .target
                                                                                                .value,
                                                                                    },
                                                                                )
                                                                            }
                                                                        />
                                                                    ) : isEditing ? (
                                                                        <span className="text-base-content/60">
                                                                            {combo.mat_description ||
                                                                                "N/A"}
                                                                        </span>
                                                                    ) : (
                                                                        <div className="flex items-center gap-1 justify-center">
                                                                            <span>
                                                                                {combo.mat_description ||
                                                                                    "N/A"}
                                                                            </span>
                                                                            {(() => {
                                                                                if (
                                                                                    combo.qty ==
                                                                                    null
                                                                                )
                                                                                    return null;
                                                                                if (
                                                                                    (!combo.qty ||
                                                                                        combo.qty ===
                                                                                            0) &&
                                                                                    (!combo.minimum ||
                                                                                        combo.minimum ===
                                                                                            0)
                                                                                ) {
                                                                                    return (
                                                                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-600 border border-gray-300 whitespace-nowrap">
                                                                                            No
                                                                                            Inventory
                                                                                        </span>
                                                                                    );
                                                                                }
                                                                                if (
                                                                                    !combo.minimum ||
                                                                                    combo.minimum ===
                                                                                        0
                                                                                ) {
                                                                                    return combo.qty >
                                                                                        0 ? (
                                                                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-green-100 text-green-700 border border-green-300 whitespace-nowrap">
                                                                                            Healthy
                                                                                        </span>
                                                                                    ) : (
                                                                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-600 border border-gray-300 whitespace-nowrap">
                                                                                            No
                                                                                            Inventory
                                                                                        </span>
                                                                                    );
                                                                                }
                                                                                if (
                                                                                    combo.qty <=
                                                                                    combo.minimum
                                                                                )
                                                                                    return (
                                                                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-700 border border-red-300 whitespace-nowrap">
                                                                                            Critical
                                                                                        </span>
                                                                                    );
                                                                                if (
                                                                                    combo.qty <=
                                                                                    combo.minimum *
                                                                                        1.5
                                                                                )
                                                                                    return (
                                                                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-yellow-100 text-yellow-700 border border-yellow-300 whitespace-nowrap">
                                                                                            Low
                                                                                            Stock
                                                                                        </span>
                                                                                    );
                                                                                return (
                                                                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-green-100 text-green-700 border border-green-300 whitespace-nowrap">
                                                                                        Healthy
                                                                                    </span>
                                                                                );
                                                                            })()}
                                                                        </div>
                                                                    )}
                                                                </td>
                                                                <td
                                                                    className={
                                                                        td
                                                                    }
                                                                >
                                                                    {isEditing &&
                                                                    station ===
                                                                        1 ? (
                                                                        <input
                                                                            type="text"
                                                                            className={inputSmCls()}
                                                                            value={
                                                                                editFormData.supplier
                                                                            }
                                                                            onChange={(
                                                                                e,
                                                                            ) =>
                                                                                setEditFormData(
                                                                                    {
                                                                                        ...editFormData,
                                                                                        supplier:
                                                                                            e
                                                                                                .target
                                                                                                .value,
                                                                                    },
                                                                                )
                                                                            }
                                                                        />
                                                                    ) : isEditing ? (
                                                                        <span className="text-base-content/60">
                                                                            {combo.supplier ||
                                                                                "N/A"}
                                                                        </span>
                                                                    ) : (
                                                                        combo.supplier ||
                                                                        "N/A"
                                                                    )}
                                                                </td>
                                                                <td
                                                                    className={
                                                                        td
                                                                    }
                                                                >
                                                                    {isEditing ? (
                                                                        <input
                                                                            type="date"
                                                                            className={inputSmCls()}
                                                                            value={
                                                                                editFormData.expiration
                                                                            }
                                                                            onChange={(
                                                                                e,
                                                                            ) =>
                                                                                setEditFormData(
                                                                                    {
                                                                                        ...editFormData,
                                                                                        expiration:
                                                                                            e
                                                                                                .target
                                                                                                .value,
                                                                                    },
                                                                                )
                                                                            }
                                                                        />
                                                                    ) : (
                                                                        <div className="flex items-center justify-center gap-1">
                                                                            {combo.expiration ||
                                                                                "N/A"}
                                                                            {hasNearestExpiration && (
                                                                                <BorderBadge className="text-[10px]">
                                                                                    Nearest
                                                                                </BorderBadge>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </td>
                                                                <td
                                                                    className={
                                                                        td
                                                                    }
                                                                >
                                                                    {isEditing &&
                                                                    station ===
                                                                        1 ? (
                                                                        <input
                                                                            type="text"
                                                                            className={inputSmCls()}
                                                                            value={
                                                                                editFormData.uom
                                                                            }
                                                                            onChange={(
                                                                                e,
                                                                            ) =>
                                                                                setEditFormData(
                                                                                    {
                                                                                        ...editFormData,
                                                                                        uom: e
                                                                                            .target
                                                                                            .value,
                                                                                    },
                                                                                )
                                                                            }
                                                                        />
                                                                    ) : isEditing ? (
                                                                        <span className="text-base-content/60">
                                                                            {combo.uom ||
                                                                                "N/A"}
                                                                        </span>
                                                                    ) : (
                                                                        combo.uom ||
                                                                        "N/A"
                                                                    )}
                                                                </td>
                                                                <td
                                                                    className={
                                                                        td
                                                                    }
                                                                >
                                                                    {isEditing &&
                                                                    station ===
                                                                        1 ? (
                                                                        <input
                                                                            type="number"
                                                                            min="0"
                                                                            className={inputSmCls()}
                                                                            value={
                                                                                editFormData.qty
                                                                            }
                                                                            onChange={(
                                                                                e,
                                                                            ) =>
                                                                                setEditFormData(
                                                                                    {
                                                                                        ...editFormData,
                                                                                        qty: e
                                                                                            .target
                                                                                            .value,
                                                                                    },
                                                                                )
                                                                            }
                                                                        />
                                                                    ) : (
                                                                        combo.qty ||
                                                                        "N/A"
                                                                    )}
                                                                </td>
                                                                <td
                                                                    className={
                                                                        td
                                                                    }
                                                                >
                                                                    {isEditing ? (
                                                                        <input
                                                                            type="number"
                                                                            className={inputSmCls()}
                                                                            value={
                                                                                editFormData.qty_per_box
                                                                            }
                                                                            onChange={(
                                                                                e,
                                                                            ) =>
                                                                                setEditFormData(
                                                                                    {
                                                                                        ...editFormData,
                                                                                        qty_per_box:
                                                                                            e
                                                                                                .target
                                                                                                .value,
                                                                                    },
                                                                                )
                                                                            }
                                                                        />
                                                                    ) : (
                                                                        combo.qty_per_box ||
                                                                        "N/A"
                                                                    )}
                                                                </td>
                                                                <td
                                                                    className={
                                                                        td
                                                                    }
                                                                >
                                                                    {isEditing &&
                                                                    station ===
                                                                        1 ? (
                                                                        <input
                                                                            type="number"
                                                                            className={inputSmCls()}
                                                                            value={
                                                                                editFormData.minimum
                                                                            }
                                                                            onChange={(
                                                                                e,
                                                                            ) =>
                                                                                setEditFormData(
                                                                                    {
                                                                                        ...editFormData,
                                                                                        minimum:
                                                                                            e
                                                                                                .target
                                                                                                .value,
                                                                                    },
                                                                                )
                                                                            }
                                                                        />
                                                                    ) : isEditing ? (
                                                                        <span className="text-base-content/60">
                                                                            {combo.minimum ||
                                                                                "N/A"}
                                                                        </span>
                                                                    ) : (
                                                                        combo.minimum ||
                                                                        "N/A"
                                                                    )}
                                                                </td>

                                                                <td
                                                                    className={
                                                                        td
                                                                    }
                                                                >
                                                                    {isEditing &&
                                                                    station ===
                                                                        1 ? (
                                                                        <input
                                                                            type="number"
                                                                            step="0.01"
                                                                            className={inputSmCls()}
                                                                            value={
                                                                                editFormData.price
                                                                            }
                                                                            onChange={(
                                                                                e,
                                                                            ) =>
                                                                                setEditFormData(
                                                                                    {
                                                                                        ...editFormData,
                                                                                        price: e
                                                                                            .target
                                                                                            .value,
                                                                                    },
                                                                                )
                                                                            }
                                                                        />
                                                                    ) : isEditing ? (
                                                                        <span className="text-base-content/60">
                                                                            {combo.price ||
                                                                                "N/A"}
                                                                        </span>
                                                                    ) : (
                                                                        combo.price ||
                                                                        "N/A"
                                                                    )}
                                                                </td>
                                                                <td
                                                                    className={
                                                                        td
                                                                    }
                                                                >
                                                                    {isEditing ? (
                                                                        <input
                                                                            type="text"
                                                                            className={inputSmCls()}
                                                                            value={
                                                                                editFormData.bin_location
                                                                            }
                                                                            onChange={(
                                                                                e,
                                                                            ) =>
                                                                                setEditFormData(
                                                                                    {
                                                                                        ...editFormData,
                                                                                        bin_location:
                                                                                            e
                                                                                                .target
                                                                                                .value,
                                                                                    },
                                                                                )
                                                                            }
                                                                        />
                                                                    ) : (
                                                                        combo.bin_location ||
                                                                        "N/A"
                                                                    )}
                                                                </td>
                                                                <td
                                                                    className={
                                                                        td
                                                                    }
                                                                >
                                                                    {isEditing ? (
                                                                        <div className="flex gap-1 justify-center">
                                                                            <button
                                                                                onClick={() =>
                                                                                    handleSaveEdit(
                                                                                        combo,
                                                                                        idx,
                                                                                    )
                                                                                }
                                                                                className="px-2 py-1 text-xs rounded border-2 border-base-content text-base-content bg-transparent hover:bg-base-content hover:text-base-100 transition-all"
                                                                            >
                                                                                Save
                                                                            </button>
                                                                            <button
                                                                                onClick={
                                                                                    handleCancelEdit
                                                                                }
                                                                                className="px-2 py-1 text-xs rounded border border-base-content/40 text-base-content bg-transparent hover:border-base-content transition-all"
                                                                            >
                                                                                Cancel
                                                                            </button>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="flex gap-1 justify-center">
                                                                            <IconBtn
                                                                                onClick={() =>
                                                                                    handleEditRow(
                                                                                        combo,
                                                                                        idx,
                                                                                    )
                                                                                }
                                                                                title="Edit"
                                                                            >
                                                                                <EditOutlined className="text-base" />
                                                                            </IconBtn>
                                                                            {station ===
                                                                                1 && (
                                                                                <IconBtn
                                                                                    onClick={() =>
                                                                                        handleDeleteRow(
                                                                                            combo,
                                                                                            idx,
                                                                                        )
                                                                                    }
                                                                                    title="Delete"
                                                                                >
                                                                                    <DeleteOutlined className="text-base" />
                                                                                </IconBtn>
                                                                            )}
                                                                            <IconBtn
                                                                                onClick={() =>
                                                                                    handleDetailHistory(
                                                                                        combo.id,
                                                                                        combo,
                                                                                    )
                                                                                }
                                                                                title="Detail History"
                                                                            >
                                                                                <HistoryOutlined className="text-base" />
                                                                            </IconBtn>
                                                                        </div>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })
                                            ) : (
                                                <tr>
                                                    <td
                                                        colSpan="11"
                                                        className="text-center text-base-content/40 py-4"
                                                    >
                                                        {modalSearchQuery
                                                            ? "No matching items found"
                                                            : "No items found"}
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end pt-4 flex-shrink-0">
                            <SecondaryBtn
                                onClick={() => {
                                    setShowViewModal(false);
                                    setSelectedItem(null);
                                    setEditingRowId(null);
                                    setEditFormData({});
                                    setModalSearchQuery("");
                                }}
                            >
                                Close
                            </SecondaryBtn>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════════
                DELETE DETAIL CONFIRM MODAL
            ══════════════════════════════════════════ */}
            {showDeleteConfirmModal && (
                <div className="modal modal-open">
                    <div className="modal-box bg-base-100 border border-base-content/20">
                        <h3 className="font-bold text-lg mb-4 text-base-content">
                            Confirm Deletion
                        </h3>
                        <div className="border-l-4 border-base-content pl-3 mb-4 py-2">
                            <p className="text-sm font-semibold text-base-content">
                                This action cannot be undone!
                            </p>
                        </div>
                        <p className="mb-4 text-base-content">
                            Are you sure you want to delete this item?
                        </p>
                        <div className="mb-4">
                            <label className="block mb-1 text-sm font-medium text-base-content">
                                Type <strong>"Confirm"</strong> to proceed
                            </label>
                            <input
                                type="text"
                                placeholder="Type Confirm"
                                className={inputCls()}
                                value={deleteConfirmText}
                                onChange={(e) =>
                                    setDeleteConfirmText(e.target.value)
                                }
                            />
                        </div>
                        <div className="flex justify-end gap-2 pt-4 border-t border-base-content/10">
                            <SecondaryBtn
                                onClick={() => {
                                    setShowDeleteConfirmModal(false);
                                    setDeleteItemId(null);
                                    setDeleteConfirmText("");
                                }}
                            >
                                Cancel
                            </SecondaryBtn>
                            <PrimaryBtn
                                onClick={handleConfirmDelete}
                                disabled={deleteConfirmText !== "Confirm"}
                            >
                                Delete
                            </PrimaryBtn>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════════
                DELETE MAIN CONFIRM MODAL
            ══════════════════════════════════════════ */}
            {showDeleteMainConfirmModal && (
                <div className="modal modal-open">
                    <div className="modal-box bg-base-100 border border-base-content/20">
                        <h3 className="font-bold text-lg mb-4 text-base-content">
                            Confirm Deletion
                        </h3>
                        <div className="border-l-4 border-base-content pl-3 mb-4 py-2">
                            <p className="text-sm font-bold text-base-content">
                                Warning: This will delete ALL related items!
                            </p>
                            <p className="text-sm text-base-content/70">
                                This action will delete the main record AND all
                                associated detail records.
                            </p>
                        </div>
                        <p className="mb-4 text-base-content">
                            Are you sure you want to delete this item and all
                            its related details?
                        </p>
                        <div className="mb-4">
                            <label className="block mb-1 text-sm font-medium text-base-content">
                                Type <strong>"Confirm"</strong> to proceed
                            </label>
                            <input
                                type="text"
                                placeholder="Type Confirm"
                                className={inputCls()}
                                value={deleteMainConfirmText}
                                onChange={(e) =>
                                    setDeleteMainConfirmText(e.target.value)
                                }
                            />
                        </div>
                        <div className="flex justify-end gap-2 pt-4 border-t border-base-content/10">
                            <SecondaryBtn
                                onClick={() => {
                                    setShowDeleteMainConfirmModal(false);
                                    setDeleteMainItemId(null);
                                    setDeleteMainConfirmText("");
                                }}
                            >
                                Cancel
                            </SecondaryBtn>
                            <PrimaryBtn
                                onClick={handleConfirmMainDelete}
                                disabled={deleteMainConfirmText !== "Confirm"}
                            >
                                Delete All
                            </PrimaryBtn>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════════
                ADD QUANTITY MODAL
            ══════════════════════════════════════════ */}
            {showAddQuantityModal && (
                <div className="modal modal-open">
                    <div className="modal-box max-w-7xl max-h-[90vh] flex flex-col bg-base-100 border border-base-content/20">
                        <h3 className="font-bold text-2xl mb-6 text-base-content">
                            Add Quantity
                        </h3>
                        <input
                            type="text"
                            placeholder="Search by Item Code, Description, Supplier, or Commonality..."
                            value={quantitySearchQuery}
                            onChange={(e) =>
                                setQuantitySearchQuery(e.target.value)
                            }
                            className={`mb-4 flex-shrink-0 ${inputCls()}`}
                        />
                        <div className="border border-base-content/15 rounded-lg mb-4 flex-shrink-0 overflow-auto max-h-[300px]">
                            <div className="p-4">
                                <h4 className="font-semibold text-lg mb-2 text-base-content">
                                    Available Items (Click to Select)
                                </h4>
                                <div className="overflow-auto">
                                    <table className={tableCls}>
                                        <thead className="sticky top-0 bg-base-200 z-10">
                                            <tr>
                                                {[
                                                    "Select",
                                                    "Commonality",
                                                    "Item Code",
                                                    "Description",
                                                    "Supplier",
                                                    "Current Qty",
                                                ].map((h) => (
                                                    <th key={h} className={th}>
                                                        {h}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredQuantityItems.length >
                                            0 ? (
                                                filteredQuantityItems.map(
                                                    (item, idx) => {
                                                        const isSelected =
                                                            selectedQuantityItems.some(
                                                                (s) =>
                                                                    s.id ===
                                                                    item.id,
                                                            );
                                                        return (
                                                            <tr
                                                                key={idx}
                                                                className={`hover cursor-pointer text-base-content ${isSelected ? "bg-base-content/10" : ""}`}
                                                                onClick={() =>
                                                                    handleSelectQuantityItem(
                                                                        item,
                                                                    )
                                                                }
                                                            >
                                                                <td
                                                                    className={
                                                                        td
                                                                    }
                                                                >
                                                                    <input
                                                                        type="checkbox"
                                                                        className="checkbox checkbox-sm border-base-content/40"
                                                                        checked={
                                                                            isSelected
                                                                        }
                                                                        onChange={() => {}}
                                                                    />
                                                                </td>
                                                                <td
                                                                    className={
                                                                        td
                                                                    }
                                                                >
                                                                    {item.commonality ||
                                                                        "N/A"}
                                                                </td>
                                                                <td
                                                                    className={
                                                                        td
                                                                    }
                                                                >
                                                                    {item.item_code ||
                                                                        "N/A"}
                                                                </td>
                                                                <td
                                                                    className={
                                                                        td
                                                                    }
                                                                >
                                                                    {item.mat_description ||
                                                                        "N/A"}
                                                                </td>
                                                                <td
                                                                    className={
                                                                        td
                                                                    }
                                                                >
                                                                    {item.supplier ||
                                                                        "N/A"}
                                                                </td>
                                                                <td
                                                                    className={
                                                                        td
                                                                    }
                                                                >
                                                                    {item.qty ||
                                                                        0}
                                                                </td>
                                                            </tr>
                                                        );
                                                    },
                                                )
                                            ) : (
                                                <tr>
                                                    <td
                                                        colSpan="6"
                                                        className="text-center text-base-content/40 py-4"
                                                    >
                                                        {quantitySearchQuery
                                                            ? "No matching items found"
                                                            : "No items available"}
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                        <div className="border border-base-content/15 rounded-lg flex-1 flex flex-col overflow-hidden">
                            <div className="p-4 flex flex-col overflow-hidden h-full">
                                <h4 className="font-semibold text-lg mb-4 flex-shrink-0 text-base-content">
                                    Selected Items (
                                    {selectedQuantityItems.length})
                                </h4>
                                {selectedQuantityItems.length > 0 ? (
                                    <div className="overflow-auto flex-1">
                                        <table className={tableCls}>
                                            <thead className="sticky top-0 bg-base-200 z-10">
                                                <tr>
                                                    {[
                                                        "Commonality",
                                                        "Item Code",
                                                        "Description",
                                                        "Supplier",
                                                        "Current Qty",
                                                        "Qty to Add",
                                                        "New Total",
                                                        "Action",
                                                    ].map((h) => (
                                                        <th
                                                            key={h}
                                                            className={th}
                                                        >
                                                            {h}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {selectedQuantityItems.map(
                                                    (item, idx) => {
                                                        const currentQty =
                                                            item.qty || 0;
                                                        const toAdd =
                                                            quantityToAdd[
                                                                item.id
                                                            ] || 0;
                                                        return (
                                                            <tr
                                                                key={idx}
                                                                className="text-base-content"
                                                            >
                                                                <td
                                                                    className={
                                                                        td
                                                                    }
                                                                >
                                                                    {item.commonality ||
                                                                        "N/A"}
                                                                </td>
                                                                <td
                                                                    className={
                                                                        td
                                                                    }
                                                                >
                                                                    {item.item_code ||
                                                                        "N/A"}
                                                                </td>
                                                                <td
                                                                    className={
                                                                        td
                                                                    }
                                                                >
                                                                    {item.mat_description ||
                                                                        "N/A"}
                                                                </td>
                                                                <td
                                                                    className={
                                                                        td
                                                                    }
                                                                >
                                                                    {item.supplier ||
                                                                        "N/A"}
                                                                </td>
                                                                <td
                                                                    className={
                                                                        td
                                                                    }
                                                                >
                                                                    {currentQty}
                                                                </td>
                                                                <td
                                                                    className={
                                                                        td
                                                                    }
                                                                >
                                                                    <input
                                                                        type="number"
                                                                        min="0"
                                                                        className="w-24 px-2 py-1 text-sm rounded border border-base-content/30 text-base-content bg-transparent focus:border-base-content focus:outline-none"
                                                                        value={
                                                                            quantityToAdd[
                                                                                item
                                                                                    .id
                                                                            ] ||
                                                                            ""
                                                                        }
                                                                        onChange={(
                                                                            e,
                                                                        ) =>
                                                                            handleQuantityChange(
                                                                                item.id,
                                                                                e
                                                                                    .target
                                                                                    .value,
                                                                            )
                                                                        }
                                                                        placeholder="0"
                                                                    />
                                                                </td>
                                                                <td
                                                                    className={
                                                                        td
                                                                    }
                                                                >
                                                                    <span
                                                                        className={`font-semibold ${toAdd > 0 ? "text-base-content" : "text-base-content/50"}`}
                                                                    >
                                                                        {currentQty +
                                                                            toAdd}
                                                                    </span>
                                                                </td>
                                                                <td
                                                                    className={
                                                                        td
                                                                    }
                                                                >
                                                                    <IconBtn
                                                                        onClick={() =>
                                                                            handleSelectQuantityItem(
                                                                                item,
                                                                            )
                                                                        }
                                                                        title="Remove"
                                                                    >
                                                                        <DeleteOutlined className="text-base" />
                                                                    </IconBtn>
                                                                </td>
                                                            </tr>
                                                        );
                                                    },
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="flex-1 flex items-center justify-center">
                                        <div className="flex items-center gap-2 text-base-content/50 border border-base-content/20 rounded-lg px-4 py-3">
                                            <SearchOutlined className="text-lg" />
                                            <span>
                                                No items selected. Click on
                                                items above to select them.
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-4 flex-shrink-0 border-t border-base-content/10 mt-4">
                            <SecondaryBtn
                                onClick={() => {
                                    setShowAddQuantityModal(false);
                                    setQuantitySearchQuery("");
                                    setSelectedQuantityItems([]);
                                    setQuantityToAdd({});
                                }}
                            >
                                Cancel
                            </SecondaryBtn>
                            <PrimaryBtn
                                onClick={handleSaveQuantities}
                                disabled={selectedQuantityItems.length === 0}
                            >
                                Update Quantities
                            </PrimaryBtn>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════════
                CONSIGNED HISTORY MODAL
            ══════════════════════════════════════════ */}
            {showConsignedHistoryModal && (
                <div className="modal modal-open">
                    <div className="modal-box max-w-6xl max-h-[90vh] flex flex-col bg-base-100 border border-base-content/20">
                        <h3 className="font-bold text-2xl mb-2 text-base-content">
                            Consigned History
                        </h3>
                        {consignedHistoryItemInfo && (
                            <div className="mb-4 p-3 border border-base-content/15 rounded-lg">
                                <div className="grid grid-cols-2 gap-2 text-sm text-base-content">
                                    <div>
                                        <span className="font-semibold">
                                            Commonality:
                                        </span>{" "}
                                        {consignedHistoryItemInfo.commonality}
                                    </div>
                                    <div>
                                        <span className="font-semibold">
                                            Category:
                                        </span>{" "}
                                        {consignedHistoryItemInfo.category}
                                    </div>
                                </div>
                            </div>
                        )}
                        <div className="flex-1 overflow-auto">
                            {loadingConsignedHistory ? (
                                <div className="flex justify-center items-center h-64">
                                    <span className="loading loading-spinner loading-lg"></span>
                                </div>
                            ) : consignedHistoryData.length > 0 ? (
                                <div className="space-y-3">
                                    {consignedHistoryData.map(
                                        (history, idx) => (
                                            <div
                                                key={idx}
                                                className="border border-base-content/15 rounded-lg p-4"
                                            >
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <BorderBadge>
                                                            {formatAction(
                                                                history.action,
                                                            )}
                                                        </BorderBadge>
                                                        {history.type ===
                                                            "main" && (
                                                            <BorderBadge>
                                                                Main Record
                                                            </BorderBadge>
                                                        )}
                                                    </div>
                                                    <div className="text-xs text-base-content/50">
                                                        {history.created_at}
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2 text-sm mb-2 text-base-content">
                                                    <div>
                                                        <span className="font-semibold">
                                                            User:
                                                        </span>{" "}
                                                        {history.user_name}
                                                    </div>
                                                </div>
                                                {renderChangeDetails(history)}
                                                {(history.action ===
                                                    "deleted" ||
                                                    history.action ===
                                                        "deleted_with_main") &&
                                                    history.old_values && (
                                                        <div className="mt-2">
                                                            <div className="text-xs font-semibold mb-1 text-base-content">
                                                                Deleted Data:
                                                            </div>
                                                            <div className="grid grid-cols-2 gap-2 text-xs border border-base-content/15 p-2 rounded text-base-content">
                                                                {Object.entries(
                                                                    history.old_values,
                                                                ).map(
                                                                    ([
                                                                        key,
                                                                        value,
                                                                    ]) =>
                                                                        value !==
                                                                            null &&
                                                                        value !==
                                                                            undefined && (
                                                                            <div
                                                                                key={
                                                                                    key
                                                                                }
                                                                            >
                                                                                <span className="font-semibold capitalize">
                                                                                    {key.replace(
                                                                                        /_/g,
                                                                                        " ",
                                                                                    )}

                                                                                    :
                                                                                </span>{" "}
                                                                                {String(
                                                                                    value,
                                                                                )}
                                                                            </div>
                                                                        ),
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                {history.action === "created" &&
                                                    history.new_values && (
                                                        <div className="mt-2">
                                                            <div className="text-xs font-semibold mb-1 text-base-content">
                                                                Created Data:
                                                            </div>
                                                            <div className="grid grid-cols-2 gap-2 text-xs border border-base-content/15 p-2 rounded text-base-content">
                                                                {Object.entries(
                                                                    history.new_values,
                                                                ).map(
                                                                    ([
                                                                        key,
                                                                        value,
                                                                    ]) =>
                                                                        value !==
                                                                            null &&
                                                                        value !==
                                                                            undefined && (
                                                                            <div
                                                                                key={
                                                                                    key
                                                                                }
                                                                            >
                                                                                <span className="font-semibold capitalize">
                                                                                    {key.replace(
                                                                                        /_/g,
                                                                                        " ",
                                                                                    )}

                                                                                    :
                                                                                </span>{" "}
                                                                                {String(
                                                                                    value,
                                                                                )}
                                                                            </div>
                                                                        ),
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                            </div>
                                        ),
                                    )}
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 text-base-content/50 border border-base-content/20 rounded-lg px-4 py-3">
                                    <HistoryOutlined className="text-lg" />
                                    <span>No consigned history found</span>
                                </div>
                            )}
                        </div>
                        <div className="flex justify-between pt-4 flex-shrink-0 border-t border-base-content/10 mt-4">
                            <SecondaryBtn
                                onClick={handleExportConsignedHistory}
                                disabled={
                                    loadingConsignedHistory ||
                                    consignedHistoryData.length === 0
                                }
                                title="Export Consigned History to CSV"
                            >
                                <FileExcelOutlined className="text-base" />
                                Export CSV
                            </SecondaryBtn>
                            <SecondaryBtn
                                onClick={() => {
                                    setShowConsignedHistoryModal(false);
                                    setConsignedHistoryData([]);
                                    setConsignedHistoryItemInfo(null);
                                }}
                            >
                                Close
                            </SecondaryBtn>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════════
                DETAIL HISTORY MODAL
            ══════════════════════════════════════════ */}
            {showDetailHistoryModal && (
                <div className="modal modal-open">
                    <div className="modal-box max-w-6xl max-h-[90vh] flex flex-col bg-base-100 border border-base-content/20">
                        <h3 className="font-bold text-2xl mb-2 text-base-content">
                            Consigned Detail History
                        </h3>
                        {detailHistoryItemInfo && (
                            <div className="mb-4 p-3 border border-base-content/15 rounded-lg">
                                <div className="grid grid-cols-2 gap-2 text-sm text-base-content">
                                    <div>
                                        <span className="font-semibold">
                                            Commonality:
                                        </span>{" "}
                                        {detailHistoryItemInfo.commonality}
                                    </div>
                                    <div>
                                        <span className="font-semibold">
                                            Item Code:
                                        </span>{" "}
                                        {detailHistoryItemInfo.item_code}
                                    </div>
                                    <div>
                                        <span className="font-semibold">
                                            Supplier:
                                        </span>{" "}
                                        {detailHistoryItemInfo.supplier}
                                    </div>
                                    <div>
                                        <span className="font-semibold">
                                            Description:
                                        </span>{" "}
                                        {detailHistoryItemInfo.mat_description}
                                    </div>
                                </div>
                            </div>
                        )}
                        <div className="flex-1 overflow-auto">
                            {loadingDetailHistory ? (
                                <div className="flex justify-center items-center h-64">
                                    <span className="loading loading-spinner loading-lg"></span>
                                </div>
                            ) : detailHistoryData.length > 0 ? (
                                <div className="space-y-3">
                                    {detailHistoryData.map((history, idx) => (
                                        <div
                                            key={idx}
                                            className="border border-base-content/15 rounded-lg p-4"
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex items-center gap-2">
                                                    <BorderBadge>
                                                        {formatAction(
                                                            history.action,
                                                        )}
                                                    </BorderBadge>
                                                    <BorderBadge>
                                                        Detail Record
                                                    </BorderBadge>
                                                </div>
                                                <div className="text-xs text-base-content/50">
                                                    {history.created_at}
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2 text-sm mb-2 text-base-content">
                                                <div>
                                                    <span className="font-semibold">
                                                        User:
                                                    </span>{" "}
                                                    {history.user_name}
                                                </div>
                                            </div>
                                            {renderChangeDetails(history)}
                                            {[
                                                "issued",
                                                "returned",
                                                "replacement_return",
                                                "replacement_issue",
                                            ].includes(history.action) &&
                                                history.old_values && (
                                                    <div className="mt-2">
                                                        <div className="text-xs font-semibold mb-1 text-base-content">
                                                            {history.action ===
                                                            "issued"
                                                                ? "Material Issuance Details:"
                                                                : history.action ===
                                                                    "returned"
                                                                  ? "Material Return Details:"
                                                                  : "Replacement Details:"}
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-2 text-xs border border-base-content/15 p-2 rounded text-base-content">
                                                            {history.old_values
                                                                .mrs_no && (
                                                                <div>
                                                                    <span className="font-semibold">
                                                                        MRS No:
                                                                    </span>{" "}
                                                                    {
                                                                        history
                                                                            .old_values
                                                                            .mrs_no
                                                                    }
                                                                </div>
                                                            )}
                                                            {history.old_values
                                                                .supplier && (
                                                                <div>
                                                                    <span className="font-semibold">
                                                                        Supplier:
                                                                    </span>{" "}
                                                                    {
                                                                        history
                                                                            .old_values
                                                                            .supplier
                                                                    }
                                                                </div>
                                                            )}
                                                            {history.old_values
                                                                .issued_qty !==
                                                                undefined && (
                                                                <div>
                                                                    <span className="font-semibold">
                                                                        Issued
                                                                        Qty:
                                                                    </span>{" "}
                                                                    {
                                                                        history
                                                                            .old_values
                                                                            .issued_qty
                                                                    }
                                                                </div>
                                                            )}
                                                            {history.old_values
                                                                .returned_qty !==
                                                                undefined && (
                                                                <div>
                                                                    <span className="font-semibold">
                                                                        Returned
                                                                        Qty:
                                                                    </span>{" "}
                                                                    {
                                                                        history
                                                                            .old_values
                                                                            .returned_qty
                                                                    }
                                                                </div>
                                                            )}
                                                            {history.old_values
                                                                .reason && (
                                                                <div className="col-span-2">
                                                                    <span className="font-semibold">
                                                                        Reason:
                                                                    </span>{" "}
                                                                    {
                                                                        history
                                                                            .old_values
                                                                            .reason
                                                                    }
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            {(history.action === "deleted" ||
                                                history.action ===
                                                    "deleted_with_main") &&
                                                history.old_values && (
                                                    <div className="mt-2">
                                                        <div className="text-xs font-semibold mb-1 text-base-content">
                                                            Deleted Data:
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-2 text-xs border border-base-content/15 p-2 rounded text-base-content">
                                                            {Object.entries(
                                                                history.old_values,
                                                            )
                                                                .filter(
                                                                    ([key]) =>
                                                                        ![
                                                                            "mrs_no",
                                                                            "issued_qty",
                                                                            "returned_qty",
                                                                            "supplier",
                                                                            "reason",
                                                                        ].includes(
                                                                            key,
                                                                        ),
                                                                )
                                                                .map(
                                                                    ([
                                                                        key,
                                                                        value,
                                                                    ]) =>
                                                                        value !==
                                                                            null &&
                                                                        value !==
                                                                            undefined && (
                                                                            <div
                                                                                key={
                                                                                    key
                                                                                }
                                                                            >
                                                                                <span className="font-semibold capitalize">
                                                                                    {key.replace(
                                                                                        /_/g,
                                                                                        " ",
                                                                                    )}

                                                                                    :
                                                                                </span>{" "}
                                                                                {String(
                                                                                    value,
                                                                                )}
                                                                            </div>
                                                                        ),
                                                                )}
                                                        </div>
                                                    </div>
                                                )}
                                            {history.action === "created" &&
                                                history.new_values && (
                                                    <div className="mt-2">
                                                        <div className="text-xs font-semibold mb-1 text-base-content">
                                                            Created Data:
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-2 text-xs border border-base-content/15 p-2 rounded text-base-content">
                                                            {Object.entries(
                                                                history.new_values,
                                                            ).map(
                                                                ([
                                                                    key,
                                                                    value,
                                                                ]) =>
                                                                    value !==
                                                                        null &&
                                                                    value !==
                                                                        undefined && (
                                                                        <div
                                                                            key={
                                                                                key
                                                                            }
                                                                        >
                                                                            <span className="font-semibold capitalize">
                                                                                {key.replace(
                                                                                    /_/g,
                                                                                    " ",
                                                                                )}

                                                                                :
                                                                            </span>{" "}
                                                                            {String(
                                                                                value,
                                                                            )}
                                                                        </div>
                                                                    ),
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 text-base-content/50 border border-base-content/20 rounded-lg px-4 py-3">
                                    <HistoryOutlined className="text-lg" />
                                    <span>No detail history found</span>
                                </div>
                            )}
                        </div>
                        <div className="flex justify-between pt-4 flex-shrink-0 border-t border-base-content/10 mt-4">
                            <SecondaryBtn
                                onClick={handleExportDetailHistory}
                                disabled={
                                    loadingDetailHistory ||
                                    detailHistoryData.length === 0
                                }
                                title="Export Consigned Detailed History to CSV"
                            >
                                <FileExcelOutlined className="text-base" />
                                Export CSV
                            </SecondaryBtn>
                            <SecondaryBtn
                                onClick={() => {
                                    setShowDetailHistoryModal(false);
                                    setDetailHistoryData([]);
                                    setDetailHistoryItemInfo(null);
                                }}
                            >
                                Close
                            </SecondaryBtn>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════════
                IMPORT EXCEL MODAL
            ══════════════════════════════════════════ */}
            {showImportModal && (
                <div className="modal modal-open">
                    <div className="modal-box bg-base-100 border border-base-content/20">
                        <h3 className="font-bold text-lg mb-4 text-base-content">
                            Import Excel File
                        </h3>
                        <div className="border-l-4 border-base-content pl-3 mb-4 py-2">
                            <p className="text-sm font-bold text-base-content">
                                Excel Format Required
                            </p>
                            <p className="text-sm text-base-content/60">
                                Columns: Commonality, Category, Item Code,
                                Material Description, Supplier, Expiration, UOM,
                                Quantity, Qty Per Box, Minimum, Maximum, Price,
                                Bin Location
                            </p>
                        </div>
                        <div className="mb-4">
                            <label className="block mb-1 text-sm font-medium text-base-content">
                                Select Excel File (.xlsx or .xls)
                            </label>
                            <input
                                type="file"
                                accept=".xlsx,.xls"
                                onChange={handleFileChange}
                                className="w-full text-sm text-base-content file:mr-3 file:py-1.5 file:px-3 file:rounded file:border file:border-base-content/40 file:text-base-content file:bg-transparent hover:file:border-base-content file:transition-all"
                            />
                            {selectedFile && (
                                <p className="text-xs text-base-content/60 mt-1">
                                    Selected: {selectedFile.name}
                                </p>
                            )}
                        </div>
                        <div className="flex justify-end gap-2 pt-4 border-t border-base-content/10">
                            <SecondaryBtn
                                onClick={() => {
                                    setShowImportModal(false);
                                    setSelectedFile(null);
                                }}
                                disabled={importProcessing}
                            >
                                Cancel
                            </SecondaryBtn>
                            <PrimaryBtn
                                onClick={handleImportSubmit}
                                disabled={!selectedFile || importProcessing}
                            >
                                {importProcessing ? (
                                    <span className="flex items-center gap-2">
                                        <span className="loading loading-spinner loading-xs"></span>
                                        Importing...
                                    </span>
                                ) : (
                                    "Import"
                                )}
                            </PrimaryBtn>
                        </div>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
