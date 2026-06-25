import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head, usePage, router } from "@inertiajs/react";
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
    AppstoreAddOutlined,
    ShoppingCartOutlined,
    PlusCircleOutlined,
    UserOutlined,
    LeftOutlined,
    RightOutlined,
} from "@ant-design/icons";

function VariantDropdown({ anchorRef, options, selectedId, onSelect, onClose }) {
    const [style, setStyle] = useState({});

    useEffect(() => {
        if (anchorRef.current) {
            const rect = anchorRef.current.getBoundingClientRect();
            setStyle({
                position: "fixed",
                top: rect.bottom + 4,
                left: rect.left,
                minWidth: Math.max(rect.width, 220),
                zIndex: 9999,
            });
        }
    }, [anchorRef]);

    useEffect(() => {
        const handleClose = (e) => {
            if (!anchorRef.current?.contains(e.target)) onClose();
        };
        document.addEventListener("mousedown", handleClose);
        return () => document.removeEventListener("mousedown", handleClose);
    }, []);

    return createPortal(
        <ul style={style} className="bg-base-100 border-2 border-primary/60 rounded-lg shadow-2xl max-h-52 overflow-y-auto py-1">
            {options.map(v => (
                <li
                    key={v.id}
                    className={`px-3 py-2 text-xs cursor-pointer hover:bg-primary/15 hover:text-primary transition-colors ${
                        selectedId === v.id
                            ? 'bg-primary/20 font-semibold text-primary border-l-2 border-primary'
                            : 'border-l-2 border-transparent'
                    }`}
                    onMouseDown={(e) => {
                        e.preventDefault();
                        onSelect(v.id);
                        onClose();
                    }}
                >
                    {v.detailed_description || '-'}
                </li>
            ))}
        </ul>,
        document.body
    );
}

