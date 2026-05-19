import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head, router } from "@inertiajs/react";
import { useState, useEffect, useMemo, useRef } from "react";

import { 
    EyeOutlined, 
    CheckCircleOutlined,
    ClockCircleOutlined,
    CloseCircleOutlined,
    SyncOutlined,
    ShoppingOutlined,
    UndoOutlined,
    UserOutlined,
} from '@ant-design/icons';
import { X, Search } from "lucide-react";

// -------------------- Search Bar --------------------
const SearchBar = ({ value, onChange, placeholder = "Search..." }) => (
    <div className="relative w-full max-w-sm">
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Search className="h-4 w-4 text-base-content/40" />
        </div>
        <input
            type="text"
            className="input input-bordered input-sm w-full pl-9 pr-8"
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
        />
        {value && (
            <button
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-base-content/40 hover:text-base-content"
                onClick={() => onChange("")}
            >
                <X className="h-4 w-4" />
            </button>
        )}
    </div>
);

const applySearch = (data, term) => {
    if (!term.trim()) return data;
    const lower = term.toLowerCase();
    return data.filter(row =>
        Object.values(row).some(val =>
            val !== null && val !== undefined && String(val).toLowerCase().includes(lower)
        )
    );
};

const sortByLatest = (data) =>
    [...data].sort((a, b) => {
        const da = a.created_at ? new Date(a.created_at) : new Date(0);
        const db = b.created_at ? new Date(b.created_at) : new Date(0);
        return db - da;
    });

// -------------------- Status Badge (border-only, theme-aware) --------------------
const getStatusBadge = (status) => {
    const cfgMap = {
        'Pending':     { icon: <ClockCircleOutlined />,  style: { borderColor: 'oklch(var(--wa))',  color: 'oklch(var(--wa))' } },
        'Approved':    { icon: <CheckCircleOutlined />,  style: { borderColor: 'oklch(var(--su))',  color: 'oklch(var(--su))' } },
        'Rejected':    { icon: <CloseCircleOutlined />,  style: { borderColor: 'oklch(var(--er))',  color: 'oklch(var(--er))' } },
        'Preparing':   { icon: <SyncOutlined spin />,    style: { borderColor: 'oklch(var(--in))',  color: 'oklch(var(--in))' } },
        'For Pick Up': { icon: <ShoppingOutlined />,     style: { borderColor: 'oklch(var(--p))',   color: 'oklch(var(--p))' } },
        'Delivered':   { icon: <CheckCircleOutlined />,  style: { borderColor: 'oklch(var(--su))',  color: 'oklch(var(--su))' } },
        'Returned':    { icon: <UndoOutlined />,         style: { borderColor: 'oklch(var(--er))',  color: 'oklch(var(--er))' } },
        'Cancelled':   { icon: <CloseCircleOutlined />,  style: { borderColor: 'oklch(var(--er))',  color: 'oklch(var(--er))' } },
    };
    const cfg = cfgMap[status] || { icon: null, style: { borderColor: 'currentColor', color: 'inherit' } };
    return (
        <span className="badge badge-outline gap-1" style={{ ...cfg.style, backgroundColor: 'transparent' }}>
            {cfg.icon}{status}
        </span>
    );
};

// -------------------- Tab Button Style --------------------
const tabBtnStyle = (isActive) => isActive
    ? { border: '2px solid currentColor', color: 'inherit', backgroundColor: 'transparent', opacity: 1 }
    : { border: '2px dashed currentColor', color: 'inherit', backgroundColor: 'transparent', opacity: 0.45 };

