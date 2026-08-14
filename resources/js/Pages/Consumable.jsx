import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head, usePage, router } from "@inertiajs/react";
import { useState, useEffect } from "react";

export default function Consumable({
    tableData,
    tableFilters,
    empStation = 1,
}) {
    const props = usePage().props;
    const station = parseInt(empStation, 10);

    const [isImporting, setIsImporting] = useState(false);
    const [mainSearchQuery, setMainSearchQuery] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSecondModalOpen, setIsSecondModalOpen] = useState(false);
    const [isAddingToExisting, setIsAddingToExisting] = useState(false);
    const [existingConsumableId, setExistingConsumableId] = useState(null);
    const [isQuantityModalOpen, setIsQuantityModalOpen] = useState(false);
    const [quantitySearchQuery, setQuantitySearchQuery] = useState("");
    const [filteredItems, setFilteredItems] = useState([]);
    const [selectedItem, setSelectedItem] = useState(null);
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
    const [isDeleteDetailModalOpen, setIsDeleteDetailModalOpen] =
        useState(false);
    const [detailToDelete, setDetailToDelete] = useState(null);
    const [deleteDetailConfirmText, setDeleteDetailConfirmText] = useState("");
    const [isDeletingDetail, setIsDeletingDetail] = useState(false);
    const [isDetailHistoryModalOpen, setIsDetailHistoryModalOpen] =
        useState(false);
    const [detailHistoryData, setDetailHistoryData] = useState([]);
    const [detailHistoryItem, setDetailHistoryItem] = useState(null);
    const [editingDetailId, setEditingDetailId] = useState(null);
    const [editDetailFormData, setEditDetailFormData] = useState({});

    const [isEditItemModalOpen, setIsEditItemModalOpen] = useState(false);
    const [itemToEdit, setItemToEdit] = useState(null);
    const [editItemFormData, setEditItemFormData] = useState({
        material_description: "",
        category: "",
        uom: "",
    });
    const [isSavingItem, setIsSavingItem] = useState(false);

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

        router.delete(route("consumable.destroyDetail", detailToDelete.id), {
            preserveState: true,
            preserveScroll: true,
            onSuccess: () => {
                alert("Detail deleted successfully");
                handleCloseDeleteDetailModal();
            },
            onError: (errors) => {
                console.error("Delete error:", errors);
                alert(
                    "Failed to delete detail: " +
                        (errors.error || "Unknown error"),
                );
            },
            onFinish: () => {
                setIsDeletingDetail(false);
            },
        });
    };

    const handleViewHistory = async (item) => {
        setHistoryItem(item);
        setIsLoadingHistory(true);
        setIsHistoryModalOpen(true);

        try {
            const response = await fetch(
                route("consumable.history", item.consumable_id),
                {
                    headers: {
                        Accept: "application/json",
                        "X-Requested-With": "XMLHttpRequest",
                    },
                },
            );

            if (response.ok) {
                const data = await response.json();
                setHistoryData(data.history || []);
            }
        } catch (error) {
            console.error("Error fetching history:", error);
            alert("Failed to load history");
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
            const response = await fetch(
                route("consumable.detailHistory", detail.id),
                {
                    headers: {
                        Accept: "application/json",
                        "X-Requested-With": "XMLHttpRequest",
                    },
                },
            );

            if (response.ok) {
                const data = await response.json();
                setDetailHistoryData(data.history || []);
            }
        } catch (error) {
            console.error("Error fetching detail history:", error);
            alert("Failed to load detail history");
        } finally {
            setIsLoadingHistory(false);
        }
    };

    const handleEditDetailClick = (detail) => {
        setEditingDetailId(detail.id);
        setEditDetailFormData({
            item_code: detail.item_code || "",
            detailed_description: detail.detailed_description || "",
            serial: detail.serial || "",
            bin_location: detail.bin_location || "",
            quantity: detail.quantity || 0,
            max: detail.max || 0,
            min: detail.min || 0,
        });
    };

    const handleCancelEditDetail = () => {
        setEditingDetailId(null);
        setEditDetailFormData({});
    };

    const handleSaveEditDetail = (detail) => {
        if (station === 1 && !editDetailFormData.item_code.trim()) {
            alert("Item code is required");
            return;
        }

        const payload =
            station === 2
                ? {
                      id: detail.id,
                      item_code: detail.item_code,
                      detailed_description: detail.detailed_description,
                      serial: detail.serial,
                      quantity: detail.quantity,
                      max: detail.max,
                      min: detail.min,
                      bin_location: editDetailFormData.bin_location,
                  }
                : {
                      id: detail.id,
                      item_code: editDetailFormData.item_code,
                      detailed_description:
                          editDetailFormData.detailed_description,
                      serial: editDetailFormData.serial,
                      bin_location: editDetailFormData.bin_location,
                      quantity: parseFloat(editDetailFormData.quantity) || 0,
                      max: parseFloat(editDetailFormData.max) || 0,
                      min: parseFloat(editDetailFormData.min) || 0,
                  };

        router.put(
            route("consumable.bulkUpdateDetails"),
            { details: [payload] },
            {
                preserveState: true,
                preserveScroll: true,
                onSuccess: () => {
                    setEditingDetailId(null);
                    setEditDetailFormData({});
                    alert("Detail updated successfully!");
                },
                onError: (errors) => {
                    console.error("Validation errors:", errors);
                    alert("Failed to save changes");
                },
            },
        );
    };

    const handleEditDetailInputChange = (e) => {
        const { name, value } = e.target;
        setEditDetailFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleDeleteClick = (item) => {
        setItemToDelete(item);
        setDeleteConfirmText("");
        setIsDeleteModalOpen(true);
    };

    const handleEditItemClick = (item) => {
        setItemToEdit(item);
        setEditItemFormData({
            material_description: item.material_description || "",
            category: item.category || "",
            uom: item.uom || "",
        });
        setIsEditItemModalOpen(true);
    };

    const handleEditItemInputChange = (e) => {
        const { name, value } = e.target;
        setEditItemFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleCloseEditItemModal = () => {
        setIsEditItemModalOpen(false);
        setItemToEdit(null);
        setEditItemFormData({
            material_description: "",
            category: "",
            uom: "",
        });
    };

    const handleSaveEditItem = () => {
        if (
            !editItemFormData.material_description.trim() ||
            !editItemFormData.category.trim() ||
            !editItemFormData.uom.trim()
        ) {
            alert("Please fill in all required fields");
            return;
        }

        if (!itemToEdit) return;

        setIsSavingItem(true);

        router.put(
            route("consumable.update", itemToEdit.consumable_id),
            {
                material_description: editItemFormData.material_description,
                category: editItemFormData.category,
                uom: editItemFormData.uom,
            },
            {
                preserveState: true,
                preserveScroll: true,
                onSuccess: () => {
                    alert("Item updated successfully!");
                    handleCloseEditItemModal();
                },
                onError: (errors) => {
                    console.error("Validation errors:", errors);
                    alert("Failed to update item. Please check the form.");
                },
                onFinish: () => {
                    setIsSavingItem(false);
                },
            },
        );
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

        router.delete(route("consumable.destroy", itemToDelete.consumable_id), {
            preserveState: true,
            preserveScroll: true,
            onSuccess: () => {
                alert("Item and all related details deleted successfully");
                handleCloseDeleteModal();
            },
            onError: (errors) => {
                console.error("Delete error:", errors);
                alert(
                    "Failed to delete item: " +
                        (errors.error || "Unknown error"),
                );
            },
            onFinish: () => {
                setIsDeleting(false);
            },
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
        price: "",
    });

    const consumableItems = tableData?.data || [];
    const pagination = tableData?.pagination || {
        from: 0,
        to: 0,
        total: 0,
        current_page: 1,
        last_page: 1,
        per_page: 10,
    };

    useEffect(() => {
        if (quantitySearchQuery.trim() === "") {
            setFilteredItems([]);
            return;
        }

        const timeoutId = setTimeout(async () => {
            setIsSearching(true);
            try {
                const response = await fetch(
                    route("consumable.searchDetails") +
                        "?search=" +
                        encodeURIComponent(quantitySearchQuery),
                    {
                        headers: {
                            Accept: "application/json",
                            "X-Requested-With": "XMLHttpRequest",
                        },
                    },
                );

                if (response.ok) {
                    const data = await response.json();
                    setFilteredItems(data);
                }
            } catch (error) {
                console.error("Error searching items:", error);
            } finally {
                setIsSearching(false);
            }
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [quantitySearchQuery]);

    const handleImport = () => {
        document.getElementById("excel-file-input").click();
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setIsImporting(true);

            const formData = new FormData();
            formData.append("file", file);

            router.post(route("consumable.import"), formData, {
                onSuccess: () => {
                    setIsImporting(false);
                    alert("File imported successfully!");
                    e.target.value = "";
                },
                onError: (errors) => {
                    setIsImporting(false);
                    alert(
                        "Import failed: " +
                            (errors.file || errors.error || "Unknown error"),
                    );
                    e.target.value = "";
                },
                onFinish: () => {
                    setIsImporting(false);
                },
            });
        }
    };

    const handleClearSearch = () => {
        setMainSearchQuery("");
    };

    const handleSearch = (e) => {
        const query = e.target.value;
        setMainSearchQuery(query);

        if (query.length >= 3 || query.length === 0) {
            router.get(
                route("consumable"),
                {
                    search: query,
                    page: 1,
                },
                {
                    preserveState: true,
                    preserveScroll: true,
                },
            );
        }
    };

    const handlePerPageChange = (e) => {
        router.get(
            route("consumable"),
            {
                per_page: e.target.value,
                search: mainSearchQuery,
                page: 1,
            },
            {
                preserveState: true,
                preserveScroll: true,
            },
        );
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
            price: "",
        });
    };

    const handleAddItemToExisting = (consumable) => {
        setExistingConsumableId(consumable.consumable_id);
        setIsAddingToExisting(true);

        setFormData({
            material_description: consumable.material_description,
            category: consumable.category,
            uom: consumable.uom,
            item_code: "",
            detailed_description: "",
            serial: "",
            bin_location: "",
            quantity: "",
            max: "",
            min: "",
            price: "",
        });

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
            price: "",
        });
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleNext = () => {
        if (
            !formData.material_description.trim() ||
            !formData.category.trim() ||
            !formData.uom.trim()
        ) {
            alert("Please fill in all required fields");
            return;
        }

        setIsModalOpen(false);
        setIsSecondModalOpen(true);
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
            price: "",
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
                min: formData.min,
            };

            router.post(route("consumable.addDetail"), detailData, {
                preserveState: true,
                preserveScroll: true,
                onSuccess: () => {
                    handleCloseSecondModal();
                },
                onError: (errors) => {
                    console.error("Validation errors:", errors);
                    alert("Failed to add detail. Please check the form.");
                },
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
                price: formData.price,
            };

            router.post(route("consumable.store"), mainData, {
                preserveState: true,
                preserveScroll: true,
                onSuccess: () => {
                    handleCloseSecondModal();
                },
                onError: (errors) => {
                    console.error("Validation errors:", errors);
                },
            });
        }
    };

    const handleAddQuantity = async () => {
        if (selectedItems.length === 0) {
            alert("Please add at least one item to the table");
            return;
        }

        const invalidItems = selectedItems.filter(
            (item) =>
                !item.quantityToAdd || parseFloat(item.quantityToAdd) <= 0,
        );
        if (invalidItems.length > 0) {
            alert("Please enter valid quantities for all items");
            return;
        }

        setIsAddingQuantity(true);

        router.post(
            route("consumable.addQuantityBulk"),
            {
                items: selectedItems.map((item) => ({
                    detail_id: item.id,
                    quantity: parseFloat(item.quantityToAdd),
                })),
            },
            {
                preserveState: true,
                preserveScroll: true,
                onSuccess: () => {
                    alert(
                        `Successfully updated ${selectedItems.length} item(s)`,
                    );
                    setIsQuantityModalOpen(false);
                    setSelectedItems([]);
                    setQuantitySearchQuery("");
                    setFilteredItems([]);
                },
                onError: (errors) => {
                    console.error("Error adding quantities:", errors);
                    alert("Failed to add quantities");
                },
                onFinish: () => {
                    setIsAddingQuantity(false);
                },
            },
        );
    };

    const handleAddToTable = () => {
        if (!selectedItem) {
            alert("Please select an item first");
            return;
        }

        const exists = selectedItems.find(
            (item) => item.id === selectedItem.id,
        );
        if (exists) {
            alert("This item is already in the table");
            return;
        }

        setSelectedItems((prev) => [
            ...prev,
            {
                ...selectedItem,
                quantityToAdd: "",
            },
        ]);

        setSelectedItem(null);
        setQuantitySearchQuery("");
        setFilteredItems([]);
    };

    const handleTableQuantityChange = (itemId, quantity) => {
        setSelectedItems((prev) =>
            prev.map((item) =>
                item.id === itemId
                    ? { ...item, quantityToAdd: quantity }
                    : item,
            ),
        );
    };

    const handleRemoveFromTable = (itemId) => {
        setSelectedItems((prev) => prev.filter((item) => item.id !== itemId));
    };

    return (
        <AuthenticatedLayout>
            <Head title="Consumables and Spare Parts" />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <h1 className="text-2xl font-bold">
                        Consumables and Spare Parts
                    </h1>

                    <div className="flex gap-2">
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
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        className="h-5 w-5 mr-2"
                                        viewBox="0 0 20 20"
                                        fill="currentColor"
                                    >
                                        <path
                                            fillRule="evenodd"
                                            d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z"
                                            clipRule="evenodd"
                                        />
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
                            className="btn btn-outline"
                            onClick={() => setIsQuantityModalOpen(true)}
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-5 w-5 mr-2"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                            >
                                <path
                                    fillRule="evenodd"
                                    d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                                    clipRule="evenodd"
                                />
                            </svg>
                            Add Quantity
                        </button>

                        <button
                            className="btn btn-outline"
                            onClick={handleOpenModal}
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-5 w-5 mr-2"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                            >
                                <path
                                    fillRule="evenodd"
                                    d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                                    clipRule="evenodd"
                                />
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
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-5 w-5"
                                    viewBox="0 0 20 20"
                                    fill="currentColor"
                                >
                                    <path
                                        fillRule="evenodd"
                                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                        clipRule="evenodd"
                                    />
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

                        <div className="text-sm opacity-70">
                            Showing {pagination.from} to {pagination.to} of{" "}
                            {pagination.total} entries
                        </div>
                    </div>
                </div>

                {/* Data Table */}
                <div className="overflow-x-auto border border-base-content/20 rounded-lg">
                    <table className="table table-zebra w-full [&_th]:border-y [&_th]:border-base-content/20 [&_td]:border-y [&_td]:border-base-content/20">
                        <thead>
                            <tr>
                                <th>Item Code</th>
                                <th>Material Description</th>
                                <th>Long Description</th>
                                <th>Serial</th>
                                <th>Category</th>
                                <th>Bin Location</th>
                                <th>Qty</th>
                                <th>UOM</th>
                                <th>Min</th>
                                <th>Max</th>
                                <th className="text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {consumableItems.length > 0 ? (
                                consumableItems.flatMap((item, itemIndex) => {
                                    const details = item.details || [];

                                    if (details.length === 0) {
                                        return (
                                            <tr
                                                key={`empty-${item.consumable_id}`}
                                            >
                                                <td
                                                    colSpan="10"
                                                    className="opacity-50 italic"
                                                >
                                                    No details for{" "}
                                                    {item.material_description}
                                                </td>
                                                <td className="text-center">
                                                    <div className="flex justify-center gap-2">
                                                        <button
                                                            className="btn btn-xs btn-outline"
                                                            title="Add Detail"
                                                            onClick={() =>
                                                                handleAddItemToExisting(
                                                                    item,
                                                                )
                                                            }
                                                        >
                                                            <svg
                                                                xmlns="http://www.w3.org/2000/svg"
                                                                className="h-4 w-4"
                                                                viewBox="0 0 20 20"
                                                                fill="currentColor"
                                                            >
                                                                <path
                                                                    fillRule="evenodd"
                                                                    d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                                                                    clipRule="evenodd"
                                                                />
                                                            </svg>
                                                        </button>
                                                        <button
                                                            className="btn btn-xs btn-ghost"
                                                            title="Edit Item"
                                                            onClick={() =>
                                                                handleEditItemClick(
                                                                    item,
                                                                )
                                                            }
                                                        >
                                                            <svg
                                                                xmlns="http://www.w3.org/2000/svg"
                                                                className="h-4 w-4"
                                                                viewBox="0 0 20 20"
                                                                fill="currentColor"
                                                            >
                                                                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                                            </svg>
                                                        </button>
                                                        <button
                                                            onClick={() =>
                                                                handleDeleteClick(
                                                                    item,
                                                                )
                                                            }
                                                            className="btn btn-xs btn-ghost opacity-60 hover:opacity-100 hover:text-error"
                                                            title="Delete Consumable"
                                                        >
                                                            <svg
                                                                xmlns="http://www.w3.org/2000/svg"
                                                                className="h-4 w-4"
                                                                viewBox="0 0 20 20"
                                                                fill="currentColor"
                                                            >
                                                                <path
                                                                    fillRule="evenodd"
                                                                    d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                                                                    clipRule="evenodd"
                                                                />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    }

                                    return details.map(
                                        (detail, detailIndex) => {
                                            const isEditing =
                                                editingDetailId === detail.id;
                                            const isFirstDetail =
                                                detailIndex === 0;

                                            return (
                                                <tr
                                                    key={`${item.consumable_id}-${detail.id}`}
                                                >
                                                    {/* Item Code */}
                                                    <td>
                                                        {isEditing ? (
                                                            station === 1 ? (
                                                                <input
                                                                    type="text"
                                                                    name="item_code"
                                                                    className="input input-bordered input-xs w-full"
                                                                    value={
                                                                        editDetailFormData.item_code
                                                                    }
                                                                    onChange={
                                                                        handleEditDetailInputChange
                                                                    }
                                                                />
                                                            ) : (
                                                                <span className="opacity-50">
                                                                    {detail.item_code ||
                                                                        "-"}
                                                                </span>
                                                            )
                                                        ) : (
                                                            detail.item_code ||
                                                            "-"
                                                        )}
                                                    </td>

                                                    {/* Material Description */}
                                                    <td>
                                                        {item.material_description ||
                                                            "-"}
                                                    </td>

                                                    {/* Long Description */}
                                                    <td>
                                                        {isEditing ? (
                                                            station === 1 ? (
                                                                <input
                                                                    type="text"
                                                                    name="detailed_description"
                                                                    className="input input-bordered input-xs w-full"
                                                                    value={
                                                                        editDetailFormData.detailed_description
                                                                    }
                                                                    onChange={
                                                                        handleEditDetailInputChange
                                                                    }
                                                                />
                                                            ) : (
                                                                <span className="opacity-50">
                                                                    {detail.detailed_description ||
                                                                        "-"}
                                                                </span>
                                                            )
                                                        ) : (
                                                            detail.detailed_description ||
                                                            "-"
                                                        )}
                                                    </td>

                                                    {/* Serial */}
                                                    <td>
                                                        {isEditing ? (
                                                            station === 1 ? (
                                                                <input
                                                                    type="text"
                                                                    name="serial"
                                                                    className="input input-bordered input-xs w-full"
                                                                    value={
                                                                        editDetailFormData.serial
                                                                    }
                                                                    onChange={
                                                                        handleEditDetailInputChange
                                                                    }
                                                                />
                                                            ) : (
                                                                <span className="opacity-50">
                                                                    {detail.serial ||
                                                                        "-"}
                                                                </span>
                                                            )
                                                        ) : (
                                                            detail.serial || "-"
                                                        )}
                                                    </td>

                                                    {/* Category */}
                                                    <td>
                                                        {item.category || "-"}
                                                    </td>

                                                    {/* Bin Location */}
                                                    <td>
                                                        {isEditing ? (
                                                            <input
                                                                type="text"
                                                                name="bin_location"
                                                                className="input input-bordered input-xs w-full"
                                                                value={
                                                                    editDetailFormData.bin_location
                                                                }
                                                                onChange={
                                                                    handleEditDetailInputChange
                                                                }
                                                            />
                                                        ) : (
                                                            detail.bin_location ||
                                                            "-"
                                                        )}
                                                    </td>

                                                    {/* Qty */}
                                                    <td>
                                                        {isEditing ? (
                                                            station === 1 ? (
                                                                <input
                                                                    type="number"
                                                                    name="quantity"
                                                                    className="input input-bordered input-xs w-20"
                                                                    value={
                                                                        editDetailFormData.quantity
                                                                    }
                                                                    onChange={
                                                                        handleEditDetailInputChange
                                                                    }
                                                                />
                                                            ) : (
                                                                <span className="opacity-50">
                                                                    {detail.quantity ||
                                                                        "0"}
                                                                </span>
                                                            )
                                                        ) : (
                                                            detail.quantity ||
                                                            "0"
                                                        )}
                                                    </td>

                                                    {/* UOM */}
                                                    <td>{item.uom || "-"}</td>

                                                    {/* Min */}
                                                    <td>
                                                        {isEditing ? (
                                                            station === 1 ? (
                                                                <input
                                                                    type="number"
                                                                    name="min"
                                                                    className="input input-bordered input-xs w-20"
                                                                    value={
                                                                        editDetailFormData.min
                                                                    }
                                                                    onChange={
                                                                        handleEditDetailInputChange
                                                                    }
                                                                />
                                                            ) : (
                                                                <span className="opacity-50">
                                                                    {detail.min ||
                                                                        "0"}
                                                                </span>
                                                            )
                                                        ) : (
                                                            detail.min || "0"
                                                        )}
                                                    </td>

                                                    {/* Max */}
                                                    <td>
                                                        {isEditing ? (
                                                            station === 1 ? (
                                                                <input
                                                                    type="number"
                                                                    name="max"
                                                                    className="input input-bordered input-xs w-20"
                                                                    value={
                                                                        editDetailFormData.max
                                                                    }
                                                                    onChange={
                                                                        handleEditDetailInputChange
                                                                    }
                                                                />
                                                            ) : (
                                                                <span className="opacity-50">
                                                                    {detail.max ||
                                                                        "0"}
                                                                </span>
                                                            )
                                                        ) : (
                                                            detail.max || "0"
                                                        )}
                                                    </td>

                                                    {/* Actions */}
                                                    <td>
                                                        <div className="flex justify-center gap-1">
                                                            {isEditing ? (
                                                                <>
                                                                    <button
                                                                        className="btn btn-xs btn-outline"
                                                                        onClick={() =>
                                                                            handleSaveEditDetail(
                                                                                detail,
                                                                            )
                                                                        }
                                                                        title="Save"
                                                                    >
                                                                        <svg
                                                                            xmlns="http://www.w3.org/2000/svg"
                                                                            className="h-3 w-3"
                                                                            viewBox="0 0 20 20"
                                                                            fill="currentColor"
                                                                        >
                                                                            <path
                                                                                fillRule="evenodd"
                                                                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                                                                clipRule="evenodd"
                                                                            />
                                                                        </svg>
                                                                    </button>
                                                                    <button
                                                                        className="btn btn-xs btn-ghost"
                                                                        onClick={
                                                                            handleCancelEditDetail
                                                                        }
                                                                        title="Cancel"
                                                                    >
                                                                        <svg
                                                                            xmlns="http://www.w3.org/2000/svg"
                                                                            className="h-3 w-3"
                                                                            viewBox="0 0 20 20"
                                                                            fill="currentColor"
                                                                        >
                                                                            <path
                                                                                fillRule="evenodd"
                                                                                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                                                                clipRule="evenodd"
                                                                            />
                                                                        </svg>
                                                                    </button>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    {isFirstDetail && (
                                                                        <>
                                                                            <button
                                                                                className="btn btn-xs btn-outline"
                                                                                title="Add Detail to this Item"
                                                                                onClick={() =>
                                                                                    handleAddItemToExisting(
                                                                                        item,
                                                                                    )
                                                                                }
                                                                            >
                                                                                <svg
                                                                                    xmlns="http://www.w3.org/2000/svg"
                                                                                    className="h-3 w-3"
                                                                                    viewBox="0 0 20 20"
                                                                                    fill="currentColor"
                                                                                >
                                                                                    <path
                                                                                        fillRule="evenodd"
                                                                                        d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                                                                                        clipRule="evenodd"
                                                                                    />
                                                                                </svg>
                                                                            </button>
                                                                            <button
                                                                                className="btn btn-xs btn-ghost"
                                                                                title="Edit Item"
                                                                                onClick={() =>
                                                                                    handleEditItemClick(
                                                                                        item,
                                                                                    )
                                                                                }
                                                                            >
                                                                                <svg
                                                                                    xmlns="http://www.w3.org/2000/svg"
                                                                                    className="h-3 w-3"
                                                                                    viewBox="0 0 20 20"
                                                                                    fill="currentColor"
                                                                                >
                                                                                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                                                                </svg>
                                                                            </button>
                                                                        </>
                                                                    )}
                                                                    <button
                                                                        className="btn btn-xs btn-ghost"
                                                                        title="View Detail History"
                                                                        onClick={() =>
                                                                            handleViewDetailHistory(
                                                                                detail,
                                                                            )
                                                                        }
                                                                    >
                                                                        <svg
                                                                            xmlns="http://www.w3.org/2000/svg"
                                                                            className="h-4 w-4"
                                                                            viewBox="0 0 20 20"
                                                                            fill="currentColor"
                                                                        >
                                                                            <path
                                                                                fillRule="evenodd"
                                                                                d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                                                                                clipRule="evenodd"
                                                                            />
                                                                        </svg>
                                                                    </button>
                                                                    <button
                                                                        className="btn btn-xs btn-ghost"
                                                                        title="Edit Detail"
                                                                        onClick={() =>
                                                                            handleEditDetailClick(
                                                                                detail,
                                                                            )
                                                                        }
                                                                    >
                                                                        <svg
                                                                            xmlns="http://www.w3.org/2000/svg"
                                                                            className="h-3 w-3"
                                                                            viewBox="0 0 20 20"
                                                                            fill="currentColor"
                                                                        >
                                                                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                                                        </svg>
                                                                    </button>
                                                                    <button
                                                                        className="btn btn-xs btn-ghost opacity-60 hover:opacity-100 hover:text-error"
                                                                        title="Delete Detail"
                                                                        onClick={() =>
                                                                            handleDeleteDetailClick(
                                                                                detail,
                                                                            )
                                                                        }
                                                                    >
                                                                        <svg
                                                                            xmlns="http://www.w3.org/2000/svg"
                                                                            className="h-3 w-3"
                                                                            viewBox="0 0 20 20"
                                                                            fill="currentColor"
                                                                        >
                                                                            <path
                                                                                fillRule="evenodd"
                                                                                d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                                                                                clipRule="evenodd"
                                                                            />
                                                                        </svg>
                                                                    </button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        },
                                    );
                                })
                            ) : (
                                <tr>
                                    <td
                                        colSpan="11"
                                        className="text-center py-8 opacity-50"
                                    >
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
                                className="join-item btn btn-sm btn-outline"
                                disabled={pagination.current_page === 1}
                                onClick={() =>
                                    router.get(
                                        route("consumable"),
                                        {
                                            page: pagination.current_page - 1,
                                            per_page: pagination.per_page,
                                            search: mainSearchQuery,
                                        },
                                        {
                                            preserveState: true,
                                            preserveScroll: true,
                                        },
                                    )
                                }
                            >
                                «
                            </button>

                            {[...Array(pagination.last_page)].map((_, i) => {
                                const page = i + 1;
                                if (
                                    page === 1 ||
                                    page === pagination.last_page ||
                                    (page >= pagination.current_page - 1 &&
                                        page <= pagination.current_page + 1)
                                ) {
                                    return (
                                        <button
                                            key={page}
                                            className={`join-item btn btn-sm ${page === pagination.current_page ? "btn-active" : "btn-outline"}`}
                                            onClick={() =>
                                                router.get(
                                                    route("consumable"),
                                                    {
                                                        page,
                                                        per_page:
                                                            pagination.per_page,
                                                        search: mainSearchQuery,
                                                    },
                                                    {
                                                        preserveState: true,
                                                        preserveScroll: true,
                                                    },
                                                )
                                            }
                                        >
                                            {page}
                                        </button>
                                    );
                                } else if (
                                    page === pagination.current_page - 2 ||
                                    page === pagination.current_page + 2
                                ) {
                                    return (
                                        <span
                                            key={page}
                                            className="join-item btn btn-sm btn-disabled"
                                        >
                                            ...
                                        </span>
                                    );
                                }
                                return null;
                            })}

                            <button
                                className="join-item btn btn-sm btn-outline"
                                disabled={
                                    pagination.current_page ===
                                    pagination.last_page
                                }
                                onClick={() =>
                                    router.get(
                                        route("consumable"),
                                        {
                                            page: pagination.current_page + 1,
                                            per_page: pagination.per_page,
                                            search: mainSearchQuery,
                                        },
                                        {
                                            preserveState: true,
                                            preserveScroll: true,
                                        },
                                    )
                                }
                            >
                                »
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* ==================== Add Item Modal - Step 1 ==================== */}
            {isModalOpen && (
                <div className="modal modal-open">
                    <div className="modal-box">
                        <h3 className="font-bold text-lg mb-4">
                            {isAddingToExisting
                                ? "Add New Item - Step 1"
                                : "Add New Item"}
                        </h3>

                        {isAddingToExisting && (
                            <div className="flex items-center gap-3 border border-base-content/20 rounded-lg p-3 mb-4">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    className="shrink-0 w-5 h-5 opacity-60"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                    />
                                </svg>
                                <span className="text-sm opacity-70">
                                    Adding detail to consumable ID:{" "}
                                    {existingConsumableId}
                                </span>
                            </div>
                        )}

                        <div className="space-y-4">
                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text">
                                        Material Description *
                                    </span>
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
                                    <span className="label-text">
                                        Category *
                                    </span>
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
                                    <span className="label-text">
                                        Unit of Measure (UOM) *
                                    </span>
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
                                className="btn btn-outline"
                                onClick={handleNext}
                            >
                                Next
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ==================== Add Item Modal - Step 2 ==================== */}
            {isSecondModalOpen && (
                <div className="modal modal-open">
                    <div className="modal-box max-w-2xl">
                        <h3 className="font-bold text-lg mb-4">
                            {isAddingToExisting
                                ? `Add Detail to Item`
                                : "Add New Item - Step 2"}
                        </h3>

                        {isAddingToExisting && (
                            <div className="border border-base-content/20 rounded-lg p-3 mb-4">
                                <div className="flex items-start gap-3">
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        className="shrink-0 w-5 h-5 opacity-60 mt-0.5"
                                        stroke="currentColor"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth="2"
                                            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                        />
                                    </svg>
                                    <div className="text-sm opacity-70">
                                        <p>
                                            Adding new detail to existing
                                            consumable:
                                        </p>
                                        <p className="font-semibold">
                                            ID: {existingConsumableId}
                                        </p>
                                        <p className="font-semibold">
                                            Material:{" "}
                                            {formData.material_description}
                                        </p>
                                        <p className="font-semibold">
                                            Category: {formData.category}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text">
                                        Item Code *
                                    </span>
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
                                    <span className="label-text">
                                        Long Description
                                    </span>
                                </label>
                                <input
                                    type="text"
                                    name="detailed_description"
                                    placeholder="Enter Long Description"
                                    className="input input-bordered w-full"
                                    value={formData.detailed_description}
                                    onChange={handleInputChange}
                                />
                            </div>
                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text">
                                        Serial Number
                                    </span>
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
                                    <span className="label-text">
                                        Bin Location
                                    </span>
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
                                    <span className="label-text">
                                        Quantity *
                                    </span>
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
                                    <span className="label-text">
                                        Maximum Quantity
                                    </span>
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
                                    <span className="label-text">
                                        Minimum Quantity
                                    </span>
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
                                        <span className="label-text">
                                            Price
                                        </span>
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
                                className="btn btn-outline"
                                onClick={handleSubmit}
                            >
                                {isAddingToExisting ? "Add Detail" : "Submit"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ==================== Add Quantity Modal ==================== */}
            {isQuantityModalOpen && (
                <div className="modal modal-open">
                    <div className="modal-box max-w-5xl">
                        <h3 className="font-bold text-lg mb-4">Add Quantity</h3>

                        <div className="space-y-6">
                            {/* Search section */}
                            <div className="border border-base-content/20 rounded-lg p-4">
                                <h4 className="font-semibold text-sm mb-2">
                                    Search Items
                                </h4>
                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text">
                                            Search by Item Code or Description
                                        </span>
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Enter item code or description..."
                                        className="input input-bordered w-full"
                                        value={quantitySearchQuery}
                                        onChange={(e) =>
                                            setQuantitySearchQuery(
                                                e.target.value,
                                            )
                                        }
                                    />

                                    {quantitySearchQuery.trim() !== "" && (
                                        <div className="mt-2 max-h-60 overflow-y-auto border border-base-content/20 rounded-lg shadow-lg bg-base-100">
                                            {isSearching ? (
                                                <div className="p-4 text-center">
                                                    <span className="loading loading-spinner loading-sm"></span>
                                                    <span className="ml-2">
                                                        Searching...
                                                    </span>
                                                </div>
                                            ) : filteredItems.length > 0 ? (
                                                <ul className="menu rounded-box w-full p-0">
                                                    {filteredItems.map(
                                                        (item) => (
                                                            <li
                                                                key={item.id}
                                                                className="w-full"
                                                            >
                                                                <button
                                                                    className={`flex flex-col items-start p-3 hover:bg-base-content/10 w-full ${selectedItem?.id === item.id ? "bg-base-content/10" : ""}`}
                                                                    onClick={() => {
                                                                        setSelectedItem(
                                                                            item,
                                                                        );
                                                                        setQuantitySearchQuery(
                                                                            `${item.item_code} - ${item.detailed_description}`,
                                                                        );
                                                                        setFilteredItems(
                                                                            [],
                                                                        );
                                                                    }}
                                                                >
                                                                    <div className="flex justify-between w-full">
                                                                        <span className="font-medium">
                                                                            {
                                                                                item.item_code
                                                                            }
                                                                        </span>
                                                                        <span className="badge badge-outline badge-sm">
                                                                            {
                                                                                item
                                                                                    .consumable
                                                                                    ?.material_description
                                                                            }
                                                                        </span>
                                                                    </div>
                                                                    <span className="text-sm opacity-60">
                                                                        Desc:{" "}
                                                                        {
                                                                            item.detailed_description
                                                                        }
                                                                    </span>
                                                                    <span className="text-xs opacity-50">
                                                                        Category:{" "}
                                                                        {item
                                                                            .consumable
                                                                            ?.category ||
                                                                            "-"}
                                                                    </span>
                                                                    <span className="text-xs opacity-50">
                                                                        Current
                                                                        Qty:{" "}
                                                                        {
                                                                            item.quantity
                                                                        }{" "}
                                                                        {
                                                                            item
                                                                                .consumable
                                                                                ?.uom
                                                                        }{" "}
                                                                        | Bin:{" "}
                                                                        {item.bin_location ||
                                                                            "N/A"}
                                                                    </span>
                                                                </button>
                                                            </li>
                                                        ),
                                                    )}
                                                </ul>
                                            ) : (
                                                <div className="p-4 text-center opacity-50">
                                                    No items found matching "
                                                    {quantitySearchQuery}"
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {selectedItem && (
                                    <div className="mt-4 border border-base-content/20 rounded-lg p-3">
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1">
                                                <h4 className="font-bold text-sm mb-2">
                                                    Selected Item
                                                </h4>
                                                <div className="grid grid-cols-3 gap-2 text-xs">
                                                    <div>
                                                        <p className="opacity-50">
                                                            Consumable
                                                        </p>
                                                        <p className="font-medium">
                                                            {
                                                                selectedItem
                                                                    .consumable
                                                                    ?.material_description
                                                            }
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="opacity-50">
                                                            Item Code
                                                        </p>
                                                        <p className="font-medium">
                                                            {
                                                                selectedItem.item_code
                                                            }
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="opacity-50">
                                                            Description
                                                        </p>
                                                        <p className="font-medium">
                                                            {
                                                                selectedItem.detailed_description
                                                            }
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="opacity-50">
                                                            Current Qty
                                                        </p>
                                                        <p className="font-medium">
                                                            {
                                                                selectedItem.quantity
                                                            }{" "}
                                                            {
                                                                selectedItem
                                                                    .consumable
                                                                    ?.uom
                                                            }
                                                        </p>
                                                    </div>
                                                    <div className="col-span-2">
                                                        <p className="opacity-50">
                                                            Bin Location
                                                        </p>
                                                        <p className="font-medium">
                                                            {selectedItem.bin_location ||
                                                                "N/A"}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                            <button
                                                className="btn btn-outline btn-sm ml-2"
                                                onClick={handleAddToTable}
                                            >
                                                Add to Table
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Items to update section */}
                            <div className="border border-base-content/20 rounded-lg p-4">
                                <div className="flex justify-between items-center mb-2">
                                    <h4 className="font-semibold text-sm">
                                        Items to Update ({selectedItems.length})
                                    </h4>
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
                                        <table className="table table-sm w-full [&_th]:border-y [&_th]:border-base-content/20 [&_td]:border-y [&_td]:border-base-content/20">
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
                                                    const currentQty =
                                                        parseFloat(
                                                            item.quantity,
                                                        ) || 0;
                                                    const addQty =
                                                        parseFloat(
                                                            item.quantityToAdd,
                                                        ) || 0;
                                                    const newQty =
                                                        currentQty + addQty;

                                                    return (
                                                        <tr key={item.id}>
                                                            <td className="font-medium">
                                                                {
                                                                    item
                                                                        .consumable
                                                                        ?.material_description
                                                                }
                                                            </td>
                                                            <td>
                                                                {item.item_code}
                                                            </td>
                                                            <td>
                                                                {
                                                                    item.detailed_description
                                                                }
                                                            </td>
                                                            <td>
                                                                {currentQty}{" "}
                                                                {
                                                                    item
                                                                        .consumable
                                                                        ?.uom
                                                                }
                                                            </td>
                                                            <td>
                                                                <input
                                                                    type="number"
                                                                    className="input input-bordered input-xs w-24"
                                                                    placeholder="0"
                                                                    value={
                                                                        item.quantityToAdd
                                                                    }
                                                                    onChange={(
                                                                        e,
                                                                    ) =>
                                                                        handleTableQuantityChange(
                                                                            item.id,
                                                                            e
                                                                                .target
                                                                                .value,
                                                                        )
                                                                    }
                                                                    min="0"
                                                                />
                                                            </td>
                                                            <td>
                                                                <span className="font-semibold">
                                                                    {newQty.toFixed(
                                                                        2,
                                                                    )}{" "}
                                                                    {
                                                                        item
                                                                            .consumable
                                                                            ?.uom
                                                                    }
                                                                </span>
                                                            </td>
                                                            <td>
                                                                <button
                                                                    className="btn btn-ghost btn-xs opacity-60 hover:opacity-100 hover:text-error"
                                                                    onClick={() =>
                                                                        handleRemoveFromTable(
                                                                            item.id,
                                                                        )
                                                                    }
                                                                >
                                                                    <svg
                                                                        xmlns="http://www.w3.org/2000/svg"
                                                                        className="h-4 w-4"
                                                                        viewBox="0 0 20 20"
                                                                        fill="currentColor"
                                                                    >
                                                                        <path
                                                                            fillRule="evenodd"
                                                                            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                                                            clipRule="evenodd"
                                                                        />
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
                                    <div className="text-center py-8 opacity-40">
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            className="h-12 w-12 mx-auto mb-2"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                                            />
                                        </svg>
                                        <p>No items added yet</p>
                                        <p className="text-xs mt-1">
                                            Search and add items from above
                                        </p>
                                    </div>
                                )}
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
                                className="btn btn-outline"
                                onClick={handleAddQuantity}
                                disabled={
                                    selectedItems.length === 0 ||
                                    isAddingQuantity
                                }
                            >
                                {isAddingQuantity ? (
                                    <>
                                        <span className="loading loading-spinner loading-sm mr-2"></span>
                                        Updating...
                                    </>
                                ) : (
                                    <>
                                        Update {selectedItems.length} Item
                                        {selectedItems.length !== 1 ? "s" : ""}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ==================== Delete Confirmation Modal ==================== */}
            {isDeleteModalOpen && itemToDelete && (
                <div className="modal modal-open">
                    <div className="modal-box">
                        <h3 className="font-bold text-lg mb-4">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-6 w-6 inline-block mr-2 opacity-70"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                            >
                                <path
                                    fillRule="evenodd"
                                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                                    clipRule="evenodd"
                                />
                            </svg>
                            Confirm Delete
                        </h3>

                        {/* Warning notice — border only */}
                        <div className="flex items-start gap-3 border border-base-content/20 rounded-lg p-3 mb-4">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                className="shrink-0 w-5 h-5 opacity-60 mt-0.5"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                />
                            </svg>
                            <div>
                                <p className="font-bold text-sm">Warning!</p>
                                <p className="text-sm opacity-70">
                                    This action cannot be undone. This will
                                    permanently delete the item and all its
                                    related details.
                                </p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="border border-base-content/20 rounded-lg p-4">
                                <p className="text-sm font-semibold mb-2">
                                    Item to delete:
                                </p>
                                <div className="space-y-1">
                                    <p className="text-sm">
                                        <span className="font-medium">ID:</span>{" "}
                                        {itemToDelete.consumable_id}
                                    </p>
                                    <p className="text-sm">
                                        <span className="font-medium">
                                            Material:
                                        </span>{" "}
                                        {itemToDelete.material_description}
                                    </p>
                                    <p className="text-sm">
                                        <span className="font-medium">
                                            Category:
                                        </span>{" "}
                                        {itemToDelete.category}
                                    </p>
                                </div>
                            </div>

                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text font-semibold">
                                        Type{" "}
                                        <span className="font-bold">
                                            CONFIRM
                                        </span>{" "}
                                        to delete:
                                    </span>
                                </label>
                                <input
                                    type="text"
                                    className={`input input-bordered w-full ${deleteConfirmText === "CONFIRM" ? "input-success" : deleteConfirmText.length > 0 ? "input-error" : ""}`}
                                    placeholder="Type CONFIRM here"
                                    value={deleteConfirmText}
                                    onChange={(e) =>
                                        setDeleteConfirmText(e.target.value)
                                    }
                                    autoFocus
                                />
                                {deleteConfirmText.length > 0 &&
                                    deleteConfirmText !== "CONFIRM" && (
                                        <label className="label">
                                            <span className="label-text-alt text-error">
                                                Must type exactly "CONFIRM"
                                                (case-sensitive)
                                            </span>
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
                                className="btn btn-outline border-error text-error hover:bg-error hover:text-error-content"
                                onClick={handleConfirmDelete}
                                disabled={
                                    deleteConfirmText !== "CONFIRM" ||
                                    isDeleting
                                }
                            >
                                {isDeleting ? (
                                    <>
                                        <span className="loading loading-spinner loading-sm mr-2"></span>
                                        Deleting...
                                    </>
                                ) : (
                                    <>
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            className="h-5 w-5 mr-2"
                                            viewBox="0 0 20 20"
                                            fill="currentColor"
                                        >
                                            <path
                                                fillRule="evenodd"
                                                d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                                                clipRule="evenodd"
                                            />
                                        </svg>
                                        Delete Permanently
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ==================== Consumable Item History Modal ==================== */}
            {isHistoryModalOpen && historyItem && (
                <div className="modal modal-open">
                    <div className="modal-box max-w-4xl">
                        <h3 className="font-bold text-lg mb-4">
                            History: {historyItem.material_description}
                        </h3>

                        <div className="border border-base-content/20 rounded-lg p-3 mb-4">
                            <p className="text-sm">
                                <strong>ID:</strong> {historyItem.consumable_id}
                            </p>
                            <p className="text-sm">
                                <strong>Category:</strong>{" "}
                                {historyItem.category}
                            </p>
                            <p className="text-sm">
                                <strong>UOM:</strong> {historyItem.uom}
                            </p>
                        </div>

                        {isLoadingHistory ? (
                            <div className="flex justify-center items-center py-8">
                                <span className="loading loading-spinner loading-lg"></span>
                            </div>
                        ) : historyData.length > 0 ? (
                            <div className="overflow-x-auto max-h-96 border border-base-content/20 rounded-lg">
                                <table className="table table-sm w-full [&_th]:border-y [&_th]:border-base-content/20 [&_td]:border-y [&_td]:border-base-content/20">
                                    <thead className="sticky top-0 bg-base-100">
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
                                                    {new Date(
                                                        record.created_at,
                                                    ).toLocaleString()}
                                                </td>
                                                <td>
                                                    <span className="badge badge-outline badge-sm">
                                                        {record.action}
                                                    </span>
                                                </td>
                                                <td className="text-xs">
                                                    {record.user_name}
                                                </td>
                                                <td className="text-xs">
                                                    {record.action ===
                                                        "created" && (
                                                        <span className="opacity-70">
                                                            Item created
                                                        </span>
                                                    )}
                                                    {record.action ===
                                                        "updated" &&
                                                        record.changes && (
                                                            <div className="space-y-1">
                                                                {record.changes.map(
                                                                    (
                                                                        field,
                                                                        i,
                                                                    ) => (
                                                                        <div
                                                                            key={
                                                                                i
                                                                            }
                                                                        >
                                                                            <strong>
                                                                                {
                                                                                    field
                                                                                }

                                                                                :
                                                                            </strong>
                                                                            <span className="opacity-50 line-through ml-1">
                                                                                {record
                                                                                    .old_values?.[
                                                                                    field
                                                                                ] ||
                                                                                    "N/A"}
                                                                            </span>
                                                                            <span className="mx-1">
                                                                                →
                                                                            </span>
                                                                            <span>
                                                                                {record
                                                                                    .new_values?.[
                                                                                    field
                                                                                ] ||
                                                                                    "N/A"}
                                                                            </span>
                                                                        </div>
                                                                    ),
                                                                )}
                                                            </div>
                                                        )}
                                                    {record.action ===
                                                        "deleted" && (
                                                        <span className="opacity-70">
                                                            Item deleted
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="text-center py-8 opacity-40">
                                No history records found
                            </div>
                        )}

                        <div className="modal-action">
                            <button
                                className="btn btn-ghost"
                                onClick={handleCloseHistoryModal}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ==================== Detail History Modal ==================== */}
            {isDetailHistoryModalOpen && detailHistoryItem && (
                <div className="modal modal-open">
                    <div className="modal-box max-w-5xl">
                        <h3 className="font-bold text-lg mb-4">
                            Detail History: {detailHistoryItem.item_code}
                        </h3>

                        <div className="border border-base-content/20 rounded-lg p-3 mb-4">
                            <div className="grid grid-cols-2 gap-2 text-sm">
                                <p>
                                    <strong>Consumable:</strong>{" "}
                                    {
                                        detailHistoryItem.consumable
                                            ?.material_description
                                    }
                                </p>
                                <p>
                                    <strong>Description:</strong>{" "}
                                    {detailHistoryItem.detailed_description}
                                </p>
                                <p>
                                    <strong>Current Qty:</strong>{" "}
                                    {detailHistoryItem.quantity}{" "}
                                    {detailHistoryItem.consumable?.uom}
                                </p>
                                <p>
                                    <strong>Bin Location:</strong>{" "}
                                    {detailHistoryItem.bin_location || "N/A"}
                                </p>
                            </div>
                        </div>

                        {isLoadingHistory ? (
                            <div className="flex justify-center items-center py-8">
                                <span className="loading loading-spinner loading-lg"></span>
                            </div>
                        ) : detailHistoryData.length > 0 ? (
                            <div className="overflow-x-auto max-h-96 border border-base-content/20 rounded-lg">
                                <table className="table table-sm w-full [&_th]:border-y [&_th]:border-base-content/20 [&_td]:border-y [&_td]:border-base-content/20">
                                    <thead className="sticky top-0 bg-base-100">
                                        <tr>
                                            <th>Date/Time</th>
                                            <th>Action</th>
                                            <th>User</th>
                                            <th>Changes</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {detailHistoryData.map(
                                            (record, index) => (
                                                <tr key={record.id || index}>
                                                    <td className="text-xs">
                                                        {new Date(
                                                            record.created_at,
                                                        ).toLocaleString()}
                                                    </td>
                                                    <td>
                                                        <span className="badge badge-outline badge-sm">
                                                            {record.action}
                                                        </span>
                                                    </td>
                                                    <td className="text-xs">
                                                        {record.user_name}
                                                    </td>
                                                    <td className="text-xs">
                                                        {record.action ===
                                                            "created" && (
                                                            <span className="opacity-70">
                                                                Detail created
                                                            </span>
                                                        )}
                                                        {record.action ===
                                                            "updated" &&
                                                            record.changes && (
                                                                <div className="space-y-1">
                                                                    {record.changes.map(
                                                                        (
                                                                            field,
                                                                            i,
                                                                        ) => (
                                                                            <div
                                                                                key={
                                                                                    i
                                                                                }
                                                                            >
                                                                                <strong>
                                                                                    {
                                                                                        field
                                                                                    }

                                                                                    :
                                                                                </strong>
                                                                                <span className="opacity-50 line-through ml-1">
                                                                                    {String(
                                                                                        record
                                                                                            .old_values?.[
                                                                                            field
                                                                                        ] ||
                                                                                            "N/A",
                                                                                    )}
                                                                                </span>
                                                                                <span className="mx-1">
                                                                                    →
                                                                                </span>
                                                                                <span>
                                                                                    {String(
                                                                                        record
                                                                                            .new_values?.[
                                                                                            field
                                                                                        ] ||
                                                                                            "N/A",
                                                                                    )}
                                                                                </span>
                                                                            </div>
                                                                        ),
                                                                    )}
                                                                </div>
                                                            )}
                                                        {record.action ===
                                                            "deleted" && (
                                                            <span className="opacity-70">
                                                                Detail deleted
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ),
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="text-center py-8 opacity-40">
                                No history records found
                            </div>
                        )}

                        <div className="modal-action">
                            <button
                                className="btn btn-ghost"
                                onClick={handleCloseDetailHistoryModal}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ==================== Edit Item Modal ==================== */}
            {isEditItemModalOpen && itemToEdit && (
                <div className="modal modal-open">
                    <div className="modal-box">
                        <h3 className="font-bold text-lg mb-4">Edit Item</h3>

                        <div className="border border-base-content/20 rounded-lg p-3 mb-4">
                            <span className="text-sm opacity-70">
                                Editing consumable ID:{" "}
                                {itemToEdit.consumable_id}
                            </span>
                        </div>

                        <div className="space-y-4">
                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text">
                                        Material Description *
                                    </span>
                                </label>
                                <input
                                    type="text"
                                    name="material_description"
                                    placeholder="Enter material description"
                                    className="input input-bordered w-full"
                                    value={
                                        editItemFormData.material_description
                                    }
                                    onChange={handleEditItemInputChange}
                                />
                            </div>
                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text">
                                        Category *
                                    </span>
                                </label>
                                <input
                                    type="text"
                                    name="category"
                                    placeholder="Enter category"
                                    className="input input-bordered w-full"
                                    value={editItemFormData.category}
                                    onChange={handleEditItemInputChange}
                                />
                            </div>
                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text">
                                        Unit of Measure (UOM) *
                                    </span>
                                </label>
                                <input
                                    type="text"
                                    name="uom"
                                    placeholder="e.g., pcs, kg, box"
                                    className="input input-bordered w-full"
                                    value={editItemFormData.uom}
                                    onChange={handleEditItemInputChange}
                                />
                            </div>
                        </div>

                        <div className="modal-action">
                            <button
                                className="btn btn-ghost"
                                onClick={handleCloseEditItemModal}
                                disabled={isSavingItem}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn btn-outline"
                                onClick={handleSaveEditItem}
                                disabled={isSavingItem}
                            >
                                {isSavingItem ? (
                                    <>
                                        <span className="loading loading-spinner loading-sm mr-2"></span>
                                        Saving...
                                    </>
                                ) : (
                                    "Save Changes"
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ==================== Delete Detail Confirmation Modal ==================== */}
            {isDeleteDetailModalOpen && detailToDelete && (
                <div className="modal modal-open">
                    <div className="modal-box">
                        <h3 className="font-bold text-lg mb-4">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-6 w-6 inline-block mr-2 opacity-70"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                            >
                                <path
                                    fillRule="evenodd"
                                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                                    clipRule="evenodd"
                                />
                            </svg>
                            Confirm Delete Detail
                        </h3>

                        <div className="flex items-start gap-3 border border-base-content/20 rounded-lg p-3 mb-4">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                className="shrink-0 w-5 h-5 opacity-60 mt-0.5"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                />
                            </svg>
                            <div>
                                <p className="font-bold text-sm">Warning!</p>
                                <p className="text-sm opacity-70">
                                    This action cannot be undone. This will
                                    permanently delete this detail.
                                </p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="border border-base-content/20 rounded-lg p-4">
                                <p className="text-sm font-semibold mb-2">
                                    Detail to delete:
                                </p>
                                <div className="space-y-1">
                                    <p className="text-sm">
                                        <span className="font-medium">
                                            Consumable:
                                        </span>{" "}
                                        {
                                            detailToDelete.consumable
                                                ?.material_description
                                        }
                                    </p>
                                    <p className="text-sm">
                                        <span className="font-medium">
                                            Item Code:
                                        </span>{" "}
                                        {detailToDelete.item_code}
                                    </p>
                                    <p className="text-sm">
                                        <span className="font-medium">
                                            Description:
                                        </span>{" "}
                                        {detailToDelete.detailed_description}
                                    </p>
                                    <p className="text-sm">
                                        <span className="font-medium">
                                            Quantity:
                                        </span>{" "}
                                        {detailToDelete.quantity}{" "}
                                        {detailToDelete.consumable?.uom}
                                    </p>
                                </div>
                            </div>

                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text font-semibold">
                                        Type{" "}
                                        <span className="font-bold">
                                            CONFIRM
                                        </span>{" "}
                                        to delete:
                                    </span>
                                </label>
                                <input
                                    type="text"
                                    className={`input input-bordered w-full ${deleteDetailConfirmText === "CONFIRM" ? "input-success" : deleteDetailConfirmText.length > 0 ? "input-error" : ""}`}
                                    placeholder="Type CONFIRM here"
                                    value={deleteDetailConfirmText}
                                    onChange={(e) =>
                                        setDeleteDetailConfirmText(
                                            e.target.value,
                                        )
                                    }
                                    autoFocus
                                />
                                {deleteDetailConfirmText.length > 0 &&
                                    deleteDetailConfirmText !== "CONFIRM" && (
                                        <label className="label">
                                            <span className="label-text-alt text-error">
                                                Must type exactly "CONFIRM"
                                                (case-sensitive)
                                            </span>
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
                                className="btn btn-outline border-error text-error hover:bg-error hover:text-error-content"
                                onClick={handleConfirmDeleteDetail}
                                disabled={
                                    deleteDetailConfirmText !== "CONFIRM" ||
                                    isDeletingDetail
                                }
                            >
                                {isDeletingDetail ? (
                                    <>
                                        <span className="loading loading-spinner loading-sm mr-2"></span>
                                        Deleting...
                                    </>
                                ) : (
                                    <>
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            className="h-5 w-5 mr-2"
                                            viewBox="0 0 20 20"
                                            fill="currentColor"
                                        >
                                            <path
                                                fillRule="evenodd"
                                                d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                                                clipRule="evenodd"
                                            />
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