export default function OrderMaterial({ 
    tableData      = [], 
    suppliesData   = [],
    consumableData = [],
    approvers      = [],
    station        = 'Unknown Station',
    empDept        = 'Unknown Department',
    empProdline    = 'Unknown Prodline',
    empName        = 'Unknown Employee',
    isConsignedUser = false,
    isStoreUser     = false,
}) {
    const props = usePage().props;

    const showConsigned  = isConsignedUser || isStoreUser;
    const showSupplies   = !isConsignedUser;
    const showConsumable = !isConsignedUser;

    const defaultTab = showConsigned ? "consigned" : "supplies";

    const [activeTab, setActiveTab]                       = useState(defaultTab);
    const [searchTerm, setSearchTerm]                     = useState("");
    const [suppliesSearchTerm, setSuppliesSearchTerm]     = useState("");
    const [consumableSearchTerm, setConsumableSearchTerm] = useState("");
    const [cartItems, setCartItems]                       = useState([]);
    const [showCartModal, setShowCartModal]               = useState(false);
    const [currentDateTime, setCurrentDateTime]           = useState(new Date());
    const [selectedVariants, setSelectedVariants]         = useState({});
    const [isSubmitting, setIsSubmitting]                 = useState(false);
    const [approverSearch, setApproverSearch]             = useState("");
    const [approverDropdownOpen, setApproverDropdownOpen] = useState(false);

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage]                = useState(10);

    const [orderInfo, setOrderInfo] = useState({
        station:     station,
        employee_id: "",
        factory:     "",
        department:  empDept,
        approver:    "",
        machine_no:  "",
    });

    const factoryOptions = [
        { value: "",          label: "Select Factory" },
        { value: "Factory 1", label: "Factory 1" },
        { value: "Factory 2", label: "Factory 2" },
        { value: "Factory 3", label: "Factory 3" },
        { value: "Factory 4", label: "Factory 4" },
        { value: "Factory 5", label: "Factory 5" },
    ];

    const filteredApprovers = approvers.filter(a =>
        a.name.toLowerCase().includes(approverSearch.toLowerCase())
    );

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (approverDropdownOpen && !e.target.closest('.approver-dropdown-wrapper')) {
                setApproverDropdownOpen(false);
                setApproverSearch('');
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [approverDropdownOpen]);

    useEffect(() => {
        if (typeof window.Echo === 'undefined') return;
        const channel = window.Echo.channel('material-issuance');
        channel.listen('.material.updated', () => {
            router.reload({
                only: ['tableData', 'suppliesData', 'consumableData'],
                preserveState: true,
                preserveScroll: true,
            });
        });
        return () => { window.Echo.leave('material-issuance'); };
    }, []);

    useEffect(() => {
        const timer = setInterval(() => { setCurrentDateTime(new Date()); }, 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => { setCurrentPage(1); }, [activeTab, searchTerm, suppliesSearchTerm, consumableSearchTerm]);

    useEffect(() => {
        setOrderInfo(prev => ({ ...prev, station, department: empDept }));
    }, [station, empDept]);

    useEffect(() => {
        const handleClickOutside = () => {
            setSelectedVariants(prev => {
                const next = { ...prev };
                Object.keys(next).forEach(k => { if (k.startsWith('__open_')) next[k] = false; });
                return next;
            });
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const formatDateTime = (date) => date.toLocaleString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true,
    });

    // ==================== FILTER LOGIC ====================
    const filteredData = tableData.filter(item => {
        const s = searchTerm.toLowerCase();
        return item.item_code?.toLowerCase().includes(s) || item.mat_description?.toLowerCase().includes(s) || item.supplier?.toLowerCase().includes(s);
    });

    const normalizedSuppliesData = () => {
        const grouped = {};
        suppliesData.forEach(item => {
            const key = item.material_description || 'Unknown';
            if (!grouped[key]) grouped[key] = { material_description: item.material_description, supplies_no: item.supplies_no, uom: item.uom, variants: [] };
            grouped[key].variants.push(item);
        });
        return Object.values(grouped);
    };

    const normalizedConsumableData = () => {
        const grouped = {};
        consumableData.forEach(item => {
            const key = item.material_description || 'Unknown';
            if (!grouped[key]) grouped[key] = { material_description: item.material_description, consumable_id: item.consumable_id, category: item.category, uom: item.uom, variants: [] };
            grouped[key].variants.push(item);
        });
        return Object.values(grouped);
    };

    const filteredSuppliesData = normalizedSuppliesData().filter(group => {
        const s = suppliesSearchTerm.toLowerCase();
        return group.material_description?.toLowerCase().includes(s) ||
            group.variants.some(v => v.item_code?.toLowerCase().includes(s) || v.detailed_description?.toLowerCase().includes(s));
    });

    const filteredConsumableData = normalizedConsumableData().filter(group => {
        const s = consumableSearchTerm.toLowerCase();
        return group.material_description?.toLowerCase().includes(s) || group.category?.toLowerCase().includes(s) ||
            group.variants.some(v => v.item_code?.toLowerCase().includes(s) || v.detailed_description?.toLowerCase().includes(s) || v.serial?.toLowerCase().includes(s));
    });

    // ==================== CART HELPERS ====================
    const needsConsignedForm = isConsignedUser || (isStoreUser && activeTab === "consigned");

    const canAddToCart = () => needsConsignedForm
        ? orderInfo.employee_id.trim() !== "" && orderInfo.factory !== ""
        : orderInfo.approver !== "";

    const groupedCartItems = () => {
        const groups = {};
        cartItems.forEach(item => {
            const key = item.cart_type === 'consigned'
                ? `${item.employee_id}_${item.factory}_${item.station}`
                : `${item.station}_${item.department}_${item.approver}`;
            if (!groups[key]) {
                groups[key] = item.cart_type === 'consigned'
                    ? { cart_type: 'consigned', employee_id: item.employee_id, factory: item.factory, station: item.station, items: [] }
                    : { cart_type: item.cart_type, station: item.station, department: item.department, approver: item.approver, machine_no: item.machine_no, items: [] };
            }
            groups[key].items.push(item);
        });
        return Object.values(groups);
    };

    const handleAddToCart = (item) => {
        if (needsConsignedForm) {
            if (!orderInfo.employee_id.trim()) { alert("Please enter Employee ID before adding items to cart!"); return; }
            if (!orderInfo.factory)            { alert("Please select a Factory before adding items to cart!"); return; }
        } else {
            if (!orderInfo.approver) { alert("Please select an Approver before adding items to cart!"); return; }
        }
        if (!item.qty || item.qty <= 0) { alert("This item is out of stock!"); return; }

        const exists = cartItems.findIndex(c => c.id === item.id &&
            (needsConsignedForm
                ? (c.employee_id === orderInfo.employee_id && c.factory === orderInfo.factory)
                : (c.approver === orderInfo.approver)));

        if (exists >= 0) {
            alert("Item already in cart!");
        } else {
            setCartItems([...cartItems, {
                ...item, request_quantity: "", remarks: "", cart_type: activeTab,
                ...(needsConsignedForm
                    ? { employee_id: orderInfo.employee_id, factory: orderInfo.factory, station: orderInfo.station }
                    : { station: orderInfo.station, department: orderInfo.department, approver: orderInfo.approver, machine_no: orderInfo.machine_no }),
                cart_item_id: `${item.id}_${Date.now()}`,
            }]);
        }
    };

    const handleRemoveFromCart  = (id) => setCartItems(cartItems.filter(i => i.cart_item_id !== id));
    const handleQuantityChange = (id, qty) => setCartItems(cartItems.map(i => i.cart_item_id !== id ? i : { ...i, request_quantity: qty === "" ? "" : Math.min(Math.max(1, qty), i.qty || 1) }));
    const handleRemarksChange   = (id, remarks) => setCartItems(cartItems.map(i => i.cart_item_id === id ? { ...i, remarks } : i));
    const handleOrderInfoChange = (field, value) => setOrderInfo({ ...orderInfo, [field]: value });
    const handleVariantChange   = (desc, id) => setSelectedVariants({ ...selectedVariants, [desc]: id });

    const getSelectedVariant = (group) => {
        const id = selectedVariants[group.material_description];
        return (id && group.variants.find(v => v.id === id)) || group.variants[0];
    };

    // ==================== SUBMIT ====================
    const handleSubmitOrder = async () => {
        if (cartItems.length === 0) { alert("Cart is empty!"); return; }

        const orderData = {
            type: activeTab === 'supplies' ? 'supplies' : activeTab === 'consumable' ? 'consumable' : 'consigned',
            orders: groupedCartItems().map(group => ({
                ...(group.cart_type === 'consigned'
                    ? { employee_id: group.employee_id, factory: group.factory, station: group.station }
                    : { station: group.station, department: group.department, approver: group.approver, machine_no: group.machine_no }),
                items: group.items.map(item => ({
                    item_code: item.item_code, mat_description: item.mat_description,
                    material_description: item.material_description, detailed_description: item.detailed_description,
                    supplier: item.supplier, serial: item.serial, expiration: item.expiration,
                    bin_location: item.bin_location, qty: item.qty, uom: item.uom,
                    qty_per_box: item.qty_per_box, request_quantity: item.request_quantity, remarks: item.remarks,
                })),
            })),
        };

        setIsSubmitting(true);
        router.post(route('order-material.submit'), orderData, {
            preserveScroll: true,
            onSuccess: (page) => {
                const flash = page.props.flash || {};
                if (flash.success && flash.orders) {
                    alert(`Order submitted successfully!\n\nMRS Numbers: ${flash.orders.map(o => o.mrs_no).join(', ')}`);
                } else {
                    alert('Order submitted successfully!');
                }
                setCartItems([]);
                setShowCartModal(false);
                setOrderInfo({ station, employee_id: "", factory: "", department: empDept, approver: "", machine_no: "" });
            },
            onError: (errors) => { console.error('Error submitting order:', errors); alert('Failed to submit order. Please check the console for details.'); },
            onFinish: () => setIsSubmitting(false),
        });
    };

    // ==================== PAGINATION ====================
    const getCurrentData = () => {
        if (activeTab === "consigned")  return filteredData;
        if (activeTab === "supplies")   return filteredSuppliesData;
        if (activeTab === "consumable") return filteredConsumableData;
        return [];
    };

    const totalItems = getCurrentData().length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const getPaginatedData = () => getCurrentData().slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    const handlePageChange = (page) => { if (page >= 1 && page <= totalPages) setCurrentPage(page); };

    const renderPagination = () => {
        if (totalPages <= 1) return null;
        return (
            <div className="flex justify-center items-center gap-2 mt-4">
                <button className="btn btn-sm btn-outline h-9 min-h-[2.25rem] px-3" onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1}>
                    <LeftOutlined className="text-sm" />
                </button>
                <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let p;
                        if (totalPages <= 5)                    p = i + 1;
                        else if (currentPage <= 3)              p = i + 1;
                        else if (currentPage >= totalPages - 2) p = totalPages - 4 + i;
                        else                                    p = currentPage - 2 + i;
                        return (
                            <button key={p} className={`btn btn-sm h-9 min-h-[2.25rem] px-3 text-sm ${currentPage === p ? 'btn-active' : 'btn-outline'}`} onClick={() => handlePageChange(p)}>{p}</button>
                        );
                    })}
                </div>
                <button className="btn btn-sm btn-outline h-9 min-h-[2.25rem] px-3" onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages}>
                    <RightOutlined className="text-sm" />
                </button>
            </div>
        );
    };

    // ── Variant dropdown cell ─────────────────────────────────────────────────
    // For single-variant rows: just show text.
    // For multi-variant rows: show a clearly styled button/dropdown trigger.
    const renderVariantCell = (group, selectedVariant) => {
        if (group.variants.length <= 1) {
            return (
                <div className="flex justify-center items-center h-full">
                    <span className="inline-block max-w-[140px] break-words whitespace-normal text-xs">
                        {selectedVariant.detailed_description || '-'}
                    </span>
                </div>
            );
        }

        const anchorRef = { current: null };
        const isOpen = selectedVariants[`__open_${group.material_description}`];

        return (
            <div
                ref={(el) => { anchorRef.current = el; }}
                className={`
                    flex items-center gap-1 rounded-md border-2 cursor-pointer select-none
                    transition-all duration-150 min-h-[2rem] px-2 py-1 w-full
                    ${isOpen
                        ? 'border-primary bg-primary/10 shadow-md'
                        : 'border-primary/50 bg-primary/5 hover:border-primary hover:bg-primary/10'
                    }
                `}
                onClick={(e) => {
                    e.stopPropagation();
                    setSelectedVariants(prev => ({
                        ...prev,
                        [`__open_${group.material_description}`]: !prev[`__open_${group.material_description}`]
                    }));
                }}
            >
                {/* Variant badge showing count */}
                <span className="flex-shrink-0 bg-primary text-primary-content text-[10px] font-bold rounded px-1 py-0.5 leading-none">
                    {group.variants.length}
                </span>

                {/* Selected variant text */}
                <span className="flex-1 text-xs font-medium truncate text-primary" title={selectedVariant.detailed_description || '-'}>
                    {selectedVariant.detailed_description || '-'}
                </span>

                {/* Chevron */}
                <svg
                    className={`w-3.5 h-3.5 flex-shrink-0 text-primary transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
                >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>

                {isOpen && (
                    <VariantDropdown
                        anchorRef={anchorRef}
                        options={group.variants}
                        selectedId={selectedVariant.id}
                        onSelect={(id) => handleVariantChange(group.material_description, id)}
                        onClose={() => setSelectedVariants(prev => ({ ...prev, [`__open_${group.material_description}`]: false }))}
                    />
                )}
            </div>
        );
    };

    // Total items counter widget
    const TotalWidget = ({ count }) => (
        <div className="border border-base-content/20 rounded-lg px-4 py-2">
            <div className="text-xs opacity-50">Total Items</div>
            <div className="text-sm font-bold">{count}</div>
        </div>
    );

    // ==================== TAB CONTENT ====================
    const renderTabContent = () => {
        const paginatedData = getPaginatedData();

        if (activeTab === "consigned") return (
            <>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-3">
                    <div className="form-control w-full md:w-1/2">
                        <input type="text" placeholder="Search by Item Code, Description, or Supplier..."
                            className="input input-bordered w-full input-sm text-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>
                    <TotalWidget count={totalItems} />
                </div>
                <div className="overflow-x-auto">
                    <table className="table w-full table-sm [&_th]:border-y [&_th]:border-base-content/20 [&_td]:border-y [&_td]:border-base-content/20">
                        <thead>
                            <tr>
                                <th className="text-center text-xs px-2 py-2 w-[12%]">Item Code</th>
                                <th className="text-center text-xs px-2 py-2 w-[25%]">Description</th>
                                <th className="text-center text-xs px-2 py-2 w-[15%]">Supplier</th>
                                <th className="text-center text-xs px-2 py-2 w-[10%]">Qty</th>
                                <th className="text-center text-xs px-2 py-2 w-[8%]">UOM</th>
                                <th className="text-center text-xs px-2 py-2 w-[10%]">Qty/Box</th>
                                <th className="text-center text-xs px-2 py-2 w-[10%]">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedData.length > 0 ? paginatedData.map((item) => (
                                <tr key={item.id}>
                                    <td className="text-center align-middle px-2 py-2 text-xs"><span className="inline-block max-w-[90px] truncate font-mono" title={item.item_code || '-'}>{item.item_code || '-'}</span></td>
                                    <td className="text-center align-middle px-2 py-2 text-xs"><span className="inline-block max-w-[160px] break-words whitespace-normal">{item.mat_description || '-'}</span></td>
                                    <td className="text-center align-middle px-2 py-2 text-xs"><span className="inline-block max-w-[110px] break-words whitespace-normal">{item.supplier || '-'}</span></td>
                                    <td className="text-center align-middle px-2 py-2 text-xs"><span className={`font-semibold ${item.qty <= 0 ? 'text-error' : ''}`}>{item.qty || 0}</span></td>
                                    <td className="text-center align-middle px-2 py-2 text-xs">{item.uom || '-'}</td>
                                    <td className="text-center align-middle px-2 py-2 text-xs">{item.qty_per_box || 0}</td>
                                    <td className="text-center align-middle px-2 py-2">
                                        <button className="btn btn-xs btn-outline h-7 min-h-[1.75rem] px-2"
                                            onClick={() => handleAddToCart(item)}
                                            disabled={!canAddToCart() || !item.qty || item.qty <= 0}>
                                            <PlusCircleOutlined className="text-sm" />
                                        </button>
                                    </td>
                                </tr>
                            )) : (
                                <tr><td colSpan="7" className="text-center opacity-40 py-8 text-sm">{searchTerm ? 'No items found matching your search.' : 'No consigned items available.'}</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
                {renderPagination()}
            </>
        );

        if (activeTab === "supplies") return (
            <>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-3">
                    <div className="form-control w-full md:w-1/2">
                        <input type="text" placeholder="Search by Item Code, Description, or Material Description..."
                            className="input input-bordered w-full input-sm text-sm" value={suppliesSearchTerm} onChange={(e) => setSuppliesSearchTerm(e.target.value)} />
                    </div>
                    <TotalWidget count={totalItems} />
                </div>
                <div className="overflow-x-auto">
                    <table className="table w-full table-sm [&_th]:border-y [&_th]:border-base-content/20 [&_td]:border-y [&_td]:border-base-content/20">
                        <thead>
                            <tr>
                                <th className="text-center text-xs px-2 py-2 w-[10%]">Item Code</th>
                                <th className="text-center text-xs px-2 py-2 w-[35%]">Material Desc</th>
                                {/* Wider column + helper label so users know it's clickable */}
                                <th className="text-center text-xs px-2 py-2 w-[22%]">
                                    Detailed Desc
                                    <span className="block text-[10px] font-normal opacity-50 normal-case">(click to switch)</span>
                                </th>
                                <th className="text-center text-xs px-2 py-2 w-[10%]">Qty</th>
                                <th className="text-center text-xs px-2 py-2 w-[8%]">UOM</th>
                                <th className="text-center text-xs px-2 py-2 w-[12%]">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedData.length > 0 ? paginatedData.map((group, index) => {
                                const sv = getSelectedVariant(group);
                                return (
                                    <tr key={index}>
                                        <td className="text-center align-middle px-2 py-2 text-xs"><span className="inline-block max-w-[90px] truncate font-mono" title={sv.item_code || '-'}>{sv.item_code || '-'}</span></td>
                                        <td className="text-center align-middle px-2 py-2 text-xs"><span className="inline-block max-w-[220px] break-words whitespace-normal">{group.material_description || '-'}</span></td>
                                        <td className="align-middle px-2 py-2">{renderVariantCell(group, sv)}</td>
                                        <td className="text-center align-middle px-2 py-2 text-xs">
                                            <span className={`font-semibold ${sv.qty <= 0 ? 'text-error' : sv.qty < sv.min ? 'text-warning' : ''}`}>{sv.qty || 0}</span>
                                        </td>
                                        <td className="text-center align-middle px-2 py-2 text-xs">{group.uom || '-'}</td>
                                        <td className="text-center align-middle px-2 py-2">
                                            <button className="btn btn-xs btn-outline h-7 min-h-[1.75rem] px-2"
                                                onClick={() => handleAddToCart(sv)}
                                                disabled={!canAddToCart() || !sv.qty || sv.qty <= 0}>
                                                <PlusCircleOutlined className="text-sm" />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            }) : (
                                <tr><td colSpan="6" className="text-center opacity-40 py-8 text-sm">{suppliesSearchTerm ? 'No supplies found matching your search.' : 'No supplies available.'}</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
                {renderPagination()}
            </>
        );

        if (activeTab === "consumable") return (
            <>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-3">
                    <div className="form-control w-full md:w-1/2">
                        <input type="text" placeholder="Search by Item Code, Description, Serial, or Category..."
                            className="input input-bordered w-full input-sm text-sm" value={consumableSearchTerm} onChange={(e) => setConsumableSearchTerm(e.target.value)} />
                    </div>
                    <TotalWidget count={totalItems} />
                </div>
                <div className="overflow-x-auto">
                    <table className="table w-full table-sm [&_th]:border-y [&_th]:border-base-content/20 [&_td]:border-y [&_td]:border-base-content/20">
                        <thead>
                            <tr>
                                <th className="text-center text-xs px-2 py-2 w-[10%]">Item Code</th>
                                <th className="text-center text-xs px-2 py-2 w-[22%]">Material</th>
                                <th className="text-center text-xs px-2 py-2 w-[18%]">
                                    Detailed
                                    <span className="block text-[10px] font-normal opacity-50 normal-case">(click to switch)</span>
                                </th>
                                <th className="text-center text-xs px-2 py-2 w-[10%]">Serial</th>
                                <th className="text-center text-xs px-2 py-2 w-[12%]">Category</th>
                                <th className="text-center text-xs px-2 py-2 w-[8%]">Qty</th>
                                <th className="text-center text-xs px-2 py-2 w-[7%]">UOM</th>
                                <th className="text-center text-xs px-2 py-2 w-[8%]">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedData.length > 0 ? paginatedData.map((group, index) => {
                                const sv = getSelectedVariant(group);
                                return (
                                    <tr key={index}>
                                        <td className="text-center align-middle px-2 py-2 text-xs"><span className="inline-block max-w-[80px] truncate font-mono" title={sv.item_code || '-'}>{sv.item_code || '-'}</span></td>
                                        <td className="text-center align-middle px-2 py-2 text-xs"><span className="inline-block max-w-[160px] break-words whitespace-normal">{group.material_description || '-'}</span></td>
                                        <td className="align-middle px-2 py-2">{renderVariantCell(group, sv)}</td>
                                        <td className="text-center align-middle px-2 py-2 text-xs"><span className="inline-block max-w-[80px] truncate" title={sv.serial || '-'}>{sv.serial || '-'}</span></td>
                                        <td className="text-center align-middle px-2 py-2 text-xs"><span className="inline-block max-w-[90px] truncate" title={group.category || '-'}>{group.category || '-'}</span></td>
                                        <td className="text-center align-middle px-2 py-2 text-xs">
                                            <span className={`font-semibold ${sv.qty <= 0 ? 'text-error' : sv.qty < sv.min ? 'text-warning' : ''}`}>{sv.qty || 0}</span>
                                        </td>
                                        <td className="text-center align-middle px-2 py-2 text-xs">{group.uom || '-'}</td>
                                        <td className="text-center align-middle px-2 py-2">
                                            <button className="btn btn-xs btn-outline h-7 min-h-[1.75rem] px-2"
                                                onClick={() => handleAddToCart(sv)}
                                                disabled={!canAddToCart() || !sv.qty || sv.qty <= 0}>
                                                <PlusCircleOutlined className="text-sm" />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            }) : (
                                <tr><td colSpan="8" className="text-center opacity-40 py-8 text-sm">{consumableSearchTerm ? 'No consumables found matching your search.' : 'No consumables available.'}</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
                {renderPagination()}
            </>
        );

        return null;
    };

    return (
        <AuthenticatedLayout>
            <Head title="Order Material" />

            <div className="p-6">
                <div className="border border-base-content/20 rounded-lg">
                    <div className="p-6">

                        {/* Header */}
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-3xl font-bold">Order Material</h2>
                            <div className="flex gap-2">
                                <div className="indicator">
                                    {cartItems.length > 0 && (
                                        <span className="indicator-item badge badge-outline">{cartItems.length}</span>
                                    )}
                                    <button className="btn btn-outline gap-2" onClick={() => setShowCartModal(true)}>
                                        <ShoppingCartOutlined className="text-lg" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Order Information Form */}
                        <div className="border border-base-content/20 rounded-lg p-4 mb-4">
                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                {/* Employee Info */}
                                <div className="flex items-center gap-3 flex-shrink-0">
                                    <div className="avatar placeholder">
                                        <div className="border border-base-content/30 rounded-full w-10 h-10 flex items-center justify-center">
                                            <UserOutlined className="text-xl" />
                                        </div>
                                    </div>
                                    <div>
                                        <div className="font-semibold text-sm">{isConsignedUser ? empDept : empName}</div>
                                        <div className="text-xs opacity-50">{formatDateTime(currentDateTime)}</div>
                                    </div>
                                </div>

                                {/* Form Fields */}
                                <div className="flex-1">
                                    {needsConsignedForm ? (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                            <div className="space-y-1">
                                                <label className="block"><span className="text-xs font-semibold opacity-70">Station</span></label>
                                                <input type="text" className="input input-bordered input-sm w-full opacity-60 px-2 py-1 text-sm" value={orderInfo.station} readOnly />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="block"><span className="text-xs font-semibold opacity-70">Employee ID <span className="text-error">*</span></span></label>
                                                <input type="text" placeholder="Enter employee ID..."
                                                    className="input input-bordered input-sm w-full px-2 py-1 text-sm"
                                                    value={orderInfo.employee_id}
                                                    onChange={(e) => handleOrderInfoChange('employee_id', e.target.value)} />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="block"><span className="text-xs font-semibold opacity-70">Factory <span className="text-error">*</span></span></label>
                                                <select className="select select-bordered select-sm w-full px-2 text-sm"
                                                    value={orderInfo.factory}
                                                    onChange={(e) => handleOrderInfoChange('factory', e.target.value)}>
                                                    {factoryOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                                            <div className="space-y-1">
                                                <label className="block"><span className="text-xs font-semibold opacity-70">Station</span></label>
                                                <input type="text" className="input input-bordered input-sm w-full opacity-60 px-2 py-1 text-sm" value={orderInfo.station} readOnly />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="block"><span className="text-xs font-semibold opacity-70">Prodline</span></label>
                                                <input type="text" className="input input-bordered input-sm w-full opacity-60 px-2 py-1 text-sm" value={empProdline} readOnly />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="block"><span className="text-xs font-semibold opacity-70">Machine No.</span></label>
                                                <input type="text" placeholder="Enter machine no..."
                                                    className="input input-bordered input-sm w-full px-2 py-1 text-sm"
                                                    value={orderInfo.machine_no}
                                                    onChange={(e) => handleOrderInfoChange('machine_no', e.target.value)} />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="block"><span className="text-xs font-semibold opacity-70">Department</span></label>
                                                <input type="text" className="input input-bordered input-sm w-full opacity-60 px-2 py-1 text-sm" value={orderInfo.department} readOnly />
                                            </div>
                                            {/* Approver custom dropdown */}
                                            <div className="space-y-1 relative approver-dropdown-wrapper">
                                                <label className="block">
                                                    <span className="text-xs font-semibold opacity-70">Approver <span className="text-error">*</span></span>
                                                </label>
                                                <div
                                                    className="input input-bordered input-sm w-full px-2 py-1 flex items-center justify-between cursor-pointer text-sm"
                                                    onClick={() => setApproverDropdownOpen(prev => !prev)}
                                                >
                                                    <span className={`truncate ${!orderInfo.approver ? 'opacity-40' : ''}`}>
                                                        {orderInfo.approver
                                                            ? approvers.find(a => a.id == orderInfo.approver)?.name ?? "Select Approver"
                                                            : "Select Approver"}
                                                    </span>
                                                    <svg className={`w-3.5 h-3.5 ml-1 flex-shrink-0 transition-transform ${approverDropdownOpen ? 'rotate-180' : ''}`}
                                                        fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                    </svg>
                                                </div>
                                                {approverDropdownOpen && (
                                                    <div className="absolute z-50 top-full left-0 w-full mt-1 bg-base-100 border border-base-content/20 rounded-lg shadow-lg">
                                                        <div className="p-2 border-b border-base-content/10">
                                                            <input type="text" className="input input-bordered input-sm w-full text-sm"
                                                                placeholder="Search approver..." value={approverSearch}
                                                                onChange={(e) => setApproverSearch(e.target.value)}
                                                                onClick={(e) => e.stopPropagation()} autoFocus />
                                                        </div>
                                                        <ul className="max-h-40 overflow-y-auto py-1">
                                                            <li className="px-3 py-2 text-sm opacity-40 hover:bg-base-content/10 cursor-pointer"
                                                                onClick={() => { handleOrderInfoChange('approver', ''); setApproverDropdownOpen(false); setApproverSearch(''); }}>
                                                                Select Approver
                                                            </li>
                                                            {filteredApprovers.length > 0 ? filteredApprovers.map(a => (
                                                                <li key={a.id}
                                                                    className={`px-3 py-2 text-sm hover:bg-base-content/10 cursor-pointer ${orderInfo.approver == a.id ? 'bg-base-content/10 font-semibold' : ''}`}
                                                                    onClick={() => { handleOrderInfoChange('approver', a.id); setApproverDropdownOpen(false); setApproverSearch(''); }}>
                                                                    {a.name}
                                                                </li>
                                                            )) : (
                                                                <li className="px-3 py-2 text-sm opacity-40 text-center">No approvers found</li>
                                                            )}
                                                        </ul>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="flex gap-2 mb-4">
                            {showConsigned && (
                                <button
                                    className={`px-5 py-2 rounded-lg font-semibold border-2 transition-all duration-200 text-sm ${
                                        activeTab === "consigned"
                                            ? 'bg-base-content text-base-100 border-base-content'
                                            : 'bg-transparent text-base-content border-base-content/30 hover:border-base-content/70'
                                    }`}
                                    onClick={() => setActiveTab("consigned")}>
                                    Consigned
                                </button>
                            )}
                            {showSupplies && (
                                <button
                                    className={`px-5 py-2 rounded-lg font-semibold border-2 transition-all duration-200 text-sm ${
                                        activeTab === "supplies"
                                            ? 'bg-base-content text-base-100 border-base-content'
                                            : 'bg-transparent text-base-content border-base-content/30 hover:border-base-content/70'
                                    }`}
                                    onClick={() => setActiveTab("supplies")}>
                                    Supplies
                                </button>
                            )}
                            {showConsumable && (
                                <button
                                    className={`px-5 py-2 rounded-lg font-semibold border-2 transition-all duration-200 text-sm ${
                                        activeTab === "consumable"
                                            ? 'bg-base-content text-base-100 border-base-content'
                                            : 'bg-transparent text-base-content border-base-content/30 hover:border-base-content/70'
                                    }`}
                                    onClick={() => setActiveTab("consumable")}>
                                    Consumable and Spare Parts
                                </button>
                            )}
                        </div>

                        {/* Tab Content */}
                        <div className="mt-4">{renderTabContent()}</div>

                    </div>
                </div>
            </div>

            {/* ==================== CART MODAL ==================== */}
            {showCartModal && (
                <div className="modal modal-open">
                    <div className="modal-box max-w-7xl max-h-[90vh] relative">
                        <h3 className="font-bold text-lg mb-4">Order Cart</h3>

                        <div className="overflow-y-auto max-h-[calc(90vh-200px)]">
                            {groupedCartItems().length > 0 ? groupedCartItems().map((group, groupIndex) => (
                                <div key={groupIndex} className="mb-6">
                                    {/* Requestor Info */}
                                    <div className="border border-base-content/20 rounded-lg p-4 mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="avatar placeholder">
                                                <div className="border border-base-content/30 rounded-full w-10 h-10 flex items-center justify-center">
                                                    <UserOutlined className="text-xl" />
                                                </div>
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="font-bold text-lg">Requestor Info</h4>
                                                {group.cart_type === 'consigned' ? (
                                                    <div className="grid grid-cols-3 gap-4 mt-2">
                                                        <div><div className="text-xs opacity-50 font-medium">Employee ID</div><div className="font-semibold text-sm">{group.employee_id}</div></div>
                                                        <div><div className="text-xs opacity-50 font-medium">Station</div><div className="font-semibold text-sm">{group.station}</div></div>
                                                        <div><div className="text-xs opacity-50 font-medium">Factory</div><div className="font-semibold text-sm">{group.factory}</div></div>
                                                    </div>
                                                ) : (
                                                    <div className="grid grid-cols-5 gap-4 mt-2">
                                                        <div><div className="text-xs opacity-50 font-medium">Station</div><div className="font-semibold text-sm">{group.station}</div></div>
                                                        <div><div className="text-xs opacity-50 font-medium">Prodline</div><div className="font-semibold text-sm">{empProdline}</div></div>
                                                        <div><div className="text-xs opacity-50 font-medium">Machine No.</div><div className="font-semibold text-sm">{group.machine_no || '-'}</div></div>
                                                        <div><div className="text-xs opacity-50 font-medium">Department</div><div className="font-semibold text-sm">{group.department}</div></div>
                                                        <div><div className="text-xs opacity-50 font-medium">Approver</div><div className="font-semibold text-sm">{approvers.find(a => a.id == group.approver)?.name ?? group.approver}</div></div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Items Table */}
                                    <div className="overflow-x-auto">
                                        <table className="table table-zebra w-full table-sm [&_th]:border-y [&_th]:border-base-content/20 [&_td]:border-y [&_td]:border-base-content/20">
                                            <thead>
                                                <tr>
                                                    <th className="text-center text-xs px-2 py-3">Item Code</th>
                                                    {group.cart_type === 'consigned' ? (
                                                        <>
                                                            <th className="text-center text-xs px-2 py-3">Description</th>
                                                            <th className="text-center text-xs px-2 py-3">Supplier</th>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <th className="text-center text-xs px-2 py-3">Material Description</th>
                                                            <th className="text-center text-xs px-2 py-3">Detailed Description</th>
                                                            {group.cart_type === 'consumable' && <th className="text-center text-xs px-2 py-3">Serial</th>}
                                                        </>
                                                    )}
                                                    <th className="text-center text-xs px-2 py-3">Available Qty</th>
                                                    <th className="text-center text-xs px-2 py-3">UOM</th>
                                                    <th className="text-center text-xs px-2 py-3">Request Quantity</th>
                                                    <th className="text-center text-xs px-2 py-3">Remarks</th>
                                                    <th className="text-center text-xs px-2 py-3">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {group.items.map((item) => (
                                                    <tr key={item.cart_item_id}>
                                                        <td className="text-center align-middle px-2 py-2 text-xs"><span className="inline-block max-w-[80px] truncate font-mono" title={item.item_code || '-'}>{item.item_code || '-'}</span></td>
                                                        {group.cart_type === 'consigned' ? (
                                                            <>
                                                                <td className="text-center align-middle px-2 py-2 text-xs"><span className="inline-block max-w-[120px] break-words whitespace-normal">{item.mat_description || '-'}</span></td>
                                                                <td className="text-center align-middle px-2 py-2 text-xs"><span className="inline-block max-w-[100px] break-words whitespace-normal">{item.supplier || '-'}</span></td>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <td className="text-center align-middle px-2 py-2 text-xs"><span className="inline-block max-w-[180px] break-words whitespace-normal">{item.material_description || '-'}</span></td>
                                                                <td className="text-center align-middle px-2 py-2 text-xs"><span className="inline-block max-w-[120px] break-words whitespace-normal">{item.detailed_description || '-'}</span></td>
                                                                {group.cart_type === 'consumable' && (
                                                                    <td className="text-center align-middle px-2 py-2 text-xs"><span className="inline-block max-w-[80px] truncate">{item.serial || '-'}</span></td>
                                                                )}
                                                            </>
                                                        )}
                                                        <td className="text-center align-middle px-2 py-2 text-sm">{item.qty || 0}</td>
                                                        <td className="text-center align-middle px-2 py-2 text-xs"><span className="inline-block max-w-[60px] truncate">{item.uom || '-'}</span></td>
                                                        <td className="text-center align-middle px-2 py-2">
                                                            <input type="number" min="1" max={item.qty || 1}
                                                                className="input input-bordered input-sm w-20 h-8 min-h-[2rem] px-2 text-sm"
                                                                value={item.request_quantity}
                                                                onChange={(e) => handleQuantityChange(item.cart_item_id, e.target.value === "" ? "" : parseInt(e.target.value) || "")} />
                                                        </td>
                                                        <td className="text-center align-middle px-2 py-2">
                                                            <input type="text" className="input input-bordered input-sm w-full h-8 min-h-[2rem] px-2 text-sm"
                                                                placeholder="Enter remarks..." value={item.remarks}
                                                                onChange={(e) => handleRemarksChange(item.cart_item_id, e.target.value)} />
                                                        </td>
                                                        <td className="text-center align-middle px-2 py-2">
                                                            <button className="btn btn-sm btn-ghost border border-error/40 text-error hover:bg-error hover:text-error-content h-8 min-h-[2rem] px-3 text-xs"
                                                                onClick={() => handleRemoveFromCart(item.cart_item_id)}>
                                                                Remove
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )) : (
                                <div className="text-center opacity-40 py-20 text-sm">Your cart is empty</div>
                            )}
                        </div>

                        <div className="modal-action">
                            <button className="btn btn-ghost border border-base-content/30" onClick={() => setShowCartModal(false)} disabled={isSubmitting}>
                                Close
                            </button>
                            {cartItems.length > 0 && (
                                <button className="btn btn-outline" onClick={handleSubmitOrder} disabled={isSubmitting}>
                                    {isSubmitting ? (
                                        <span className="flex items-center gap-2">
                                            <span className="loading loading-spinner loading-sm"></span>
                                            Submitting...
                                        </span>
                                    ) : "Submit Order"}
                                </button>
                            )}
                        </div>

                        {/* Loading Overlay */}
                        {isSubmitting && (
                            <div className="absolute inset-0 bg-base-100/80 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center z-50">
                                <span className="loading loading-spinner loading-lg"></span>
                                <p className="mt-4 text-base font-semibold">Submitting your order...</p>
                                <p className="text-sm opacity-50 mt-1">Please wait, do not close this window.</p>
                            </div>
                        )}
                    </div>
                    <div className="modal-backdrop"></div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}