// -------------------- Approver Filter Pills --------------------
const ApproverFilter = ({ approvers, selected, onSelect }) => (
    <div className="flex flex-wrap items-center gap-2 mb-4 p-3 bg-base-200 rounded-lg">
        <span className="text-sm text-base-content/60 flex items-center gap-1 mr-1">
            <UserOutlined /> Filter by Approver:
        </span>
        <button
            onClick={() => onSelect(null)}
            className="px-3 py-1 rounded-full text-sm font-medium transition-all duration-150"
            style={selected === null
                ? { border: '2px solid currentColor', opacity: 1 }
                : { border: '2px dashed currentColor', opacity: 0.45 }}
        >
            All
        </button>
        {approvers.map(approver => (
            <button
                key={approver}
                onClick={() => onSelect(prev => prev === approver ? null : approver)}
                className="px-3 py-1 rounded-full text-sm font-medium transition-all duration-150 flex items-center gap-1"
                style={selected === approver
                    ? { border: '2px solid currentColor', opacity: 1 }
                    : { border: '2px dashed currentColor', opacity: 0.45 }}
            >
                <UserOutlined className="text-xs" />
                {approver}
            </button>
        ))}
    </div>
);

// -------------------- Pagination --------------------
const Pagination = ({ current, last, onPageChange }) => {
    if (last <= 1) return null;

    const pages = [];
    const delta = 2;
    const left  = Math.max(1, current - delta);
    const right = Math.min(last, current + delta);

    if (left > 1)    { pages.push(1); if (left > 2) pages.push('...'); }
    for (let i = left; i <= right; i++) pages.push(i);
    if (right < last) { if (right < last - 1) pages.push('...'); pages.push(last); }

    return (
        <div className="flex justify-center items-center gap-1 mt-4 flex-wrap">
            <button
                className="btn btn-sm btn-ghost"
                disabled={current === 1}
                onClick={() => onPageChange(current - 1)}
            >«</button>
            {pages.map((p, i) =>
                p === '...'
                    ? <span key={`ellipsis-${i}`} className="px-2 text-base-content/40">…</span>
                    : <button
                        key={p}
                        className={`btn btn-sm ${current === p ? 'btn-neutral' : 'btn-ghost'}`}
                        onClick={() => onPageChange(p)}
                    >{p}</button>
            )}
            <button
                className="btn btn-sm btn-ghost"
                disabled={current === last}
                onClick={() => onPageChange(current + 1)}
            >»</button>
        </div>
    );
};

export default function OrderMonitor({ 
    consignedData  = { data: [], current_page: 1, last_page: 1, per_page: 20, total: 0 }, 
    suppliesData   = { data: [], current_page: 1, last_page: 1, per_page: 20, total: 0 }, 
    consumableData = { data: [], current_page: 1, last_page: 1, per_page: 20, total: 0 },
    isConsignedUser = false,
    isStoreUser     = false,
    isRegularUser   = false,
    filters         = {},
}) {
    useEffect(() => {
        console.log('=== ORDER MONITOR PROPS DEBUG ===');
        console.log('isConsignedUser:', isConsignedUser);
        console.log('isStoreUser:', isStoreUser);
        console.log('isRegularUser:', isRegularUser);
    }, []);

    const [showModal, setShowModal]         = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [orderItems, setOrderItems]       = useState([]);
    const [isLoading, setIsLoading]         = useState(false);

    const [searchTerms, setSearchTerms] = useState({
        consigned:  filters?.search_consigned  ?? '',
        supplies:   filters?.search_supplies   ?? '',
        consumable: filters?.search_consumable ?? '',
    });
    const [pages, setPages] = useState({ consigned: 1, supplies: 1, consumable: 1 });
    const searchTimeouts = useRef({});

    // Selected approver per tab (null = show All)
    const [suppliesApprover,   setSuppliesApprover]   = useState(null);
    const [consumableApprover, setConsumableApprover] = useState(null);

    const showConsigned  = isConsignedUser || isStoreUser;
    const showSupplies   = isStoreUser || isRegularUser;
    const showConsumable = isStoreUser || isRegularUser;

    const defaultTab = showConsigned ? "Consigned" : "Supplies";
    const [activeTab, setActiveTab]     = useState(defaultTab);
    const [currentType, setCurrentType] = useState(showConsigned ? "consigned" : "supplies");

    // ==================== REAL-TIME UPDATES ====================
    useEffect(() => {
        if (typeof window.Echo === 'undefined') return;
        const channel = window.Echo.channel('material-issuance');
        channel.listen('.material.updated', (event) => {
            const reloadProps = [];
            if (event.type === 'consigned'  && showConsigned)  reloadProps.push('consignedData');
            if (event.type === 'supplies'   && showSupplies)   reloadProps.push('suppliesData');
            if (event.type === 'consumable' && showConsumable) reloadProps.push('consumableData');
            if (reloadProps.length > 0) {
                router.reload({
                    only: reloadProps,
                    preserveState: true,
                    preserveScroll: true,
                    onSuccess: () => {
                        if (selectedOrder && selectedOrder.mrs_no === event.mrs_no)
                            fetchOrderDetails(selectedOrder.mrs_no, currentType);
                    },
                });
            }
        });
        return () => window.Echo.leave('material-issuance');
    }, [selectedOrder, currentType, showConsigned, showSupplies, showConsumable]);

    // ==================== DERIVE UNIQUE APPROVERS ====================
    // Pull distinct approver names from each dataset to populate the filter pills
    const suppliesApprovers = useMemo(() =>
        [...new Set((suppliesData.data ?? []).map(r => r.approver).filter(Boolean))].sort(),
    [suppliesData]);

    const consumableApprovers = useMemo(() =>
        [...new Set((consumableData.data ?? []).map(r => r.approver).filter(Boolean))].sort(),
    [consumableData]);

    // ==================== SORTED + FILTERED DATA ====================
// Search is now server-side — just apply approver filter client-side on current page
    const filteredConsigned = useMemo(() =>
        consignedData.data ?? [],
    [consignedData]);

    const filteredSupplies = useMemo(() => {
        let data = suppliesData.data ?? [];
        if (suppliesApprover) data = data.filter(r => r.approver === suppliesApprover);
        return data;
    }, [suppliesData, suppliesApprover]);

    const filteredConsumable = useMemo(() => {
        let data = consumableData.data ?? [];
        if (consumableApprover) data = data.filter(r => r.approver === consumableApprover);
        return data;
    }, [consumableData, consumableApprover]);

    const handleSearch = (tab, value) => {
        setSearchTerms(prev => ({ ...prev, [tab]: value }));
        setPages(prev => ({ ...prev, [tab]: 1 }));

        clearTimeout(searchTimeouts.current[tab]);
        searchTimeouts.current[tab] = setTimeout(() => {
            router.reload({
                data: {
                    search_consigned:  tab === 'consigned'  ? value : searchTerms.consigned,
                    search_supplies:   tab === 'supplies'   ? value : searchTerms.supplies,
                    search_consumable: tab === 'consumable' ? value : searchTerms.consumable,
                    consigned_page:  1,
                    supplies_page:   1,
                    consumable_page: 1,
                },
                only: [
                    tab === 'consigned'  ? 'consignedData'  :
                    tab === 'supplies'   ? 'suppliesData'   : 'consumableData'
                ],
                preserveState: true,
                preserveScroll: true,
            });
        }, 400);
    };

    // ==================== FETCH ORDER DETAILS ====================
    const fetchOrderDetails = async (mrsNo, type) => {
        setIsLoading(true);
        try {
            const response = await fetch(
                route('order-monitor.details', { mrs_no: mrsNo, type }),
                { headers: { 'X-Requested-With': 'XMLHttpRequest', 'Accept': 'application/json' } }
            );
            const data = await response.json();
            setOrderItems(data.items || []);
        } catch (error) {
            console.error(error);
            alert('Failed to load order details');
        } finally {
            setIsLoading(false);
        }
    };

    const handleView = async (row, type) => {
        setSelectedOrder(row);
        setCurrentType(type);
        setShowModal(true);
        await fetchOrderDetails(row.mrs_no, type);
    };

    const closeModal = () => {
        setShowModal(false);
        setSelectedOrder(null);
        setOrderItems([]);
    };

    const getCurrentData = () => {
        switch (activeTab) {
            case "Consigned":                  return consignedData;
            case "Supplies":                   return suppliesData;
            case "Consumable and Spare parts": return consumableData;
            default:                           return { data: [], total: 0 };
        }
    };

    const handlePageChange = (tab, page) => {
        setPages(prev => ({ ...prev, [tab]: page }));
        router.reload({
            data: {
                consigned_page:  tab === 'consigned'  ? page : pages.consigned,
                supplies_page:   tab === 'supplies'   ? page : pages.supplies,
                consumable_page: tab === 'consumable' ? page : pages.consumable,
            },
            only: [
                tab === 'consigned'  ? 'consignedData'  :
                tab === 'supplies'   ? 'suppliesData'   : 'consumableData'
            ],
            preserveState: true,
            preserveScroll: true,
        });
    };

    // ==================== CONSIGNED TABLE ====================
    const renderConsignedTable = () => (
        <div>
            <div className="flex items-center justify-between mb-3">
                <SearchBar
                    value={searchTerms.consigned}
                                        onChange={(val) => handleSearch('consigned', val)}

                    placeholder="Search by MRS no, employee, station..."
                />
                <span className="text-sm text-base-content/60 ml-4 whitespace-nowrap">
                    {searchTerms.consigned
                        ? `${filteredConsigned.length} of ${consignedData.length} records`
                        : `${consignedData.length} records`}
                </span>
            </div>
            <div className="overflow-x-auto">
                <table className="table table-zebra [&_th]:border-y [&_th]:border-base-content/20 [&_td]:border-y [&_td]:border-base-content/20">
                    <thead>
                        <tr>
                            <th>Date Order</th><th>Time</th><th>MRS No</th>
                            <th>Employee ID</th><th>Employee Name</th><th>Station</th>
                            <th>Status</th><th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredConsigned.length > 0 ? filteredConsigned.map((row) => (
                            <tr key={row.id} className="hover">
                                <td>{row.date_order}</td>
                                <td><span className="text-xs text-base-content/50">{row.time ?? '—'}</span></td>
                                <td><span className="font-semibold">{row.mrs_no}</span></td>
                                <td><span className="font-mono text-sm">{row.employee_id}</span></td>
                                <td>{row.employee_name}</td>
                                <td>
                                    <span className="badge badge-outline" style={{ backgroundColor: 'transparent' }}>
                                        {row.station}
                                    </span>
                                </td>
                                <td>{getStatusBadge(row.status)}</td>
                                <td>
                                    <button className="btn btn-ghost btn-sm" onClick={() => handleView(row, 'consigned')} disabled={isLoading}>
                                        <EyeOutlined className="text-lg" />
                                    </button>
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan="8" className="text-center py-8 text-base-content/50">
                                    {searchTerms.consigned ? `No results for "${searchTerms.consigned}"` : 'No consigned orders available'}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
                </div>
            <Pagination
                current={consignedData.current_page ?? 1}
                last={consignedData.last_page ?? 1}
                onPageChange={(page) => handlePageChange('consigned', page)}
            />
        </div>
    );

    // ==================== SUPPLIES TABLE ====================
    const renderSuppliesTable = () => (
        <div>
            {suppliesApprovers.length > 0 && (
                <ApproverFilter
                    approvers={suppliesApprovers}
                    selected={suppliesApprover}
                    onSelect={setSuppliesApprover}
                />
            )}
            <div className="flex items-center justify-between mb-3">
                <SearchBar
                    value={searchTerms.supplies}
                    onChange={(val) => handleSearch('supplies', val)}
                    placeholder="Search by MRS no, requestor, department..."
                />
                <span className="text-sm text-base-content/60 ml-4 whitespace-nowrap">
                    {(suppliesApprover || searchTerms.supplies)
                        ? `${filteredSupplies.length} of ${suppliesData.length} records`
                        : `${suppliesData.length} records`}
                </span>
            </div>
            <div className="overflow-x-auto">
                <table className="table table-zebra [&_th]:border-y [&_th]:border-base-content/20 [&_td]:border-y [&_td]:border-base-content/20">
                    <thead>
                        <tr>
                            <th>Date Order</th><th>Time</th><th>MRS No</th>
                            <th>Requestor</th><th>Department</th><th>Approver</th>
                            <th>Approver Status</th><th>MRS Status</th><th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredSupplies.length > 0 ? filteredSupplies.map((row) => (
                            <tr key={row.id} className="hover">
                                <td>{row.date_order}</td>
                                <td><span className="text-xs text-base-content/50">{row.time ?? '—'}</span></td>
                                <td><span className="font-semibold">{row.mrs_no}</span></td>
                                <td>{row.requestor}</td>
                                <td>
                                    <span className="badge badge-outline" style={{ backgroundColor: 'transparent' }}>
                                        {row.department}
                                    </span>
                                </td>
                                <td>
                                    <span className="text-sm flex items-center gap-1">
                                        <UserOutlined className="text-base-content/40 text-xs" />
                                        {row.approver || <span className="text-base-content/40 italic text-xs">—</span>}
                                    </span>
                                </td>
                                <td>{getStatusBadge(row.approver_status)}</td>
                                <td>{getStatusBadge(row.status)}</td>
                                <td>
                                    <button className="btn btn-ghost btn-sm" onClick={() => handleView(row, 'supplies')} disabled={isLoading}>
                                        <EyeOutlined className="text-lg" />
                                    </button>
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan="9" className="text-center py-8 text-base-content/50">
                                    {suppliesApprover
                                        ? `No orders assigned to "${suppliesApprover}"`
                                        : searchTerms.supplies
                                            ? `No results for "${searchTerms.supplies}"`
                                            : 'No supplies orders available'}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
</div>
            <Pagination
                current={suppliesData.current_page ?? 1}
                last={suppliesData.last_page ?? 1}
                onPageChange={(page) => handlePageChange('supplies', page)}
            />
        </div>
    );

    // ==================== CONSUMABLE TABLE ====================
    const renderConsumableTable = () => (
        <div>
            {consumableApprovers.length > 0 && (
                <ApproverFilter
                    approvers={consumableApprovers}
                    selected={consumableApprover}
                    onSelect={setConsumableApprover}
                />
            )}
            <div className="flex items-center justify-between mb-3">
                <SearchBar
                    value={searchTerms.consumable}
                    onChange={(val) => handleSearch('consumable', val)}
                    placeholder="Search by MRS no, requestor, department..."
                />
                <span className="text-sm text-base-content/60 ml-4 whitespace-nowrap">
                    {(consumableApprover || searchTerms.consumable)
                        ? `${filteredConsumable.length} of ${consumableData.length} records`
                        : `${consumableData.length} records`}
                </span>
            </div>
            <div className="overflow-x-auto">
                <table className="table table-zebra [&_th]:border-y [&_th]:border-base-content/20 [&_td]:border-y [&_td]:border-base-content/20">
                    <thead>
                        <tr>
                            <th>Date Order</th><th>Time</th><th>MRS No</th>
                            <th>Requestor</th><th>Department</th><th>Approver</th>
                            <th>Approver Status</th><th>MRS Status</th><th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredConsumable.length > 0 ? filteredConsumable.map((row) => (
                            <tr key={row.id} className="hover">
                                <td>{row.date_order}</td>
                                <td><span className="text-xs text-base-content/50">{row.time ?? '—'}</span></td>
                                <td><span className="font-semibold">{row.mrs_no}</span></td>
                                <td>{row.requestor}</td>
                                <td>
                                    <span className="badge badge-outline" style={{ backgroundColor: 'transparent' }}>
                                        {row.department}
                                    </span>
                                </td>
                                <td>
                                    <span className="text-sm flex items-center gap-1">
                                        <UserOutlined className="text-base-content/40 text-xs" />
                                        {row.approver || <span className="text-base-content/40 italic text-xs">—</span>}
                                    </span>
                                </td>
                                <td>{getStatusBadge(row.approver_status)}</td>
                                <td>{getStatusBadge(row.status)}</td>
                                <td>
                                    <button className="btn btn-ghost btn-sm" onClick={() => handleView(row, 'consumable')} disabled={isLoading}>
                                        <EyeOutlined className="text-lg" />
                                    </button>
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan="9" className="text-center py-8 text-base-content/50">
                                    {consumableApprover
                                        ? `No orders assigned to "${consumableApprover}"`
                                        : searchTerms.consumable
                                            ? `No results for "${searchTerms.consumable}"`
                                            : 'No consumable orders available'}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
</div>
            <Pagination
                current={consumableData.current_page ?? 1}
                last={consumableData.last_page ?? 1}
                onPageChange={(page) => handlePageChange('consumable', page)}
            />
        </div>
    );

    const renderTabContent = () => {
        switch (activeTab) {
            case "Consigned":                  return renderConsignedTable();
            case "Supplies":                   return renderSuppliesTable();
            case "Consumable and Spare parts": return renderConsumableTable();
            default:                           return null;
        }
    };

    return (
        <AuthenticatedLayout>
            <Head title="Order Monitor" />
            <div className="p-6">
                <div className="card bg-base-100 shadow-xl">
                    <div className="card-body">
                        {/* Header */}
                        <div className="flex justify-between items-center">
                            <h2 className="card-title text-3xl">Order Monitor</h2>
                            <div className="text-sm text-base-content/60">
                                Total Orders: {getCurrentData().total ?? 0}
                            </div>
                        </div>

                        {/* Status Legend */}
                        <div className="p-4 bg-base-200 rounded-lg">
                            <h3 className="font-semibold mb-3">Status Legend:</h3>
                            <div className="flex flex-wrap gap-4">
                                {[
                                    { s: 'Pending',     label: 'Waiting for action' },
                                    { s: 'Approved',    label: 'Approved by manager' },
                                    { s: 'Preparing',   label: 'Being prepared' },
                                    { s: 'For Pick Up', label: 'Ready for pickup' },
                                    { s: 'Delivered',   label: 'Successfully delivered' },
                                ].map(({ s, label }) => (
                                    <div key={s} className="flex items-center gap-2">
                                        {getStatusBadge(s)}
                                        <span className="text-sm">{label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="flex gap-2 mt-4 flex-wrap">
                            {showConsigned && (
                                <button
                                    style={tabBtnStyle(activeTab === "Consigned")}
                                    className="px-5 py-2 rounded-lg font-semibold transition-all duration-200"
                                    onClick={() => { setActiveTab("Consigned"); setCurrentType("consigned"); }}
                                >
                                    Consigned
                                </button>
                            )}
                            {showSupplies && (
                                <button
                                    style={tabBtnStyle(activeTab === "Supplies")}
                                    className="px-5 py-2 rounded-lg font-semibold transition-all duration-200"
                                    onClick={() => { setActiveTab("Supplies"); setCurrentType("supplies"); }}
                                >
                                    Supplies
                                </button>
                            )}
                            {showConsumable && (
                                <button
                                    style={tabBtnStyle(activeTab === "Consumable and Spare parts")}
                                    className="px-5 py-2 rounded-lg font-semibold transition-all duration-200"
                                    onClick={() => { setActiveTab("Consumable and Spare parts"); setCurrentType("consumable"); }}
                                >
                                    Consumable and Spare parts
                                </button>
                            )}
                        </div>

                        {/* Tab Content */}
                        <div className="mt-6">{renderTabContent()}</div>
                    </div>
                </div>
            </div>

            {/* ================= ORDER DETAILS MODAL ================= */}
            {showModal && selectedOrder && (
                <div className="modal modal-open">
                    <div className="modal-box max-w-6xl">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-lg">Order Details — {selectedOrder.mrs_no}</h3>
                            <button className="btn btn-sm btn-circle btn-ghost" onClick={closeModal}>
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Order Info */}
                        <div className="card bg-base-200 mb-6">
                            <div className="card-body">
                                <h4 className="card-title text-base mb-4">Order Information</h4>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div>
                                        <p className="text-sm text-base-content/50">MRS No</p>
                                        <p className="font-semibold">{selectedOrder.mrs_no}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-base-content/50">Order Date</p>
                                        <p className="font-semibold">{selectedOrder.date_order}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-base-content/50">Time Created</p>
                                        <p className="font-semibold">{selectedOrder.time ?? '—'}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-base-content/50">
                                            {currentType === 'consigned' ? 'Employee Name' : 'Requestor'}
                                        </p>
                                        <p className="font-semibold">
                                            {selectedOrder.employee_name || selectedOrder.requestor}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-base-content/50">
                                            {currentType === 'consigned' ? 'Station' : 'Department'}
                                        </p>
                                        <p className="font-semibold">
                                            {selectedOrder.station || selectedOrder.department}
                                        </p>
                                    </div>
                                    {currentType !== 'consigned' && selectedOrder.approver && (
                                        <div>
                                            <p className="text-sm text-base-content/50">Approver</p>
                                            <p className="font-semibold flex items-center gap-1">
                                                <UserOutlined className="text-base-content/50" />
                                                {selectedOrder.approver}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {currentType !== 'consigned' && (
                                    <div className="grid grid-cols-2 gap-4 mt-4">
                                        <div>
                                            <p className="text-sm text-base-content/50">Approver Status</p>
                                            <div className="mt-1">{getStatusBadge(selectedOrder.approver_status)}</div>
                                        </div>
                                        <div>
                                            <p className="text-sm text-base-content/50">MRS Status</p>
                                            <div className="mt-1">{getStatusBadge(selectedOrder.status)}</div>
                                        </div>
                                    </div>
                                )}

                                {currentType === 'consigned' && (
                                    <div className="mt-4">
                                        <p className="text-sm text-base-content/50">Status</p>
                                        <div className="mt-1">{getStatusBadge(selectedOrder.status)}</div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="divider"></div>

                        {/* Items Table */}
                        <div>
                            <h4 className="font-semibold mb-3 text-lg">Ordered Items</h4>
                            <div className="overflow-x-auto">
                                <table className="table table-sm table-zebra [&_th]:border-y [&_th]:border-base-content/20 [&_td]:border-y [&_td]:border-base-content/20">
                                    <thead>
                                        <tr>
                                            <th>Item Code</th>
                                            <th>Material Description</th>
                                            {currentType === 'consigned' && <th>Supplier</th>}
                                            {currentType !== 'consigned' && <th>Detailed Description</th>}
                                            <th>Available Qty</th>
                                            <th>UOM</th>
                                            <th>Requested</th>
                                            <th>Issued</th>
                                            {currentType !== 'consigned' && <th>Approver Status</th>}
                                            <th>Status</th>
                                            <th>Remarks</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {orderItems.length === 0 ? (
                                            <tr>
                                                <td colSpan="11" className="text-center py-8 text-base-content/40">
                                                    {isLoading ? 'Loading items…' : 'No items found'}
                                                </td>
                                            </tr>
                                        ) : orderItems.map((item, idx) => (
                                            <tr key={idx}>
                                                <td><span className="font-mono text-xs">{item.item_code}</span></td>
                                                <td>
                                                    <div className="max-w-xs">
                                                        <p className="truncate" title={item.material_description}>
                                                            {item.material_description}
                                                        </p>
                                                    </div>
                                                </td>
                                                {currentType === 'consigned' && <td>{item.supplier || 'N/A'}</td>}
                                                {currentType !== 'consigned' && (
                                                    <td>
                                                        <div className="max-w-xs">
                                                            <p className="truncate" title={item.detailed_description}>
                                                                {item.detailed_description || 'N/A'}
                                                            </p>
                                                        </div>
                                                    </td>
                                                )}
                                                <td>{item.quantity}</td>
                                                <td>{item.uom}</td>
                                                <td><span className="font-semibold">{item.request_qty}</span></td>
                                                <td><span className="font-semibold">{item.issued_qty || 0}</span></td>
                                                {currentType !== 'consigned' && (
                                                    <td>{getStatusBadge(item.approver_status)}</td>
                                                )}
                                                <td>{item.mrs_status && getStatusBadge(item.mrs_status)}</td>
                                                <td>
                                                    <div className="max-w-xs">
                                                        <p className="text-xs truncate" title={item.remarks}>
                                                            {item.remarks || '—'}
                                                        </p>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="modal-action">
                            <button className="btn btn-outline" onClick={closeModal}>Close</button>
                        </div>
                    </div>
                    <div className="modal-backdrop" onClick={closeModal}></div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}